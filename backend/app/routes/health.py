from flask import Blueprint, jsonify
from sqlalchemy import text

from app.database.db import db

health_bp = Blueprint('health', __name__)


@health_bp.route('/', methods=['GET'])
def health_check():
    try:
        with db.engine.connect() as connection:
            connection.execute(text('SELECT 1'))
        return jsonify({
            'status': 'ok',
            'database': db.engine.url.get_backend_name(),
        }), 200
    except Exception:
        return jsonify({'status': 'unavailable', 'database': None}), 503
