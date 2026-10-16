from datetime import datetime
import bcrypt
import json
from app import db

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(128), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship to user profile
    profile = db.relationship('UserProfile', backref='user', uselist=False, cascade="all, delete-orphan")
    
    def set_password(self, password):
        salt = bcrypt.gensalt()
        self.password_hash = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
        
    def check_password(self, password):
        try:
            return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))
        except Exception:
            return False

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat()
        }


class UserProfile(db.Model):
    __tablename__ = 'user_profiles'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    age = db.Column(db.Integer, nullable=True)
    monthly_income = db.Column(db.Numeric(12, 2), default=0.00)
    monthly_expenses = db.Column(db.Numeric(12, 2), default=0.00)
    monthly_savings = db.Column(db.Numeric(12, 2), default=0.00)
    investment_amount = db.Column(db.Numeric(12, 2), default=0.00)
    investment_horizon = db.Column(db.Integer, nullable=True)  # in years
    risk_tolerance = db.Column(db.String(20), default='Moderate')  # Conservative, Moderate, Aggressive
    currency = db.Column(db.String(10), default='INR')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "age": self.age,
            "monthly_income": float(self.monthly_income),
            "monthly_expenses": float(self.monthly_expenses),
            "monthly_savings": float(self.monthly_savings),
            "investment_amount": float(self.investment_amount),
            "investment_horizon": self.investment_horizon,
            "risk_tolerance": self.risk_tolerance,
            "currency": self.currency,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat()
        }


class Income(db.Model):
    __tablename__ = 'incomes'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), index=True, nullable=False)
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    source = db.Column(db.String(50), nullable=False)  # Salary, Freelancing, Business, Investments, Rental, Other
    date = db.Column(db.Date, nullable=False)
    description = db.Column(db.String(255))
    is_recurring = db.Column(db.Boolean, default=False)
    recurrence_period = db.Column(db.String(20))          # Monthly, Weekly, Yearly, etc.
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "amount": float(self.amount),
            "source": self.source,
            "date": self.date.isoformat() if self.date else None,
            "description": self.description,
            "is_recurring": self.is_recurring,
            "recurrence_period": self.recurrence_period,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat()
        }


class Expense(db.Model):
    __tablename__ = 'expenses'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), index=True, nullable=False)
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    category = db.Column(db.String(50), nullable=False)  # Food, Groceries, Travel, Shopping, Bills, Rent, etc.
    subcategory = db.Column(db.String(50))
    date = db.Column(db.Date, nullable=False)
    payment_method = db.Column(db.String(50))           # Cash, Card, UPI, Net Banking, etc.
    description = db.Column(db.String(255))
    merchant = db.Column(db.String(100))
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "amount": float(self.amount),
            "category": self.category,
            "subcategory": self.subcategory,
            "date": self.date.isoformat() if self.date else None,
            "payment_method": self.payment_method,
            "description": self.description,
            "merchant": self.merchant,
            "notes": self.notes,
            "created_at": self.created_at.isoformat(),
        }


class Budget(db.Model):
    __tablename__ = 'budgets'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), index=True, nullable=False)
    category = db.Column(db.String(50), nullable=False)  # Food, Travel, Rent, or 'Overall'
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    warning_threshold_1 = db.Column(db.Numeric(5, 2), default=70.00) # percentage 70%
    warning_threshold_2 = db.Column(db.Numeric(5, 2), default=90.00) # percentage 90%
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "category": self.category,
            "amount": float(self.amount),
            "warning_threshold_1": float(self.warning_threshold_1),
            "warning_threshold_2": float(self.warning_threshold_2),
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat()
        }


class FinancialGoal(db.Model):
    __tablename__ = 'financial_goals'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), index=True, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    target_amount = db.Column(db.Numeric(12, 2), nullable=False)
    current_amount = db.Column(db.Numeric(12, 2), default=0.00)
    target_date = db.Column(db.Date, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "target_amount": float(self.target_amount),
            "current_amount": float(self.current_amount),
            "target_date": self.target_date.isoformat() if self.target_date else None,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat()
        }


class AICorrection(db.Model):
    __tablename__ = 'ai_corrections'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), index=True, nullable=False)
    raw_text = db.Column(db.String(255), nullable=False)
    corrected_category = db.Column(db.String(50), nullable=False)
    corrected_subcategory = db.Column(db.String(50))
    corrected_merchant = db.Column(db.String(100))
    corrected_amount = db.Column(db.Numeric(12, 2))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "raw_text": self.raw_text,
            "corrected_category": self.corrected_category,
            "corrected_subcategory": self.corrected_subcategory,
            "corrected_merchant": self.corrected_merchant,
            "corrected_amount": float(self.corrected_amount) if self.corrected_amount else None,
            "created_at": self.created_at.isoformat()
        }


class AIConversation(db.Model):
    __tablename__ = 'ai_conversations'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), index=True, nullable=False)
    title = db.Column(db.String(100), default="New Chat")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    messages = db.relationship('AIMessage', backref='conversation', lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "title": self.title,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat()
        }


class AIMessage(db.Model):
    __tablename__ = 'ai_messages'
    
    id = db.Column(db.Integer, primary_key=True)
    conversation_id = db.Column(db.Integer, db.ForeignKey('ai_conversations.id'), index=True, nullable=False)
    role = db.Column(db.String(10), nullable=False)  # 'user' or 'assistant'
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "conversation_id": self.conversation_id,
            "role": self.role,
            "content": self.content,
            "created_at": self.created_at.isoformat()
        }


class EmergencyFund(db.Model):
    __tablename__ = 'emergency_funds'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), unique=True, nullable=False)
    current_amount = db.Column(db.Numeric(12, 2), default=0.00)
    target_months = db.Column(db.Integer, default=6)  # e.g., 3, 6, 9, 12 months
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "current_amount": float(self.current_amount),
            "target_months": self.target_months,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat()
        }


class FinancialScore(db.Model):
    __tablename__ = 'financial_scores'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), index=True, nullable=False)
    score = db.Column(db.Integer, nullable=False)
    savings_score = db.Column(db.Float, default=0.0)
    budget_score = db.Column(db.Float, default=0.0)
    emergency_score = db.Column(db.Float, default=0.0)
    goal_score = db.Column(db.Float, default=0.0)
    debt_score = db.Column(db.Float, default=0.0)
    breakdown_json = db.Column(db.Text)  # Store JSON with details
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "score": self.score,
            "savings_score": self.savings_score,
            "budget_score": self.budget_score,
            "emergency_score": self.emergency_score,
            "goal_score": self.goal_score,
            "debt_score": self.debt_score,
            "breakdown": json.loads(self.breakdown_json) if self.breakdown_json else {},
            "created_at": self.created_at.isoformat()
        }


class RiskProfile(db.Model):
    __tablename__ = 'risk_profiles'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), index=True, nullable=False)
    score = db.Column(db.Integer, nullable=False)
    risk_level = db.Column(db.String(20), nullable=False)  # Conservative, Moderate, Aggressive
    answers_json = db.Column(db.Text, nullable=False)       # JSON string containing the answers
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "score": self.score,
            "risk_level": self.risk_level,
            "answers": json.loads(self.answers_json) if self.answers_json else {},
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat()
        }


class PortfolioHolding(db.Model):
    __tablename__ = 'portfolio_holdings'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), index=True, nullable=False)
    asset_class = db.Column(db.String(20), nullable=False)  # 'Stock', 'Mutual Fund', 'ETF'
    symbol = db.Column(db.String(50), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    quantity = db.Column(db.Numeric(12, 4), nullable=False, default=0.0)
    purchase_price = db.Column(db.Numeric(12, 2), nullable=False, default=0.0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "asset_class": self.asset_class,
            "symbol": self.symbol,
            "name": self.name,
            "quantity": float(self.quantity),
            "purchase_price": float(self.purchase_price),
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat()
        }


class Notification(db.Model):
    """In-app notification for a user."""
    __tablename__ = 'notifications'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), index=True, nullable=False)
    type = db.Column(db.String(50), nullable=False)   # budget_alert | goal_deadline | savings_reminder | anomaly | achievement
    title = db.Column(db.String(120), nullable=False)
    message = db.Column(db.String(500), nullable=False)
    is_read = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "type": self.type,
            "title": self.title,
            "message": self.message,
            "is_read": self.is_read,
            "created_at": self.created_at.isoformat()
        }


class Achievement(db.Model):
    """Gamification badge earned by a user."""
    __tablename__ = 'achievements'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), index=True, nullable=False)
    code = db.Column(db.String(50), nullable=False)        # machine-readable badge code
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(300), nullable=False)
    icon = db.Column(db.String(10), default='🏆')          # emoji
    earned_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint('user_id', 'code', name='uq_user_achievement'),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "code": self.code,
            "title": self.title,
            "description": self.description,
            "icon": self.icon,
            "earned_at": self.earned_at.isoformat()
        }

