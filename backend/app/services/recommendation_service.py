import os
import json
from app.services.market_service import get_market_data_provider
from app.services.ai_service import get_ai_provider, get_user_financial_context
from app.models import RiskProfile, UserProfile

def generate_recommendations(user_id: int, monthly_investable_override=None) -> dict:
    # 1. Fetch user context & risk profile
    context = get_user_financial_context(user_id)
    risk_level = context.get("risk_tolerance", "Moderate")
    
    monthly_income = context.get("profile_monthly_income", 0.0)
    monthly_expenses = context.get("profile_monthly_expenses", 0.0)
    monthly_savings_profile = context.get("profile_monthly_savings_target", 0.0)
    profile_investment_amount = context.get("profile_investment_amount", 0.0)
    
    # Calculate monthly investable
    if monthly_investable_override is not None:
        monthly_investable = float(monthly_investable_override)
    elif profile_investment_amount > 0:
        monthly_investable = profile_investment_amount
    else:
        monthly_investable = monthly_savings_profile if monthly_savings_profile > 0 else max(0.0, monthly_income - monthly_expenses)
    if monthly_investable == 0.0:
        monthly_investable = 10000.0  # Safe fallback default
        
    provider = get_market_data_provider()
    
    # Define allocation configurations
    if risk_level == "Conservative":
        allocation = [
            {"asset_class": "Debt & Fixed Income", "percentage": 60, "sub_allocation": [
                {"type": "Fixed Deposits & PPF", "percentage": 40},
                {"type": "Debt Mutual Funds", "percentage": 20}
            ]},
            {"asset_class": "Large Cap Equities", "percentage": 20, "sub_allocation": [
                {"type": "Index Funds", "percentage": 10},
                {"type": "Bluechip Stocks", "percentage": 10}
            ]},
            {"asset_class": "Gold", "percentage": 10, "sub_allocation": []},
            {"asset_class": "Cash & Liquid", "percentage": 10, "sub_allocation": []}
        ]
        # Candidate selection
        stocks = ["TCS.BSE", "HDFCBANK.BSE"]
        mutual_funds = ["HDFC_NIF50", "SBI_BLUE"]
        etfs = ["NIFTYBEES.BSE", "SETFNIF50.BSE"]
        diversification_alerts = [
            "Conservative allocation prioritizes capital preservation. High exposure to individual volatile stocks is discouraged."
        ]
    elif risk_level == "Aggressive":
        allocation = [
            {"asset_class": "Equities & Growth", "percentage": 80, "sub_allocation": [
                {"type": "Index Funds", "percentage": 30},
                {"type": "Flexi / Growth Funds", "percentage": 30},
                {"type": "Small Cap / Emerging", "percentage": 20}
            ]},
            {"asset_class": "Debt & Bonds", "percentage": 10, "sub_allocation": [
                {"type": "Corporate Bonds", "percentage": 10}
            ]},
            {"asset_class": "Gold", "percentage": 5, "sub_allocation": []},
            {"asset_class": "Cash & Short Term", "percentage": 5, "sub_allocation": []}
        ]
        stocks = ["INFY.BSE", "RELIANCE.BSE", "TCS.BSE"]
        mutual_funds = ["PP_FLEXI", "NIPP_SMALL"]
        etfs = ["MON100.BSE"]
        diversification_alerts = [
            "Aggressive allocation carries substantial volatility risk. Ensure you have at least a 6-month emergency fund saved."
        ]
    else:
        # Moderate
        allocation = [
            {"asset_class": "Equities", "percentage": 60, "sub_allocation": [
                {"type": "Large Cap / Index", "percentage": 40},
                {"type": "Flexi Cap Funds", "percentage": 20}
            ]},
            {"asset_class": "Debt & Fixed Income", "percentage": 25, "sub_allocation": [
                {"type": "Fixed Deposits / PPF", "percentage": 15},
                {"type": "Debt Mutual Funds", "percentage": 10}
            ]},
            {"asset_class": "Gold", "percentage": 10, "sub_allocation": []},
            {"asset_class": "Cash & Liquid", "percentage": 5, "sub_allocation": []}
        ]
        stocks = ["RELIANCE.BSE", "HDFCBANK.BSE", "TCS.BSE"]
        mutual_funds = ["SBI_BLUE", "PP_FLEXI", "HDFC_NIF50"]
        etfs = ["NIFTYBEES.BSE", "MON100.BSE"]
        diversification_alerts = [
            "Moderate allocation balances equity growth with a stable fixed assets buffer."
        ]

    for item in allocation:
        item["monthly_amount"] = round(monthly_investable * item["percentage"] / 100, 2)
        for sub_item in item["sub_allocation"]:
            sub_item["monthly_amount"] = round(monthly_investable * sub_item["percentage"] / 100, 2)

    # Fetch rich metrics for candidates
    stock_candidates = []
    for sym in stocks:
        try:
            analysis = provider.get_stock_analysis(sym)
            stock_candidates.append({
                "symbol": sym,
                "name": analysis.get("name", sym),
                "sector": analysis.get("sector", "Other"),
                "price": analysis.get("price", 0.0),
                "fundamental_score": analysis.get("fundamental_score", 0),
                "volatility": analysis.get("volatility", "Medium"),
                "suitability_score": analysis.get("suitability_score", 70)
            })
        except Exception:
            stock_candidates.append({
                "symbol": sym,
                "name": sym,
                "sector": "Unknown",
                "price": 0.0,
                "fundamental_score": 70,
                "volatility": "Medium",
                "suitability_score": 70
            })

    mf_candidates = []
    for sym in mutual_funds:
        try:
            analysis = provider.get_mutual_fund_analysis(sym)
            mf_candidates.append({
                "symbol": sym,
                "name": analysis.get("name", sym),
                "category": analysis.get("category", "Equity"),
                "nav": analysis.get("nav", 0.0),
                "expense_ratio": analysis.get("expense_ratio", 0.0),
                "fund_consistency_score": analysis.get("fund_consistency_score", 70),
                "suitability_score": analysis.get("suitability_score", 70)
            })
        except Exception:
            mf_candidates.append({
                "symbol": sym,
                "name": sym,
                "category": "Equity",
                "nav": 100.0,
                "expense_ratio": 1.2,
                "fund_consistency_score": 75,
                "suitability_score": 75
            })

    etf_candidates = []
    # Pull ETF details
    try:
        summary = provider.get_market_summary()
        etfs_list = summary.get("etfs", [])
        for sym in etfs:
            matched = next((x for x in etfs_list if x["symbol"] == sym), None)
            if matched:
                etf_candidates.append({
                    "symbol": sym,
                    "name": matched["name"],
                    "price": matched["price"],
                    "change_percent": matched["change_percent"]
                })
            else:
                etf_candidates.append({
                    "symbol": sym,
                    "name": sym,
                    "price": 150.00,
                    "change_percent": 0.50
                })
    except Exception:
        for sym in etfs:
            etf_candidates.append({
                "symbol": sym,
                "name": sym,
                "price": 150.00,
                "change_percent": 0.0
            })

    # Assemble recommendation object
    recommendation_data = {
        "risk_level": risk_level,
        "monthly_investable": float(monthly_investable),
        "allocation": allocation,
        "stocks": stock_candidates,
        "mutual_funds": mf_candidates,
        "etfs": etf_candidates,
        "diversification_alerts": diversification_alerts
    }

    # Generate AI explanation
    ai_provider = get_ai_provider()
    explanation = ai_provider.explain_recommendation(recommendation_data)
    recommendation_data["explanation"] = explanation

    return recommendation_data
