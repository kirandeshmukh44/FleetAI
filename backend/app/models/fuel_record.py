from datetime import datetime
from app.database.db import db

class FuelRecord(db.Model):
    __tablename__ = 'fuel_records'
    
    id = db.Column(db.Integer, primary_key=True)
    vehicle_id = db.Column(db.Integer, db.ForeignKey('vehicles.id'), nullable=False)
    driver_id = db.Column(db.Integer, db.ForeignKey('drivers.id'), nullable=True)
    journey_id = db.Column(db.Integer, db.ForeignKey('journeys.id'), nullable=True)
    timestamp = db.Column(db.DateTime, nullable=False)
    fuel_level = db.Column(db.Float, nullable=False)  # percentage
    fuel_consumed = db.Column(db.Float, default=0.0)  # liters
    distance_traveled = db.Column(db.Float, default=0.0)  # km
    fuel_efficiency = db.Column(db.Float, default=0.0)  # km/l
    cost = db.Column(db.Float, default=0.0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    vehicle = db.relationship('Vehicle', backref='fuel_records')
    driver = db.relationship('Driver', backref='fuel_records')
    journey = db.relationship('Journey', backref='fuel_records')
    
    def to_dict(self):
        return {
            'id': self.id,
            'vehicle_id': self.vehicle_id,
            'driver_id': self.driver_id,
            'journey_id': self.journey_id,
            'timestamp': self.timestamp.isoformat(),
            'fuel_level': self.fuel_level,
            'fuel_consumed': self.fuel_consumed,
            'distance_traveled': self.distance_traveled,
            'fuel_efficiency': self.fuel_efficiency,
            'cost': self.cost,
            'created_at': self.created_at.isoformat()
        }
