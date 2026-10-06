from datetime import datetime
from app.database.db import db
from sqlalchemy import UniqueConstraint

class Driver(db.Model):
    __tablename__ = 'drivers'
    __table_args__ = (
        UniqueConstraint('user_id', 'driver_id', name='uq_drivers_user_driver_id'),
        UniqueConstraint('user_id', 'email', name='uq_drivers_user_email'),
        UniqueConstraint('user_id', 'license_number', name='uq_drivers_user_license_number'),
    )
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    driver_id = db.Column(db.String(50), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120))
    phone = db.Column(db.String(20))
    license_number = db.Column(db.String(50))
    license_expiry = db.Column(db.Date)
    assigned_vehicle_id = db.Column(db.Integer, db.ForeignKey('vehicles.id'), nullable=True)
    total_journeys = db.Column(db.Integer, default=0)
    average_speed = db.Column(db.Float, default=0.0)
    harsh_braking_count = db.Column(db.Integer, default=0)
    harsh_acceleration_count = db.Column(db.Integer, default=0)
    risk_level = db.Column(db.String(20), default='LOW')  # LOW, MEDIUM, HIGH
    risk_score = db.Column(db.Float, default=0.0)
    fuel_efficiency = db.Column(db.Float, default=0.0)
    status = db.Column(db.String(20), default='ACTIVE')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    assigned_vehicle = db.relationship('Vehicle', backref='assigned_drivers', foreign_keys=[assigned_vehicle_id])
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'driver_id': self.driver_id,
            'name': self.name,
            'email': self.email,
            'phone': self.phone,
            'license_number': self.license_number,
            'license_expiry': self.license_expiry.isoformat() if self.license_expiry else None,
            'assigned_vehicle_id': self.assigned_vehicle_id,
            'total_journeys': self.total_journeys,
            'average_speed': self.average_speed,
            'harsh_braking_count': self.harsh_braking_count,
            'harsh_acceleration_count': self.harsh_acceleration_count,
            'risk_level': self.risk_level,
            'risk_score': self.risk_score,
            'fuel_efficiency': self.fuel_efficiency,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
