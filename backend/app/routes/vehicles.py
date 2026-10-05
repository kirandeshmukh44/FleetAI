from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.models import Vehicle
from app.database.db import db
from sqlalchemy.exc import IntegrityError
from app.utils.auth import current_user_id
from app.utils.validation import REGISTRATION_RE, VEHICLE_ID_RE, clean
import math

vehicles_bp = Blueprint('vehicles', __name__)

@vehicles_bp.route('/', methods=['GET'])
@jwt_required()
def get_vehicles():
    from app.models import Journey
    vehicles = Vehicle.query.filter_by(user_id=current_user_id()).all()
    result = []
    for v in vehicles:
        data = v.to_dict()
        # If speed is 0 but status is ACTIVE, fetch active journey speed or simulate active operating speed
        if (data.get('current_speed') or 0) <= 0 and data.get('status') == 'ACTIVE':
            active_journey = Journey.query.filter_by(vehicle_id=v.id, status='IN_PROGRESS').first()
            if active_journey and (active_journey.average_speed or 0) > 0:
                data['current_speed'] = active_journey.average_speed
            else:
                vtype = (v.vehicle_type or 'Car').lower()
                data['current_speed'] = 45.0 if 'truck' in vtype else 50.0 if 'bus' in vtype else 55.0
        result.append(data)
    return jsonify(result), 200

@vehicles_bp.route('/<int:id>', methods=['GET'])
@jwt_required()
def get_vehicle(id):
    vehicle = Vehicle.query.filter_by(id=id, user_id=current_user_id()).first_or_404()
    return jsonify(vehicle.to_dict()), 200

@vehicles_bp.route('/', methods=['POST'])
@jwt_required()
def create_vehicle():
    data = request.get_json(silent=True) or {}
    required = ('vehicle_id', 'registration_number', 'vehicle_type')
    missing = [field for field in required if not str(data.get(field) or '').strip()]
    if missing:
        return jsonify({'error': f"Required fields: {', '.join(missing)}"}), 400
    data['vehicle_id'] = clean(data['vehicle_id']).upper()
    data['registration_number'] = clean(data['registration_number']).upper()
    if not VEHICLE_ID_RE.fullmatch(data['vehicle_id']):
        return jsonify({'error': 'Vehicle ID must use format VH-001.'}), 400
    if not REGISTRATION_RE.fullmatch(data['registration_number']):
        return jsonify({'error': 'Registration number must use a valid format such as MH12AB1234.'}), 400
    if data.get('vehicle_type') not in {'Truck', 'Van', 'Bus', 'Car', 'Motorcycle', 'Other'}:
        return jsonify({'error': 'Choose a valid vehicle type.'}), 400
    if data.get('fuel_type') and data['fuel_type'] not in {'Petrol', 'Diesel', 'Electric', 'CNG', 'LPG', 'Hybrid'}:
        return jsonify({'error': 'Choose a valid fuel type.'}), 400
    if data.get('status') and data['status'] not in {'ACTIVE', 'IDLE', 'STOPPED', 'OFFLINE'}:
        return jsonify({'error': 'Invalid vehicle status.'}), 400
    try:
        if data.get('year') not in (None, ''):
            data['year'] = int(data['year'])
            if not 1900 <= data['year'] <= 2100:
                return jsonify({'error': 'Vehicle year must be between 1900 and 2100.'}), 400
        if data.get('fuel_level') not in (None, ''):
            data['fuel_level'] = float(data['fuel_level'])
            if not math.isfinite(data['fuel_level']) or not 0 <= data['fuel_level'] <= 100:
                return jsonify({'error': 'Fuel level must be between 0 and 100.'}), 400
    except (TypeError, ValueError):
        return jsonify({'error': 'Year and fuel level must be valid numbers.'}), 400
    allowed = {'vehicle_id', 'registration_number', 'vehicle_type', 'make', 'model', 'year', 'fuel_type', 'status', 'fuel_level'}
    vehicle = Vehicle(user_id=current_user_id(), **{key: value for key, value in data.items() if key in allowed})
    db.session.add(vehicle)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({'error': 'Vehicle ID or registration number already exists.'}), 409
    return jsonify(vehicle.to_dict()), 201

@vehicles_bp.route('/<int:id>', methods=['PUT'])
@jwt_required()
def update_vehicle(id):
    vehicle = Vehicle.query.filter_by(id=id, user_id=current_user_id()).first_or_404()
    data = request.get_json(silent=True) or {}
    
    allowed = {'vehicle_id', 'registration_number', 'vehicle_type', 'make', 'model', 'year', 'fuel_type', 'status', 'fuel_level'}
    unknown = set(data) - allowed
    if unknown:
        return jsonify({'error': f"Unsupported vehicle fields: {', '.join(sorted(unknown))}"}), 400
    if 'vehicle_id' in data:
        data['vehicle_id'] = clean(data['vehicle_id']).upper()
        if not VEHICLE_ID_RE.fullmatch(data['vehicle_id']):
            return jsonify({'error': 'Vehicle ID must use format VH-001.'}), 400
    if 'registration_number' in data:
        data['registration_number'] = clean(data['registration_number']).upper()
        if not REGISTRATION_RE.fullmatch(data['registration_number']):
            return jsonify({'error': 'Registration number must use a valid format such as MH12AB1234.'}), 400
    if 'vehicle_type' in data and data['vehicle_type'] not in {'Truck', 'Van', 'Bus', 'Car', 'Motorcycle', 'Other'}:
        return jsonify({'error': 'Choose a valid vehicle type.'}), 400
    if 'fuel_type' in data and data['fuel_type'] not in {None, '', 'Petrol', 'Diesel', 'Electric', 'CNG', 'LPG', 'Hybrid'}:
        return jsonify({'error': 'Choose a valid fuel type.'}), 400
    try:
        if 'year' in data and data['year'] not in (None, ''):
            data['year'] = int(data['year'])
            if not 1900 <= data['year'] <= 2100:
                return jsonify({'error': 'Vehicle year must be between 1900 and 2100.'}), 400
        if 'fuel_level' in data and data['fuel_level'] not in (None, ''):
            data['fuel_level'] = float(data['fuel_level'])
            if not math.isfinite(data['fuel_level']) or not 0 <= data['fuel_level'] <= 100:
                return jsonify({'error': 'Fuel level must be between 0 and 100.'}), 400
    except (TypeError, ValueError):
        return jsonify({'error': 'Year and fuel level must be valid numbers.'}), 400
    for key, value in data.items():
        setattr(vehicle, key, value)
    
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({'error': 'Vehicle ID or registration number already exists.'}), 409
    return jsonify(vehicle.to_dict()), 200

@vehicles_bp.route('/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_vehicle(id):
    vehicle = Vehicle.query.filter_by(id=id, user_id=current_user_id()).first_or_404()
    db.session.delete(vehicle)
    db.session.commit()
    return jsonify({'message': 'Vehicle deleted'}), 200
