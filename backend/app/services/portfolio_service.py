from app import db
from app.models import PortfolioHolding, RiskProfile
from app.services.market_service import get_market_data_provider

def get_portfolio_summary(user_id: int) -> dict:
    holdings = PortfolioHolding.query.filter_by(user_id=user_id).all()
    provider = get_market_data_provider()
    
    # Get latest risk profile or default
    latest_profile = RiskProfile.query.filter_by(user_id=user_id).order_by(RiskProfile.created_at.desc()).first()
    risk_level = latest_profile.risk_level if latest_profile else "Moderate"

    detailed_holdings = []
    total_invested = 0.0
    total_current = 0.0
    
    asset_types = {}
    sectors = {}

    for h in holdings:
        qty = float(h.quantity)
        buy_price = float(h.purchase_price)
        invested = qty * buy_price
        
        current_price = buy_price
        sector = "Other"
        name = h.name
        
        symbol = h.symbol
        ac = h.asset_class

        if ac == "Stock":
            try:
                data = provider.get_stock_analysis(symbol)
                current_price = float(data.get("price") or buy_price)
                sector = data.get("sector") or "Other"
                name = data.get("name") or h.name
            except Exception:
                pass
        elif ac == "Mutual Fund":
            try:
                data = provider.get_mutual_fund_analysis(symbol)
                current_price = float(data.get("nav") or buy_price)
                sector = data.get("category") or "Other"
                name = data.get("name") or h.name
            except Exception:
                pass
        elif ac == "ETF":
            sector = "Index/ETF"
            try:
                summary = provider.get_market_summary()
                for etf in summary.get("etfs", []):
                    if etf.get("symbol") == symbol:
                        current_price = float(etf.get("price") or buy_price)
                        name = etf.get("name") or h.name
                        break
            except Exception:
                pass
        
        current_value = qty * current_price
        gain_loss = current_value - invested
        gain_percent = (gain_loss / invested * 100.0) if invested > 0 else 0.0
        
        total_invested += invested
        total_current += current_value
        
        asset_types[ac] = asset_types.get(ac, 0.0) + current_value
        sectors[sector] = sectors.get(sector, 0.0) + current_value
        
        detailed_holdings.append({
            "id": h.id,
            "asset_class": ac,
            "symbol": symbol,
            "name": name,
            "quantity": qty,
            "purchase_price": buy_price,
            "current_price": current_price,
            "invested_value": round(invested, 2),
            "current_value": round(current_value, 2),
            "gain_loss": round(gain_loss, 2),
            "gain_loss_percent": round(gain_percent, 2),
            "sector": sector
        })

    total_gain_loss = total_current - total_invested
    total_gain_percent = (total_gain_loss / total_invested * 100.0) if total_invested > 0 else 0.0

    # Format allocations for frontend chart rendering
    asset_allocation = []
    sector_allocation = []
    
    if total_current > 0:
        for k, v in asset_types.items():
            asset_allocation.append({
                "name": k,
                "value": round(v, 2),
                "percentage": round((v / total_current) * 100, 1)
            })
        for k, v in sectors.items():
            sector_allocation.append({
                "name": k,
                "value": round(v, 2),
                "percentage": round((v / total_current) * 100, 1)
            })

    # Portfolio Health Scoring Logic
    health_score = 100
    issues = []
    suggestions = []
    
    if len(detailed_holdings) == 0:
        health_score = 100
        issues.append("No active portfolio holdings.")
        suggestions.append("Add your first stock, mutual fund, or ETF holding to start tracking portfolio health.")
    else:
        # Concentration checking
        max_single_holding_pct = 0.0
        max_holding_symbol = ""
        
        for dh in detailed_holdings:
            pct = (dh["current_value"] / total_current) * 100
            if pct > max_single_holding_pct:
                max_single_holding_pct = pct
                max_holding_symbol = dh["symbol"]

        if max_single_holding_pct > 30.0:
            penalty = min(20, int((max_single_holding_pct - 30.0) * 0.5))
            health_score -= penalty
            issues.append(f"High concentration in {max_holding_symbol} ({max_single_holding_pct:.1f}% of total).")
            suggestions.append(f"Spread capital across other holdings to reduce dependency on {max_holding_symbol}.")
            
        for sec, sec_val in sectors.items():
            sec_pct = (sec_val / total_current) * 100
            if sec_pct > 40.0 and sec != "Other":
                health_score -= 15
                issues.append(f"High sector concentration in {sec} ({sec_pct:.1f}% of total).")
                suggestions.append(f"Allocate new capital to other sectors to diversify from {sec}.")

        # Risk Profile Alignment check
        equity_val = asset_types.get("Stock", 0.0) + asset_types.get("Mutual Fund", 0.0) * 0.8
        equity_pct = (equity_val / total_current) * 100 if total_current > 0 else 0.0
        
        if risk_level == "Conservative" and equity_pct > 40.0:
            health_score -= 20
            issues.append(f"Portfolio has high equity exposure ({equity_pct:.1f}%) for a Conservative profile.")
            suggestions.append("Rebalance towards lower-risk instruments like debt funds or gold.")
        elif risk_level == "Aggressive" and equity_pct < 50.0:
            health_score -= 15
            issues.append(f"Portfolio has low equity exposure ({equity_pct:.1f}%) for an Aggressive profile.")
            suggestions.append("Consider increasing equity allocations for long-term capital growth.")

    health_score = max(0, min(100, health_score))
    
    if len(detailed_holdings) > 0 and health_score >= 85:
        suggestions.append("Your portfolio is well-diversified and matches your risk appetite.")

    return {
        "holdings": detailed_holdings,
        "summary": {
            "total_invested": round(total_invested, 2),
            "total_current": round(total_current, 2),
            "total_gain_loss": round(total_gain_loss, 2),
            "total_gain_loss_percent": round(total_gain_percent, 2)
        },
        "asset_allocation": asset_allocation,
        "sector_allocation": sector_allocation,
        "health": {
            "score": health_score,
            "issues": issues,
            "suggestions": suggestions
        }
    }
