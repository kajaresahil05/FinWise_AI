from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services.market_service import get_market_data_provider
from app import db
from app.models import RiskProfile, UserProfile
from datetime import datetime
import json
import math

investment_bp = Blueprint('investment', __name__)

@investment_bp.route('/market-summary', methods=['GET'])
@jwt_required()
def get_market_summary():
    try:
        provider = get_market_data_provider()
        summary = provider.get_market_summary()
        return jsonify(summary), 200
    except Exception as e:
        return jsonify({"error": f"Failed to retrieve market summary: {str(e)}"}), 500

@investment_bp.route('/historical/<path:symbol>', methods=['GET'])
@jwt_required()
def get_historical_data(symbol):
    if not symbol:
        return jsonify({"error": "Symbol is required"}), 400
    try:
        provider = get_market_data_provider()
        history = provider.get_historical_data(symbol)
        return jsonify({
            "symbol": symbol,
            "history": history
        }), 200
    except Exception as e:
        return jsonify({"error": f"Failed to retrieve historical data: {str(e)}"}), 500

@investment_bp.route('/stocks/search', methods=['GET'])
@jwt_required()
def search_stocks_route():
    query = request.args.get('q', '')
    if not query:
        return jsonify([]), 200
    try:
        provider = get_market_data_provider()
        results = provider.search_stocks(query)
        return jsonify(results), 200
    except Exception as e:
        return jsonify({"error": f"Failed to search stocks: {str(e)}"}), 500

@investment_bp.route('/stocks/analysis/<path:symbol>', methods=['GET'])
@jwt_required()
def get_stock_analysis_route(symbol):
    if not symbol:
        return jsonify({"error": "Symbol is required"}), 400
    try:
        provider = get_market_data_provider()
        analysis = provider.get_stock_analysis(symbol)
        return jsonify(analysis), 200
    except Exception as e:
        return jsonify({"error": f"Failed to retrieve stock analysis: {str(e)}"}), 500

@investment_bp.route('/mutual-funds/analysis/<path:symbol>', methods=['GET'])
@jwt_required()
def get_mutual_fund_analysis_route(symbol):
    if not symbol:
        return jsonify({"error": "Symbol is required"}), 400
    try:
        provider = get_market_data_provider()
        analysis = provider.get_mutual_fund_analysis(symbol)
        return jsonify(analysis), 200
    except Exception as e:
        return jsonify({"error": f"Failed to retrieve mutual fund analysis: {str(e)}"}), 500


def calculate_risk_profile(answers: dict) -> tuple:
    score = 0
    score += int(answers.get('age', 2))
    score += int(answers.get('horizon', 2))
    score += int(answers.get('experience', 2))
    score += int(answers.get('goal', 2))
    score += int(answers.get('reaction', 2))
    score += int(answers.get('income_stability', 2))
    score += int(answers.get('savings_rate', 2))
    score += int(answers.get('obligations', 2))
    
    if score < 15:
        risk_level = 'Conservative'
    elif score <= 25:
        risk_level = 'Moderate'
    else:
        risk_level = 'Aggressive'
        
    return score, risk_level


@investment_bp.route('/risk-profile', methods=['POST'])
@jwt_required()
def submit_risk_profile():
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    
    answers = data.get('answers')
    if not answers or not isinstance(answers, dict):
        return jsonify({"error": "Questionnaire answers dict is required"}), 400
        
    try:
        score, risk_level = calculate_risk_profile(answers)
    except Exception as e:
        return jsonify({"error": f"Invalid answers data format: {str(e)}"}), 400
        
    risk_profile = RiskProfile(
        user_id=user_id,
        score=score,
        risk_level=risk_level,
        answers_json=json.dumps(answers)
    )
    db.session.add(risk_profile)
    
    profile = UserProfile.query.filter_by(user_id=user_id).first()
    if profile:
        profile.risk_tolerance = risk_level
        profile.updated_at = datetime.utcnow()
        
    db.session.commit()
    
    return jsonify({
        "message": "Risk profile updated successfully",
        "risk_profile": risk_profile.to_dict()
    }), 201


@investment_bp.route('/risk-profile/latest', methods=['GET'])
@jwt_required()
def get_latest_risk_profile():
    user_id = get_jwt_identity()
    risk_profile = RiskProfile.query.filter_by(user_id=user_id).order_by(RiskProfile.created_at.desc()).first()
    if not risk_profile:
        profile = UserProfile.query.filter_by(user_id=user_id).first()
        risk_level = profile.risk_tolerance if profile else 'Moderate'
        return jsonify({
            "risk_level": risk_level,
            "score": 20,
            "answers": {}
        }), 200
        
    return jsonify(risk_profile.to_dict()), 200


@investment_bp.route('/risk-profile/history', methods=['GET'])
@jwt_required()
def get_risk_profile_history():
    user_id = get_jwt_identity()
    history = RiskProfile.query.filter_by(user_id=user_id).order_by(RiskProfile.created_at.desc()).all()
    return jsonify([rp.to_dict() for rp in history]), 200


@investment_bp.route('/recommendations', methods=['POST', 'GET'])
@jwt_required()
def get_recommendations_route():
    from app.services.recommendation_service import generate_recommendations
    try:
        user_id = get_jwt_identity()
        request_data = request.get_json(silent=True) or {}
        monthly_investable = None
        if "monthly_investable" in request_data:
            try:
                monthly_investable = float(request_data["monthly_investable"])
            except (TypeError, ValueError):
                return jsonify({"error": "Monthly investment amount must be a positive number."}), 400
            if not math.isfinite(monthly_investable) or not 0 < monthly_investable <= 9999999999.99:
                return jsonify({"error": "Monthly investment amount must be greater than 0 and no more than 9,999,999,999.99."}), 400

        recs = generate_recommendations(user_id, monthly_investable_override=monthly_investable)
        if monthly_investable is not None:
            profile = UserProfile.query.filter_by(user_id=user_id).first()
            if profile:
                profile.investment_amount = monthly_investable
                db.session.commit()
        return jsonify(recs), 200
    except Exception as e:
        return jsonify({"error": f"Failed to generate recommendations: {str(e)}"}), 500


@investment_bp.route('/simulate', methods=['POST'])
@jwt_required()
def simulate_investment():
    data = request.get_json() or {}
    
    sim_type = data.get('type')  # 'sip' or 'lump_sum'
    amount = data.get('amount')
    duration = data.get('duration')
    return_rate = data.get('return_rate')
    
    if not all([sim_type, amount is not None, duration is not None, return_rate is not None]):
        return jsonify({"error": "Missing required fields: type, amount, duration, return_rate"}), 400
        
    if sim_type not in ['sip', 'lump_sum']:
        return jsonify({"error": "Invalid type. Must be 'sip' or 'lump_sum'."}), 400
        
    try:
        amt = float(amount)
        dur = int(duration)
        rate = float(return_rate)
        if amt <= 0 or dur <= 0 or rate < 0:
            return jsonify({"error": "amount, duration, and return_rate must be positive numbers."}), 400
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid input format. Check numbers."}), 400
        
    projections = []
    
    if sim_type == 'sip':
        monthly_rate = (rate / 12.0) / 100.0
        
        for y in range(1, dur + 1):
            n = y * 12
            total_invested = amt * n
            if monthly_rate > 0:
                fv = amt * (((1 + monthly_rate)**n - 1) / monthly_rate) * (1 + monthly_rate)
            else:
                fv = total_invested
            est_returns = fv - total_invested
            projections.append({
                "year": y,
                "total_invested": round(total_invested, 2),
                "estimated_returns": round(max(0.0, est_returns), 2),
                "future_value": round(fv, 2)
            })
    else:
        annual_rate = rate / 100.0
        
        for y in range(1, dur + 1):
            total_invested = amt
            fv = amt * ((1 + annual_rate)**y)
            est_returns = fv - total_invested
            projections.append({
                "year": y,
                "total_invested": round(total_invested, 2),
                "estimated_returns": round(max(0.0, est_returns), 2),
                "future_value": round(fv, 2)
            })
            
    final_point = projections[-1]
    
    return jsonify({
        "type": sim_type,
        "amount": amt,
        "duration": dur,
        "return_rate": rate,
        "summary": {
            "total_invested": final_point["total_invested"],
            "estimated_returns": final_point["estimated_returns"],
            "future_value": final_point["future_value"]
        },
        "projections": projections
    }), 200

