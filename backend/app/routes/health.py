from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import FinancialScore, EmergencyFund, UserProfile, Expense
from app.services.health_service import calculate_financial_health_score
from datetime import datetime, date

health_bp = Blueprint('health', __name__)

@health_bp.route('/score', methods=['GET'])
@jwt_required()
def get_health_score():
    user_id = int(get_jwt_identity())
    try:
        score_data = calculate_financial_health_score(user_id)
        return jsonify(score_data), 200
    except Exception as e:
        return jsonify({"error": f"Failed to compute health score: {str(e)}"}), 500

@health_bp.route('/history', methods=['GET'])
@jwt_required()
def get_score_history():
    user_id = int(get_jwt_identity())
    try:
        # Get last 12 health score records to show a trend chart
        scores = FinancialScore.query.filter_by(user_id=user_id).order_by(FinancialScore.created_at.desc()).limit(12).all()
        # Return in ascending chronological order for charts
        scores.reverse()
        return jsonify([s.to_dict() for s in scores]), 200
    except Exception as e:
        return jsonify({"error": f"Failed to retrieve score history: {str(e)}"}), 500

@health_bp.route('/emergency', methods=['GET'])
@jwt_required()
def get_emergency_fund():
    user_id = int(get_jwt_identity())
    try:
        profile = UserProfile.query.filter_by(user_id=user_id).first()
        essential_monthly = float(profile.monthly_expenses or 0.0) if profile else 0.0
        
        # If monthly expenses not configured, estimate based on actual expenses this month
        if essential_monthly <= 0:
            today = date.today()
            start_of_month = date(today.year, today.month, 1)
            expenses_curr_month = Expense.query.filter(Expense.user_id == user_id, Expense.date >= start_of_month).all()
            essential_monthly = sum(float(e.amount) for e in expenses_curr_month)
            
        ef = EmergencyFund.query.filter_by(user_id=user_id).first()
        current_amount = float(ef.current_amount) if ef else 0.0
        target_months = ef.target_months if ef else 6
        
        target_amount = essential_monthly * target_months
        remaining = max(0.0, target_amount - current_amount)
        
        # Suggest contribution: aim to build the remaining in 12 months
        suggested_monthly = remaining / 12.0
        
        return jsonify({
            "essential_monthly": essential_monthly,
            "current_amount": current_amount,
            "target_months": target_months,
            "target_amount": target_amount,
            "remaining": remaining,
            "suggested_monthly_contribution": suggested_monthly
        }), 200
    except Exception as e:
        return jsonify({"error": f"Failed to fetch emergency fund: {str(e)}"}), 500

@health_bp.route('/emergency', methods=['POST'])
@jwt_required()
def update_emergency_fund():
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}
    
    current_amount = data.get('current_amount')
    target_months = data.get('target_months', 6)
    
    if current_amount is None:
        return jsonify({"error": "current_amount is required"}), 400
        
    try:
        ef = EmergencyFund.query.filter_by(user_id=user_id).first()
        if not ef:
            ef = EmergencyFund(user_id=user_id)
            db.session.add(ef)
            
        ef.current_amount = current_amount
        ef.target_months = int(target_months)
        ef.updated_at = datetime.utcnow()
        
        db.session.commit()
        return jsonify({"message": "Emergency fund targets updated successfully", "emergency_fund": ef.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to update emergency fund targets: {str(e)}"}), 500
