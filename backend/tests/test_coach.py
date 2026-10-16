import json

def test_chat_creates_conversation(client):
    # Register user
    reg_response = client.post('/api/auth/register', json={
        "email": "coach_test@example.com",
        "password": "password123",
        "name": "Coach User"
    })
    token = reg_response.get_json()["access_token"]

    # Chat message (should create thread automatically)
    res = client.post('/api/ai/chat', json={
        "message": "Explain SIP and Index Funds"
    }, headers={"Authorization": f"Bearer {token}"})
    
    assert res.status_code == 201
    data = res.get_json()
    assert "response" in data
    assert "SIP" in data["response"]
    assert "conversation_id" in data
    assert data["title"] is not None


def test_conversation_management(client):
    # Register user
    reg_response = client.post('/api/auth/register', json={
        "email": "coach_mgmt@example.com",
        "password": "password123",
        "name": "Mgmt User"
    })
    token = reg_response.get_json()["access_token"]

    # Create first message
    res = client.post('/api/ai/chat', json={
        "message": "Hello Coach!"
    }, headers={"Authorization": f"Bearer {token}"})
    conv_id = res.get_json()["conversation_id"]

    # Retrieve conversations list
    convs_res = client.get('/api/ai/conversations', headers={"Authorization": f"Bearer {token}"})
    assert convs_res.status_code == 200
    convs_data = convs_res.get_json()
    assert len(convs_data) == 1
    assert convs_data[0]["id"] == conv_id

    # Retrieve messages list for this conversation
    msgs_res = client.get(f'/api/ai/conversations/{conv_id}/messages', headers={"Authorization": f"Bearer {token}"})
    assert msgs_res.status_code == 200
    msgs_data = msgs_res.get_json()
    # Should contain 2 messages: user message and coach assistant response
    assert len(msgs_data) == 2
    assert msgs_data[0]["role"] == "user"
    assert msgs_data[1]["role"] == "assistant"

    # Delete conversation
    del_res = client.delete(f'/api/ai/conversations/{conv_id}', headers={"Authorization": f"Bearer {token}"})
    assert del_res.status_code == 200

    # Retrieve list again (should be empty)
    convs_res_after = client.get('/api/ai/conversations', headers={"Authorization": f"Bearer {token}"})
    assert len(convs_res_after.get_json()) == 0


def test_chat_incorporates_context(client):
    # Register user
    reg_response = client.post('/api/auth/register', json={
        "email": "coach_context@example.com",
        "password": "password123",
        "name": "Context User"
    })
    token = reg_response.get_json()["access_token"]

    # 1. Update Profile Income to 50000
    client.put('/api/auth/profile', json={
        "name": "Context User",
        "monthly_income": 50000.00,
        "monthly_savings": 15000.00
    }, headers={"Authorization": f"Bearer {token}"})

    # 2. Add some expenses
    client.post('/api/expenses', json={
        "amount": 2500.00,
        "category": "Food",
        "date": "2026-08-01",
        "description": "Party food"
    }, headers={"Authorization": f"Bearer {token}"})

    # 3. Add category budget
    client.post('/api/budgets', json={
        "category": "Food",
        "amount": 2000.00
    }, headers={"Authorization": f"Bearer {token}"})

    # 4. Chat with coach asking for spending/budget status
    res = client.post('/api/ai/chat', json={
        "message": "Where am I overspending?"
    }, headers={"Authorization": f"Bearer {token}"})

    assert res.status_code == 201
    response_text = res.get_json()["response"]
    # Check that it identifies "Food" as exceeded (Limit: 2000, Spent: 2500)
    assert "Food" in response_text
    assert "exceeded" in response_text.lower() or "spent" in response_text.lower()
