from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.models import RiskPrediction, Driver, Vehicle, DriverBehavior
from app.database.db import db
from app.ml.prediction import risk_predictor
import json
import joblib
import os

risk_bp = Blueprint('risk', __name__)

@risk_bp.route('/model-info', methods=['GET'])
@jwt_required()
def get_model_info():
    backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
    path = os.path.join(backend_dir, 'trained_models', 'training_metadata.pkl')
    if not os.path.exists(path):
        return jsonify({'available': risk_predictor.is_loaded, 'source': None}), 200
    metadata = joblib.load(path)
    return jsonify({
        'available': risk_predictor.is_loaded,
        'source': metadata.get('source'),
        'label': metadata.get('label'),
        'rows_used': metadata.get('rows_used'),
        'accuracy': metadata.get('metrics', {}).get('accuracy'),
        'f1_score': metadata.get('metrics', {}).get('f1_score'),
    }), 200

@risk_bp.route('/predict', methods=['POST'])
@jwt_required()
def predict_risk():
    data = request.get_json(silent=True) or {}
    driver_id = data.get('driver_id')
    vehicle_id = data.get('vehicle_id')
    
    # Get driver and vehicle data for features
    driver = Driver.query.get(driver_id)
    vehicle = Vehicle.query.get(vehicle_id)
    
    if not driver or not vehicle:
        return jsonify({'error': 'Driver or vehicle not found'}), 404
    
    # Prepare features for prediction
    from app.models import GPSRecord
    latest_gps = GPSRecord.query.filter_by(vehicle_id=vehicle.id).order_by(GPSRecord.timestamp.desc()).first()
    latest_behavior = DriverBehavior.query.filter_by(driver_id=driver.id, vehicle_id=vehicle.id).order_by(DriverBehavior.timestamp.desc()).first()
    speed = latest_gps.speed if latest_gps else (vehicle.current_speed or 0)
    features = {
        'speed': speed,
        'acceleration': latest_behavior.acceleration if latest_behavior else 0,
        'braking': latest_behavior.braking if latest_behavior else 0,
        'harsh_braking': int(latest_behavior.harsh_braking if latest_behavior else driver.harsh_braking_count > 5),
        'harsh_acceleration': int(latest_behavior.harsh_acceleration if latest_behavior else driver.harsh_acceleration_count > 5),
        'speeding': int((latest_behavior.speeding if latest_behavior else False) or speed > 80)
    }
    
    # Get prediction from ML model
    prediction_result = risk_predictor.predict_risk(features)
    
    # Calculate contributing factors
    contributing_factors = []
    if features['speed'] > 80:
        contributing_factors.append('Excessive speed')
    if features['harsh_braking']:
        contributing_factors.append('Frequent harsh braking')
    if features['harsh_acceleration']:
        contributing_factors.append('Frequent harsh acceleration')
    if driver.risk_score > 50:
        contributing_factors.append('High historical risk score')
    
    # Create prediction record
    prediction = RiskPrediction(
        driver_id=driver_id,
        vehicle_id=vehicle_id,
        risk_probability=prediction_result['risk_probability'],
        risk_level=prediction_result['risk_level'],
        model_used=prediction_result['model_used'],
        contributing_factors=json.dumps(contributing_factors),
        speed_score=min(features['speed'] / 100, 1.0),
        acceleration_score=0.5,  # Placeholder
        braking_score=0.3 if features['harsh_braking'] else 0.1,
        behavior_score=driver.risk_score / 100,
        historical_risk_score=driver.risk_score / 100
    )
    
    db.session.add(prediction)
    db.session.commit()
    
    return jsonify(prediction.to_dict()), 201

@risk_bp.route('/history', methods=['GET'])
@jwt_required()
def get_risk_history():
    predictions = RiskPrediction.query.order_by(RiskPrediction.prediction_timestamp.desc()).limit(100).all()
    return jsonify([p.to_dict() for p in predictions]), 200
