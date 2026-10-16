from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import Notification

notifications_bp = Blueprint('notifications', __name__)


@notifications_bp.route('', methods=['GET'])
@jwt_required()
def list_notifications():
    user_id = int(get_jwt_identity())
    unread_only = request.args.get('unread_only', 'false').lower() == 'true'
    query = Notification.query.filter_by(user_id=user_id)
    if unread_only:
        query = query.filter_by(is_read=False)
    notifications = query.order_by(Notification.created_at.desc()).limit(50).all()
    unread_count = Notification.query.filter_by(user_id=user_id, is_read=False).count()
    return jsonify({
        "notifications": [n.to_dict() for n in notifications],
        "unread_count": unread_count
    }), 200


@notifications_bp.route('/<int:id>/read', methods=['PATCH'])
@jwt_required()
def mark_read(id):
    user_id = int(get_jwt_identity())
    n = Notification.query.filter_by(id=id, user_id=user_id).first()
    if not n:
        return jsonify({"error": "Notification not found"}), 404
    n.is_read = True
    db.session.commit()
    return jsonify({"message": "Marked as read", "notification": n.to_dict()}), 200


@notifications_bp.route('/read-all', methods=['POST'])
@jwt_required()
def mark_all_read():
    user_id = int(get_jwt_identity())
    Notification.query.filter_by(user_id=user_id, is_read=False).update({"is_read": True})
    db.session.commit()
    return jsonify({"message": "All notifications marked as read"}), 200


@notifications_bp.route('/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_notification(id):
    user_id = int(get_jwt_identity())
    n = Notification.query.filter_by(id=id, user_id=user_id).first()
    if not n:
        return jsonify({"error": "Notification not found"}), 404
    db.session.delete(n)
    db.session.commit()
    return jsonify({"message": "Notification deleted"}), 200


@notifications_bp.route('/generate', methods=['POST'])
@jwt_required()
def generate_notifications():
    user_id = int(get_jwt_identity())
    try:
        from app.services.notification_service import generate_notifications as svc_generate
        new_notifications = svc_generate(user_id)
        return jsonify({
            "message": "Notification check complete",
            "new_notifications": new_notifications
        }), 200
    except Exception as e:
        return jsonify({"error": f"Failed to generate notifications: {str(e)}"}), 500
