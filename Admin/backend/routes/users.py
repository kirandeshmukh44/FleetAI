"""Platform user administration.

This is the surface a superadmin uses to govern *all* accounts on the system —
unlike the main application, which only ever exposes the signed-in user.
"""

from flask import Blueprint, jsonify, request
from sqlalchemy import func

from app.database.db import db
from app.models import Driver, Journey, User, Vehicle
from app.utils.validation import EMAIL_RE, NAME_RE, USERNAME_RE, clean

from config import ADMIN_ROLES, ASSIGNABLE_ROLES
from models import AdminAuditLog
from utils import (
    admin_required,
    apply_sort,
    commit_or_conflict,
    paginated_response,
    pagination_args,
    record_audit,
    search_filter,
)

users_bp = Blueprint('admin_users', __name__)

SORTABLE = {'id', 'username', 'email', 'role', 'created_at'}
SEARCHABLE = ('username', 'email', 'full_name')


def serialize_user(user):
    """User row plus the resource counts shown in the admin table."""
    data = user.to_dict()
    data['resource_counts'] = {
        'vehicles': Vehicle.query.filter_by(user_id=user.id).count(),
        'drivers': Driver.query.filter_by(user_id=user.id).count(),
        'journeys': Journey.query.filter_by(user_id=user.id).count(),
    }
    return data


@users_bp.route('/', methods=['GET'])
@admin_required
def list_users():
    args = pagination_args()
    query = User.query

    term = search_filter(User, args['search'], SEARCHABLE)
    if term is not None:
        query = query.filter(term)

    role = (request.args.get('role') or '').strip()
    if role:
        query = query.filter(User.role == role)

    total = query.count()
    query = apply_sort(query, User, args['sort'], args['direction'], SORTABLE, User.created_at)
    items = query.limit(args['per_page']).offset((args['page'] - 1) * args['per_page']).all()

    return paginated_response(
        [serialize_user(user) for user in items],
        total,
        args['page'],
        args['per_page'],
        roles=list(ASSIGNABLE_ROLES),
    )


@users_bp.route('/<int:user_id>', methods=['GET'])
@admin_required
def get_user(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify(serialize_user(user)), 200


@users_bp.route('/', methods=['POST'])
@admin_required
def create_user():
    data = request.get_json(silent=True) or {}
    username = clean(data.get('username')).lower()
    email = clean(data.get('email')).lower()
    full_name = clean(data.get('full_name')) or None
    password = data.get('password')
    role = clean(data.get('role')) or 'user'

    if not username or not email or not password:
        return jsonify({'error': 'Username, email and password are required.'}), 400
    if not USERNAME_RE.fullmatch(username):
        return jsonify({'error': 'Username must start with a letter and be 3-30 characters.'}), 400
    if not EMAIL_RE.fullmatch(email):
        return jsonify({'error': 'Enter a valid email address.'}), 400
    if full_name and not NAME_RE.fullmatch(full_name):
        return jsonify({'error': 'Enter a valid full name.'}), 400
    if not isinstance(password, str) or not 6 <= len(password) <= 128:
        return jsonify({'error': 'Password must be between 6 and 128 characters.'}), 400
    if role not in ASSIGNABLE_ROLES:
        return jsonify({'error': 'Choose a valid role.'}), 400

    if User.query.filter(func.lower(User.username) == username).first():
        return jsonify({'error': 'Username already exists'}), 409
    if User.query.filter(func.lower(User.email) == email).first():
        return jsonify({'error': 'Email already exists'}), 409

    user = User(username=username, email=email, full_name=full_name, role=role)
    user.set_password(password)
    db.session.add(user)
    conflict = commit_or_conflict('Username or email already exists.')
    if conflict:
        return conflict

    record_audit('user.created', 'user', user.id, {'username': user.username, 'role': role})
    return jsonify(serialize_user(user)), 201


@users_bp.route('/<int:user_id>', methods=['PUT'])
@admin_required
def update_user(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    data = request.get_json(silent=True) or {}
    changes = {}

    if 'username' in data:
        username = clean(data['username']).lower()
        if not USERNAME_RE.fullmatch(username):
            return jsonify({'error': 'Username must start with a letter and be 3-30 characters.'}), 400
        clash = User.query.filter(func.lower(User.username) == username, User.id != user.id).first()
        if clash:
            return jsonify({'error': 'Username already taken'}), 409
        changes['username'] = username

    if 'email' in data:
        email = clean(data['email']).lower()
        if not EMAIL_RE.fullmatch(email):
            return jsonify({'error': 'Enter a valid email address.'}), 400
        clash = User.query.filter(func.lower(User.email) == email, User.id != user.id).first()
        if clash:
            return jsonify({'error': 'Email already registered'}), 409
        changes['email'] = email

    if 'full_name' in data:
        full_name = clean(data['full_name']) or None
        if full_name and not NAME_RE.fullmatch(full_name):
            return jsonify({'error': 'Enter a valid full name.'}), 400
        changes['full_name'] = full_name

    if 'role' in data:
        role = clean(data['role'])
        if role not in ASSIGNABLE_ROLES:
            return jsonify({'error': 'Choose a valid role.'}), 400
        # Never let the last superadmin be demoted, or the panel locks itself out.
        if user.role in ADMIN_ROLES and role not in ADMIN_ROLES and _superadmin_count(excluding=user.id) == 0:
            return jsonify({'error': 'At least one superadmin must remain.'}), 400
        changes['role'] = role

    for key, value in changes.items():
        setattr(user, key, value)

    if data.get('password'):
        password = data['password']
        if not isinstance(password, str) or not 6 <= len(password) <= 128:
            return jsonify({'error': 'Password must be between 6 and 128 characters.'}), 400
        user.set_password(password)
        changes['password'] = '***reset***'

    conflict = commit_or_conflict('Username or email already exists.')
    if conflict:
        return conflict

    record_audit('user.updated', 'user', user.id, changes)
    return jsonify(serialize_user(user)), 200


def _superadmin_count(excluding=None):
    query = User.query.filter(User.role.in_(ADMIN_ROLES))
    if excluding is not None:
        query = query.filter(User.id != excluding)
    return query.count()


@users_bp.route('/<int:user_id>', methods=['DELETE'])
@admin_required
def delete_user(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    if user.id == request.admin_user.id:
        return jsonify({'error': 'You cannot delete your own account.'}), 400
    if user.role in ADMIN_ROLES and _superadmin_count(excluding=user.id) == 0:
        return jsonify({'error': 'At least one superadmin must remain.'}), 400

    username = user.username
    _delete_user_resources(user.id)
    db.session.delete(user)
    db.session.commit()
    record_audit('user.deleted', 'user', user_id, {'username': username})
    return jsonify({'message': f'User {username} and all owned records deleted'}), 200


def _delete_user_resources(user_id):
    """Remove a user's fleet records, respecting foreign-key order."""
    vehicles = Vehicle.query.filter_by(user_id=user_id).all()
    drivers = Driver.query.filter_by(user_id=user_id).all()
    vehicle_ids = [vehicle.id for vehicle in vehicles]
    driver_ids = [driver.id for driver in drivers]

    if vehicle_ids:
        Journey.query.filter(Journey.vehicle_id.in_(vehicle_ids)).delete(synchronize_session=False)
    if driver_ids:
        Journey.query.filter(Journey.driver_id.in_(driver_ids)).delete(synchronize_session=False)
    Journey.query.filter_by(user_id=user_id).delete(synchronize_session=False)

    for driver in drivers:
        db.session.delete(driver)
    for vehicle in vehicles:
        # Clear the circular driver<->vehicle assignment before removal.
        if vehicle.current_driver_id:
            vehicle.current_driver_id = None
        db.session.delete(vehicle)
    db.session.flush()


@users_bp.route('/audit-logs', methods=['GET'])
@admin_required
def list_audit_logs():
    args = pagination_args()
    query = AdminAuditLog.query

    action = (request.args.get('action') or '').strip()
    if action:
        query = query.filter(AdminAuditLog.action.like(f'{action}%'))

    total = query.count()
    items = (
        query.order_by(AdminAuditLog.created_at.desc())
        .limit(args['per_page'])
        .offset((args['page'] - 1) * args['per_page'])
        .all()
    )
    return paginated_response([log.to_dict() for log in items], total, args['page'], args['per_page'])

    if role not in ASSIGNABLE_ROLES:
        return jsonify({'error': 'Choose a valid role.'}), 400

    if User.query.filter(func.lower(User.username) == username).first():
        return jsonify({'error': 'Username already exists'}), 409
    if User.query.filter(func.lower(User.email) == email).first():
        return jsonify({'error': 'Email already exists'}), 409

    user = User(username=username, email=email, full_name=full_name, role=role)
    user.set_password(password)
    db.session.add(user)
    conflict = commit_or_conflict('Username or email already exists.')
    if conflict:
        return conflict

    record_audit('user.created', 'user', user.id, {'username': user.username, 'role': role})
    return jsonify(serialize_user(user)), 201
