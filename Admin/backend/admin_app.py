"""FleetAI Admin API — application factory.

A standalone Flask service that manages the whole FleetAI platform. It shares
the main backend's SQLAlchemy models and SQLite database (see ``bootstrap.py``)
and adds cross-tenant governance endpoints under ``/api/admin``.
"""

import bootstrap  # noqa: F401  (must run first: extends sys.path)

import os

from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from app.database.db import db
# Importing the shared models registers them on ``db.metadata`` so that
# ``create_all()`` can resolve foreign keys (e.g. admin_audit_logs -> users).
from app import models as _shared_models  # noqa: F401

from config import Config
from models import AdminAuditLog, AdminNotification, SystemSetting  # noqa: F401 (model registration)

PORT = 5001
FRONTEND_DIST_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), '..', 'frontend', 'dist')
)


def create_app():
    app = Flask(__name__)
    app.url_map.strict_slashes = False
    app.config.from_object(Config)

    db.init_app(app)
    JWTManager(app)
    _configure_cors(app)

    with app.app_context():
        # Only creates the admin_* tables here; the fleet tables already exist.
        db.create_all()

    from routes.auth import auth_bp
    from routes.fleet import fleet_bp
    from routes.overview import overview_bp
    from routes.system import system_bp
    from routes.users import users_bp

    app.register_blueprint(auth_bp, url_prefix='/api/admin/auth')
    app.register_blueprint(overview_bp, url_prefix='/api/admin/overview')
    app.register_blueprint(users_bp, url_prefix='/api/admin/users')
    app.register_blueprint(fleet_bp, url_prefix='/api/admin/fleet')
    app.register_blueprint(system_bp, url_prefix='/api/admin/system')

    _register_error_handlers(app)
    _register_root(app)
    return app


def _configure_cors(app):
    origins = [origin.strip() for origin in app.config['ADMIN_FRONTEND_URL'].split(',') if origin.strip()]
    origins.extend(['http://localhost:5175', 'http://127.0.0.1:5175'])
    CORS(
        app,
        resources={r'/api/*': {'origins': origins}},
        supports_credentials=True,
        expose_headers=['Content-Type'],
    )


def _register_error_handlers(app):
    @app.errorhandler(404)
    def not_found(_error):
        return jsonify({'error': 'Endpoint not found'}), 404

    @app.errorhandler(405)
    def method_not_allowed(_error):
        return jsonify({'error': 'Method not allowed'}), 405

    @app.errorhandler(500)
    def server_error(error):  # pragma: no cover - defensive
        db.session.rollback()
        app.logger.exception('Unhandled admin API error: %s', error)
        return jsonify({'error': 'Internal server error'}), 500


def _register_root(app):
    @app.route('/api/admin', methods=['GET'])
    def index():
        return jsonify({
            'service': 'FleetAI Admin API',
            'version': '1.0.0',
            'endpoints': {
                'auth': '/api/admin/auth',
                'overview': '/api/admin/overview',
                'users': '/api/admin/users',
                'fleet': '/api/admin/fleet',
                'system': '/api/admin/system',
            },
        }), 200

    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def frontend(path):
        """Serve the built React application and support client-side routes."""
        if path.startswith('api/'):
            return jsonify({'error': 'Endpoint not found'}), 404

        requested = os.path.join(FRONTEND_DIST_DIR, path)
        if path and os.path.isfile(requested):
            return send_from_directory(FRONTEND_DIST_DIR, path)

        index_path = os.path.join(FRONTEND_DIST_DIR, 'index.html')
        if not os.path.isfile(index_path):
            return jsonify({
                'error': 'Frontend build not found',
                'message': 'Run npm run build in Admin/frontend before starting the production server.',
            }), 503
        return send_from_directory(FRONTEND_DIST_DIR, 'index.html')
