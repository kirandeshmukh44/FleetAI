from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
from app.models import Vehicle, Driver, Journey, FuelRecord, DriverBehavior, RiskPrediction

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/summary', methods=['GET'])
@jwt_required()
def get_dashboard_summary():
    total_vehicles = Vehicle.query.count()
    active_vehicles = Vehicle.query.filter_by(status='ACTIVE').count()
    total_drivers = Driver.query.count()
    high_risk_drivers = Driver.query.filter_by(risk_level='HIGH').count()
    total_journeys = Journey.query.count()
    
    # Calculate average fuel efficiency
    fuel_records = FuelRecord.query.all()
    valid_efficiencies = [r.fuel_efficiency for r in fuel_records if r.fuel_efficiency and r.fuel_efficiency > 0]
    avg_fuel_efficiency = sum(valid_efficiencies) / len(valid_efficiencies) if valid_efficiencies else 0
    
    # Count high risk predictions
    high_risk_predictions = RiskPrediction.query.filter_by(risk_level='HIGH').count()
    
    return jsonify({
        'total_vehicles': total_vehicles,
        'active_vehicles': active_vehicles,
        'total_drivers': total_drivers,
        'high_risk_drivers': high_risk_drivers,
        'average_fuel_efficiency': round(avg_fuel_efficiency, 2),
        'risk_alerts': high_risk_predictions,
        'total_journeys': total_journeys
    }), 200
