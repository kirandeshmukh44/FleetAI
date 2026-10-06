"""System administration: health, settings and operator notifications."""

import platform
import sys
from datetime import datetime, timedelta, timezone

from flask import Blueprint, current_app, jsonify, request
from sqlalchemy import text

from app.database.db import db
from app.models import (
    Driver,
    DriverBehavior,
    FuelRecord,
    GPSRecord,
    Journey,
    RiskPrediction,
    User,
    Vehicle,
)

from models import AdminAuditLog, AdminNotification, SystemSetting
from utils import admin_required, record_audit

system_bp = Blueprint('admin_system', __name__)

DEFAULT_SETTINGS = (
    ('platform_name', 'FleetAI', 'string', 'Name shown across the admin interface'),
    ('alerts_high_risk_threshold', '60', 'number', 'Risk score at or above which a driver is flagged high risk'),
    ('maintenance_mode', 'false', 'boolean', 'Pause fleet write operations platform-wide'),
    ('session_timeout_minutes', '480', 'number', 'Admin session lifetime before re-authentication'),
    ('notify_on_new_superadmin', 'true', 'boolean', 'Notify operators when a superadmin account is created'),
)


@system_bp.route('/health', methods=['GET'])
def health_check():
    """Liveness probe. Deliberately public so uptime monitors can reach it."""
    try:
        with db.engine.connect() as connection:
            connection.execute(text('SELECT 1'))
        return jsonify({
            'status': 'ok',
            'database': db.engine.url.get_backend_name(),
            'service': 'fleetai-admin-api',
            'time': datetime.now(timezone.utc).isoformat(),
        }), 200
    except Exception:  # noqa: BLE001
        return jsonify({'status': 'unavailable', 'database': None}), 503


@system_bp.route('/info', methods=['GET'])
@admin_required
def system_info():
    """Runtime metadata + table row counts for the System page."""
    tables = (
        ('users', User), ('vehicles', Vehicle), ('drivers', Driver),
        ('journeys', Journey), ('gps_records', GPSRecord),
        ('fuel_records', FuelRecord), ('driver_behavior', DriverBehavior),
        ('risk_predictions', RiskPrediction),
        ('admin_audit_logs', AdminAuditLog), ('admin_notifications', AdminNotification),
    )

    return jsonify({
        'service': 'FleetAI Admin Panel',
        'api_version': '1.0.0',
        'python_version': sys.version.split()[0],
        'platform': platform.system(),
        'database': db.engine.url.get_backend_name(),
        'database_path': current_app.config.get('SQLALCHEMY_DATABASE_URI', '').replace('sqlite:///', ''),
        'main_backend': current_app.config.get('MAIN_BACKEND_DIR', ''),
        'jwt_expiry_seconds': current_app.config.get('JWT_ACCESS_TOKEN_EXPIRES'),
        'table_counts': {name: model.query.count() for name, model in tables},
        'server_time': datetime.now(timezone.utc).isoformat(),
    }), 200


@system_bp.route('/settings', methods=['GET'])
@admin_required
def list_settings():
    ensure_default_settings()
    settings = SystemSetting.query.order_by(SystemSetting.key).all()
    return jsonify([setting.to_dict() for setting in settings]), 200


@system_bp.route('/settings/<string:key>', methods=['PUT'])
@admin_required
def update_setting(key):
    ensure_default_settings()
    setting = SystemSetting.query.filter_by(key=key).first()
    if not setting:
        return jsonify({'error': f'Unknown setting: {key}'}), 404

    data = request.get_json(silent=True) or {}
    if 'value' not in data:
        return jsonify({'error': 'Value is required.'}), 400

    raw = str(data['value'])
    if setting.value_type == 'number':
        try:
            float(raw)
        except (TypeError, ValueError):
            return jsonify({'error': f'{key} must be a number.'}), 400
    elif setting.value_type == 'boolean':
        if raw.strip().lower() not in ('1', '0', 'true', 'false', 'yes', 'no', 'on', 'off'):
            return jsonify({'error': f'{key} must be a boolean.'}), 400

    previous = setting.value
    setting.value = raw
    setting.updated_by = request.admin_user.username
    db.session.commit()

    record_audit('setting.updated', 'setting', key, {'from': previous, 'to': raw})
    return jsonify(setting.to_dict()), 200


def ensure_default_settings():
    """Seed the default settings the first time the panel is opened."""
    existing = {row.key for row in SystemSetting.query.all()}
    created = False
    for key, value, value_type, description in DEFAULT_SETTINGS:
        if key in existing:
            continue
        db.session.add(SystemSetting(
            key=key, value=value, value_type=value_type, description=description
        ))
        created = True
    if created:
        db.session.commit()


@system_bp.route('/notifications', methods=['GET'])
@admin_required
def list_notifications():
    resolved = (request.args.get('resolved') or '').strip().lower()
    query = AdminNotification.query
    if resolved in ('true', 'false'):
        query = query.filter(AdminNotification.is_resolved.is_(resolved == 'true'))
    items = query.order_by(AdminNotification.created_at.desc()).limit(100).all()
    return jsonify([item.to_dict() for item in items]), 200


@system_bp.route('/notifications', methods=['POST'])
@admin_required
def create_notification():
    data = request.get_json(silent=True) or {}
    title = (data.get('title') or '').strip()
    message = (data.get('message') or '').strip()
    severity = (data.get('severity') or 'info').strip().lower()

    if not title or not message:
        return jsonify({'error': 'Title and message are required.'}), 400
    if severity not in ('info', 'warning', 'critical'):
        return jsonify({'error': 'Severity must be info, warning or critical.'}), 400

    notification = AdminNotification(
        severity=severity,
        title=title[:160],
        message=message[:500],
        source=(data.get('source') or 'manual')[:60],
    )
    db.session.add(notification)
    db.session.commit()
    record_audit('notification.created', 'notification', notification.id, {'title': title})
    return jsonify(notification.to_dict()), 201


@system_bp.route('/notifications/<int:notification_id>/resolve', methods=['POST'])
@admin_required
def resolve_notification(notification_id):
    notification = AdminNotification.query.get(notification_id)
    if not notification:
        return jsonify({'error': 'Notification not found'}), 404

    notification.is_resolved = True
    notification.resolved_by = request.admin_user.username
    notification.resolved_at = datetime.utcnow()
    db.session.commit()
    record_audit('notification.resolved', 'notification', notification_id)
    return jsonify(notification.to_dict()), 200


@system_bp.route('/check', methods=['POST'])
@admin_required
def run_health_sweep():
    """Evaluate platform health rules and raise notifications for violations."""
    now = datetime.utcnow()
    issues = []

    stale_vehicles = Vehicle.query.filter(Vehicle.last_updated < now - timedelta(hours=24)).count()
    if stale_vehicles:
        issues.append(('warning', 'Stale vehicle telemetry',
                       f'{stale_vehicles} vehicle(s) have not reported in 24+ hours.', 'telemetry'))

    expired = Driver.query.filter(
        Driver.license_expiry.isnot(None), Driver.license_expiry <= now.date()
    ).count()
    if expired:
        issues.append(('critical', 'Expired driving licences',
                       f'{expired} driver(s) have an expired licence.', 'compliance'))

    raised = 0
    for severity, title, message, source in issues:
        if AdminNotification.query.filter_by(title=title, is_resolved=False).first():
            continue
        db.session.add(AdminNotification(
            severity=severity, title=title, message=message, source=source
        ))
        raised += 1
    db.session.commit()

    return jsonify({
        'raised': raised,
        'issues': [
            {'severity': s, 'title': t, 'message': m, 'source': c} for s, t, m, c in issues
        ],
        'checked_at': now.isoformat(),
    }), 200

