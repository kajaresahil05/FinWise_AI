import json

def test_ai_categorize_heuristics(client):
    reg_response = client.post('/api/auth/register', json={
        "email": "ai_test@example.com",
        "password": "password123",
        "name": "AI Test User"
    })
    token = reg_response.get_json()["access_token"]

    # Test 1: Food & Domino's
    response = client.post('/api/ai/expense-categorize', json={
        "text": "Spent 350 rupees at Domino's"
    }, headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.get_json()
    assert data["category"] == "Food"
    assert data["subcategory"] == "Restaurant"
    assert data["merchant"] == "Domino's"
    assert data["amount"] == 350.0

    # Test 2: Groceries & Target
    response2 = client.post('/api/ai/expense-categorize', json={
        "text": "Spent 1500 at Target on groceries"
    }, headers={"Authorization": f"Bearer {token}"})
    assert response2.status_code == 200
    data2 = response2.get_json()
    assert data2["category"] == "Groceries"
    assert data2["merchant"] == "Target"
    assert data2["amount"] == 1500.0


def test_ai_correction_saving_and_retrieval(client):
    reg_response = client.post('/api/auth/register', json={
        "email": "ai_corr_test@example.com",
        "password": "password123",
        "name": "AI Corr Test User"
    })
    token = reg_response.get_json()["access_token"]

    # Categorize raw text (should map to Food or default Other because of "pizza")
    response_init = client.post('/api/ai/expense-categorize', json={
        "text": "annual pizza party"
    }, headers={"Authorization": f"Bearer {token}"})
    assert response_init.status_code == 200
    assert response_init.get_json()["is_correction"] is False

    # Save a correction
    corr_response = client.post('/api/ai/expense-correct', json={
        "raw_text": "annual pizza party",
        "corrected_category": "Entertainment",
        "corrected_subcategory": "Party",
        "corrected_merchant": "Office",
        "corrected_amount": 2500.00
    }, headers={"Authorization": f"Bearer {token}"})
    assert corr_response.status_code == 201

    # Re-categorize the same text
    response_after = client.post('/api/ai/expense-categorize', json={
        "text": "annual pizza party"
    }, headers={"Authorization": f"Bearer {token}"})
    assert response_after.status_code == 200
    data_after = response_after.get_json()
    assert data_after["category"] == "Entertainment"
    assert data_after["subcategory"] == "Party"
    assert data_after["merchant"] == "Office"
    assert data_after["amount"] == 2500.0
    assert data_after["is_correction"] is True
