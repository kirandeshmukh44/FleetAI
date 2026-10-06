from datetime import datetime
from app.database.db import db
from sqlalchemy import UniqueConstraint

class Vehicle(db.Model):
    __tablename__ = 'vehicles'
    __table_args__ = (
        UniqueConstraint('user_id', 'vehicle_id', name='uq_vehicles_user_vehicle_id'),
        UniqueConstraint('user_id', 'registration_number', name='uq_vehicles_user_registration_number'),
    )
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    vehicle_id = db.Column(db.String(50), nullable=False)
    registration_number = db.Column(db.String(50), nullable=False)
    vehicle_type = db.Column(db.String(50), nullable=False)
    make = db.Column(db.String(100))
    model = db.Column(db.String(100))
    year = db.Column(db.Integer)
    fuel_type = db.Column(db.String(50))
    status = db.Column(db.String(20), default='ACTIVE')  # ACTIVE, IDLE, STOPPED, OFFLINE
    current_driver_id = db.Column(db.Integer, db.ForeignKey('drivers.id'), nullable=True)
    current_speed = db.Column(db.Float, default=0.0)
    fuel_level = db.Column(db.Float, default=100.0)
    risk_level = db.Column(db.String(20), default='LOW')  # LOW, MEDIUM, HIGH
    last_location_lat = db.Column(db.Float)
    last_location_lng = db.Column(db.Float)
    last_updated = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    driver = db.relationship('Driver', backref='vehicles', foreign_keys=[current_driver_id])
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'vehicle_id': self.vehicle_id,
            'registration_number': self.registration_number,
            'vehicle_type': self.vehicle_type,
            'make': self.make,
            'model': self.model,
            'year': self.year,
            'fuel_type': self.fuel_type,
            'status': self.status,
            'current_driver_id': self.current_driver_id,
            'current_speed': self.current_speed,
            'fuel_level': self.fuel_level,
            'risk_level': self.risk_level,
            'last_location_lat': self.last_location_lat,
            'last_location_lng': self.last_location_lng,
            'last_updated': self.last_updated.isoformat() if self.last_updated else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
