from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import PortfolioHolding
from app.services.portfolio_service import get_portfolio_summary
from app.services.market_service import get_market_data_provider

portfolio_bp = Blueprint('portfolio', __name__)

@portfolio_bp.route('', methods=['GET'])
@jwt_required()
def get_portfolio():
    user_id = int(get_jwt_identity())
    try:
        summary = get_portfolio_summary(user_id)
        return jsonify(summary), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@portfolio_bp.route('/holdings', methods=['POST'])
@jwt_required()
def add_holding():
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}

    asset_class = data.get('asset_class')
    symbol = data.get('symbol')
    name = data.get('name')
    quantity = data.get('quantity')
    purchase_price = data.get('purchase_price')

    if not all([asset_class, symbol, name, quantity, purchase_price]):
        return jsonify({"error": "Missing required fields."}), 400

    if asset_class not in ["Stock", "Mutual Fund", "ETF"]:
        return jsonify({"error": "Invalid asset class. Must be Stock, Mutual Fund, or ETF."}), 400

    try:
        qty = float(quantity)
        price = float(purchase_price)
        if qty <= 0 or price <= 0:
            return jsonify({"error": "Quantity and purchase price must be greater than zero."}), 400
    except ValueError:
        return jsonify({"error": "Invalid quantity or purchase price value."}), 400

    try:
        holding = PortfolioHolding(
            user_id=user_id,
            asset_class=asset_class,
            symbol=symbol,
            name=name,
            quantity=qty,
            purchase_price=price
        )
        db.session.add(holding)
        db.session.commit()
        return jsonify({"message": "Holding added successfully", "holding": holding.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@portfolio_bp.route('/holdings/<int:holding_id>', methods=['PUT'])
@jwt_required()
def update_holding(holding_id):
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}

    holding = PortfolioHolding.query.filter_by(id=holding_id, user_id=user_id).first()
    if not holding:
        return jsonify({"error": "Holding not found or unauthorized."}), 404

    quantity = data.get('quantity')
    purchase_price = data.get('purchase_price')

    try:
        if quantity is not None:
            qty = float(quantity)
            if qty <= 0:
                return jsonify({"error": "Quantity must be greater than zero."}), 400
            holding.quantity = qty
        
        if purchase_price is not None:
            price = float(purchase_price)
            if price <= 0:
                return jsonify({"error": "Purchase price must be greater than zero."}), 400
            holding.purchase_price = price
            
        db.session.commit()
        return jsonify({"message": "Holding updated successfully", "holding": holding.to_dict()}), 200
    except ValueError:
        return jsonify({"error": "Invalid quantity or purchase price numeric value."}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@portfolio_bp.route('/holdings/<int:holding_id>', methods=['DELETE'])
@jwt_required()
def delete_holding(holding_id):
    user_id = int(get_jwt_identity())
    
    holding = PortfolioHolding.query.filter_by(id=holding_id, user_id=user_id).first()
    if not holding:
        return jsonify({"error": "Holding not found or unauthorized."}), 404

    try:
        db.session.delete(holding)
        db.session.commit()
        return jsonify({"message": "Holding deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
