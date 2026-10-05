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
    
    result = [
        {
            'vehicle_id': vc[0],
            'total_consumed': float(vc[1] or 0),
            'avg_efficiency': float(vc[2] or 0)
        }
        for vc in vehicle_consumption
    ]
    
    # If no FuelRecord exists, aggregate directly from Journey records
    if not result:
        from app.models import Journey
        journeys = Journey.query.filter_by(user_id=current_user_id()).all()
        by_veh = {}
        for j in journeys:
            v_id = j.vehicle.vehicle_id if j.vehicle else f"Vehicle #{j.vehicle_id}"
            if v_id not in by_veh:
                by_veh[v_id] = {'consumed': 0.0, 'dist': 0.0}
            by_veh[v_id]['consumed'] += (j.fuel_consumed or 0.0)
            by_veh[v_id]['dist'] += (j.distance or 0.0)
        result = [
            {
                'vehicle_id': vid,
                'total_consumed': round(v['consumed'], 1),
                'avg_efficiency': round(v['dist'] / v['consumed'], 1) if v['consumed'] > 0 else 12.0
            }
            for vid, v in by_veh.items()
        ]
        
    return jsonify({'vehicle_consumption': result}), 200
