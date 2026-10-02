from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.models import Journey, Vehicle, Driver
from app.database.db import db
import math

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
    from datetime import datetime, timezone
    from sqlalchemy.exc import IntegrityError

    data = request.get_json(silent=True) or {}
    required = ('journey_id', 'vehicle_id', 'driver_id', 'start_location', 'end_location', 'start_time')
    missing = [field for field in required if not str(data.get(field) or '').strip()]
    if missing:
        return jsonify({'error': f"Required fields: {', '.join(missing)}"}), 400

    journey_id = str(data['journey_id']).strip()
    if Journey.query.filter_by(journey_id=journey_id).first():
        return jsonify({'error': 'Journey ID already exists. Choose another ID.'}), 409

    try:
        vehicle_id = int(data['vehicle_id'])
        driver_id = int(data['driver_id'])
    except (TypeError, ValueError):
        return jsonify({'error': 'Choose a valid vehicle and driver.'}), 400

    vehicle = db.session.get(Vehicle, vehicle_id)
    driver = db.session.get(Driver, driver_id)
    if not vehicle:
        return jsonify({'error': 'Selected vehicle was not found. Refresh the vehicle list.'}), 404
    if not driver:
        return jsonify({'error': 'Selected driver was not found. Refresh the driver list.'}), 404

    def parse_datetime(value, field):
        try:
            parsed = datetime.fromisoformat(str(value).replace('Z', '+00:00'))
            if parsed.tzinfo:
                parsed = parsed.astimezone(timezone.utc).replace(tzinfo=None)
            return parsed
        except (TypeError, ValueError):
            raise ValueError(f'{field} must be a valid date and time.')

    try:
        start_time = parse_datetime(data['start_time'], 'Departure time')
        end_time = parse_datetime(data['end_time'], 'Arrival time') if data.get('end_time') else None
        if end_time and end_time <= start_time:
            return jsonify({'error': 'Arrival time must be later than departure time.'}), 400
        numbers = {}
        for key in ('distance', 'duration', 'fuel_consumed', 'average_speed', 'max_speed'):
            value = data.get(key)
            if value in (None, ''):
                numbers[key] = 0.0
            else:
                numbers[key] = float(value)
                if not math.isfinite(numbers[key]) or numbers[key] < 0:
                    return jsonify({'error': f'{key.replace("_", " ").capitalize()} must be a finite, nonnegative number.'}), 400
        if numbers['distance'] > 0 and numbers['duration'] <= 0:
            return jsonify({'error': 'Duration must be greater than zero when distance is provided.'}), 400
    except (TypeError, ValueError) as error:
        return jsonify({'error': str(error)}), 400

    status = data.get('status') or 'IN_PROGRESS'
    if status not in {'IN_PROGRESS', 'COMPLETED', 'CANCELLED'}:
        return jsonify({'error': 'Invalid journey status.'}), 400

    journey = Journey(
        journey_id=journey_id,
        vehicle_id=vehicle.id,
        driver_id=driver.id,
        start_time=start_time,
        end_time=end_time,
        start_location=str(data['start_location']).strip(),
        end_location=str(data['end_location']).strip(),
        status=status,
        **numbers,
    )
    db.session.add(journey)

    if status == 'IN_PROGRESS':
        vehicle.status = 'ACTIVE'
        vehicle.current_driver_id = driver.id
        driver.status = 'ACTIVE'
        driver.assigned_vehicle_id = vehicle.id
        driver.total_journeys = (driver.total_journeys or 0) + 1

    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({'error': 'Journey ID already exists. Choose another ID.'}), 409
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
