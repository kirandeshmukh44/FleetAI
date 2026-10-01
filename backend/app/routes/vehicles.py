from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.models import Vehicle
from app.database.db import db

vehicles_bp = Blueprint('vehicles', __name__)

@vehicles_bp.route('/', methods=['GET'])
@jwt_required()
def get_vehicles():
    vehicles = Vehicle.query.all()
    return jsonify([v.to_dict() for v in vehicles]), 200

@vehicles_bp.route('/<int:id>', methods=['GET'])
@jwt_required()
def get_vehicle(id):
    vehicle = Vehicle.query.get_or_404(id)
    return jsonify(vehicle.to_dict()), 200

@vehicles_bp.route('/', methods=['POST'])
@jwt_required()
def create_vehicle():
    data = request.get_json()
    vehicle = Vehicle(**data)
    db.session.add(vehicle)
    db.session.commit()
    return jsonify(vehicle.to_dict()), 201

@vehicles_bp.route('/<int:id>', methods=['PUT'])
@jwt_required()
def update_vehicle(id):
    vehicle = Vehicle.query.get_or_404(id)
    data = request.get_json()
    
    for key, value in data.items():
        setattr(vehicle, key, value)
    
    db.session.commit()
    return jsonify(vehicle.to_dict()), 200

@vehicles_bp.route('/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_vehicle(id):
    vehicle = Vehicle.query.get_or_404(id)
    db.session.delete(vehicle)
    db.session.commit()
    return jsonify({'message': 'Vehicle deleted'}), 200
