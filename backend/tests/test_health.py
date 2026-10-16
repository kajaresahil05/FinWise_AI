import json

def test_health_score_calculation(client):
    # Register user
    reg_response = client.post('/api/auth/register', json={
        "email": "health_calc@example.com",
        "password": "password123",
        "name": "Health User"
    })
    token = reg_response.get_json()["access_token"]

    # 1. Update Profile Income
    client.put('/api/auth/profile', json={
        "name": "Health User",
        "monthly_income": 60000.00,
        "monthly_expenses": 20000.00
    }, headers={"Authorization": f"Bearer {token}"})

    # 2. Get Score
    res = client.get('/api/financial-health/score', headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.get_json()
    assert "score" in data
    assert "breakdown" in data
    assert "strengths" in data
    assert "improvements" in data
    
    # Check default score is in a reasonable range
    assert 0 <= data["score"] <= 100
    assert "savings_rate" in data["breakdown"]


def test_emergency_fund_management(client):
    # Register user
    reg_response = client.post('/api/auth/register', json={
        "email": "health_ef@example.com",
        "password": "password123",
        "name": "EF User"
    })
    token = reg_response.get_json()["access_token"]

    # Configure profile expenses to 25000
    client.put('/api/auth/profile', json={
        "name": "EF User",
        "monthly_income": 70000.00,
        "monthly_expenses": 25000.00
    }, headers={"Authorization": f"Bearer {token}"})

    # Get emergency fund details
    res = client.get('/api/financial-health/emergency', headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.get_json()
    assert data["essential_monthly"] == 25000.00
    assert data["target_months"] == 6
    assert data["target_amount"] == 150000.00  # 25000 * 6
    assert data["remaining"] == 150000.00
    
    # Update current saved cushion
    up_res = client.post('/api/financial-health/emergency', json={
        "current_amount": 100000.00,
        "target_months": 3
    }, headers={"Authorization": f"Bearer {token}"})
    assert up_res.status_code == 200

    # Get details again to check update
    res2 = client.get('/api/financial-health/emergency', headers={"Authorization": f"Bearer {token}"})
    data2 = res2.get_json()
    assert data2["current_amount"] == 100000.00
    assert data2["target_months"] == 3
    assert data2["target_amount"] == 75000.00  # 25000 * 3
    assert data2["remaining"] == 0.0  # target (75000) reached by 100000!


def test_score_history(client):
    # Register user
    reg_response = client.post('/api/auth/register', json={
        "email": "health_hist@example.com",
        "password": "password123",
        "name": "Hist User"
    })
    token = reg_response.get_json()["access_token"]

    # Initial score calculation to write a database record
    client.get('/api/financial-health/score', headers={"Authorization": f"Bearer {token}"})

    # Fetch score history list
    res = client.get('/api/financial-health/history', headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.get_json()
    assert len(data) >= 1
    assert "score" in data[0]
    assert "created_at" in data[0]
