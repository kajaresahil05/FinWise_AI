import re
import os
from PIL import Image
import pytesseract

def extract_text_from_receipt(image_path: str) -> tuple[str, str]:
    """
    Attempts to read text from an image using pytesseract.
    Returns a tuple: (extracted_text, status)
    status can be 'success' or 'fallback'
    """
    if not os.path.exists(image_path):
        return "", "error"

    try:
        # Check if tesseract is accessible, this raises an exception if not
        # We can also check if a custom path is configured via environment variables
        tess_path = os.getenv("TESSERACT_CMD")
        if tess_path:
            pytesseract.pytesseract.tesseract_cmd = tess_path
            
        img = Image.open(image_path)
        # Run pytesseract OCR
        text = pytesseract.image_to_string(img)
        if text.strip():
            return text, "success"
        else:
            return "", "empty"
    except Exception as e:
        print(f"Tesseract OCR failed or not installed. Error: {e}")
        # Return fallback mock receipt text based on filename to facilitate easy demonstrations
        filename = os.path.basename(image_path).lower()
        if "starbucks" in filename:
            mock_text = (
                "STARBUCKS COFFEE #48102\n"
                "1024 Connaught Place, New Delhi\n"
                "Date: 17/08/2026\n"
                "Time: 14:32\n"
                "1x Java Chip Frappuccino - 350.00\n"
                "1x Butter Croissant - 120.00\n"
                "Subtotal: 470.00\n"
                "CGST 2.5%: 11.75\n"
                "SGST 2.5%: 11.75\n"
                "Total Paid: 493.50\n"
                "Payment Method: UPI\n"
                "Thank you for visiting Starbucks!"
            )
        elif "domino" in filename or "pizza" in filename:
            mock_text = (
                "DOMINO'S PIZZA INDIA\n"
                "Sector 62, Noida, UP\n"
                "Order #9832\n"
                "Date: 2026-08-16\n"
                "1x Peppy Paneer Medium - 450.00\n"
                "1x Garlic Breadsticks - 100.00\n"
                "Delivery Charge: 50.00\n"
                "Tax (GST 5%): 27.50\n"
                "Total Amount: 627.50\n"
                "Paid via Card\n"
                "Enjoy your hot pizza!"
            )
        elif "amazon" in filename:
            mock_text = (
                "AMAZON SELLER SERVICES\n"
                "Invoice Date: 15-08-2026\n"
                "Order ID: 403-982312-3213\n"
                "Item: Logitech MX Master 3S - 8500.00\n"
                "CGST: 765.00\n"
                "SGST: 765.00\n"
                "Total Price: 10030.00\n"
                "Paid: 10030.00\n"
                "Thank you for buying on Amazon!"
            )
        elif "netflix" in filename:
            mock_text = (
                "NETFLIX ENTERTAINMENT\n"
                "Subscription Receipt\n"
                "Billing Date: 2026-08-10\n"
                "Plan: Premium Ultra HD 4-Screens\n"
                "Amount: 649.00\n"
                "GST included: 99.00\n"
                "Total: 649.00\n"
                "Payment status: Success"
            )
        else:
            mock_text = (
                "MOCK STORE INDIA PVT LTD\n"
                "G-15, Mall Road, India\n"
                "Date: 17/08/2026\n"
                "Items Purchased:\n"
                "Groceries and Supplies - 1200.00\n"
                "VAT/GST: 60.00\n"
                "Total Due: 1260.00\n"
                "Paid via GPay"
            )
        return mock_text, "fallback"

def parse_receipt_text_heuristically(text: str) -> dict:
    """
    Parses OCR text using regular expressions as a quick heuristic backup.
    """
    lines = text.split("\n")
    merchant = "Unknown"
    amount = 0.0
    tax = 0.0
    date_str = None
    
    # 1. Determine merchant (first non-empty lines)
    for line in lines[:3]:
        clean = line.strip()
        if clean and len(clean) > 3 and not any(k in clean.lower() for k in ["date", "receipt", "invoice", "order"]):
            merchant = clean
            break

    # 2. Extract total amount
    # Search for lines containing total, amount, paid, due, net
    total_patterns = [
        r'(?:total|amount|paid|net|due|total paid|total amount)[\s\:\=]*[₹$]?\s*([\d,]+\.\d{2})',
        r'(?:total|amount|paid|net|due|total paid|total amount)[\s\:\=]*[₹$]?\s*([\d,]+)'
    ]
    
    found_amount = False
    for pattern in total_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        if matches:
            try:
                # Get the largest or last match which is usually the total
                candidates = [float(m.replace(",", "")) for m in matches]
                amount = max(candidates)
                found_amount = True
                break
            except ValueError:
                pass
                
    # 3. Extract tax
    tax_patterns = [
        r'(?:tax|gst|cgst|sgst|vat)[\s\:\=]*[₹$]?\s*([\d,]+\.\d{2})',
        r'(?:tax|gst|cgst|sgst|vat)[\s\:\=]*[₹$]?\s*([\d,]+)'
    ]
    for pattern in tax_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        if matches:
            try:
                candidates = [float(m.replace(",", "")) for m in matches]
                tax = sum(candidates) # sum CGST + SGST if both are found
                break
            except ValueError:
                pass

    # 4. Extract date
    # Match YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY
    date_patterns = [
        r'\b(\d{4})[-/](\d{2})[-/](\d{2})\b', # YYYY-MM-DD
        r'\b(\d{2})[-/](\d{2})[-/](\d{4})\b'  # DD/MM/YYYY
    ]
    for pattern in date_patterns:
        match = re.search(pattern, text)
        if match:
            # Format normalized to YYYY-MM-DD
            g1, g2, g3 = match.groups()
            if len(g3) == 4: # DD/MM/YYYY
                date_str = f"{g3}-{g2}-{g1}"
            else: # YYYY-MM-DD
                date_str = f"{g1}-{g2}-{g3}"
            break
            
    return {
        "merchant": merchant,
        "amount": amount,
        "tax": tax,
        "date": date_str
    }
