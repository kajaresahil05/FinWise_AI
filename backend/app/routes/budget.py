from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import Budget

budget_bp = Blueprint('budget', __name__)

@budget_bp.route('', methods=['GET'])
@jwt_required()
def get_budgets():
    user_id = get_jwt_identity()
    budgets = Budget.query.filter_by(user_id=user_id).all()
    return jsonify({"budgets": [b.to_dict() for b in budgets]}), 200

@budget_bp.route('', methods=['POST'])
@jwt_required()
def add_budget():
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    
    category = data.get('category')
    amount = data.get('amount')
    
    if not category or amount is None:
        return jsonify({"error": "Category and amount are required"}), 400
        
    try:
        amount_val = float(amount)
        if amount_val <= 0:
            return jsonify({"error": "Amount must be greater than 0"}), 400
    except ValueError:
        return jsonify({"error": "Invalid amount format"}), 400
        
    # Check if budget already exists for this category
    existing = Budget.query.filter_by(user_id=user_id, category=category).first()
    if existing:
        return jsonify({"error": f"A budget for the '{category}' category already exists."}), 400
        
    t1 = data.get('warning_threshold_1', 70.0)
    t2 = data.get('warning_threshold_2', 90.0)
    
    try:
        t1_val = float(t1)
        t2_val = float(t2)
        if t1_val < 0 or t1_val > 100 or t2_val < 0 or t2_val > 100:
            return jsonify({"error": "Thresholds must be percentages between 0 and 100"}), 400
    except ValueError:
        return jsonify({"error": "Invalid threshold values"}), 400
        
    budget = Budget(
        user_id=user_id,
        category=category,
        amount=amount_val,
        warning_threshold_1=t1_val,
        warning_threshold_2=t2_val
    )
    
    db.session.add(budget)
    db.session.commit()
    
    return jsonify({"message": "Budget created successfully", "budget": budget.to_dict()}), 201

@budget_bp.route('/<int:budget_id>', methods=['PUT'])
@jwt_required()
def update_budget(budget_id):
    user_id = get_jwt_identity()
    budget = Budget.query.filter_by(id=budget_id, user_id=user_id).first()
    
    if not budget:
        return jsonify({"error": "Budget record not found"}), 404
        
    data = request.get_json() or {}
    
    if 'amount' in data:
        try:
            amount_val = float(data['amount'])
            if amount_val <= 0:
                return jsonify({"error": "Amount must be greater than 0"}), 400
            budget.amount = amount_val
        except ValueError:
            return jsonify({"error": "Invalid amount format"}), 400
            
    if 'category' in data:
        new_cat = data['category']
        if new_cat != budget.category:
            existing = Budget.query.filter_by(user_id=user_id, category=new_cat).first()
            if existing:
                return jsonify({"error": f"A budget for the '{new_cat}' category already exists."}), 400
            budget.category = new_cat
            
    if 'warning_threshold_1' in data:
        try:
            t1_val = float(data['warning_threshold_1'])
            if t1_val < 0 or t1_val > 100:
                return jsonify({"error": "Threshold 1 must be between 0 and 100"}), 400
            budget.warning_threshold_1 = t1_val
        except ValueError:
            return jsonify({"error": "Invalid threshold 1"}), 400
            
    if 'warning_threshold_2' in data:
        try:
            t2_val = float(data['warning_threshold_2'])
            if t2_val < 0 or t2_val > 100:
                return jsonify({"error": "Threshold 2 must be between 0 and 100"}), 400
            budget.warning_threshold_2 = t2_val
        except ValueError:
            return jsonify({"error": "Invalid threshold 2"}), 400
            
    db.session.commit()
    return jsonify({"message": "Budget updated successfully", "budget": budget.to_dict()}), 200

@budget_bp.route('/<int:budget_id>', methods=['DELETE'])
@jwt_required()
def delete_budget(budget_id):
    user_id = get_jwt_identity()
    budget = Budget.query.filter_by(id=budget_id, user_id=user_id).first()
    
    if not budget:
        return jsonify({"error": "Budget record not found"}), 404
        
    db.session.delete(budget)
    db.session.commit()
    return jsonify({"message": "Budget deleted successfully"}), 200
