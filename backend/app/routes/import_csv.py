from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
import pandas as pd
from werkzeug.utils import secure_filename
import os
import tempfile
from app.database.db import db
from app.models import Vehicle, Driver, GPSRecord, Journey, FuelRecord
from app.utils.auth import current_user_id
from datetime import datetime

import_bp = Blueprint('import', __name__)

ALLOWED_EXTENSIONS = {'csv'}


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@import_bp.route('/csv', methods=['POST'])
@jwt_required()
def import_csv():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']
    data_type = request.form.get('data_type')  # vehicles, drivers, gps, journeys, fuel

    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    if file and allowed_file(file.filename):
        suffix = os.path.splitext(secure_filename(file.filename))[1].lower()
        handle, filepath = tempfile.mkstemp(prefix='fleet-import-', suffix=suffix)
        os.close(handle)
        file.save(filepath)

        try:
            df = pd.read_csv(filepath)
            owner_id = current_user_id()

            if data_type == 'vehicles':
                result = import_vehicles(df, owner_id)
            elif data_type == 'drivers':
                result = import_drivers(df, owner_id)
            elif data_type == 'gps':
                result = import_gps(df, owner_id)
            elif data_type == 'journeys':
                result = import_journeys(df, owner_id)
            elif data_type == 'fuel':
                result = import_fuel(df, owner_id)
            else:
                return jsonify({'error': 'Invalid data type'}), 400

            os.remove(filepath)
            return jsonify(result), 200

        except Exception as e:
            try:
                os.remove(filepath)
            except Exception:
                pass
            return jsonify({'error': str(e)}), 400

    return jsonify({'error': 'Invalid file type'}), 400


def import_vehicles(df, owner_id):
    count = 0
    skipped = 0
    for _, row in df.iterrows():
        vehicle_id = str(row.get('vehicle_id') or '').strip()
        reg = str(row.get('registration_number') or '').strip()
        if not vehicle_id or not reg:
            skipped += 1
            continue
        # Skip if this user already has a vehicle with same vehicle_id or registration
        existing = Vehicle.query.filter_by(vehicle_id=vehicle_id).first()
        if existing:
            skipped += 1
            continue
        vehicle = Vehicle(
            user_id=owner_id,
            vehicle_id=vehicle_id,
            registration_number=reg,
            vehicle_type=str(row.get('vehicle_type') or 'Car').strip(),
            make=str(row.get('make') or '').strip() or None,
            model=str(row.get('model') or '').strip() or None,
            year=int(row['year']) if pd.notna(row.get('year')) and str(row.get('year')).strip() else None,
            fuel_type=str(row.get('fuel_type') or '').strip() or None,
            status=str(row.get('status') or 'ACTIVE').strip(),
        )
        db.session.add(vehicle)
        count += 1
    db.session.commit()
    msg = f'Imported {count} vehicles'
    if skipped:
        msg += f' ({skipped} skipped — duplicate or missing required fields)'
    return {'message': msg, 'count': count, 'skipped': skipped}


def import_drivers(df, owner_id):
    count = 0
    skipped = 0
    for _, row in df.iterrows():
        driver_id = str(row.get('driver_id') or '').strip()
        name = str(row.get('name') or '').strip()
        if not driver_id or not name:
            skipped += 1
            continue
        existing = Driver.query.filter_by(driver_id=driver_id).first()
        if existing:
            skipped += 1
            continue
        email = str(row.get('email') or '').strip() or None
        phone = str(row.get('phone') or '').strip() or None
        license_number = str(row.get('license_number') or '').strip() or None
        driver = Driver(
            user_id=owner_id,
            driver_id=driver_id,
            name=name,
            email=email,
            phone=phone,
            license_number=license_number,
            status=str(row.get('status') or 'ACTIVE').strip(),
        )
        db.session.add(driver)
        count += 1
    db.session.commit()
    msg = f'Imported {count} drivers'
    if skipped:
        msg += f' ({skipped} skipped — duplicate or missing required fields)'
    return {'message': msg, 'count': count, 'skipped': skipped}


def import_gps(df, owner_id):
    count = 0
    skipped = 0
    for _, row in df.iterrows():
        # Only match vehicles belonging to this user
        vehicle = Vehicle.query.filter_by(vehicle_id=row.get('vehicle_id'), user_id=owner_id).first()
        if not vehicle:
            skipped += 1
            continue
        try:
            ts = pd.to_datetime(row.get('timestamp'))
            lat = float(row.get('latitude'))
            lng = float(row.get('longitude'))
        except (TypeError, ValueError):
            skipped += 1
            continue

        gps = GPSRecord(
            vehicle_id=vehicle.id,
            timestamp=ts,
            latitude=lat,
            longitude=lng,
            speed=float(row.get('speed') or 0.0),
            heading=float(row.get('heading') or 0.0),
            altitude=float(row.get('altitude') or 0.0),
        )
        vehicle.current_speed = gps.speed or 0
        vehicle.last_location_lat = gps.latitude
        vehicle.last_location_lng = gps.longitude
        vehicle.last_updated = gps.timestamp
        if vehicle.current_speed > 0:
            vehicle.status = 'ACTIVE'
        elif vehicle.status == 'ACTIVE':
            vehicle.status = 'IDLE'
        db.session.add(gps)
        count += 1
    db.session.commit()
    msg = f'Imported {count} GPS records'
    if skipped:
        msg += f' ({skipped} skipped — vehicle not found for this user or invalid data)'
    return {'message': msg, 'count': count, 'skipped': skipped}


def import_journeys(df, owner_id):
    count = 0
    skipped = 0
    for _, row in df.iterrows():
        # Only match vehicles and drivers belonging to this user
        vehicle = Vehicle.query.filter_by(vehicle_id=row.get('vehicle_id'), user_id=owner_id).first()
        driver = Driver.query.filter_by(driver_id=row.get('driver_id'), user_id=owner_id).first()

        if not vehicle or not driver:
            skipped += 1
            continue

        journey_id = str(row.get('journey_id') or '').strip()
        if not journey_id:
            skipped += 1
            continue

        existing = Journey.query.filter_by(journey_id=journey_id).first()
        if existing:
            skipped += 1
            continue

        try:
            start_time = pd.to_datetime(row.get('start_time'))
            end_time = pd.to_datetime(row.get('end_time')) if pd.notna(row.get('end_time')) else None
        except (TypeError, ValueError):
            skipped += 1
            continue

        journey = Journey(
            user_id=owner_id,
            journey_id=journey_id,
            vehicle_id=vehicle.id,
            driver_id=driver.id,
            start_time=start_time,
            end_time=end_time,
            start_location=str(row.get('start_location') or '').strip(),
            end_location=str(row.get('end_location') or '').strip(),
            distance=float(row.get('distance') or 0.0),
            duration=float(row.get('duration') or 0.0),
            fuel_consumed=float(row.get('fuel_consumed') or 0.0),
            average_speed=float(row.get('average_speed') or 0.0),
            max_speed=float(row.get('max_speed') or 0.0),
            status=str(row.get('status') or 'COMPLETED').strip(),
        )
        db.session.add(journey)
        count += 1
    db.session.commit()
    msg = f'Imported {count} journeys'
    if skipped:
        msg += f' ({skipped} skipped — vehicle/driver not found for this user, duplicate ID, or invalid data)'
    return {'message': msg, 'count': count, 'skipped': skipped}


def import_fuel(df, owner_id):
    count = 0
    skipped = 0
    for _, row in df.iterrows():
        # Only match vehicles belonging to this user
        vehicle = Vehicle.query.filter_by(vehicle_id=row.get('vehicle_id'), user_id=owner_id).first()
        if not vehicle:
            skipped += 1
            continue

        driver = None
        if row.get('driver_id'):
            driver = Driver.query.filter_by(driver_id=row.get('driver_id'), user_id=owner_id).first()

        try:
            ts = pd.to_datetime(row.get('timestamp'))
            fuel_level = float(row.get('fuel_level') or 0.0)
        except (TypeError, ValueError):
            skipped += 1
            continue

        fuel = FuelRecord(
            vehicle_id=vehicle.id,
            driver_id=driver.id if driver else None,
            timestamp=ts,
            fuel_level=fuel_level,
            fuel_consumed=float(row.get('fuel_consumed') or 0.0),
            distance_traveled=float(row.get('distance_traveled') or 0.0),
            fuel_efficiency=float(row.get('fuel_efficiency') or 0.0),
        )
        db.session.add(fuel)
        count += 1
    db.session.commit()
    msg = f'Imported {count} fuel records'
    if skipped:
        msg += f' ({skipped} skipped — vehicle not found for this user or invalid data)'
    return {'message': msg, 'count': count, 'skipped': skipped}
