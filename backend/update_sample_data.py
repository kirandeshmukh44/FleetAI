from app import create_app
from app.models import Vehicle, Driver
from app.database.db import db
import random

app = create_app()

with app.app_context():
    # Update vehicles with realistic speeds
    vehicles = Vehicle.query.all()
    for vehicle in vehicles:
        vehicle.current_speed = random.uniform(30, 90)
        vehicle.fuel_level = random.uniform(40, 95)
        vehicle.last_location_lat = 19.0760 + random.uniform(-0.1, 0.1)
        vehicle.last_location_lng = 72.8777 + random.uniform(-0.1, 0.1)
    
    # Update drivers with behavior data
    drivers = Driver.query.all()
    for driver in drivers:
        driver.harsh_braking_count = random.randint(0, 15)
        driver.harsh_acceleration_count = random.randint(0, 12)
        driver.average_speed = random.uniform(35, 75)
        driver.risk_score = random.randint(10, 85)
        driver.fuel_efficiency = random.uniform(3.5, 8.5)
        
        # Set risk level based on risk score
        if driver.risk_score >= 60:
            driver.risk_level = 'HIGH'
        elif driver.risk_score >= 35:
            driver.risk_level = 'MEDIUM'
        else:
            driver.risk_level = 'LOW'
    
    db.session.commit()
    
    print("Sample data updated successfully!")
    print(f"Updated {len(vehicles)} vehicles and {len(drivers)} drivers")
