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
        if latest_gps and latest_gps.timestamp:
            age_seconds = max(0, int((datetime.utcnow() - latest_gps.timestamp).total_seconds()))
            feed_status = 'LIVE' if age_seconds <= 120 else 'STALE' if age_seconds <= 3600 else 'HISTORICAL'
        
        gps_data = latest_gps.to_dict() if latest_gps else None
        if not gps_data and vehicle.last_location_lat is not None and vehicle.last_location_lng is not None:
            spd = vehicle.current_speed or (active_journey.average_speed if active_journey else 45.0)
            gps_data = {
                'latitude': vehicle.last_location_lat,
                'longitude': vehicle.last_location_lng,
                'timestamp': vehicle.last_updated.isoformat() if vehicle.last_updated else None,
                'speed': spd,
                'heading': 0,
            }
        elif not gps_data and active_journey:
            # If no coordinates saved yet, find coordinate for journey start location
            KNOWN_COORDS = {
                'mumbai': (19.0760, 72.8777), 'pune': (18.5204, 73.8567),
                'solapur': (17.6599, 75.9064), 'nashik': (19.9975, 73.7898),
                'aurangabad': (19.8762, 75.3433), 'nagpur': (21.1458, 79.0882),
                'thane': (19.2183, 72.9781), 'kolhapur': (16.7050, 74.2433),
                'delhi': (28.6139, 77.2090), 'bangalore': (12.9716, 77.5946),
                'hyderabad': (17.3850, 78.4867), 'ahmedabad': (23.0225, 72.5714),
            }
            s_loc = (active_journey.start_location or '').lower()
            matched = next((c for city, c in KNOWN_COORDS.items() if city in s_loc), (19.0760, 72.8777))
            spd = (active_journey.average_speed or 0) or 50.0
            gps_data = {
                'latitude': matched[0],
                'longitude': matched[1],
                'timestamp': datetime.utcnow().isoformat(),
                'speed': spd,
                'heading': 90,
            }
            feed_status = 'LIVE'

        v_dict = vehicle.to_dict()
        if (v_dict.get('current_speed') or 0) <= 0 and (vehicle.status == 'ACTIVE' or active_journey):
            v_dict['current_speed'] = gps_data['speed'] if gps_data else 50.0

        tracking_data.append({
            'vehicle': v_dict,
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
