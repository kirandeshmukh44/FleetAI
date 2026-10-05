from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
from app.models import Vehicle, Driver, Journey, FuelRecord, DriverBehavior, RiskPrediction
from app.utils.auth import current_user_id

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/summary', methods=['GET'])
@jwt_required()
def get_dashboard_summary():
    owner_id = current_user_id()
    total_vehicles = Vehicle.query.filter_by(user_id=owner_id).count()
    active_vehicles = Vehicle.query.filter_by(user_id=owner_id, status='ACTIVE').count()
    total_drivers = Driver.query.filter_by(user_id=owner_id).count()
    high_risk_drivers = Driver.query.filter_by(user_id=owner_id, risk_level='HIGH').count()
    total_journeys = Journey.query.filter_by(user_id=owner_id).count()
    
    # Calculate average fuel efficiency
    fuel_records = FuelRecord.query.join(Vehicle).filter(Vehicle.user_id == owner_id).all()
    valid_efficiencies = [r.fuel_efficiency for r in fuel_records if r.fuel_efficiency and r.fuel_efficiency > 0]
    if not valid_efficiencies:
        # Fallback to journeys if available
        journeys = Journey.query.filter_by(user_id=owner_id).all()
        valid_efficiencies = [round(j.distance / j.fuel_consumed, 1) for j in journeys if (j.distance or 0) > 0 and (j.fuel_consumed or 0) > 0]
    avg_fuel_efficiency = sum(valid_efficiencies) / len(valid_efficiencies) if valid_efficiencies else 12.5
    
    # Count high risk predictions or high risk drivers
    high_risk_predictions = RiskPrediction.query.join(Vehicle).filter(Vehicle.user_id == owner_id, RiskPrediction.risk_level == 'HIGH').count()
    if high_risk_predictions == 0:
        high_risk_predictions = high_risk_drivers
    
    return jsonify({
        'total_vehicles': total_vehicles,
        'active_vehicles': active_vehicles,
        'total_drivers': total_drivers,
        'high_risk_drivers': high_risk_drivers,
        'average_fuel_efficiency': round(avg_fuel_efficiency, 2),
        'risk_alerts': high_risk_predictions,
        'total_journeys': total_journeys
    }), 200
