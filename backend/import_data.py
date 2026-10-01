import pandas as pd
from app import create_app
from app.models import Vehicle, Driver, GPSRecord, Journey, FuelRecord
from app.database.db import db

app = create_app()

with app.app_context():
    # Import Vehicles
    print("Importing vehicles...")
    vehicles_df = pd.read_csv('datasets/vehicles.csv')
    for _, row in vehicles_df.iterrows():
        if not Vehicle.query.filter_by(vehicle_id=row['vehicle_id']).first():
            vehicle = Vehicle(
                vehicle_id=row['vehicle_id'],
                registration_number=row['registration_number'],
                vehicle_type=row['vehicle_type'],
                make=row['make'],
                model=row['model'],
                year=row['year'],
                fuel_type=row['fuel_type'],
                status=row['status']
            )
            db.session.add(vehicle)
    db.session.commit()
    print(f"Imported {len(vehicles_df)} vehicles")

    # Import Drivers
    print("Importing drivers...")
    drivers_df = pd.read_csv('datasets/drivers.csv')
    for _, row in drivers_df.iterrows():
        if not Driver.query.filter_by(driver_id=row['driver_id']).first():
            driver = Driver(
                driver_id=row['driver_id'],
                name=row['name'],
                email=row['email'],
                phone=row['phone'],
                license_number=row['license_number'],
                license_expiry=pd.to_datetime(row['license_expiry']),
                status=row['status']
            )
            db.session.add(driver)
    db.session.commit()
    print(f"Imported {len(drivers_df)} drivers")

    # Import GPS Records
    print("Importing GPS records...")
    gps_df = pd.read_csv('datasets/gps_records.csv')
    for _, row in gps_df.iterrows():
        vehicle = Vehicle.query.filter_by(vehicle_id=row['vehicle_id']).first()
        if vehicle:
            gps = GPSRecord(
                vehicle_id=vehicle.id,
                timestamp=pd.to_datetime(row['timestamp']),
                latitude=row['latitude'],
                longitude=row['longitude'],
                speed=row['speed'],
                heading=row['heading'],
                altitude=row['altitude']
            )
            db.session.add(gps)
    db.session.commit()
    print(f"Imported {len(gps_df)} GPS records")

    # Import Journeys
    print("Importing journeys...")
    journeys_df = pd.read_csv('datasets/journeys.csv')
    for _, row in journeys_df.iterrows():
        vehicle = Vehicle.query.filter_by(vehicle_id=row['vehicle_id']).first()
        driver = Driver.query.filter_by(driver_id=row['driver_id']).first()
        
        if vehicle and driver and not Journey.query.filter_by(journey_id=row['journey_id']).first():
            journey = Journey(
                journey_id=row['journey_id'],
                vehicle_id=vehicle.id,
                driver_id=driver.id,
                start_time=pd.to_datetime(row['start_time']),
                end_time=pd.to_datetime(row['end_time']) if pd.notna(row['end_time']) else None,
                start_location=row['start_location'],
                end_location=row['end_location'],
                distance=row['distance'],
                duration=row['duration'],
                average_speed=row['average_speed'],
                max_speed=row['max_speed'],
                fuel_consumed=row['fuel_consumed'],
                status=row['status']
            )
            db.session.add(journey)
    db.session.commit()
    print(f"Imported {len(journeys_df)} journeys")

    # Import Fuel Records
    print("Importing fuel records...")
    fuel_df = pd.read_csv('datasets/fuel_records.csv')
    for _, row in fuel_df.iterrows():
        vehicle = Vehicle.query.filter_by(vehicle_id=row['vehicle_id']).first()
        driver = Driver.query.filter_by(driver_id=row['driver_id']).first() if pd.notna(row['driver_id']) else None
        
        if vehicle:
            fuel = FuelRecord(
                vehicle_id=vehicle.id,
                driver_id=driver.id if driver else None,
                timestamp=pd.to_datetime(row['timestamp']),
                fuel_level=row['fuel_level'],
                fuel_consumed=row['fuel_consumed'],
                distance_traveled=row['distance_traveled'],
                fuel_efficiency=row['fuel_efficiency'],
                cost=row['cost']
            )
            db.session.add(fuel)
    db.session.commit()
    print(f"Imported {len(fuel_df)} fuel records")

    print("\nAll data imported successfully!")
