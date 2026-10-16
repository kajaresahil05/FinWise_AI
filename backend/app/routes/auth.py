from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from app.models import User, UserProfile
from app import db
import re

auth_bp = Blueprint('auth', __name__)

EMAIL_REGEX = r'^[\w\.-]+@[\w\.-]+\.\w+$'

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    
    email = data.get('email', '').strip()
    password = data.get('password', '').strip()
    name = data.get('name', '').strip()
    
    if not email or not password or not name:
        return jsonify({"error": "Missing required fields: email, password, name"}), 400
        
    if not re.match(EMAIL_REGEX, email):
        return jsonify({"error": "Invalid email address format"}), 400
        
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters long"}), 400
        
    # Check if user already exists
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email is already registered"}), 400
        
    try:
        # Create User
        new_user = User(email=email)
        new_user.set_password(password)
        db.session.add(new_user)
        db.session.flush()  # to get new_user.id
        
        # Create default UserProfile
        new_profile = UserProfile(
            user_id=new_user.id,
            name=name,
            monthly_income=0.0,
            monthly_expenses=0.0,
            monthly_savings=0.0,
            investment_amount=0.0
        )
        db.session.add(new_profile)
        db.session.commit()
        
        # Create access token immediately upon registration
        access_token = create_access_token(identity=str(new_user.id))
        
        return jsonify({
            "message": "User registered successfully",
            "access_token": access_token,
            "user": {
                "id": new_user.id,
                "email": new_user.email,
                "name": new_profile.name
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "An error occurred during registration. Please try again."}), 500


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    
    email = data.get('email', '').strip()
    password = data.get('password', '').strip()
    
    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400
        
    user = User.query.filter_by(email=email).first()
    
    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid email or password"}), 401
        
    access_token = create_access_token(identity=str(user.id))
    
    profile = user.profile
    name = profile.name if profile else "User"
    
    return jsonify({
        "message": "Login successful",
        "access_token": access_token,
        "user": {
            "id": user.id,
            "email": user.email,
            "name": name
        }
    }), 200


@auth_bp.route('/logout', methods=['POST'])
def logout():
    # Client will discard the JWT, but we can confirm the action.
    return jsonify({"message": "Logout successful"}), 200


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    current_user_id = get_jwt_identity()
    user = db.session.get(User, int(current_user_id))
    
    if not user:
        return jsonify({"error": "User not found"}), 444
        
    profile_data = user.profile.to_dict() if user.profile else {}
    
    return jsonify({
        "user": {
            "id": user.id,
            "email": user.email,
            "profile": profile_data
        }
    }), 200


@auth_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    current_user_id = get_jwt_identity()
    user = db.session.get(User, int(current_user_id))
    
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    data = request.get_json() or {}
    profile = user.profile
    
    if not profile:
        profile = UserProfile(user_id=user.id)
        db.session.add(profile)
        
    # Update profile fields
    if 'name' in data:
        profile.name = data['name'].strip()
    if 'age' in data:
        profile.age = data['age']
    if 'monthly_income' in data:
        profile.monthly_income = data['monthly_income']
    if 'monthly_expenses' in data:
        profile.monthly_expenses = data['monthly_expenses']
    if 'monthly_savings' in data:
        profile.monthly_savings = data['monthly_savings']
    if 'investment_amount' in data:
        profile.investment_amount = data['investment_amount']
    if 'investment_horizon' in data:
        profile.investment_horizon = data['investment_horizon']
    if 'risk_tolerance' in data:
        profile.risk_tolerance = data['risk_tolerance']
    if 'currency' in data:
        profile.currency = data['currency']
        
    try:
        db.session.commit()
        return jsonify({
            "message": "Profile updated successfully",
            "profile": profile.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to update profile"}), 500
