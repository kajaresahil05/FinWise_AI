from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import AICorrection, AIConversation, AIMessage
from app.services.ai_service import categorize_expense, get_user_financial_context, get_ai_provider
from datetime import datetime
import json

ai_bp = Blueprint('ai', __name__)

@ai_bp.route('/expense-categorize', methods=['POST'])
@jwt_required()
def parse_expense():
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    text = data.get('text', '').strip()
    
    if not text:
        return jsonify({"error": "Text parameter is required"}), 400
        
    try:
        result = categorize_expense(text, int(user_id))
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": f"Failed to categorize expense: {str(e)}"}), 500

@ai_bp.route('/expense-correct', methods=['POST'])
@jwt_required()
def correct_expense():
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    
    raw_text = data.get('raw_text', '').strip()
    corrected_category = data.get('corrected_category', '').strip()
    corrected_subcategory = data.get('corrected_subcategory', '').strip()
    corrected_merchant = data.get('corrected_merchant', '').strip()
    corrected_amount = data.get('corrected_amount')
    
    if not raw_text or not corrected_category:
        return jsonify({"error": "raw_text and corrected_category are required fields"}), 400
        
    try:
        correction = AICorrection.query.filter_by(user_id=int(user_id), raw_text=raw_text).first()
        if not correction:
            correction = AICorrection(
                user_id=int(user_id),
                raw_text=raw_text
            )
            db.session.add(correction)
            
        correction.corrected_category = corrected_category
        correction.corrected_subcategory = corrected_subcategory or None
        correction.corrected_merchant = corrected_merchant or None
        correction.corrected_amount = corrected_amount
        
        db.session.commit()
        return jsonify({"message": "Correction recorded successfully", "correction": correction.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to save correction: {str(e)}"}), 500

@ai_bp.route('/conversations', methods=['GET'])
@jwt_required()
def get_conversations():
    user_id = int(get_jwt_identity())
    conversations = AIConversation.query.filter_by(user_id=user_id).order_by(AIConversation.updated_at.desc()).all()
    return jsonify([c.to_dict() for c in conversations]), 200

@ai_bp.route('/conversations/<int:id>/messages', methods=['GET'])
@jwt_required()
def get_conversation_messages(id):
    user_id = int(get_jwt_identity())
    conversation = AIConversation.query.filter_by(id=id, user_id=user_id).first()
    if not conversation:
        return jsonify({"error": "Conversation not found"}), 404
        
    messages = AIMessage.query.filter_by(conversation_id=id).order_by(AIMessage.created_at.asc()).all()
    return jsonify([m.to_dict() for m in messages]), 200

@ai_bp.route('/conversations/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_conversation(id):
    user_id = int(get_jwt_identity())
    conversation = AIConversation.query.filter_by(id=id, user_id=user_id).first()
    if not conversation:
        return jsonify({"error": "Conversation not found"}), 404
        
    try:
        db.session.delete(conversation)
        db.session.commit()
        return jsonify({"message": "Conversation deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to delete conversation: {str(e)}"}), 500

@ai_bp.route('/chat', methods=['POST'])
@jwt_required()
def chat_coach():
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}
    message = data.get('message', '').strip()
    conversation_id = data.get('conversation_id')
    
    if not message:
        return jsonify({"error": "Message is required"}), 400
        
    try:
        # Get or create conversation
        if conversation_id:
            conversation = AIConversation.query.filter_by(id=conversation_id, user_id=user_id).first()
            if not conversation:
                return jsonify({"error": "Conversation not found"}), 404
        else:
            # Create a title based on message first 30 chars
            title = message[:30] + '...' if len(message) > 30 else message
            conversation = AIConversation(user_id=user_id, title=title)
            db.session.add(conversation)
            db.session.flush() # Populate conversation.id
            
        # 1. Add User Message
        user_msg = AIMessage(conversation_id=conversation.id, role='user', content=message)
        db.session.add(user_msg)
        
        # 2. Get history (messages before the current one)
        history_msgs = AIMessage.query.filter_by(conversation_id=conversation.id).order_by(AIMessage.created_at.asc()).all()
        history_list = [{"role": m.role, "content": m.content} for m in history_msgs[:-1]]
        
        # 3. Get Context
        context = get_user_financial_context(user_id)
        
        # 4. Generate AI response
        provider = get_ai_provider()
        ai_response = provider.chat(prompt=message, history=history_list, context_str=json.dumps(context))
        
        # 5. Add Assistant Message
        assistant_msg = AIMessage(conversation_id=conversation.id, role='assistant', content=ai_response)
        db.session.add(assistant_msg)
        
        # 6. Update conversation timestamp
        conversation.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            "response": ai_response,
            "conversation_id": conversation.id,
            "title": conversation.title
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to generate coach response: {str(e)}"}), 500


@ai_bp.route('/financial-report', methods=['GET'])
@jwt_required()
def get_financial_report():
    """
    GET /api/ai/financial-report?year=YYYY&month=M
    Returns a structured monthly financial report with an optional AI narrative.
    Defaults to the current calendar month if no params provided.
    """
    user_id = int(get_jwt_identity())
    today = datetime.utcnow()

    try:
        year = int(request.args.get('year', today.year))
        month = int(request.args.get('month', today.month))
        if not (1 <= month <= 12):
            return jsonify({"error": "month must be between 1 and 12"}), 400
        if year < 2000 or year > today.year + 1:
            return jsonify({"error": "Invalid year provided"}), 400
    except ValueError:
        return jsonify({"error": "year and month must be valid integers"}), 400

    try:
        from app.services.report_service import generate_monthly_report
        report = generate_monthly_report(user_id, year, month)
        return jsonify(report), 200
    except Exception as e:
        return jsonify({"error": f"Failed to generate report: {str(e)}"}), 500
