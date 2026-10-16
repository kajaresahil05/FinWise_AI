from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import FinancialGoal
from datetime import date

goal_bp = Blueprint('goal', __name__)

@goal_bp.route('', methods=['GET'])
@jwt_required()
def get_goals():
    user_id = get_jwt_identity()
    goals = FinancialGoal.query.filter_by(user_id=user_id).all()
    return jsonify({"goals": [g.to_dict() for g in goals]}), 200

@goal_bp.route('', methods=['POST'])
@jwt_required()
def add_goal():
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    
    name = data.get('name')
    target_amount = data.get('target_amount')
    target_date_str = data.get('target_date')
    
    if not name or target_amount is None or target_date_str is None:
        return jsonify({"error": "Goal name, target amount, and target date are required"}), 400
        
    try:
        target_val = float(target_amount)
        if target_val <= 0:
            return jsonify({"error": "Target amount must be greater than 0"}), 400
    except ValueError:
        return jsonify({"error": "Invalid target amount format"}), 400
        
    current_amount = data.get('current_amount', 0.0)
    try:
        current_val = float(current_amount)
        if current_val < 0:
            return jsonify({"error": "Current amount cannot be negative"}), 400
    except ValueError:
        return jsonify({"error": "Invalid current amount format"}), 400
        
    try:
        date_val = date.fromisoformat(target_date_str)
        if date_val < date.today():
            return jsonify({"error": "Target date cannot be in the past"}), 400
    except ValueError:
        return jsonify({"error": "Invalid target date format. Use YYYY-MM-DD"}), 400
        
    goal = FinancialGoal(
        user_id=user_id,
        name=name,
        target_amount=target_val,
        current_amount=current_val,
        target_date=date_val
    )
    
    db.session.add(goal)
    db.session.commit()
    
    return jsonify({"message": "Financial goal created successfully", "goal": goal.to_dict()}), 201

@goal_bp.route('/<int:goal_id>', methods=['PUT'])
@jwt_required()
def update_goal(goal_id):
    user_id = get_jwt_identity()
    goal = FinancialGoal.query.filter_by(id=goal_id, user_id=user_id).first()
    
    if not goal:
        return jsonify({"error": "Financial goal not found"}), 404
        
    data = request.get_json() or {}
    
    if 'name' in data:
        goal.name = data['name']
        
    if 'target_amount' in data:
        try:
            target_val = float(data['target_amount'])
            if target_val <= 0:
                return jsonify({"error": "Target amount must be greater than 0"}), 400
            goal.target_amount = target_val
        except ValueError:
            return jsonify({"error": "Invalid target amount format"}), 400
            
    if 'current_amount' in data:
        try:
            current_val = float(data['current_amount'])
            if current_val < 0:
                return jsonify({"error": "Current amount cannot be negative"}), 400
            goal.current_amount = current_val
        except ValueError:
            return jsonify({"error": "Invalid current amount format"}), 400
            
    if 'target_date' in data:
        try:
            date_val = date.fromisoformat(data['target_date'])
            if date_val < date.today():
                return jsonify({"error": "Target date cannot be in the past"}), 400
            goal.target_date = date_val
        except ValueError:
            return jsonify({"error": "Invalid target date format. Use YYYY-MM-DD"}), 400
            
    db.session.commit()
    return jsonify({"message": "Financial goal updated successfully", "goal": goal.to_dict()}), 200

@goal_bp.route('/<int:goal_id>', methods=['DELETE'])
@jwt_required()
def delete_goal(goal_id):
    user_id = get_jwt_identity()
    goal = FinancialGoal.query.filter_by(id=goal_id, user_id=user_id).first()
    
    if not goal:
        return jsonify({"error": "Financial goal not found"}), 404
        
    db.session.delete(goal)
    db.session.commit()
    return jsonify({"message": "Financial goal deleted successfully"}), 200
