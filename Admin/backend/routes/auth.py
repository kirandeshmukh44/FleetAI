"""Admin authentication: sign-in, session identity and password rotation."""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token, get_jwt_identity

from app.database.db import db
from app.models import User
from app.utils.validation import EMAIL_RE, NAME_RE, USERNAME_RE, clean

from config import ADMIN_ROLES
from models import AdminAuditLog
from utils import admin_required, record_audit

auth_bp = Blueprint('admin_auth', __name__)


@auth_bp.route('/login', methods=['POST'])
def admin_login():
    data = request.get_json(silent=True) or {}
    username = clean(data.get('username')).lower()
    password = data.get('password')

    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400
    if not isinstance(password, str) or not 6 <= len(password) <= 128:
        return jsonify({'error': 'Password must be between 6 and 128 characters.'}), 400

    user = User.query.filter(func_lower(User.username) == username).first()

    if not user or not user.check_password(password):
        return jsonify({'error': 'Invalid administrator credentials'}), 401
    if user.role not in ADMIN_ROLES:
        # Deliberately vague: do not reveal that the account exists but is unprivileged.
        return jsonify({'error': 'This account does not have administrator access.'}), 403

    token = create_access_token(
        identity=str(user.id),
        additional_claims={'role': user.role, 'token_type': 'admin'},
    )
    return jsonify({'access_token': token, 'user': _session_payload(user)}), 200


def func_lower(column):
    """Cross-database LOWER() so the lookup is case-insensitive on SQLite/Postgres."""
    from sqlalchemy import func

    return func.lower(column)


def _session_payload(user):
    return {
        'id': user.id,
        'full_name': user.full_name,
        'username': user.username,
        'email': user.email,
        'role': user.role,
        'created_at': user.created_at.isoformat() if user.created_at else None,
    }


@auth_bp.route('/me', methods=['GET'])
@admin_required
def admin_me():
    return jsonify(_session_payload(request.admin_user)), 200


@auth_bp.route('/password', methods=['PUT'])
@admin_required
def change_own_password():
    data = request.get_json(silent=True) or {}
    current_password = data.get('current_password')
    new_password = data.get('new_password')

    if not isinstance(new_password, str) or not 6 <= len(new_password) <= 128:
        return jsonify({'error': 'New password must be between 6 and 128 characters.'}), 400
    if not current_password or not request.admin_user.check_password(current_password):
        return jsonify({'error': 'Current password is incorrect.'}), 400
    if current_password == new_password:
        return jsonify({'error': 'New password must differ from the current password.'}), 400

    request.admin_user.set_password(new_password)
    db.session.commit()
    record_audit('auth.password_changed', 'user', request.admin_user.id)
    return jsonify({'message': 'Password updated successfully'}), 200


@auth_bp.route('/sessions', methods=['GET'])
@admin_required
def list_sessions():
    """Recent admin sign-ins, derived from the audit trail."""
    logs = (
        AdminAuditLog.query.filter(AdminAuditLog.action == 'auth.login')
        .order_by(AdminAuditLog.created_at.desc())
        .limit(20)
        .all()
    )
    return jsonify([log.to_dict() for log in logs]), 200
