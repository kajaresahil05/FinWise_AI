import json

def test_register_success(client):
    response = client.post('/api/auth/register', json={
        "email": "test@example.com",
        "password": "password123",
        "name": "Test User"
    })
    assert response.status_code == 201
    data = response.get_json()
    assert "access_token" in data
    assert data["user"]["email"] == "test@example.com"
    assert data["user"]["name"] == "Test User"


def test_register_invalid_email(client):
    response = client.post('/api/auth/register', json={
        "email": "invalid-email",
        "password": "password123",
        "name": "Test User"
    })
    assert response.status_code == 400
    data = response.get_json()
    assert "error" in data


def test_register_duplicate_email(client):
    # First registration
    client.post('/api/auth/register', json={
        "email": "test@example.com",
        "password": "password123",
        "name": "Test User"
    })
    # Second registration with same email
    response = client.post('/api/auth/register', json={
        "email": "test@example.com",
        "password": "password456",
        "name": "Another User"
    })
    assert response.status_code == 400
    data = response.get_json()
    assert data["error"] == "Email is already registered"


def test_login_success(client):
    # Register user
    client.post('/api/auth/register', json={
        "email": "test@example.com",
        "password": "password123",
        "name": "Test User"
    })
    
    # Login user
    response = client.post('/api/auth/login', json={
        "email": "test@example.com",
        "password": "password123"
    })
    assert response.status_code == 200
    data = response.get_json()
    assert "access_token" in data
    assert data["user"]["email"] == "test@example.com"


def test_login_invalid_credentials(client):
    response = client.post('/api/auth/login', json={
        "email": "test@example.com",
        "password": "wrongpassword"
    })
    assert response.status_code == 401


def test_get_me_unauthorized(client):
    response = client.get('/api/auth/me')
    assert response.status_code == 401


def test_get_me_success(client):
    # Register user to get token
    reg_response = client.post('/api/auth/register', json={
        "email": "test@example.com",
        "password": "password123",
        "name": "Test User"
    })
    token = reg_response.get_json()["access_token"]
    
    # Access profile
    response = client.get('/api/auth/me', headers={
        "Authorization": f"Bearer {token}"
    })
    assert response.status_code == 200
    data = response.get_json()
    assert data["user"]["email"] == "test@example.com"
    assert data["user"]["profile"]["name"] == "Test User"


def test_update_profile(client):
    # Register user to get token
    reg_response = client.post('/api/auth/register', json={
        "email": "test@example.com",
        "password": "password123",
        "name": "Test User"
    })
    token = reg_response.get_json()["access_token"]
    
    # Update profile fields
    response = client.put('/api/auth/profile', json={
        "name": "Updated Name",
        "age": 25,
        "monthly_income": 50000,
        "monthly_expenses": 30000,
        "monthly_savings": 20000,
        "investment_amount": 10000,
        "investment_horizon": 5,
        "risk_tolerance": "Aggressive",
        "currency": "INR"
    }, headers={
        "Authorization": f"Bearer {token}"
    })
    assert response.status_code == 200
    data = response.get_json()
    assert data["profile"]["name"] == "Updated Name"
    assert data["profile"]["age"] == 25
    assert data["profile"]["monthly_income"] == 50000.00
    assert data["profile"]["monthly_expenses"] == 30000.00
    assert data["profile"]["monthly_savings"] == 20000.00
    assert data["profile"]["investment_amount"] == 10000.00
    assert data["profile"]["investment_horizon"] == 5
    assert data["profile"]["risk_tolerance"] == "Aggressive"
    assert data["profile"]["currency"] == "INR"
