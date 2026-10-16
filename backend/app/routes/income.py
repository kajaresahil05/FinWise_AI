from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import Income
from datetime import datetime, date

income_bp = Blueprint('income', __name__)

@income_bp.route('', methods=['GET'])
@jwt_required()
def get_incomes():
    user_id = get_jwt_identity()
    
    # Query parameters
    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')
    source = request.args.get('source')
    
    query = Income.query.filter_by(user_id=user_id)
    
    if start_date_str:
        try:
            start_date = date.fromisoformat(start_date_str)
            query = query.filter(Income.date >= start_date)
        except ValueError:
            return jsonify({"error": "Invalid start_date format. Use YYYY-MM-DD"}), 400
            
    if end_date_str:
        try:
            end_date = date.fromisoformat(end_date_str)
            query = query.filter(Income.date <= end_date)
        except ValueError:
            return jsonify({"error": "Invalid end_date format. Use YYYY-MM-DD"}), 400
            
    if source:
        query = query.filter(Income.source.ilike(f"%{source}%"))
        
    incomes = query.order_by(Income.date.desc()).all()
    return jsonify({"incomes": [inc.to_dict() for inc in incomes]}), 200

@income_bp.route('', methods=['POST'])
@jwt_required()
def add_income():
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    
    # Validation
    amount = data.get('amount')
    source = data.get('source')
    date_str = data.get('date')
    
    if amount is None or source is None or date_str is None:
        return jsonify({"error": "Amount, source, and date are required"}), 400
        
    try:
        amount_val = float(amount)
        if amount_val <= 0:
            return jsonify({"error": "Amount must be greater than 0"}), 400
    except ValueError:
        return jsonify({"error": "Invalid amount format"}), 400
        
    try:
        date_val = date.fromisoformat(date_str)
    except ValueError:
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400
        
    income = Income(
        user_id=user_id,
        amount=amount_val,
        source=source,
        date=date_val,
        description=data.get('description', ''),
        is_recurring=bool(data.get('is_recurring', False)),
        recurrence_period=data.get('recurrence_period') if data.get('is_recurring') else None
    )
    
    db.session.add(income)
    db.session.commit()
    
    return jsonify({"message": "Income added successfully", "income": income.to_dict()}), 201

@income_bp.route('/<int:income_id>', methods=['PUT'])
@jwt_required()
def update_income(income_id):
    user_id = get_jwt_identity()
    income = Income.query.filter_by(id=income_id, user_id=user_id).first()
    
    if not income:
        return jsonify({"error": "Income record not found"}), 404
        
    data = request.get_json() or {}
    
    if 'amount' in data:
        try:
            amount_val = float(data['amount'])
            if amount_val <= 0:
                return jsonify({"error": "Amount must be greater than 0"}), 400
            income.amount = amount_val
        except ValueError:
            return jsonify({"error": "Invalid amount format"}), 400
            
    if 'date' in data:
        try:
            income.date = date.fromisoformat(data['date'])
        except ValueError:
            return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400
            
    if 'source' in data:
        income.source = data['source']
        
    if 'description' in data:
        income.description = data['description']
        
    if 'is_recurring' in data:
        income.is_recurring = bool(data['is_recurring'])
        if income.is_recurring:
            income.recurrence_period = data.get('recurrence_period', income.recurrence_period)
        else:
            income.recurrence_period = None
            
    if 'recurrence_period' in data and income.is_recurring:
        income.recurrence_period = data['recurrence_period']
        
    db.session.commit()
    return jsonify({"message": "Income updated successfully", "income": income.to_dict()}), 200

@income_bp.route('/<int:income_id>', methods=['DELETE'])
@jwt_required()
def delete_income(income_id):
    user_id = get_jwt_identity()
    income = Income.query.filter_by(id=income_id, user_id=user_id).first()
    
    if not income:
        return jsonify({"error": "Income record not found"}), 404
        
    db.session.delete(income)
    db.session.commit()
    
    return jsonify({"message": "Income deleted successfully"}), 200
