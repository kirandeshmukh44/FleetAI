from datetime import datetime

from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
from app.models import Vehicle, GPSRecord

tracking_bp = Blueprint('tracking', __name__)

@tracking_bp.route('/', methods=['GET'])
@jwt_required()
def get_tracking_data():
    vehicles = Vehicle.query.all()
    tracking_data = []
    
    for vehicle in vehicles:
        latest_gps = GPSRecord.query.filter_by(vehicle_id=vehicle.id).order_by(GPSRecord.timestamp.desc()).first()
        feed_status = 'NO_DATA'
        age_seconds = None
        if latest_gps:
            age_seconds = max(0, int((datetime.utcnow() - latest_gps.timestamp).total_seconds()))
            feed_status = 'LIVE' if age_seconds <= 120 else 'STALE' if age_seconds <= 3600 else 'HISTORICAL'
        tracking_data.append({
            'vehicle': vehicle.to_dict(),
            'latest_gps': latest_gps.to_dict() if latest_gps else None,
            'feed_status': feed_status,
            'age_seconds': age_seconds,
        })
    
    return jsonify(tracking_data), 200

@tracking_bp.route('/<int:vehicle_id>', methods=['GET'])
@jwt_required()
def get_vehicle_tracking(vehicle_id):
    vehicle = Vehicle.query.get_or_404(vehicle_id)
    gps_records = GPSRecord.query.filter_by(vehicle_id=vehicle_id).order_by(GPSRecord.timestamp.desc()).limit(100).all()
    
    return jsonify({
        'vehicle': vehicle.to_dict(),
        'gps_records': [gps.to_dict() for gps in gps_records]
    }), 200
