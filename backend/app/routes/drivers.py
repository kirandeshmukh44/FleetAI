from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.models import Driver
from app.database.db import db
from datetime import date
from sqlalchemy.exc import IntegrityError

drivers_bp = Blueprint('drivers', __name__)

@drivers_bp.route('/', methods=['GET'])
@jwt_required()
def get_drivers():
    drivers = Driver.query.all()
    return jsonify([d.to_dict() for d in drivers]), 200

@drivers_bp.route('/<int:id>', methods=['GET'])
@jwt_required()
def get_driver(id):
    driver = Driver.query.get_or_404(id)
    return jsonify(driver.to_dict()), 200

@drivers_bp.route('/', methods=['POST'])
@jwt_required()
def create_driver():
    data = request.get_json(silent=True) or {}
    missing = [field for field in ('driver_id', 'name') if not str(data.get(field) or '').strip()]
    if missing:
        return jsonify({'error': f"Required fields: {', '.join(missing)}"}), 400
    if data.get('status') and data['status'] not in {'ACTIVE', 'INACTIVE', 'ON_LEAVE'}:
        return jsonify({'error': 'Invalid driver status.'}), 400
    if data.get('risk_level') and data['risk_level'] not in {'LOW', 'MEDIUM', 'HIGH'}:
        return jsonify({'error': 'Invalid risk level.'}), 400
    if data.get('license_expiry'):
        try:
            data['license_expiry'] = date.fromisoformat(data['license_expiry'])
        except (TypeError, ValueError):
            return jsonify({'error': 'License expiry must be a valid date.'}), 400
    allowed = {'driver_id', 'name', 'email', 'phone', 'license_number', 'license_expiry', 'status', 'risk_level'}
    driver = Driver(**{key: value for key, value in data.items() if key in allowed})
    db.session.add(driver)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({'error': 'Driver ID, email, or license number already exists.'}), 409
    return jsonify(driver.to_dict()), 201

@drivers_bp.route('/<int:id>', methods=['PUT'])
@jwt_required()
def update_driver(id):
    driver = Driver.query.get_or_404(id)
    data = request.get_json(silent=True) or {}
    
    if data.get('license_expiry'):
        try:
            data['license_expiry'] = date.fromisoformat(data['license_expiry'])
        except (TypeError, ValueError):
            return jsonify({'error': 'License expiry must be a valid date.'}), 400
    allowed = {'driver_id', 'name', 'email', 'phone', 'license_number', 'license_expiry', 'status', 'risk_level'}
    for key, value in data.items():
        if key in allowed:
            setattr(driver, key, value or None if key in {'email', 'phone', 'license_number', 'license_expiry'} else value)
    
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({'error': 'Driver ID, email, or license number already exists.'}), 409
    return jsonify(driver.to_dict()), 200

@drivers_bp.route('/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_driver(id):
    driver = Driver.query.get_or_404(id)
    db.session.delete(driver)
    db.session.commit()
    return jsonify({'message': 'Driver deleted'}), 200
