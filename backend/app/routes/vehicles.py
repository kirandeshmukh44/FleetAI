from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.models import Vehicle
from app.database.db import db
from sqlalchemy.exc import IntegrityError
from app.utils.auth import current_user_id
import math

vehicles_bp = Blueprint('vehicles', __name__)

@vehicles_bp.route('/', methods=['GET'])
@jwt_required()
def get_vehicles():
    vehicles = Vehicle.query.filter_by(user_id=current_user_id()).all()
    return jsonify([v.to_dict() for v in vehicles]), 200

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
