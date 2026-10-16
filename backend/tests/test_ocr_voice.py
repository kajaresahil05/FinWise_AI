import json
import io

def test_scan_receipt_fallback_starbucks(client):
    reg_response = client.post('/api/auth/register', json={
        "email": "ocr_test@example.com",
        "password": "password123",
        "name": "OCR Test User"
    })
    token = reg_response.get_json()["access_token"]

    # Mock file upload with "starbucks" in the filename to trigger Starbucks mock OCR text fallback
    data = {
        'receipt': (io.BytesIO(b"fake image data"), 'starbucks_receipt.png')
    }
    
    response = client.post(
        '/api/expenses/scan-receipt',
        data=data,
        content_type='multipart/form-data',
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    res_data = response.get_json()
    
    assert res_data["ocr_status"] == "fallback"
    assert "STARBUCKS" in res_data["merchant"].upper()
    assert res_data["amount"] > 0.0
    assert res_data["category"] == "Food"

def test_scan_receipt_missing_file(client):
    reg_response = client.post('/api/auth/register', json={
        "email": "ocr_test2@example.com",
        "password": "password123",
        "name": "OCR Test User 2"
    })
    token = reg_response.get_json()["access_token"]

    response = client.post(
        '/api/expenses/scan-receipt',
        data={},
        content_type='multipart/form-data',
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 400
    assert "error" in response.get_json()

def test_voice_entry_parsing(client):
    reg_response = client.post('/api/auth/register', json={
        "email": "voice_test@example.com",
        "password": "password123",
        "name": "Voice Test User"
    })
    token = reg_response.get_json()["access_token"]

    response = client.post(
        '/api/expenses/voice-entry',
        json={
            "text": "I spent 450 rupees on groceries today"
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    res_data = response.get_json()
    assert res_data["amount"] == 450.0
    assert res_data["category"] == "Groceries"
    assert "groceries" in res_data["description"].lower()

def test_voice_entry_empty_fails(client):
    reg_response = client.post('/api/auth/register', json={
        "email": "voice_test2@example.com",
        "password": "password123",
        "name": "Voice Test User 2"
    })
    token = reg_response.get_json()["access_token"]

    response = client.post(
        '/api/expenses/voice-entry',
        json={
            "text": ""
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 400
    assert "error" in response.get_json()
