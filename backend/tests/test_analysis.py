import json

def test_get_stock_analysis(client):
    reg_response = client.post('/api/auth/register', json={
        "email": "analysis_test@example.com",
        "password": "password123",
        "name": "Analysis User"
    })
    token = reg_response.get_json()["access_token"]

    # Test Reliance
    response = client.get(
        '/api/investments/stocks/analysis/RELIANCE.BSE',
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    data = response.get_json()
    assert data["name"] == "Reliance Industries Ltd"
    assert data["sector"] == "Energy"
    assert data["fundamental_score"] == 85
    assert data["suitability_score"] == 75
    assert "pe_ratio" in data
    assert "debt_to_equity" in data

    # Test fallback arbitrary stock ticker
    response_fallback = client.get(
        '/api/investments/stocks/analysis/AAPL',
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response_fallback.status_code == 200
    data_fb = response_fallback.get_json()
    assert "AAPL" in data_fb["name"]
    assert 10 <= data_fb["suitability_score"] <= 100

def test_get_mutual_fund_analysis(client):
    reg_response = client.post('/api/auth/register', json={
        "email": "analysis_test2@example.com",
        "password": "password123",
        "name": "Analysis User 2"
    })
    token = reg_response.get_json()["access_token"]

    # Test HDFC Nifty 50 Index Fund
    response = client.get(
        '/api/investments/mutual-funds/analysis/HDFC_NIF50',
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    data = response.get_json()
    assert data["name"] == "HDFC Index Fund Nifty 50 Plan"
    assert data["category"] == "Index Fund"
    assert data["expense_ratio"] == 0.2
    assert "1Y" in data["returns"]
    assert isinstance(data["returns"]["1Y"], float)

    # Test fallback arbitrary fund symbol
    response_fallback = client.get(
        '/api/investments/mutual-funds/analysis/SOME_NEW_FUND',
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response_fallback.status_code == 200
    data_fb = response_fallback.get_json()
    assert "SOME NEW FUND" in data_fb["name"]
    assert "returns" in data_fb
