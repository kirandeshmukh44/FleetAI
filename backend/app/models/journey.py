from datetime import datetime
from app.database.db import db

class Journey(db.Model):
    __tablename__ = 'journeys'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    journey_id = db.Column(db.String(50), unique=True, nullable=False)
    vehicle_id = db.Column(db.Integer, db.ForeignKey('vehicles.id'), nullable=False)
    driver_id = db.Column(db.Integer, db.ForeignKey('drivers.id'), nullable=False)
    start_time = db.Column(db.DateTime, nullable=False)
    end_time = db.Column(db.DateTime)
    start_location = db.Column(db.String(200))
    end_location = db.Column(db.String(200))
    distance = db.Column(db.Float, default=0.0)  # in km
    duration = db.Column(db.Float, default=0.0)  # in minutes
    average_speed = db.Column(db.Float, default=0.0)
    max_speed = db.Column(db.Float, default=0.0)
    fuel_consumed = db.Column(db.Float, default=0.0)  # in liters
    status = db.Column(db.String(20), default='IN_PROGRESS')  # IN_PROGRESS, COMPLETED, CANCELLED
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    vehicle = db.relationship('Vehicle', backref='journeys')
    driver = db.relationship('Driver', backref='journeys')
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'journey_id': self.journey_id,
            'vehicle_id': self.vehicle_id,
            'vehicle_label': f"{self.vehicle.vehicle_id} ({self.vehicle.registration_number})" if self.vehicle else f"Vehicle #{self.vehicle_id}",
            'driver_id': self.driver_id,
            'driver_name': self.driver.name if self.driver else f"Driver #{self.driver_id}",
            'start_time': self.start_time.isoformat(),
            'end_time': self.end_time.isoformat() if self.end_time else None,
            'start_location': self.start_location,
            'end_location': self.end_location,
            'distance': self.distance,
            'duration': self.duration,
            'average_speed': self.average_speed,
            'max_speed': self.max_speed,
            'fuel_consumed': self.fuel_consumed,
            'status': self.status,
            'created_at': self.created_at.isoformat()
        }
