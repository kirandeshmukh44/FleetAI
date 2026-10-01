from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from app.config.config import Config
from app.database.db import db

def create_app():
    app = Flask(__name__)
    app.url_map.strict_slashes = False
    app.config.from_object(Config)
    
    # Initialize extensions
    db.init_app(app)
    CORS(app)
    jwt = JWTManager(app)
    
    # Create tables
    with app.app_context():
        db.create_all()
    
    # Register blueprints
    from app.routes.auth import auth_bp
    from app.routes.vehicles import vehicles_bp
    from app.routes.drivers import drivers_bp
    from app.routes.tracking import tracking_bp
    from app.routes.dashboard import dashboard_bp
    from app.routes.fuel import fuel_bp
    from app.routes.risk import risk_bp
    from app.routes.import_csv import import_bp
    from app.routes.health import health_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(vehicles_bp, url_prefix='/api/vehicles')
    app.register_blueprint(drivers_bp, url_prefix='/api/drivers')
    app.register_blueprint(tracking_bp, url_prefix='/api/tracking')
    app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
    app.register_blueprint(fuel_bp, url_prefix='/api/fuel')
    app.register_blueprint(risk_bp, url_prefix='/api/risk')
    app.register_blueprint(import_bp, url_prefix='/api/import')
    app.register_blueprint(health_bp, url_prefix='/api/health')
    
    return app
