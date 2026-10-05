from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
from app.models import FuelRecord
from app.models import Vehicle
from app.utils.auth import current_user_id
from sqlalchemy import func

fuel_bp = Blueprint('fuel', __name__)

@fuel_bp.route('/', methods=['GET'])
@jwt_required()
def get_fuel_records():
    fuel_records = FuelRecord.query.join(Vehicle).filter(Vehicle.user_id == current_user_id()).all()
    return jsonify([r.to_dict() for r in fuel_records]), 200

@fuel_bp.route('/analytics', methods=['GET'])
@jwt_required()
def get_fuel_analytics():
    # Vehicle-wise fuel consumption
    vehicle_consumption = FuelRecord.query.join(Vehicle).filter(Vehicle.user_id == current_user_id()).with_entities(
        FuelRecord.vehicle_id,
        func.sum(FuelRecord.fuel_consumed).label('total_consumed'),
        func.avg(FuelRecord.fuel_efficiency).label('avg_efficiency')
    ).group_by(FuelRecord.vehicle_id).all()
    
    return jsonify({
        'vehicle_consumption': [
            {
                'vehicle_id': vc[0],
                'total_consumed': float(vc[1] or 0),
                'avg_efficiency': float(vc[2] or 0)
            }
            for vc in vehicle_consumption
        ]
    }), 200
