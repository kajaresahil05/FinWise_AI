"""
achievement_service.py — Awards gamification badges based on user activity.

All badge definitions are declared in ACHIEVEMENT_DEFINITIONS.
check_and_award_achievements() is idempotent — safe to call multiple times.
"""

from datetime import datetime
from sqlalchemy.exc import IntegrityError
from app import db
from app.models import (
    Achievement, Expense, Income, Budget,
    FinancialGoal, PortfolioHolding, RiskProfile
)

# ─── Badge Catalogue ──────────────────────────────────────────────────────────

ACHIEVEMENT_DEFINITIONS = [
    {
        "code": "first_expense",
        "title": "First Step",
        "description": "Added your first expense. Tracking is the first step to financial clarity!",
        "icon": "💸"
    },
    {
        "code": "first_income",
        "title": "Income Recorder",
        "description": "Logged your first income source. Great start to understanding your cash flow!",
        "icon": "💰"
    },
    {
        "code": "budget_set",
        "title": "Budget Builder",
        "description": "Created your first budget category. Budgeting is the foundation of financial health!",
        "icon": "📊"
    },
    {
        "code": "first_goal",
        "title": "Goal Setter",
        "description": "Set your first savings goal. Having a goal is the first step to achieving it!",
        "icon": "🎯"
    },
    {
        "code": "expense_7days",
        "title": "Week Warrior",
        "description": "Tracked expenses on 7 or more distinct days. Consistency builds habits!",
        "icon": "📅"
    },
    {
        "code": "expense_30days",
        "title": "Monthly Tracker",
        "description": "Tracked expenses on 30 or more distinct days. You are a dedicated tracker!",
        "icon": "🗓️"
    },
    {
        "code": "saved_10k",
        "title": "Saver — ₹10,000",
        "description": "Your cumulative savings have crossed ₹10,000. Keep it up!",
        "icon": "🥉"
    },
    {
        "code": "saved_1l",
        "title": "Saver — ₹1 Lakh",
        "description": "Your cumulative savings have crossed ₹1,00,000. Excellent discipline!",
        "icon": "🥇"
    },
    {
        "code": "portfolio_started",
        "title": "Investor",
        "description": "Added your first portfolio holding. Your investment journey has begun!",
        "icon": "📈"
    },
    {
        "code": "risk_assessed",
        "title": "Risk Aware",
        "description": "Completed the risk profile assessment. Knowing your risk tolerance is crucial!",
        "icon": "🛡️"
    },
]

# ─── Helper ───────────────────────────────────────────────────────────────────

def _already_earned(user_id: int, code: str) -> bool:
    return Achievement.query.filter_by(user_id=user_id, code=code).first() is not None


def _award(user_id: int, defn: dict):
    try:
        badge = Achievement(
            user_id=user_id,
            code=defn["code"],
            title=defn["title"],
            description=defn["description"],
            icon=defn["icon"]
        )
        db.session.add(badge)
        db.session.flush()  # catch unique constraint early
    except IntegrityError:
        db.session.rollback()  # already earned — silently skip


# ─── Main Entry Point ─────────────────────────────────────────────────────────

def check_and_award_achievements(user_id: int) -> list:
    """
    Scan user activity and award any missing badges.
    Returns list of all currently earned achievement dicts.
    """
    newly_earned = []

    # first_expense
    if not _already_earned(user_id, "first_expense"):
        if Expense.query.filter_by(user_id=user_id).first():
            _award(user_id, next(d for d in ACHIEVEMENT_DEFINITIONS if d["code"] == "first_expense"))
            newly_earned.append("first_expense")

    # first_income
    if not _already_earned(user_id, "first_income"):
        if Income.query.filter_by(user_id=user_id).first():
            _award(user_id, next(d for d in ACHIEVEMENT_DEFINITIONS if d["code"] == "first_income"))
            newly_earned.append("first_income")

    # budget_set
    if not _already_earned(user_id, "budget_set"):
        if Budget.query.filter_by(user_id=user_id).first():
            _award(user_id, next(d for d in ACHIEVEMENT_DEFINITIONS if d["code"] == "budget_set"))
            newly_earned.append("budget_set")

    # first_goal
    if not _already_earned(user_id, "first_goal"):
        if FinancialGoal.query.filter_by(user_id=user_id).first():
            _award(user_id, next(d for d in ACHIEVEMENT_DEFINITIONS if d["code"] == "first_goal"))
            newly_earned.append("first_goal")

    # expense_7days / expense_30days
    from sqlalchemy import func
    distinct_days = db.session.query(
        func.count(func.distinct(Expense.date))
    ).filter(Expense.user_id == user_id).scalar() or 0

    if not _already_earned(user_id, "expense_7days") and distinct_days >= 7:
        _award(user_id, next(d for d in ACHIEVEMENT_DEFINITIONS if d["code"] == "expense_7days"))
        newly_earned.append("expense_7days")

    if not _already_earned(user_id, "expense_30days") and distinct_days >= 30:
        _award(user_id, next(d for d in ACHIEVEMENT_DEFINITIONS if d["code"] == "expense_30days"))
        newly_earned.append("expense_30days")

    # saved_10k / saved_1l — based on total income minus total expenses
    total_income = db.session.query(
        func.coalesce(func.sum(Income.amount), 0)
    ).filter(Income.user_id == user_id).scalar() or 0

    total_expenses = db.session.query(
        func.coalesce(func.sum(Expense.amount), 0)
    ).filter(Expense.user_id == user_id).scalar() or 0

    cumulative_savings = float(total_income) - float(total_expenses)

    if not _already_earned(user_id, "saved_10k") and cumulative_savings >= 10000:
        _award(user_id, next(d for d in ACHIEVEMENT_DEFINITIONS if d["code"] == "saved_10k"))
        newly_earned.append("saved_10k")

    if not _already_earned(user_id, "saved_1l") and cumulative_savings >= 100000:
        _award(user_id, next(d for d in ACHIEVEMENT_DEFINITIONS if d["code"] == "saved_1l"))
        newly_earned.append("saved_1l")

    # portfolio_started
    if not _already_earned(user_id, "portfolio_started"):
        if PortfolioHolding.query.filter_by(user_id=user_id).first():
            _award(user_id, next(d for d in ACHIEVEMENT_DEFINITIONS if d["code"] == "portfolio_started"))
            newly_earned.append("portfolio_started")

    # risk_assessed
    if not _already_earned(user_id, "risk_assessed"):
        if RiskProfile.query.filter_by(user_id=user_id).first():
            _award(user_id, next(d for d in ACHIEVEMENT_DEFINITIONS if d["code"] == "risk_assessed"))
            newly_earned.append("risk_assessed")

    try:
        db.session.commit()
    except Exception:
        db.session.rollback()

    earned = Achievement.query.filter_by(user_id=user_id)\
        .order_by(Achievement.earned_at.desc()).all()
    return [a.to_dict() for a in earned]
