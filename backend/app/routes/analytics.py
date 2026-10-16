from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import Income, Expense, FinancialGoal
from datetime import datetime, date
from collections import defaultdict
import calendar

analytics_bp = Blueprint('analytics', __name__)

@analytics_bp.route('/summary', methods=['GET'])
@jwt_required()
def get_summary():
    user_id = get_jwt_identity()
    
    # 1. Fetch all records
    incomes = Income.query.filter_by(user_id=user_id).all()
    expenses = Expense.query.filter_by(user_id=user_id).all()
    goals = FinancialGoal.query.filter_by(user_id=user_id).all()
    
    # 2. Total sums
    total_income = sum(float(i.amount) for i in incomes)
    total_expense = sum(float(e.amount) for e in expenses)
    net_savings = total_income - total_expense
    savings_rate = (net_savings / total_income * 100) if total_income > 0 else 0
    
    # 3. Category distribution
    cat_map = defaultdict(float)
    for e in expenses:
        cat_map[e.category] += float(e.amount)
        
    category_distribution = [{"category": cat, "amount": amt} for cat, amt in cat_map.items()]
    
    # 4. Monthly Trend (last 6 months)
    monthly_data = []
    today = date.today()
    
    # Generate the last 6 months
    months_list = []
    current_year = today.year
    current_month = today.month
    
    for i in range(5, -1, -1):
        m = current_month - i
        y = current_year
        if m <= 0:
            m += 12
            y -= 1
        months_list.append((y, m))
        
    for y, m in months_list:
        month_label = f"{calendar.month_abbr[m]} {str(y)[2:]}"
        
        # Calculate income in this month
        inc_sum = 0.0
        for inc in incomes:
            if inc.date.year == y and inc.date.month == m:
                inc_sum += float(inc.amount)
                
        # Calculate expense in this month
        exp_sum = 0.0
        for exp in expenses:
            if exp.date.year == y and exp.date.month == m:
                exp_sum += float(exp.amount)
                
        monthly_data.append({
            "month": month_label,
            "income": inc_sum,
            "expenses": exp_sum,
            "savings": max(0.0, inc_sum - exp_sum)
        })
        
    # 5. Recent transactions
    merged_transactions = []
    for inc in incomes:
        merged_transactions.append({
            "id": f"income-{inc.id}",
            "type": "income",
            "amount": float(inc.amount),
            "category": inc.source,
            "date": inc.date.isoformat(),
            "description": inc.description or f"Income from {inc.source}"
        })
    for exp in expenses:
        merged_transactions.append({
            "id": f"expense-{exp.id}",
            "type": "expense",
            "amount": float(exp.amount),
            "category": exp.category,
            "date": exp.date.isoformat(),
            "description": exp.description or f"Paid to {exp.merchant or 'merchant'}"
        })
        
    # Sort descending by date
    merged_transactions.sort(key=lambda t: t["date"], reverse=True)
    recent_transactions = merged_transactions[:5]
    
    # 6. Active Goals progress
    goals_data = []
    for g in goals:
        progress = (float(g.current_amount) / float(g.target_amount) * 100) if g.target_amount > 0 else 0
        goals_data.append({
            "id": g.id,
            "name": g.name,
            "current_amount": float(g.current_amount),
            "target_amount": float(g.target_amount),
            "progress": min(100.0, progress),
            "target_date": g.target_date.isoformat()
        })
        
    return jsonify({
        "summary": {
            "total_income": total_income,
            "total_expense": total_expense,
            "net_savings": net_savings,
            "savings_rate": savings_rate
        },
        "category_distribution": category_distribution,
        "monthly_trend": monthly_data,
        "recent_transactions": recent_transactions,
        "goals": goals_data
    }), 200
