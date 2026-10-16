"""
notification_service.py — Generates contextual in-app notifications.

Rules (deduplication: one per type per day):
  - budget_alert     : any budget category >= 80% used this month
  - goal_deadline    : goal target_date within 30 days, progress < 80%
  - savings_reminder : current month savings rate < 10%
"""

from datetime import date, datetime, timedelta
from calendar import monthrange
from app import db
from app.models import Notification, Budget, Expense, Income, FinancialGoal


def _already_notified_today(user_id: int, notif_type: str, title: str) -> bool:
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    existing = Notification.query.filter(
        Notification.user_id == user_id,
        Notification.type == notif_type,
        Notification.title == title,
        Notification.created_at >= today_start
    ).first()
    return existing is not None


def _create(user_id: int, notif_type: str, title: str, message: str):
    if not _already_notified_today(user_id, notif_type, title):
        n = Notification(user_id=user_id, type=notif_type, title=title, message=message)
        db.session.add(n)


def generate_notifications(user_id: int) -> list:
    """
    Run all notification checks for the user and persist any new ones.
    Returns list of newly created notification dicts.
    """
    today = date.today()
    start_of_month = date(today.year, today.month, 1)
    end_of_month = date(today.year, today.month, monthrange(today.year, today.month)[1])

    # ── 1. Budget Alerts ──────────────────────────────────────────────
    budgets = Budget.query.filter_by(user_id=user_id).all()
    expenses_this_month = Expense.query.filter(
        Expense.user_id == user_id,
        Expense.date >= start_of_month,
        Expense.date <= end_of_month
    ).all()

    category_spent: dict = {}
    for e in expenses_this_month:
        cat = e.category or "Other"
        category_spent[cat] = category_spent.get(cat, 0.0) + float(e.amount)

    for b in budgets:
        allocated = float(b.amount)
        spent = category_spent.get(b.category, 0.0)
        if allocated > 0:
            pct = (spent / allocated) * 100
            w1 = float(b.warning_threshold_1) if b.warning_threshold_1 else 70.0
            w2 = float(b.warning_threshold_2) if b.warning_threshold_2 else 90.0
            if pct >= 100:
                _create(user_id, "budget_alert",
                        f"Budget Exceeded: {b.category}",
                        f"You have exceeded your {b.category} budget of ₹{allocated:,.0f}. "
                        f"Spent: ₹{spent:,.0f} ({pct:.0f}%).")
            elif pct >= w2:
                _create(user_id, "budget_alert",
                        f"Budget Critical: {b.category}",
                        f"You've used {pct:.0f}% of your {b.category} budget (₹{spent:,.0f} / ₹{allocated:,.0f}).")
            elif pct >= w1:
                _create(user_id, "budget_alert",
                        f"Budget Warning: {b.category}",
                        f"You've used {pct:.0f}% of your {b.category} budget (₹{spent:,.0f} / ₹{allocated:,.0f}).")

    # ── 2. Goal Deadlines ─────────────────────────────────────────────
    goals = FinancialGoal.query.filter_by(user_id=user_id).all()
    for g in goals:
        if g.target_date:
            days_left = (g.target_date - today).days
            target = float(g.target_amount)
            current = float(g.current_amount)
            progress = (current / target * 100) if target > 0 else 0
            if 0 <= days_left <= 30 and progress < 80:
                _create(user_id, "goal_deadline",
                        f"Goal Deadline Approaching: {g.name}",
                        f"Your goal '{g.name}' is due in {days_left} days. "
                        f"Current progress: {progress:.0f}% (₹{current:,.0f} / ₹{target:,.0f}).")

    # ── 3. Savings Reminder ───────────────────────────────────────────
    incomes = Income.query.filter(
        Income.user_id == user_id,
        Income.date >= start_of_month,
        Income.date <= end_of_month
    ).all()
    total_income = sum(float(i.amount) for i in incomes)
    total_expenses = sum(category_spent.values())
    if total_income > 0:
        savings = total_income - total_expenses
        savings_rate = (savings / total_income) * 100
        if savings_rate < 10:
            _create(user_id, "savings_reminder",
                    "Low Savings Rate This Month",
                    f"Your savings rate is {savings_rate:.1f}% this month. "
                    f"Consider reducing discretionary spending to improve your savings.")

    try:
        db.session.commit()
    except Exception:
        db.session.rollback()

    # Return recent unread notifications
    recent = Notification.query.filter_by(user_id=user_id, is_read=False)\
        .order_by(Notification.created_at.desc()).limit(20).all()
    return [n.to_dict() for n in recent]
