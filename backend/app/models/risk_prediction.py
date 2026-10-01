from datetime import datetime
from app.database.db import db

class RiskPrediction(db.Model):
    __tablename__ = 'risk_predictions'
    
    id = db.Column(db.Integer, primary_key=True)
    driver_id = db.Column(db.Integer, db.ForeignKey('drivers.id'), nullable=False)
    vehicle_id = db.Column(db.Integer, db.ForeignKey('vehicles.id'), nullable=False)
    journey_id = db.Column(db.Integer, db.ForeignKey('journeys.id'), nullable=True)
    prediction_timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    risk_probability = db.Column(db.Float, nullable=False)  # 0.0 to 1.0
    risk_level = db.Column(db.String(20), nullable=False)  # LOW, MEDIUM, HIGH
    model_used = db.Column(db.String(100))
    contributing_factors = db.Column(db.Text)  # JSON string
    speed_score = db.Column(db.Float, default=0.0)
    acceleration_score = db.Column(db.Float, default=0.0)
    braking_score = db.Column(db.Float, default=0.0)
    behavior_score = db.Column(db.Float, default=0.0)
    historical_risk_score = db.Column(db.Float, default=0.0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    driver = db.relationship('Driver', backref='risk_predictions')
    vehicle = db.relationship('Vehicle', backref='risk_predictions')
    journey = db.relationship('Journey', backref='risk_predictions')
    
    def to_dict(self):
        return {
            'id': self.id,
            'driver_id': self.driver_id,
            'vehicle_id': self.vehicle_id,
            'journey_id': self.journey_id,
            'prediction_timestamp': self.prediction_timestamp.isoformat(),
            'risk_probability': self.risk_probability,
            'risk_level': self.risk_level,
            'model_used': self.model_used,
            'contributing_factors': self.contributing_factors,
            'speed_score': self.speed_score,
            'acceleration_score': self.acceleration_score,
            'braking_score': self.braking_score,
            'behavior_score': self.behavior_score,
            'historical_risk_score': self.historical_risk_score,
            'created_at': self.created_at.isoformat()
        }
