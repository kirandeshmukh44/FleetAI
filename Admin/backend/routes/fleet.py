"""Fleet-wide vehicle and driver administration.

The main application scopes these resources to the signed-in user; the admin
panel sees every tenant's fleet and can take corrective action on any record.
"""

import math
import re
from datetime import date

from flask import Blueprint, jsonify, request

from app.database.db import db
from app.models import (
    Driver,
    DriverBehavior,
    FuelRecord,
    GPSRecord,
    Journey,
    RiskPrediction,
    User,
    Vehicle,
)
from app.utils.validation import (
    DRIVER_ID_RE,
    EMAIL_RE,
    NAME_RE,
    PHONE_RE,
    REGISTRATION_RE,
    VEHICLE_ID_RE,
    clean,
)

from utils import (
    admin_required,
    apply_sort,
    commit_or_conflict,
    paginated_response,
    pagination_args,
    record_audit,
    search_filter,
)

fleet_bp = Blueprint('admin_fleet', __name__)

VEHICLE_STATUSES = {'ACTIVE', 'IDLE', 'STOPPED', 'OFFLINE'}
VEHICLE_TYPES = {'Truck', 'Van', 'Bus', 'Car', 'Motorcycle', 'Other'}
FUEL_TYPES = {'Petrol', 'Diesel', 'Electric', 'CNG', 'LPG', 'Hybrid'}
DRIVER_STATUSES = {'ACTIVE', 'INACTIVE', 'ON_LEAVE'}
RISK_LEVELS = {'LOW', 'MEDIUM', 'HIGH'}

#: Matches the licence format enforced by the main backend's drivers blueprint.
LICENSE_RE = re.compile(r'^[A-Z]{2}\d{2}\s?\d{11}$')


def owner_label(user_id):
    user = User.query.get(user_id)
    return (user.full_name or user.username) if user else 'Unknown'


# ---------------------------------------------------------------- vehicles --

@fleet_bp.route('/vehicles', methods=['GET'])
@admin_required
def list_vehicles():
    args = pagination_args()
    query = Vehicle.query

    term = search_filter(
        Vehicle, args['search'], ('vehicle_id', 'registration_number', 'make', 'model')
    )
    if term is not None:
        query = query.filter(term)

    for field, column in (
        ('status', Vehicle.status),
        ('risk_level', Vehicle.risk_level),
        ('vehicle_type', Vehicle.vehicle_type),
        ('user_id', Vehicle.user_id),
    ):
        value = (request.args.get(field) or '').strip()
        if value:
            query = query.filter(column == value)

    total = query.count()
    sortable = {'id', 'vehicle_id', 'registration_number', 'status', 'risk_level', 'created_at'}
    query = apply_sort(query, Vehicle, args['sort'], args['direction'], sortable, Vehicle.created_at)
    items = query.limit(args['per_page']).offset((args['page'] - 1) * args['per_page']).all()

    return paginated_response(
        [vehicle_row(vehicle) for vehicle in items],
        total,
        args['page'],
        args['per_page'],
        statuses=sorted(VEHICLE_STATUSES),
        vehicle_types=sorted(VEHICLE_TYPES),
    )


def vehicle_row(vehicle):
    """Vehicle payload enriched with owner, driver and telemetry counts."""
    data = vehicle.to_dict()
    data['owner'] = owner_label(vehicle.user_id)
    data['driver_name'] = vehicle.driver.name if vehicle.driver else None
    data['gps_records'] = GPSRecord.query.filter_by(vehicle_id=vehicle.id).count()
    data['journey_count'] = Journey.query.filter_by(vehicle_id=vehicle.id).count()
    latest = (
        GPSRecord.query.filter_by(vehicle_id=vehicle.id)
        .order_by(GPSRecord.timestamp.desc())
        .first()
    )
    data['last_gps_at'] = latest.timestamp.isoformat() if latest and latest.timestamp else None
    return data


@fleet_bp.route('/vehicles/<int:vehicle_id>', methods=['GET'])
@admin_required
def get_vehicle(vehicle_id):
    """Full administrative detail for one vehicle."""
    vehicle = Vehicle.query.get(vehicle_id)
    if not vehicle:
        return jsonify({'error': 'Vehicle not found'}), 404

    data = vehicle_row(vehicle)
    data['journeys'] = [
        journey.to_dict()
        for journey in Journey.query.filter_by(vehicle_id=vehicle.id)
        .order_by(Journey.start_time.desc())
        .limit(10)
        .all()
    ]
    data['risk_predictions'] = [
        prediction.to_dict()
        for prediction in RiskPrediction.query.filter_by(vehicle_id=vehicle.id)
        .order_by(RiskPrediction.prediction_timestamp.desc())
        .limit(10)
        .all()
    ]
    return jsonify(data), 200


@fleet_bp.route('/vehicles/<int:vehicle_id>', methods=['PUT'])
@admin_required
def update_vehicle(vehicle_id):
    """Administrative override — admins may correct any vehicle field."""
    vehicle = Vehicle.query.get(vehicle_id)
    if not vehicle:
        return jsonify({'error': 'Vehicle not found'}), 404

    data = request.get_json(silent=True) or {}
    allowed = {
        'vehicle_id', 'registration_number', 'vehicle_type', 'make', 'model',
        'year', 'fuel_type', 'status', 'fuel_level', 'risk_level', 'current_driver_id',
    }
    unknown = set(data) - allowed
    if unknown:
        return jsonify({'error': f"Unsupported vehicle fields: {', '.join(sorted(unknown))}"}), 400

    values = {}

    if 'vehicle_id' in data:
        value = clean(data['vehicle_id']).upper()
        if not VEHICLE_ID_RE.fullmatch(value):
            return jsonify({'error': 'Vehicle ID must use format VH-001.'}), 400
        values['vehicle_id'] = value
    if 'registration_number' in data:
        value = clean(data['registration_number']).upper()
        if not REGISTRATION_RE.fullmatch(value):
            return jsonify(
                {'error': 'Registration number must use a valid format such as MH12AB1234.'}
            ), 400
        values['registration_number'] = value
    if 'vehicle_type' in data:
        if data['vehicle_type'] not in VEHICLE_TYPES:
            return jsonify({'error': 'Choose a valid vehicle type.'}), 400
        values['vehicle_type'] = data['vehicle_type']
    if 'fuel_type' in data:
        if data['fuel_type'] not in FUEL_TYPES:
            return jsonify({'error': 'Choose a valid fuel type.'}), 400
        values['fuel_type'] = data['fuel_type']
    if 'status' in data:
        if data['status'] not in VEHICLE_STATUSES:
            return jsonify({'error': 'Invalid vehicle status.'}), 400
        values['status'] = data['status']
    if 'risk_level' in data:
        if data['risk_level'] not in RISK_LEVELS:
            return jsonify({'error': 'Invalid risk level.'}), 400
        values['risk_level'] = data['risk_level']

    try:
        if 'year' in data and data['year'] not in (None, ''):
            year = int(data['year'])
            if not 1900 <= year <= 2100:
                return jsonify({'error': 'Vehicle year must be between 1900 and 2100.'}), 400
            values['year'] = year
        if 'fuel_level' in data and data['fuel_level'] not in (None, ''):
            level = float(data['fuel_level'])
            if not math.isfinite(level) or not 0 <= level <= 100:
                return jsonify({'error': 'Fuel level must be between 0 and 100.'}), 400
            values['fuel_level'] = level
    except (TypeError, ValueError):
        return jsonify({'error': 'Year and fuel level must be valid numbers.'}), 400

    if 'current_driver_id' in data:
        raw = data['current_driver_id']
        if raw in (None, ''):
            values['current_driver_id'] = None
        else:
            try:
                driver = Driver.query.get(int(raw))
            except (TypeError, ValueError):
                return jsonify({'error': 'Choose a valid driver.'}), 400
            if not driver:
                return jsonify({'error': 'Choose a valid driver.'}), 404
            if driver.assigned_vehicle_id not in (None, vehicle.id):
                return jsonify(
                    {'error': 'That driver is already assigned to another vehicle.'}
                ), 409
            values['current_driver_id'] = driver.id

    before = {key: getattr(vehicle, key, None) for key in values}
    for key, value in values.items():
        setattr(vehicle, key, value)

    conflict = commit_or_conflict('Vehicle ID or registration number already exists.')
    if conflict:
        return conflict

    record_audit('vehicle.updated', 'vehicle', vehicle.id, {'before': before, 'after': values})
    return jsonify(vehicle_row(vehicle)), 200


@fleet_bp.route('/vehicles/<int:vehicle_id>', methods=['DELETE'])
@admin_required
def delete_vehicle(vehicle_id):
    vehicle = Vehicle.query.get(vehicle_id)
    if not vehicle:
        return jsonify({'error': 'Vehicle not found'}), 404

    code = vehicle.vehicle_id
    Journey.query.filter_by(vehicle_id=vehicle.id).delete(synchronize_session=False)
    GPSRecord.query.filter_by(vehicle_id=vehicle.id).delete(synchronize_session=False)
    FuelRecord.query.filter_by(vehicle_id=vehicle.id).delete(synchronize_session=False)
    DriverBehavior.query.filter_by(vehicle_id=vehicle.id).delete(synchronize_session=False)
    RiskPrediction.query.filter_by(vehicle_id=vehicle.id).delete(synchronize_session=False)
    Driver.query.filter_by(assigned_vehicle_id=vehicle.id).update(
        {Driver.assigned_vehicle_id: None}, synchronize_session=False
    )
    db.session.delete(vehicle)
    db.session.commit()

    record_audit('vehicle.deleted', 'vehicle', vehicle_id, {'vehicle_id': code})
    return jsonify({'message': f'Vehicle {code} deleted'}), 200


# ----------------------------------------------------------------- drivers --

@fleet_bp.route('/drivers', methods=['GET'])
@admin_required
def list_drivers():
    args = pagination_args()
    query = Driver.query

    term = search_filter(
        Driver, args['search'], ('driver_id', 'name', 'email', 'phone', 'license_number')
    )
    if term is not None:
        query = query.filter(term)

    for field, column in (
        ('status', Driver.status),
        ('risk_level', Driver.risk_level),
        ('user_id', Driver.user_id),
    ):
        value = (request.args.get(field) or '').strip()
        if value:
            query = query.filter(column == value)

    total = query.count()
    sortable = {'id', 'driver_id', 'name', 'risk_level', 'risk_score', 'status', 'created_at'}
    query = apply_sort(query, Driver, args['sort'], args['direction'], sortable, Driver.created_at)
    items = query.limit(args['per_page']).offset((args['page'] - 1) * args['per_page']).all()

    return paginated_response(
        [driver_row(driver) for driver in items],
        total,
        args['page'],
        args['per_page'],
        statuses=sorted(DRIVER_STATUSES),
        risk_levels=sorted(RISK_LEVELS),
    )


def driver_row(driver):
    data = driver.to_dict()
    data['owner'] = owner_label(driver.user_id)
    data['vehicle_code'] = (
        driver.assigned_vehicle.vehicle_id if driver.assigned_vehicle else None
    )
    data['behavior_events'] = DriverBehavior.query.filter_by(driver_id=driver.id).count()
    data['prediction_count'] = RiskPrediction.query.filter_by(driver_id=driver.id).count()
    return data


@fleet_bp.route('/drivers/<int:driver_id>', methods=['GET'])
@admin_required
def get_driver(driver_id):
    driver = Driver.query.get(driver_id)
    if not driver:
        return jsonify({'error': 'Driver not found'}), 404

    data = driver_row(driver)
    data['predictions'] = [
        prediction.to_dict()
        for prediction in RiskPrediction.query.filter_by(driver_id=driver.id)
        .order_by(RiskPrediction.prediction_timestamp.desc())
        .limit(10)
        .all()
    ]
    data['behaviors'] = [
        behavior.to_dict()
        for behavior in DriverBehavior.query.filter_by(driver_id=driver.id)
        .order_by(DriverBehavior.timestamp.desc())
        .limit(20)
        .all()
    ]
    return jsonify(data), 200


@fleet_bp.route('/drivers/<int:driver_id>', methods=['PUT'])
@admin_required
def update_driver(driver_id):
    driver = Driver.query.get(driver_id)
    if not driver:
        return jsonify({'error': 'Driver not found'}), 404

    data = request.get_json(silent=True) or {}
    allowed = {
        'driver_id', 'name', 'email', 'phone', 'license_number',
        'license_expiry', 'status', 'risk_level', 'assigned_vehicle_id',
    }
    unknown = set(data) - allowed
    if unknown:
        return jsonify({'error': f"Unsupported driver fields: {', '.join(sorted(unknown))}"}), 400

    values = {}

    if 'driver_id' in data:
        value = clean(data['driver_id']).upper()
        if not DRIVER_ID_RE.fullmatch(value):
            return jsonify({'error': 'Driver ID must use format DR-001.'}), 400
        values['driver_id'] = value
    if 'name' in data:
        value = clean(data['name'])
        if not NAME_RE.fullmatch(value):
            return jsonify({'error': 'Enter a valid driver name.'}), 400
        values['name'] = value
    if data.get('email') and not EMAIL_RE.fullmatch(clean(data['email'])):
        return jsonify({'error': 'Enter a valid email address.'}), 400
    if data.get('phone') and not PHONE_RE.fullmatch(clean(data['phone'])):
        return jsonify({'error': 'Enter a valid Indian phone number.'}), 400
    if data.get('license_number') and not LICENSE_RE.fullmatch(clean(data['license_number']).upper()):
        return jsonify({'error': 'Enter a valid driving license number.'}), 400
    if data.get('status') and data['status'] not in DRIVER_STATUSES:
        return jsonify({'error': 'Invalid driver status.'}), 400
    if data.get('risk_level') and data['risk_level'] not in RISK_LEVELS:
        return jsonify({'error': 'Invalid risk level.'}), 400
    if data.get('license_expiry'):
        try:
            values['license_expiry'] = date.fromisoformat(clean(data['license_expiry']))
        except (TypeError, ValueError):
            return jsonify({'error': 'License expiry must be a valid date.'}), 400

    if 'assigned_vehicle_id' in data:
        raw = data['assigned_vehicle_id']
        if raw in (None, ''):
            values['assigned_vehicle_id'] = None
        else:
            try:
                vehicle = Vehicle.query.get(int(raw))
            except (TypeError, ValueError):
                return jsonify({'error': 'Choose a valid vehicle.'}), 400
            if not vehicle:
                return jsonify({'error': 'Choose a valid vehicle.'}), 404
            if vehicle.current_driver_id not in (None, driver.id):
                return jsonify({'error': 'That vehicle already has another driver assigned.'}), 409
            values['assigned_vehicle_id'] = vehicle.id

    for key, value in data.items():
        if key in allowed and key not in values:
            values[key] = value

    before = {key: getattr(driver, key, None) for key in values}
    for key, value in values.items():
        setattr(driver, key, value)

    conflict = commit_or_conflict('Driver ID, email, or license number already exists.')
    if conflict:
        return conflict

    audit_values = {
        key: (value.isoformat() if hasattr(value, 'isoformat') else value)
        for key, value in values.items()
    }
    record_audit('driver.updated', 'driver', driver.id, {'before': before, 'after': audit_values})
    return jsonify(driver_row(driver)), 200


@fleet_bp.route('/drivers/<int:driver_id>', methods=['DELETE'])
@admin_required
def delete_driver(driver_id):
    driver = Driver.query.get(driver_id)
    if not driver:
        return jsonify({'error': 'Driver not found'}), 404

    name = driver.name
    Journey.query.filter_by(driver_id=driver.id).delete(synchronize_session=False)
    FuelRecord.query.filter_by(driver_id=driver.id).delete(synchronize_session=False)
    DriverBehavior.query.filter_by(driver_id=driver.id).delete(synchronize_session=False)
    RiskPrediction.query.filter_by(driver_id=driver.id).delete(synchronize_session=False)
    Vehicle.query.filter_by(current_driver_id=driver.id).update(
        {Vehicle.current_driver_id: None}, synchronize_session=False
    )
    db.session.delete(driver)
    db.session.commit()

    record_audit('driver.deleted', 'driver', driver_id, {'name': name})
    return jsonify({'message': f'Driver {name} deleted'}), 200

