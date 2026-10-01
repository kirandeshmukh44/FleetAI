from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.models import Driver
from app.database.db import db

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
    data = request.get_json()
    driver = Driver(**data)
    db.session.add(driver)
    db.session.commit()
    return jsonify(driver.to_dict()), 201

@drivers_bp.route('/<int:id>', methods=['PUT'])
@jwt_required()
def update_driver(id):
    driver = Driver.query.get_or_404(id)
    data = request.get_json()
    
    for key, value in data.items():
        setattr(driver, key, value)
    
    db.session.commit()
    return jsonify(driver.to_dict()), 200

@drivers_bp.route('/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_driver(id):
    driver = Driver.query.get_or_404(id)
    db.session.delete(driver)
    db.session.commit()
    return jsonify({'message': 'Driver deleted'}), 200
