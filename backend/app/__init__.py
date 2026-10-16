from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from app.config import Config

db = SQLAlchemy()
jwt = JWTManager()

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # Initialize extensions
    db.init_app(app)
    jwt.init_app(app)
    
    # Enable CORS for frontend connection (default Vite dev server is on port 5173)
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    

    # Register blueprints
    from app.routes.auth import auth_bp
    from app.routes.income import income_bp
    from app.routes.expense import expense_bp
    from app.routes.budget import budget_bp
    from app.routes.goal import goal_bp
    from app.routes.analytics import analytics_bp
    from app.routes.ai import ai_bp
    from app.routes.health import health_bp
    from app.routes.investment import investment_bp
    from app.routes.portfolio import portfolio_bp
    from app.routes.notifications import notifications_bp
    from app.routes.achievements import achievements_bp
    
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(income_bp, url_prefix="/api/income")
    app.register_blueprint(expense_bp, url_prefix="/api/expenses")
    app.register_blueprint(budget_bp, url_prefix="/api/budgets")
    app.register_blueprint(goal_bp, url_prefix="/api/goals")
    app.register_blueprint(analytics_bp, url_prefix="/api/analytics")
    app.register_blueprint(ai_bp, url_prefix="/api/ai")
    app.register_blueprint(health_bp, url_prefix="/api/financial-health")
    app.register_blueprint(investment_bp, url_prefix="/api/investments")
    app.register_blueprint(portfolio_bp, url_prefix="/api/portfolio")
    app.register_blueprint(notifications_bp, url_prefix="/api/notifications")
    app.register_blueprint(achievements_bp, url_prefix="/api/achievements")
    
    # Register error handlers
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"error": "Resource not found"}), 404
        
    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        return jsonify({"error": "Internal server error"}), 500
        
    # Health check route
    @app.route("/api/health", methods=["GET"])
    def health():
        return jsonify({"status": "healthy", "service": "FinWise AI Backend"}), 200

    with app.app_context():
        from app import models as _models
        db.create_all()
        
    return app


