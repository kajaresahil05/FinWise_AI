import json

def test_get_market_summary(client):
    reg_response = client.post('/api/auth/register', json={
        "email": "market_test@example.com",
        "password": "password123",
        "name": "Market User"
    })
    token = reg_response.get_json()["access_token"]

    response = client.get(
        '/api/investments/market-summary',
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    data = response.get_json()
    assert "timestamp" in data
    assert "provider_type" in data
    assert len(data["indices"]) > 0
    assert len(data["stocks"]) > 0
    assert len(data["mutual_funds"]) > 0
    assert len(data["etfs"]) > 0
    
    # Assert specific simulated items exist
    nifty = next((item for item in data["indices"] if item["name"] == "Nifty 50"), None)
    assert nifty is not None
    assert nifty["symbol"] == "^NSEI"
    assert nifty["price"] > 0.0

def test_get_market_summary_unauthorized(client):
    response = client.get('/api/investments/market-summary')
    assert response.status_code == 401

def test_get_historical_data(client):
    reg_response = client.post('/api/auth/register', json={
        "email": "market_test2@example.com",
        "password": "password123",
        "name": "Market User 2"
    })
    token = reg_response.get_json()["access_token"]

    response = client.get(
        '/api/investments/historical/^NSEI',
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    data = response.get_json()
    assert data["symbol"] == "^NSEI"
    assert len(data["history"]) > 0
    
    # Check date formatting and price field
    first_item = data["history"][0]
    assert "date" in first_item
    assert "price" in first_item
    assert isinstance(first_item["price"], float)
