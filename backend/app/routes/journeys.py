from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.models import Journey
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
