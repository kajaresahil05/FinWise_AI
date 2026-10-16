from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import Expense
from datetime import datetime, date

expense_bp = Blueprint('expense', __name__)

@expense_bp.route('', methods=['GET'])
@jwt_required()
def get_expenses():
    user_id = get_jwt_identity()
    
    # Query parameters
    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')
    category = request.args.get('category')
    search = request.args.get('search')
    sort_by = request.args.get('sort_by', 'date')  # default sort by date
    order = request.args.get('order', 'desc')      # default order desc
    
    query = Expense.query.filter_by(user_id=user_id)
    
    if start_date_str:
        try:
            start_date = date.fromisoformat(start_date_str)
            query = query.filter(Expense.date >= start_date)
        except ValueError:
            return jsonify({"error": "Invalid start_date format. Use YYYY-MM-DD"}), 400
            
    if end_date_str:
        try:
            end_date = date.fromisoformat(end_date_str)
            query = query.filter(Expense.date <= end_date)
        except ValueError:
            return jsonify({"error": "Invalid end_date format. Use YYYY-MM-DD"}), 400
            
    if category:
        query = query.filter_by(category=category)
        
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            db.or_(
                Expense.description.ilike(search_filter),
                Expense.merchant.ilike(search_filter),
                Expense.notes.ilike(search_filter)
            )
        )
        
    # Sorting
    if sort_by == 'amount':
        sort_column = Expense.amount
    elif sort_by == 'category':
        sort_column = Expense.category
    else:
        sort_column = Expense.date
        
    if order == 'asc':
        query = query.order_by(sort_column.asc())
    else:
        query = query.order_by(sort_column.desc())
        
    expenses = query.all()
    return jsonify({"expenses": [exp.to_dict() for exp in expenses]}), 200

@expense_bp.route('', methods=['POST'])
@jwt_required()
def add_expense():
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    
    # Validation
    amount = data.get('amount')
    category = data.get('category')
    date_str = data.get('date')
    
    if amount is None or category is None or date_str is None:
        return jsonify({"error": "Amount, category, and date are required"}), 400
        
    try:
        amount_val = float(amount)
        if amount_val <= 0:
            return jsonify({"error": "Amount must be greater than 0"}), 400
    except ValueError:
        return jsonify({"error": "Invalid amount format"}), 400
        
    try:
        date_val = date.fromisoformat(date_str)
    except ValueError:
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400
        
    expense = Expense(
        user_id=user_id,
        amount=amount_val,
        category=category,
        subcategory=data.get('subcategory', ''),
        date=date_val,
        payment_method=data.get('payment_method', 'Cash'),
        description=data.get('description', ''),
        merchant=data.get('merchant', ''),
        notes=data.get('notes', '')
    )
    
    db.session.add(expense)
    db.session.commit()
    
    return jsonify({"message": "Expense added successfully", "expense": expense.to_dict()}), 201

@expense_bp.route('/<int:expense_id>', methods=['PUT'])
@jwt_required()
def update_expense(expense_id):
    user_id = get_jwt_identity()
    expense = Expense.query.filter_by(id=expense_id, user_id=user_id).first()
    
    if not expense:
        return jsonify({"error": "Expense record not found"}), 404
        
    data = request.get_json() or {}
    
    if 'amount' in data:
        try:
            amount_val = float(data['amount'])
            if amount_val <= 0:
                return jsonify({"error": "Amount must be greater than 0"}), 400
            expense.amount = amount_val
        except ValueError:
            return jsonify({"error": "Invalid amount format"}), 400
            
    if 'date' in data:
        try:
            expense.date = date.fromisoformat(data['date'])
        except ValueError:
            return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400
            
    if 'category' in data:
        expense.category = data['category']
        
    if 'subcategory' in data:
        expense.subcategory = data['subcategory']
        
    if 'payment_method' in data:
        expense.payment_method = data['payment_method']
        
    if 'description' in data:
        expense.description = data['description']
        
    if 'merchant' in data:
        expense.merchant = data['merchant']
        
    if 'notes' in data:
        expense.notes = data['notes']
        
    db.session.commit()
    return jsonify({"message": "Expense updated successfully", "expense": expense.to_dict()}), 200

@expense_bp.route('/<int:expense_id>', methods=['DELETE'])
@jwt_required()
def delete_expense(expense_id):
    user_id = get_jwt_identity()
    expense = Expense.query.filter_by(id=expense_id, user_id=user_id).first()
    
    if not expense:
        return jsonify({"error": "Expense record not found"}), 404
        
    db.session.delete(expense)
    db.session.commit()
    
    return jsonify({"message": "Expense deleted successfully"}), 200

@expense_bp.route('/scan-receipt', methods=['POST'])
@jwt_required()
def scan_receipt():
    import os
    from werkzeug.utils import secure_filename
    from flask import current_app
    from app.services.ocr_service import extract_text_from_receipt
    from app.services.ai_service import parse_ocr_text

    if 'receipt' not in request.files:
        return jsonify({"error": "No receipt file uploaded"}), 400
        
    file = request.files['receipt']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
        
    # Ensure temporary directory exists
    temp_dir = os.path.join(current_app.instance_path, 'temp_receipts')
    os.makedirs(temp_dir, exist_ok=True)
    
    filename = secure_filename(file.filename)
    file_path = os.path.join(temp_dir, filename)
    
    try:
        file.save(file_path)
        
        # 1. OCR text extraction
        ocr_text, ocr_status = extract_text_from_receipt(file_path)
        
        if ocr_status == "error" or not ocr_text.strip():
            return jsonify({"error": "Failed to extract text from receipt image"}), 400
            
        # 2. Extract structured fields with AI Provider
        parsed_data = parse_ocr_text(ocr_text)
        
        # Return response
        return jsonify({
            "merchant": parsed_data.get("merchant", "Unknown"),
            "amount": parsed_data.get("amount", 0.0),
            "tax": parsed_data.get("tax", 0.0),
            "date": parsed_data.get("date"),
            "category": parsed_data.get("category", "Other"),
            "subcategory": parsed_data.get("subcategory", "Uncategorized"),
            "ocr_status": ocr_status,
            "ocr_text": ocr_text
        }), 200
        
    except Exception as e:
        print(f"Error in scan-receipt endpoint: {e}")
        return jsonify({"error": f"Receipt parsing failed: {str(e)}"}), 500
    finally:
        # Clean up temp file
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception:
                pass

@expense_bp.route('/voice-entry', methods=['POST'])
@jwt_required()
def voice_entry():
    from app.services.ai_service import parse_voice_entry
    data = request.get_json() or {}
    text = data.get('text', '').strip()
    
    if not text:
        return jsonify({"error": "Voice transcript text is required"}), 400
        
    try:
        parsed_data = parse_voice_entry(text)
        return jsonify(parsed_data), 200
    except Exception as e:
        print(f"Error in voice-entry endpoint: {e}")
        return jsonify({"error": f"Voice entry parsing failed: {str(e)}"}), 500

