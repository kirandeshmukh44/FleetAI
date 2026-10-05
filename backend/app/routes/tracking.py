from datetime import datetime

from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
from app.models import Vehicle, GPSRecord
from app.utils.auth import current_user_id

tracking_bp = Blueprint('tracking', __name__)

@tracking_bp.route('/', methods=['GET'])
@jwt_required()
def get_tracking_data():
    vehicles = Vehicle.query.filter_by(user_id=current_user_id()).all()
    tracking_data = []
    
    from app.models import Journey

    for vehicle in vehicles:
        latest_gps = GPSRecord.query.filter_by(vehicle_id=vehicle.id).order_by(GPSRecord.timestamp.desc()).first()
        active_journey = Journey.query.filter_by(vehicle_id=vehicle.id, status='IN_PROGRESS').order_by(Journey.start_time.desc()).first()

        feed_status = 'NO_DATA'
        age_seconds = None
        if latest_gps:
            age_seconds = max(0, int((datetime.utcnow() - latest_gps.timestamp).total_seconds()))
            feed_status = 'LIVE' if age_seconds <= 120 else 'STALE' if age_seconds <= 3600 else 'HISTORICAL'
        
        gps_data = latest_gps.to_dict() if latest_gps else None
        if not gps_data and vehicle.last_location_lat is not None and vehicle.last_location_lng is not None:
            gps_data = {
                'latitude': vehicle.last_location_lat,
                'longitude': vehicle.last_location_lng,
                'timestamp': vehicle.last_updated.isoformat() if vehicle.last_updated else None,
                'speed': vehicle.current_speed or 0,
                'heading': 0,
            }

        tracking_data.append({
            'vehicle': vehicle.to_dict(),
            'driver': vehicle.driver.to_dict() if vehicle.driver else None,
            'latest_gps': gps_data,
            'active_journey': active_journey.to_dict() if active_journey else None,
            'feed_status': feed_status,
            'age_seconds': age_seconds,
        })
    
    return jsonify(tracking_data), 200

@tracking_bp.route('/<int:vehicle_id>', methods=['GET'])
@jwt_required()
def get_vehicle_tracking(vehicle_id):
    vehicle = Vehicle.query.filter_by(id=vehicle_id, user_id=current_user_id()).first_or_404()
    gps_records = GPSRecord.query.filter_by(vehicle_id=vehicle_id).order_by(GPSRecord.timestamp.desc()).limit(100).all()
    
    return jsonify({
        'vehicle': vehicle.to_dict(),
        'gps_records': [gps.to_dict() for gps in gps_records]
    }), 200
