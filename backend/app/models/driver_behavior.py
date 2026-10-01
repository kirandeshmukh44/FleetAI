from datetime import datetime
from app.database.db import db

class DriverBehavior(db.Model):
    __tablename__ = 'driver_behavior'
    
    id = db.Column(db.Integer, primary_key=True)
    driver_id = db.Column(db.Integer, db.ForeignKey('drivers.id'), nullable=False)
    vehicle_id = db.Column(db.Integer, db.ForeignKey('vehicles.id'), nullable=False)
    journey_id = db.Column(db.Integer, db.ForeignKey('journeys.id'), nullable=True)
    timestamp = db.Column(db.DateTime, nullable=False)
    speed = db.Column(db.Float, default=0.0)
    acceleration = db.Column(db.Float, default=0.0)
    braking = db.Column(db.Float, default=0.0)
    harsh_braking = db.Column(db.Boolean, default=False)
    harsh_acceleration = db.Column(db.Boolean, default=False)
    speeding = db.Column(db.Boolean, default=False)
    speed_limit = db.Column(db.Float, default=0.0)
    event_type = db.Column(db.String(50))  # NORMAL, HARSH_BRAKING, HARSH_ACCELERATION, SPEEDING
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    driver = db.relationship('Driver', backref='behaviors')
    vehicle = db.relationship('Vehicle', backref='behaviors')
    journey = db.relationship('Journey', backref='behaviors')
    
    def to_dict(self):
        return {
            'id': self.id,
            'driver_id': self.driver_id,
            'vehicle_id': self.vehicle_id,
            'journey_id': self.journey_id,
            'timestamp': self.timestamp.isoformat(),
            'speed': self.speed,
            'acceleration': self.acceleration,
            'braking': self.braking,
            'harsh_braking': self.harsh_braking,
            'harsh_acceleration': self.harsh_acceleration,
            'speeding': self.speeding,
            'speed_limit': self.speed_limit,
            'event_type': self.event_type,
            'created_at': self.created_at.isoformat()
        }
