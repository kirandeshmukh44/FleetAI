from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required
import pandas as pd
from werkzeug.utils import secure_filename
import os
import tempfile
from app.database.db import db
from app.models import Vehicle, Driver, GPSRecord, Journey, FuelRecord
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
            
            if data_type == 'vehicles':
                result = import_vehicles(df)
            elif data_type == 'drivers':
                result = import_drivers(df)
            elif data_type == 'gps':
                result = import_gps(df)
            elif data_type == 'journeys':
                result = import_journeys(df)
            elif data_type == 'fuel':
                result = import_fuel(df)
            else:
                return jsonify({'error': 'Invalid data type'}), 400
            
            os.remove(filepath)
            return jsonify(result), 200
            
        except Exception as e:
            os.remove(filepath)
            return jsonify({'error': str(e)}), 400
    
    return jsonify({'error': 'Invalid file type'}), 400

def import_vehicles(df):
    count = 0
    for _, row in df.iterrows():
        vehicle = Vehicle(
            vehicle_id=row.get('vehicle_id'),
            registration_number=row.get('registration_number'),
            vehicle_type=row.get('vehicle_type'),
            make=row.get('make'),
            model=row.get('model'),
            year=row.get('year'),
            fuel_type=row.get('fuel_type'),
            status=row.get('status', 'ACTIVE')
        )
        db.session.add(vehicle)
        count += 1
    db.session.commit()
    return {'message': f'Imported {count} vehicles', 'count': count}

def import_drivers(df):
    count = 0
    for _, row in df.iterrows():
        driver = Driver(
            driver_id=row.get('driver_id'),
            name=row.get('name'),
            email=row.get('email'),
            phone=row.get('phone'),
            license_number=row.get('license_number'),
            status=row.get('status', 'ACTIVE')
        )
        db.session.add(driver)
        count += 1
    db.session.commit()
    return {'message': f'Imported {count} drivers', 'count': count}

def import_gps(df):
    count = 0
    for _, row in df.iterrows():
        vehicle = Vehicle.query.filter_by(vehicle_id=row.get('vehicle_id')).first()
        if vehicle:
            gps = GPSRecord(
                vehicle_id=vehicle.id,
                timestamp=pd.to_datetime(row.get('timestamp')),
                latitude=row.get('latitude'),
                longitude=row.get('longitude'),
                speed=row.get('speed', 0.0),
                heading=row.get('heading', 0.0)
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
    return {'message': f'Imported {count} GPS records', 'count': count}

def import_journeys(df):
    count = 0
    for _, row in df.iterrows():
        vehicle = Vehicle.query.filter_by(vehicle_id=row.get('vehicle_id')).first()
        driver = Driver.query.filter_by(driver_id=row.get('driver_id')).first()
        
        if vehicle and driver:
            journey = Journey(
                journey_id=row.get('journey_id'),
                vehicle_id=vehicle.id,
                driver_id=driver.id,
                start_time=pd.to_datetime(row.get('start_time')),
                end_time=pd.to_datetime(row.get('end_time')) if pd.notna(row.get('end_time')) else None,
                start_location=row.get('start_location'),
                end_location=row.get('end_location'),
                distance=row.get('distance', 0.0),
                duration=row.get('duration', 0.0),
                status=row.get('status', 'COMPLETED')
            )
            db.session.add(journey)
            count += 1
    db.session.commit()
    return {'message': f'Imported {count} journeys', 'count': count}

def import_fuel(df):
    count = 0
    for _, row in df.iterrows():
        vehicle = Vehicle.query.filter_by(vehicle_id=row.get('vehicle_id')).first()
        driver = Driver.query.filter_by(driver_id=row.get('driver_id')).first() if row.get('driver_id') else None
        
        if vehicle:
            fuel = FuelRecord(
                vehicle_id=vehicle.id,
                driver_id=driver.id if driver else None,
                timestamp=pd.to_datetime(row.get('timestamp')),
                fuel_level=row.get('fuel_level'),
                fuel_consumed=row.get('fuel_consumed', 0.0),
                distance_traveled=row.get('distance_traveled', 0.0),
                fuel_efficiency=row.get('fuel_efficiency', 0.0)
            )
            db.session.add(fuel)
            count += 1
    db.session.commit()
    return {'message': f'Imported {count} fuel records', 'count': count}
