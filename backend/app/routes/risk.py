from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.models import RiskPrediction, Driver, Vehicle, DriverBehavior
from app.database.db import db
from app.ml.prediction import risk_predictor
from app.utils.auth import current_user_id
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
        return jsonify({
            'available': risk_predictor.is_loaded,
            'training_status': 'No training metadata found',
            'source': None,
            'limitations': ['No verified training report is available.'],
        }), 200
    try:
        metadata = joblib.load(path)
    except Exception as error:
        return jsonify({
            'available': False,
            'training_status': 'Training metadata could not be read',
            'source': None,
            'error': str(error),
        }), 200
    metrics = metadata.get('metrics', {})
    positive_count = metadata.get('class_counts', {}).get('HIGH', 0)
    rows_used = metadata.get('rows_used', 0)
    anomaly_rate = positive_count / rows_used if rows_used else None
    average_precision = metrics.get('high_average_precision')
    weak_signal = average_precision is not None and anomaly_rate is not None and average_precision <= anomaly_rate + 0.03
    return jsonify({
        'available': risk_predictor.is_loaded,
        'training_status': 'Loaded development model' if risk_predictor.is_loaded else 'Model artifacts unavailable',
        'model_name': metadata.get('model_name'),
        'source': metadata.get('source'),
        'label': metadata.get('label'),
        'label_description': metadata.get('label_description'),
        'rows_used': metadata.get('rows_used'),
        'train_rows': metadata.get('train_rows'),
        'holdout_rows': metadata.get('holdout_rows'),
        'class_counts': metadata.get('class_counts'),
        'anomaly_rate': anomaly_rate,
        'driver_count': metadata.get('driver_count'),
        'vehicle_count': metadata.get('vehicle_count'),
        'period_start': metadata.get('period_start'),
        'period_end': metadata.get('period_end'),
        'holdout_method': metadata.get('holdout_method'),
        'features': metadata.get('features', []),
        'feature_importance': metadata.get('feature_importance', {}),
        'metrics': metrics,
        'signal_quality': 'weak' if weak_signal else ('unverified' if average_precision is None else 'measurable'),
        'limitations': metadata.get('limitations', []),
        'trained_at': metadata.get('trained_at'),
    }), 200

@risk_bp.route('/predict', methods=['POST'])
@jwt_required()
def predict_risk():
    data = request.get_json(silent=True) or {}
    try:
        driver_id = int(data.get('driver_id'))
        vehicle_id = int(data.get('vehicle_id'))
    except (TypeError, ValueError):
        return jsonify({'error': 'Choose a valid driver and vehicle.'}), 400
    
    # Get driver and vehicle data for features
    owner_id = current_user_id()
    driver = Driver.query.filter_by(id=driver_id, user_id=owner_id).first()
    vehicle = Vehicle.query.filter_by(id=vehicle_id, user_id=owner_id).first()
    
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
    
    result = prediction.to_dict()
    result['input_features'] = features
    result['prediction_source'] = 'latest saved GPS and behavior records, with driver profile fallbacks'
    result['data_freshness'] = latest_gps.timestamp.isoformat() if latest_gps else None
    result['is_fallback'] = prediction_result.get('is_fallback', False)
    return jsonify(result), 201

@risk_bp.route('/history', methods=['GET'])
@jwt_required()
def get_risk_history():
    predictions = RiskPrediction.query.join(Vehicle).filter(Vehicle.user_id == current_user_id()).order_by(RiskPrediction.prediction_timestamp.desc()).limit(100).all()
    return jsonify([p.to_dict() for p in predictions]), 200
