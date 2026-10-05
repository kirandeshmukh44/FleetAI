from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from app.models import User
from app.database.db import db
from app.utils.validation import EMAIL_RE, NAME_RE, USERNAME_RE, clean

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json(silent=True) or {}
    username = clean(data.get('username'))
    email = clean(data.get('email'))
    full_name = clean(data.get('full_name')) or None
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400
    if not USERNAME_RE.fullmatch(username):
        return jsonify({'error': 'Username must start with a letter and be 3–30 characters.'}), 400
    if not isinstance(password, str) or not 6 <= len(password) <= 128:
        return jsonify({'error': 'Password must be between 6 and 128 characters.'}), 400
    
    user = User.query.filter_by(username=username).first()
    
    if user and user.check_password(password):
        access_token = create_access_token(identity=str(user.id))
        return jsonify({
            'access_token': access_token,
            'user': user.to_dict()
        }), 200
    
    return jsonify({'error': 'Invalid credentials'}), 401

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json(silent=True) or {}
    username = clean(data.get('username'))
    full_name = clean(data.get('full_name')) or None
    email = clean(data.get('email'))
    password = data.get('password')
    
    if not username or not email or not password:
        return jsonify({'error': 'All fields required'}), 400
    if not USERNAME_RE.fullmatch(username):
        return jsonify({'error': 'Username must start with a letter and be 3–30 characters.'}), 400
    if full_name and not NAME_RE.fullmatch(full_name):
        return jsonify({'error': 'Enter a valid full name.'}), 400
    if not EMAIL_RE.fullmatch(email):
        return jsonify({'error': 'Enter a valid email address.'}), 400
    if not isinstance(password, str) or not 6 <= len(password) <= 128:
        return jsonify({'error': 'Password must be between 6 and 128 characters.'}), 400
    
    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Username already exists'}), 400
    
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already exists'}), 400
    
    user = User(username=username, full_name=full_name, email=email)
    user.set_password(password)
    
    db.session.add(user)
    db.session.commit()
    
    return jsonify({'message': 'User created successfully', 'user': user.to_dict()}), 201

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    user_id = get_jwt_identity()
    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        return jsonify({'error': 'Invalid token identity'}), 401
    user = User.query.get(user_id)
    if user:
        return jsonify(user.to_dict()), 200
    return jsonify({'error': 'User not found'}), 404

@auth_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    user_id = get_jwt_identity()
    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        return jsonify({'error': 'Invalid token identity'}), 401
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    data = request.get_json(silent=True) or {}
    new_username = data.get('username')
    new_email = data.get('email')
    current_password = data.get('current_password')
    new_password = data.get('new_password')

    if new_username and not USERNAME_RE.fullmatch(clean(new_username)):
        return jsonify({'error': 'Username must start with a letter and be 3–30 characters.'}), 400
    if new_email and not EMAIL_RE.fullmatch(clean(new_email)):
        return jsonify({'error': 'Enter a valid email address.'}), 400
    if new_password and (not isinstance(new_password, str) or not 6 <= len(new_password) <= 128):
        return jsonify({'error': 'New password must be between 6 and 128 characters.'}), 400

    if new_username and new_username != user.username:
        if User.query.filter(User.username == new_username, User.id != user.id).first():
            return jsonify({'error': 'Username already taken'}), 400
        user.username = new_username

    if new_email and new_email != user.email:
        if User.query.filter(User.email == new_email, User.id != user.id).first():
            return jsonify({'error': 'Email already registered'}), 400
        user.email = new_email

    if new_password:
        if not current_password or not user.check_password(current_password):
            return jsonify({'error': 'Current password is incorrect'}), 400
        user.set_password(new_password)

    db.session.commit()
    return jsonify({'message': 'Profile updated successfully', 'user': user.to_dict()}), 200
