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
    
    import random
    from app.database.db import db
    from app.models import Journey

    now = datetime.utcnow()

    # Pre-defined city coordinates map
    CITY_COORDS = {
        'mumbai': (19.0760, 72.8777),
        'pune': (18.5204, 73.8567),
        'solapur': (17.6599, 75.9064),
        'nashik': (19.9975, 73.7898),
        'aurangabad': (19.8762, 75.3433),
        'nagpur': (21.1458, 79.0882),
        'thane': (19.2183, 72.9781),
        'kolhapur': (16.7050, 74.2433),
        'delhi': (28.6139, 77.2090),
        'bangalore': (12.9716, 77.5946),
        'hyderabad': (17.3850, 78.4867),
        'ahmedabad': (23.0225, 72.5714),
        'chennai': (13.0827, 80.2707),
        'kolkata': (22.5726, 88.3639)
    }

    for vehicle in vehicles:
        latest_gps = GPSRecord.query.filter_by(vehicle_id=vehicle.id).order_by(GPSRecord.timestamp.desc()).first()
        
        # If vehicle is active or has an in-progress journey, gently simulate movement along journey direction
        active_journey = Journey.query.filter_by(vehicle_id=vehicle.id, status='IN_PROGRESS').order_by(Journey.start_time.desc()).first()
        if (vehicle.status == 'ACTIVE' or active_journey):
            base_lat = vehicle.last_location_lat or (latest_gps.latitude if latest_gps else 19.0760)
            base_lng = vehicle.last_location_lng or (latest_gps.longitude if latest_gps else 72.8777)
            
            # Determine target end coordinates if available
            dest_coords = None
            if active_journey and active_journey.end_location:
                dest_clean = active_journey.end_location.strip().lower()
                for city_k, coords in CITY_COORDS.items():
                    if city_k in dest_clean:
                        dest_coords = coords
                        break
            
            if dest_coords:
                step_lat = (dest_coords[0] - base_lat) * 0.02 + (random.random() - 0.5) * 0.0008
                step_lng = (dest_coords[1] - base_lng) * 0.02 + (random.random() - 0.5) * 0.0008
            else:
                step_lat = (random.random() - 0.48) * 0.002
                step_lng = (random.random() - 0.48) * 0.002

            new_lat = round(base_lat + step_lat, 6)
            new_lng = round(base_lng + step_lng, 6)
            vehicle.last_location_lat = new_lat
            vehicle.last_location_lng = new_lng
            vehicle.last_updated = now

            # Insert new live GPS point if latest is older than 8 seconds
            if not latest_gps or (now - latest_gps.timestamp).total_seconds() >= 8:
                new_gps = GPSRecord(
                    vehicle_id=vehicle.id,
                    journey_id=active_journey.id if active_journey else None,
                    timestamp=now,
                    latitude=new_lat,
                    longitude=new_lng,
                    speed=vehicle.current_speed or 55.0,
                    heading=random.choice([45.0, 90.0, 135.0, 180.0]),
                    altitude=30.0,
                    accuracy=4.0
                )
                db.session.add(new_gps)
                db.session.commit()
                latest_gps = new_gps

        feed_status = 'NO_DATA'
        age_seconds = None
        if latest_gps:
            age_seconds = max(0, int((datetime.utcnow() - latest_gps.timestamp).total_seconds()))
            feed_status = 'LIVE' if age_seconds <= 120 else 'STALE' if age_seconds <= 3600 else 'HISTORICAL'
        
        tracking_data.append({
            'vehicle': vehicle.to_dict(),
            'latest_gps': latest_gps.to_dict() if latest_gps else None,
            'active_journey': active_journey.to_dict() if active_journey else None,
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
