from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import Achievement
from app.services.achievement_service import ACHIEVEMENT_DEFINITIONS

achievements_bp = Blueprint('achievements', __name__)


@achievements_bp.route('', methods=['GET'])
@jwt_required()
def list_achievements():
    """Return all earned achievements plus the full catalogue with earned status."""
    user_id = int(get_jwt_identity())
    earned = Achievement.query.filter_by(user_id=user_id)\
        .order_by(Achievement.earned_at.asc()).all()
    earned_codes = {a.code for a in earned}

    # Build full catalogue: earned + unearned
    catalogue = []
    for defn in ACHIEVEMENT_DEFINITIONS:
        entry = {
            "code": defn["code"],
            "title": defn["title"],
            "description": defn["description"],
            "icon": defn["icon"],
            "earned": defn["code"] in earned_codes,
            "earned_at": None
        }
        if defn["code"] in earned_codes:
            matched = next(a for a in earned if a.code == defn["code"])
            entry["earned_at"] = matched.earned_at.isoformat()
        catalogue.append(entry)

    return jsonify({
        "earned_count": len(earned),
        "total_count": len(ACHIEVEMENT_DEFINITIONS),
        "achievements": catalogue
    }), 200


@achievements_bp.route('/check', methods=['POST'])
@jwt_required()
def check_achievements():
    """Run the achievement check and award any newly unlocked badges."""
    user_id = int(get_jwt_identity())
    try:
        from app.services.achievement_service import check_and_award_achievements
        earned = check_and_award_achievements(user_id)
        return jsonify({
            "message": "Achievement check complete",
            "earned_achievements": earned
        }), 200
    except Exception as e:
        return jsonify({"error": f"Failed to check achievements: {str(e)}"}), 500
