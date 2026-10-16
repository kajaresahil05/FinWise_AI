"""
report_service.py — Monthly Financial Report Generator

Aggregates income, expenses, savings, budget performance, goal progress,
portfolio snapshot, and health score for a given user and calendar month.
Optionally enriches the report with an AI-generated narrative.
"""

from datetime import date, datetime
from calendar import monthrange
from app.models import (
    Income, Expense, Budget,
    FinancialGoal, PortfolioHolding
)


def generate_monthly_report(user_id: int, year: int, month: int) -> dict:
    """
    Build and return a full monthly financial report for user_id
    covering the given calendar year/month.
    """
    start_date = date(year, month, 1)
    end_date = date(year, month, monthrange(year, month)[1])

    # ------------------------------------------------------------------ #
    #  1. Income
    # ------------------------------------------------------------------ #
    incomes = Income.query.filter(
        Income.user_id == user_id,
        Income.date >= start_date,
        Income.date <= end_date
    ).all()
    total_income = sum(float(i.amount) for i in incomes)
    income_sources = {}
    for i in incomes:
        src = i.source or "Other"
        income_sources[src] = income_sources.get(src, 0.0) + float(i.amount)

    # ------------------------------------------------------------------ #
    #  2. Expenses — current month
    # ------------------------------------------------------------------ #
    expenses = Expense.query.filter(
        Expense.user_id == user_id,
        Expense.date >= start_date,
        Expense.date <= end_date
    ).all()
    total_expenses = sum(float(e.amount) for e in expenses)

    # Group by category
    category_totals: dict = {}
    for e in expenses:
        cat = e.category or "Other"
        category_totals[cat] = category_totals.get(cat, 0.0) + float(e.amount)

    biggest_category = (
        max(category_totals, key=category_totals.get)
        if category_totals else "N/A"
    )

    # ------------------------------------------------------------------ #
    #  3. Prior month expenses for % change comparison
    # ------------------------------------------------------------------ #
    if month == 1:
        prev_year, prev_month = year - 1, 12
    else:
        prev_year, prev_month = year, month - 1

    prev_start = date(prev_year, prev_month, 1)
    prev_end = date(prev_year, prev_month, monthrange(prev_year, prev_month)[1])

    prev_expenses = Expense.query.filter(
        Expense.user_id == user_id,
        Expense.date >= prev_start,
        Expense.date <= prev_end
    ).all()
    prev_total_expenses = sum(float(e.amount) for e in prev_expenses)

    prev_category_totals: dict = {}
    for e in prev_expenses:
        cat = e.category or "Other"
        prev_category_totals[cat] = prev_category_totals.get(cat, 0.0) + float(e.amount)

    # Per-category change
    category_comparison = {}
    all_cats = set(list(category_totals.keys()) + list(prev_category_totals.keys()))
    for cat in all_cats:
        curr = category_totals.get(cat, 0.0)
        prev = prev_category_totals.get(cat, 0.0)
        if prev > 0:
            change_pct = round(((curr - prev) / prev) * 100, 1)
        else:
            change_pct = 100.0 if curr > 0 else 0.0
        category_comparison[cat] = {
            "current": round(curr, 2),
            "previous": round(prev, 2),
            "change_pct": change_pct
        }

    # Overall expense change
    if prev_total_expenses > 0:
        expense_change_pct = round(
            ((total_expenses - prev_total_expenses) / prev_total_expenses) * 100, 1
        )
    else:
        expense_change_pct = 0.0

    # ------------------------------------------------------------------ #
    #  4. Savings
    # ------------------------------------------------------------------ #
    savings = total_income - total_expenses
    savings_rate = round((savings / total_income) * 100, 1) if total_income > 0 else 0.0

    prev_incomes = Income.query.filter(
        Income.user_id == user_id,
        Income.date >= prev_start,
        Income.date <= prev_end
    ).all()
    prev_total_income = sum(float(i.amount) for i in prev_incomes)
    prev_savings = prev_total_income - prev_total_expenses

    if prev_savings != 0:
        savings_change_pct = round(((savings - prev_savings) / abs(prev_savings)) * 100, 1)
    else:
        savings_change_pct = 0.0

    # ------------------------------------------------------------------ #
    #  5. Budget Performance
    # ------------------------------------------------------------------ #
    # Budget model: one row per category per user (flat structure)
    budgets = Budget.query.filter_by(user_id=user_id).all()
    budget_performance = []
    for b in budgets:
        cat_name = b.category
        allocated = float(b.amount)
        used = category_totals.get(cat_name, 0.0)
        remaining = allocated - used
        pct_used = round((used / allocated) * 100, 1) if allocated > 0 else 0.0
        w1 = float(b.warning_threshold_1) if b.warning_threshold_1 else 70.0
        w2 = float(b.warning_threshold_2) if b.warning_threshold_2 else 90.0
        status = "ok"
        if pct_used >= 100:
            status = "exceeded"
        elif pct_used >= w2:
            status = "critical"
        elif pct_used >= w1:
            status = "warning"
        budget_performance.append({
            "category": cat_name,
            "allocated": round(allocated, 2),
            "used": round(used, 2),
            "remaining": round(remaining, 2),
            "pct_used": pct_used,
            "status": status
        })

    # ------------------------------------------------------------------ #
    #  6. Goal Progress
    # ------------------------------------------------------------------ #
    goals = FinancialGoal.query.filter_by(user_id=user_id).all()
    goal_progress = []
    for g in goals:
        target = float(g.target_amount)
        current = float(g.current_amount)
        pct = round((current / target) * 100, 1) if target > 0 else 0.0
        goal_progress.append({
            "name": g.name,
            "target": round(target, 2),
            "current": round(current, 2),
            "pct": min(pct, 100.0),
            "target_date": g.target_date.isoformat() if g.target_date else None
        })

    # ------------------------------------------------------------------ #
    #  7. Portfolio Snapshot (lightweight — no market calls)
    # ------------------------------------------------------------------ #
    holdings = PortfolioHolding.query.filter_by(user_id=user_id).all()
    portfolio_invested = sum(float(h.quantity) * float(h.purchase_price) for h in holdings)
    portfolio_count = len(holdings)

    # ------------------------------------------------------------------ #
    #  8. Financial Health Score
    # ------------------------------------------------------------------ #
    health_score = None
    health_breakdown = []
    try:
        from app.services.health_service import calculate_financial_health_score
        health_data = calculate_financial_health_score(user_id)
        health_score = health_data.get("score")
        health_breakdown = health_data.get("breakdown", [])
    except Exception:
        pass

    # ------------------------------------------------------------------ #
    #  9. Assemble structured report
    # ------------------------------------------------------------------ #
    report = {
        "year": year,
        "month": month,
        "month_name": date(year, month, 1).strftime("%B %Y"),
        "income": {
            "total": round(total_income, 2),
            "sources": {k: round(v, 2) for k, v in income_sources.items()}
        },
        "expenses": {
            "total": round(total_expenses, 2),
            "previous_month_total": round(prev_total_expenses, 2),
            "change_pct": expense_change_pct,
            "by_category": {k: round(v, 2) for k, v in category_totals.items()},
            "biggest_category": biggest_category,
            "category_comparison": category_comparison
        },
        "savings": {
            "total": round(savings, 2),
            "savings_rate": savings_rate,
            "previous_month_savings": round(prev_savings, 2),
            "savings_change_pct": savings_change_pct
        },
        "budget_performance": budget_performance,
        "goal_progress": goal_progress,
        "portfolio": {
            "holding_count": portfolio_count,
            "total_invested": round(portfolio_invested, 2)
        },
        "health_score": health_score,
        "health_breakdown": health_breakdown,
        "ai_narrative": None  # Populated below if AI available
    }

    # ------------------------------------------------------------------ #
    #  10. AI Narrative (optional — graceful fallback)
    # ------------------------------------------------------------------ #
    try:
        from app.services.ai_service import get_ai_provider
        provider = get_ai_provider()
        import json
        prompt = (
            f"Generate a concise, friendly monthly financial summary report for the user "
            f"based on this structured data. Use plain language suitable for someone new "
            f"to personal finance. Highlight 2-3 key strengths and 1-2 areas to improve. "
            f"Keep response under 150 words. Data: {json.dumps(report, default=str)}"
        )
        narrative = provider.chat(prompt=prompt, history=[], context_str="")
        report["ai_narrative"] = narrative
    except Exception:
        # Build a rule-based fallback narrative so page always has content
        lines = []
        if savings > 0:
            lines.append(f"You saved {savings:,.0f} this month ({savings_rate}% of income).")

        else:
            lines.append("Your expenses exceeded income this month — consider reviewing spending.")
        if expense_change_pct > 0:
            lines.append(f"Total expenses increased by {expense_change_pct}% vs last month.")
        elif expense_change_pct < 0:
            lines.append(f"Great job! Expenses decreased by {abs(expense_change_pct)}% vs last month.")
        if biggest_category and biggest_category != "N/A":
            lines.append(f"Your biggest spending category was {biggest_category}.")
        if health_score:
            lines.append(f"Your financial health score is {health_score}/100.")
        report["ai_narrative"] = " ".join(lines) if lines else "No data available for this month."

    return report
