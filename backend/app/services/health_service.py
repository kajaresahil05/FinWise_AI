from app.models import UserProfile, Income, Expense, Budget, FinancialGoal, EmergencyFund, FinancialScore
from app import db
from datetime import date, datetime
import json

def calculate_financial_health_score(user_id: int) -> dict:
    profile = UserProfile.query.filter_by(user_id=user_id).first()
    
    # 1. Base Variables
    currency = '₹'
    monthly_income_profile = 0.0
    monthly_expenses_profile = 0.0
    
    if profile:
        currency = '₹' if profile.currency == 'INR' else '$'
        monthly_income_profile = float(profile.monthly_income or 0.0)
        monthly_expenses_profile = float(profile.monthly_expenses or 0.0)
        
    today = date.today()
    start_of_month = date(today.year, today.month, 1)
    
    # Actual current month records
    incomes_curr_month = Income.query.filter(Income.user_id == user_id, Income.date >= start_of_month).all()
    expenses_curr_month = Expense.query.filter(Expense.user_id == user_id, Expense.date >= start_of_month).all()
    
    actual_income = sum(float(i.amount) for i in incomes_curr_month)
    actual_expense = sum(float(e.amount) for e in expenses_curr_month)
    
    base_income = actual_income if actual_income > 0 else monthly_income_profile
    base_expense = actual_expense if actual_expense > 0 else monthly_expenses_profile
    
    # --- SUB-SCORE 1: Savings Rate (Weight: 25%) ---
    net_savings = base_income - base_expense
    savings_rate = (net_savings / base_income * 100) if base_income > 0 else 0.0
    
    # If no income data exists at all, default to neutral (same as other pillars)
    if base_income <= 0 and base_expense <= 0:
        savings_score = 0.0
    elif savings_rate >= 30.0:
        savings_score = 100.0
    elif savings_rate <= 0.0:
        savings_score = 0.0
    else:
        savings_score = (savings_rate / 30.0) * 100.0
        
    # --- SUB-SCORE 2: Budget Adherence (Weight: 25%) ---
    budgets = Budget.query.filter_by(user_id=user_id).all()
    if not budgets:
        budget_score = 0.0  # no budgets set yet
    else:
        bud_scores = []
        for b in budgets:
            spent = sum(float(e.amount) for e in expenses_curr_month if e.category == b.category)
            limit = float(b.amount)
            if spent <= limit:
                bud_scores.append(100.0)
            else:
                overspent_pct = (spent - limit) / limit
                score = max(0.0, 100.0 - (overspent_pct * 100.0))
                bud_scores.append(score)
        budget_score = sum(bud_scores) / len(bud_scores)

    # --- SUB-SCORE 3: Emergency Fund (Weight: 20%) ---
    # Target emergency fund = essential monthly expenses * target_months
    # If monthly expenses not set, default to base_expense
    essential_monthly = monthly_expenses_profile if monthly_expenses_profile > 0 else base_expense
    
    ef_record = EmergencyFund.query.filter_by(user_id=user_id).first()
    if ef_record:
        current_ef = float(ef_record.current_amount)
        target_months = ef_record.target_months
    else:
        current_ef = 0.0
        target_months = 6  # default target
        
    target_ef_amount = essential_monthly * target_months
    
    if target_ef_amount <= 0:
        emergency_score = 0.0
    else:
        ef_ratio = current_ef / target_ef_amount
        emergency_score = min(100.0, ef_ratio * 100.0)
        
    # --- SUB-SCORE 4: Goal Progress (Weight: 15%) ---
    goals = FinancialGoal.query.filter_by(user_id=user_id).all()
    if not goals:
        goal_score = 0.0
    else:
        goal_progress_sums = []
        for g in goals:
            target = float(g.target_amount)
            curr = float(g.current_amount)
            if target > 0:
                prog = min(100.0, (curr / target) * 100.0)
                goal_progress_sums.append(prog)
            else:
                goal_progress_sums.append(100.0)
        goal_score = sum(goal_progress_sums) / len(goal_progress_sums)
        
    # --- SUB-SCORE 5: Debt Burden (Weight: 15%) ---
    # Look for expenses or bills related to loan / EMI
    # We query expenses in current month containing 'emi', 'loan', 'credit card'
    debt_categories = ['rent', 'emi', 'loan', 'bills']
    debt_amount = 0.0
    for e in expenses_curr_month:
        desc = (e.description or '').lower()
        merchant = (e.merchant or '').lower()
        cat = e.category.lower()
        if 'emi' in desc or 'loan' in desc or 'mortgage' in desc or 'emi' in merchant or 'loan' in merchant:
            debt_amount += float(e.amount)
            
    # Debt Service ratio = debt payments / monthly income
    if base_income > 0:
        debt_ratio = debt_amount / base_income
        # Ideal is < 10% of income. Critical is > 40%.
        if debt_ratio <= 0.10:
            debt_score = 100.0
        elif debt_ratio >= 0.40:
            debt_score = 0.0
        else:
            debt_score = 100.0 - ((debt_ratio - 0.10) / 0.30 * 100.0)
    else:
        debt_score = 0.0
        
    # --- Overall Health Score ---
    overall_score_float = (
        0.25 * savings_score +
        0.25 * budget_score +
        0.20 * emergency_score +
        0.15 * goal_score +
        0.15 * debt_score
    )
    overall_score = int(round(overall_score_float))
    
    # compile strengths and improvements
    strengths = []
    improvements = []
    
    if savings_score >= 80.0:
        strengths.append(f"Good monthly savings rate ({savings_rate:.1f}%).")
    elif savings_score < 50.0:
        improvements.append("Savings rate is low; try setting a budget target to curb discretionary spending.")
        
    if budget_score >= 85.0:
        strengths.append("Excellent budget adherence; you are staying within limits.")
    elif budget_score < 70.0:
        improvements.append("Several category budgets have been exceeded. Consider reviewing your category limits.")
        
    if emergency_score >= 80.0:
        strengths.append("Robust emergency fund coverage matching your target cushion.")
    elif emergency_score < 50.0:
        improvements.append(f"Emergency savings are below your {target_months}-month target. Aim to allocate monthly savings here.")
        
    if goal_score >= 80.0:
        strengths.append("Steady progress towards your active financial goals.")
    elif goal_score < 50.0:
        improvements.append("Goal completion rate is low. Try automating your monthly savings contributions.")
        
    if debt_score >= 90.0:
        strengths.append("Low debt burden relative to your monthly income.")
    elif debt_score < 70.0:
        improvements.append("Debt/EMI payments comprise a high percentage of your income. Avoid taking on new credit.")
        
    # Fallback to keep lists populated
    if not strengths:
        strengths.append("Your financial system is initialized and ready for optimization.")
    if not improvements:
        improvements.append("Keep tracking your daily expenses to generate deeper automated insights!")
        
    breakdown = {
        "savings_rate": {
            "score": round(savings_score, 1),
            "value": f"{savings_rate:.1f}%",
            "weight": "25%",
            "description": "Portion of income saved after monthly expenses."
        },
        "budget_adherence": {
            "score": round(budget_score, 1),
            "value": f"{len(budgets)} budget(s) monitored",
            "weight": "25%",
            "description": "Performance in staying within category budget thresholds."
        },
        "emergency_fund": {
            "score": round(emergency_score, 1),
            "value": f"{currency}{current_ef:,.2f} / {currency}{target_ef_amount:,.2f}",
            "weight": "20%",
            "description": f"Savings buffer to cover {target_months} months of essential expenses."
        },
        "goal_progress": {
            "score": round(goal_score, 1),
            "value": f"{len(goals)} active goal(s)",
            "weight": "15%",
            "description": "Average completion percentage across all savings goals."
        },
        "debt_burden": {
            "score": round(debt_score, 1),
            "value": f"{currency}{debt_amount:,.2f} on debt service",
            "weight": "15%",
            "description": "Proportion of income consumed by loan repayments and EMIs."
        }
    }
    
    result = {
        "score": overall_score,
        "savings_score": round(savings_score, 1),
        "budget_score": round(budget_score, 1),
        "emergency_score": round(emergency_score, 1),
        "goal_score": round(goal_score, 1),
        "debt_score": round(debt_score, 1),
        "strengths": strengths,
        "improvements": improvements,
        "breakdown": breakdown
    }
    
    # Save the calculation in DB
    try:
        new_score = FinancialScore(
            user_id=user_id,
            score=overall_score,
            savings_score=savings_score,
            budget_score=budget_score,
            emergency_score=emergency_score,
            goal_score=goal_score,
            debt_score=debt_score,
            breakdown_json=json.dumps(result)
        )
        db.session.add(new_score)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f"Failed to save score history: {e}")
        
    return result
