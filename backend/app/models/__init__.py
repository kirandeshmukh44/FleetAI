from app.models.user import User
from app.models.vehicle import Vehicle
from app.models.driver import Driver
from app.models.journey import Journey
from app.models.gps_record import GPSRecord
from app.models.fuel_record import FuelRecord
from app.models.driver_behavior import DriverBehavior
from app.models.risk_prediction import RiskPrediction

__all__ = [
    'User',
    'Vehicle',
    'Driver',
    'Journey',
    'GPSRecord',
    'FuelRecord',
    'DriverBehavior',
    'RiskPrediction'
]
