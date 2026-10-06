"""Decorators, audit helpers and shared query utilities."""

import json
from functools import wraps

from flask import jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required
from sqlalchemy import func, or_
from sqlalchemy.exc import IntegrityError

from app.database.db import db
from app.models import User

from config import ADMIN_ROLES
from models import AdminAuditLog


def admin_required(fn):
    """Require a valid JWT issued by this service *and* a privileged role."""

    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        claims = get_jwt()
        if claims.get('token_type') != 'admin':
            return jsonify({'error': 'Admin token required.'}), 401

        role = claims.get('role')
        if role not in ADMIN_ROLES:
            return jsonify({'error': 'Superadmin privileges required.'}), 403

        try:
            user_id = int(get_jwt_identity())
        except (TypeError, ValueError):
            return jsonify({'error': 'Invalid token identity'}), 401

        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        if user.role not in ADMIN_ROLES:
            # Role was revoked after the token was issued.
            return jsonify({'error': 'Superadmin privileges have been revoked.'}), 403

        request.admin_user = user
        return fn(*args, **kwargs)

    return wrapper


def record_audit(action, entity_type=None, entity_id=None, details=None, user=None):
    """Append an entry to the immutable admin audit trail.

    Never raises: auditing must not break the primary request.
    """
    try:
        actor = user or getattr(request, 'admin_user', None)
        entry = AdminAuditLog(
            actor_id=actor.id if actor else None,
            actor_username=actor.username if actor else 'system',
            action=action,
            entity_type=entity_type,
            entity_id=str(entity_id) if entity_id is not None else None,
            details=json.dumps(details) if details is not None else None,
            ip_address=request.headers.get('X-Forwarded-For', request.remote_addr),
        )
        db.session.add(entry)
        db.session.commit()
    except Exception:  # noqa: BLE001 - auditing is best-effort
        db.session.rollback()


def pagination_args(default_per_page=20, max_per_page=200):
    """Read validated ``page`` / ``per_page`` / search args from the query string."""
    try:
        page = max(1, int(request.args.get('page', 1)))
    except (TypeError, ValueError):
        page = 1
    try:
        per_page = int(request.args.get('per_page', default_per_page))
    except (TypeError, ValueError):
        per_page = default_per_page
    per_page = max(1, min(per_page, max_per_page))

    search = (request.args.get('search') or '').strip()
    sort = (request.args.get('sort') or '').strip()
    direction = (request.args.get('direction') or 'desc').strip().lower()
    if direction not in ('asc', 'desc'):
        direction = 'desc'

    return {
        'page': page,
        'per_page': per_page,
        'search': search,
        'sort': sort,
        'direction': direction,
    }


def apply_sort(query, model, sort_key, direction, allowed, default_column):
    """Apply a whitelisted ORDER BY to a query."""
    column = default_column
    if sort_key in allowed:
        column = getattr(model, sort_key, default_column)
    return query.order_by(column.asc() if direction == 'asc' else column.desc())


def search_filter(model, search, columns):
    """Build a case-insensitive OR filter across the given columns."""
    if not search:
        return None
    clauses = [getattr(model, column).ilike(f'%{search}%') for column in columns if hasattr(model, column)]
    return or_(*clauses) if clauses else None


def paginated_response(items, total, page, per_page, **extra):
    """Standard envelope so the frontend can render one table component."""
    pages = (total + per_page - 1) // per_page if per_page else 0
    payload = {
        'items': items,
        'total': total,
        'page': page,
        'per_page': per_page,
        'pages': pages,
        'has_next': page < pages,
        'has_prev': page > 1,
    }
    payload.update(extra)
    return jsonify(payload), 200


def commit_or_conflict(message):
    """Commit, converting an IntegrityError into a 409 response tuple."""
    try:
        db.session.commit()
        return None
    except IntegrityError:
        db.session.rollback()
        return jsonify({'error': message}), 409


def to_float(value, default=0.0):
    try:
        number = float(value)
    except (TypeError, ValueError):
        return default
    return default if number != number else number  # drop NaN


def count_of(model, *filters):
    return model.query.filter(*filters).count() if filters else model.query.count()


__all__ = [
    'admin_required',
    'record_audit',
    'pagination_args',
    'apply_sort',
    'search_filter',
    'paginated_response',
    'commit_or_conflict',
    'to_float',
    'count_of',
    'db',
    'func',
]
