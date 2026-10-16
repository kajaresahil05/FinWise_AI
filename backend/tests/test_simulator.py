import json

def test_simulate_unauthorized(client):
    response = client.post('/api/investments/simulate', json={
        "type": "sip",
        "amount": 5000,
        "duration": 10,
        "return_rate": 12
    })
    assert response.status_code == 401

def test_simulate_sip(client):
    # Register & log in
    reg_response = client.post('/api/auth/register', json={
        "email": "sim_user@example.com",
        "password": "password123",
        "name": "Simulator User"
    })
    token = reg_response.get_json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Simulate SIP: 5,000 monthly for 5 years at 12% returns
    response = client.post(
        '/api/investments/simulate',
        json={
            "type": "sip",
            "amount": 5000.0,
            "duration": 5,
            "return_rate": 12.0
        },
        headers=headers
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data["type"] == "sip"
    assert data["amount"] == 5000.0
    assert data["duration"] == 5
    assert data["return_rate"] == 12.0
    
    # 5 years * 12 months = 60 months
    # 60 months * 5000 = 300,000 invested
    summary = data["summary"]
    assert summary["total_invested"] == 300000.0
    assert summary["future_value"] > 300000.0
    assert summary["estimated_returns"] == round(summary["future_value"] - 300000.0, 2)
    
    projections = data["projections"]
    assert len(projections) == 5
    assert projections[0]["year"] == 1
    assert projections[4]["year"] == 5
    assert projections[4]["total_invested"] == 300000.0

def test_simulate_lump_sum(client):
    # Register & log in
    reg_response = client.post('/api/auth/register', json={
        "email": "sim_lump_user@example.com",
        "password": "password123",
        "name": "Simulator User"
    })
    token = reg_response.get_json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Simulate Lump Sum: 100,000 for 5 years at 10% returns
    response = client.post(
        '/api/investments/simulate',
        json={
            "type": "lump_sum",
            "amount": 100000.0,
            "duration": 5,
            "return_rate": 10.0
        },
        headers=headers
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data["type"] == "lump_sum"
    assert data["amount"] == 100000.0
    assert data["duration"] == 5
    
    summary = data["summary"]
    assert summary["total_invested"] == 100000.0
    # FV = 100000 * (1.10)^5 = 161,051.00
    assert abs(summary["future_value"] - 161051.00) < 1.0
    
    projections = data["projections"]
    assert len(projections) == 5
    assert projections[4]["total_invested"] == 100000.0

def test_simulate_validation(client):
    # Register & log in
    reg_response = client.post('/api/auth/register', json={
        "email": "sim_val_user@example.com",
        "password": "password123",
        "name": "Simulator User"
    })
    token = reg_response.get_json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Test missing inputs
    response1 = client.post(
        '/api/investments/simulate',
        json={"type": "sip", "amount": 5000},
        headers=headers
    )
    assert response1.status_code == 400

    # 2. Test negative values
    response2 = client.post(
        '/api/investments/simulate',
        json={
            "type": "sip",
            "amount": -5000,
            "duration": 5,
            "return_rate": 12
        },
        headers=headers
    )
    assert response2.status_code == 400

    # 3. Test invalid type
    response3 = client.post(
        '/api/investments/simulate',
        json={
            "type": "invalid_type",
            "amount": 5000,
            "duration": 5,
            "return_rate": 12
        },
        headers=headers
    )
    assert response3.status_code == 400
