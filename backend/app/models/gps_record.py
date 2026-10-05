from datetime import datetime
from app.database.db import db

class GPSRecord(db.Model):
    __tablename__ = 'gps_records'
    
    id = db.Column(db.Integer, primary_key=True)
    vehicle_id = db.Column(db.Integer, db.ForeignKey('vehicles.id'), nullable=False)
    journey_id = db.Column(db.Integer, db.ForeignKey('journeys.id'), nullable=True)
    timestamp = db.Column(db.DateTime, nullable=False)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    speed = db.Column(db.Float, default=0.0)
    heading = db.Column(db.Float, default=0.0)
    altitude = db.Column(db.Float, default=0.0)
    accuracy = db.Column(db.Float, default=0.0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    vehicle = db.relationship('Vehicle', backref='gps_records')
    journey = db.relationship('Journey', backref='gps_records')
    
    def to_dict(self):
        return {
            'id': self.id,
            'vehicle_id': self.vehicle_id,
            'journey_id': self.journey_id,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'speed': self.speed,
            'heading': self.heading,
            'altitude': self.altitude,
            'accuracy': self.accuracy,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
