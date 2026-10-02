from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.models import Journey, Vehicle, Driver, GPSRecord
from app.database.db import db

journeys_bp = Blueprint('journeys', __name__)

@journeys_bp.route('/', methods=['GET'])
@jwt_required()
def get_journeys():
    journeys = Journey.query.order_by(Journey.start_time.desc()).all()
    return jsonify([j.to_dict() for j in journeys]), 200

@journeys_bp.route('/<int:id>', methods=['GET'])
@jwt_required()
def get_journey(id):
    journey = Journey.query.get_or_404(id)
    return jsonify(journey.to_dict()), 200

@journeys_bp.route('/', methods=['POST'])
@jwt_required()
def create_journey():
    data = request.get_json(silent=True) or {}
    required = ['journey_id', 'vehicle_id', 'driver_id', 'start_time']
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({'error': f'Missing required fields: {", ".join(missing)}'}), 400

    if Journey.query.filter_by(journey_id=data['journey_id']).first():
        return jsonify({'error': 'Journey ID already exists'}), 400

    from datetime import datetime
    if isinstance(data.get('start_time'), str):
        try:
            data['start_time'] = datetime.fromisoformat(data['start_time'].replace('Z', '+00:00'))
        except ValueError:
            return jsonify({'error': 'Invalid start_time format'}), 400

    if data.get('end_time') and isinstance(data['end_time'], str):
        try:
            data['end_time'] = datetime.fromisoformat(data['end_time'].replace('Z', '+00:00'))
        except ValueError:
            return jsonify({'error': 'Invalid end_time format'}), 400

    journey = Journey(**{k: v for k, v in data.items() if hasattr(Journey, k)})
    db.session.add(journey)

    from datetime import datetime
    now_dt = datetime.utcnow()

    # Pre-defined city coordinates map for real-time tracking
    CITY_COORDS = {
        'mumbai': (19.0760, 72.8777),
        'pune': (18.5204, 73.8567),
        'solapur': (17.6599, 75.9064),
        'nashik': (19.9975, 73.7898),
        'aurangabad': (19.8762, 75.3433),
        'nagpur': (21.1458, 79.0882),
        'thane': (19.2183, 72.9781),
        'kolhapur': (16.7050, 74.2433),
        'delhi': (28.6139, 77.2090),
        'bangalore': (12.9716, 77.5946),
        'hyderabad': (17.3850, 78.4867),
        'ahmedabad': (23.0225, 72.5714),
        'chennai': (13.0827, 80.2707),
        'kolkata': (22.5726, 88.3639)
    }

    start_loc_clean = (data.get('start_location') or '').strip().lower()
    start_coords = None
    for city_key, coords in CITY_COORDS.items():
        if city_key in start_loc_clean:
            start_coords = coords
            break

    if vehicle and data.get('status') == 'IN_PROGRESS':
        vehicle.status = 'ACTIVE'
        vehicle.current_driver_id = driver.id if driver else vehicle.current_driver_id
        if start_coords:
            vehicle.last_location_lat = start_coords[0]
            vehicle.last_location_lng = start_coords[1]
        vehicle.last_updated = now_dt

        speed_val = 52.0
        if data.get('average_speed'):
            speed_val = float(data['average_speed'])
        elif data.get('distance') and data.get('duration') and float(data['duration']) > 0:
            speed_val = round((float(data['distance']) / float(data['duration'])) * 60, 1)
        vehicle.current_speed = speed_val

        # Create live GPS record for this vehicle and journey
        if vehicle.last_location_lat and vehicle.last_location_lng:
            gps = GPSRecord(
                vehicle_id=vehicle.id,
                journey_id=journey.id,
                timestamp=now_dt,
                latitude=vehicle.last_location_lat,
                longitude=vehicle.last_location_lng,
                speed=speed_val,
                heading=90.0,
                altitude=25.0,
                accuracy=5.0
            )
            db.session.add(gps)
    
    if driver and data.get('status') == 'IN_PROGRESS':
        driver.status = 'ACTIVE'
        driver.assigned_vehicle_id = vehicle.id if vehicle else driver.assigned_vehicle_id
        driver.total_journeys = (driver.total_journeys or 0) + 1

    db.session.commit()
    return jsonify(journey.to_dict()), 201

@journeys_bp.route('/<int:id>', methods=['PUT'])
@jwt_required()
def update_journey(id):
    journey = Journey.query.get_or_404(id)
    data = request.get_json(silent=True) or {}

    from datetime import datetime
    for key in ('start_time', 'end_time'):
        if data.get(key) and isinstance(data[key], str):
            try:
                data[key] = datetime.fromisoformat(data[key].replace('Z', '+00:00'))
            except ValueError:
                return jsonify({'error': f'Invalid {key} format'}), 400

    for key, value in data.items():
        if hasattr(Journey, key) and key not in ('id', 'created_at'):
            setattr(journey, key, value)

    db.session.commit()
    return jsonify(journey.to_dict()), 200

@journeys_bp.route('/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_journey(id):
    journey = Journey.query.get_or_404(id)
    db.session.delete(journey)
    db.session.commit()
    return jsonify({'message': 'Journey deleted'}), 200
