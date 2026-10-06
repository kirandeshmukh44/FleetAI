"""Admin-only models.

These live alongside the shared FleetAI models in the *same* database, so the
admin panel can record governance data (audit trail, system settings) without
duplicating the fleet schema.
"""

import json
from datetime import datetime

from app.database.db import db


class AdminAuditLog(db.Model):
    """Immutable record of every privileged action taken in the admin panel."""

    __tablename__ = 'admin_audit_logs'

    id = db.Column(db.Integer, primary_key=True)
    actor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    actor_username = db.Column(db.String(80), nullable=False)
    action = db.Column(db.String(60), nullable=False)
    entity_type = db.Column(db.String(40))
    entity_id = db.Column(db.String(40))
    details = db.Column(db.Text)  # JSON string
    ip_address = db.Column(db.String(64))
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    def to_dict(self):
        try:
            details = json.loads(self.details) if self.details else None
        except (TypeError, ValueError):
            details = self.details
        return {
            'id': self.id,
            'actor_id': self.actor_id,
            'actor_username': self.actor_username,
            'action': self.action,
            'entity_type': self.entity_type,
            'entity_id': self.entity_id,
            'details': details,
            'ip_address': self.ip_address,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class SystemSetting(db.Model):
    """Key/value runtime configuration editable from the admin panel."""

    __tablename__ = 'admin_system_settings'

    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(80), unique=True, nullable=False)
    value = db.Column(db.String(255), nullable=False, default='')
    value_type = db.Column(db.String(20), nullable=False, default='string')  # string|number|boolean
    description = db.Column(db.String(255))
    updated_by = db.Column(db.String(80))
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        typed = self.value
        if self.value_type == 'number':
            try:
                typed = float(self.value)
            except (TypeError, ValueError):
                typed = self.value
        elif self.value_type == 'boolean':
            typed = str(self.value).strip().lower() in ('1', 'true', 'yes', 'on')
        return {
            'id': self.id,
            'key': self.key,
            'value': typed,
            'raw_value': self.value,
            'value_type': self.value_type,
            'description': self.description,
            'updated_by': self.updated_by,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class AdminNotification(db.Model):
    """Operator-facing alerts raised by system health checks."""

    __tablename__ = 'admin_notifications'

    id = db.Column(db.Integer, primary_key=True)
    severity = db.Column(db.String(20), default='info')  # info|warning|critical
    title = db.Column(db.String(160), nullable=False)
    message = db.Column(db.String(500), nullable=False)
    source = db.Column(db.String(60))
    is_resolved = db.Column(db.Boolean, default=False)
    resolved_by = db.Column(db.String(80))
    resolved_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    def to_dict(self):
        return {
            'id': self.id,
            'severity': self.severity,
            'title': self.title,
            'message': self.message,
            'source': self.source,
            'is_resolved': self.is_resolved,
            'resolved_by': self.resolved_by,
            'resolved_at': self.resolved_at.isoformat() if self.resolved_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
