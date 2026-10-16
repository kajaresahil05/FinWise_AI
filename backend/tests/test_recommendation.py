import json

def test_recommendation_unauthorized(client):
    response = client.post('/api/investments/recommendations')
    assert response.status_code == 401

def test_recommendation_uses_custom_monthly_amount(client, monkeypatch):
    reg_response = client.post('/api/auth/register', json={
        "email": "rec_custom_amount@example.com",
        "password": "password123",
        "name": "Custom Amount User"
    })
    token = reg_response.get_json()["access_token"]
    captured = {}

    def fake_generate_recommendations(user_id, monthly_investable_override=None):
        captured["monthly_investable"] = monthly_investable_override
        return {"monthly_investable": monthly_investable_override}

    monkeypatch.setattr(
        "app.services.recommendation_service.generate_recommendations",
        fake_generate_recommendations
    )
    response = client.post(
        '/api/investments/recommendations',
        json={"monthly_investable": 25000.50},
        headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 200
    assert response.get_json()["monthly_investable"] == 25000.50
    assert captured["monthly_investable"] == 25000.50

    with client.application.app_context():
        from app.models import UserProfile
        profile = UserProfile.query.filter_by(user_id=reg_response.get_json()["user"]["id"]).first()
        assert float(profile.investment_amount) == 25000.50

def test_recommendation_rejects_non_positive_monthly_amount(client):
    reg_response = client.post('/api/auth/register', json={
        "email": "rec_invalid_amount@example.com",
        "password": "password123",
        "name": "Invalid Amount User"
    })
    token = reg_response.get_json()["access_token"]

    response = client.post(
        '/api/investments/recommendations',
        json={"monthly_investable": 0},
        headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 400

def test_recommendation_allocation_amounts_reach_ai(monkeypatch):
    from app.services import recommendation_service

    ai_input = {}

    class MarketProvider:
        def get_stock_analysis(self, symbol):
            return {"name": symbol, "sector": "Other", "price": 100.0}

        def get_mutual_fund_analysis(self, symbol):
            return {"name": symbol, "category": "Equity", "nav": 100.0}

        def get_market_summary(self):
            return {"etfs": []}

    class AIProvider:
        def explain_recommendation(self, recommendation_data):
            ai_input.update(recommendation_data)
            return f"Recommendation for ₹{recommendation_data['monthly_investable']:,.2f}."

    monkeypatch.setattr(
        recommendation_service,
        "get_user_financial_context",
        lambda user_id: {"risk_tolerance": "Aggressive"}
    )
    monkeypatch.setattr(recommendation_service, "get_market_data_provider", MarketProvider)
    monkeypatch.setattr(recommendation_service, "get_ai_provider", AIProvider)

    result = recommendation_service.generate_recommendations(1, monthly_investable_override=25000)

    assert sum(item["monthly_amount"] for item in result["allocation"]) == 25000
    assert result["allocation"][0]["monthly_amount"] == 20000
    assert ai_input["monthly_investable"] == 25000
    assert ai_input["allocation"][0]["monthly_amount"] == 20000
    assert "25,000.00" in result["explanation"]

def test_recommendation_conservative_user(client):
    # Register & log in
    reg_response = client.post('/api/auth/register', json={
        "email": "rec_con@example.com",
        "password": "password123",
        "name": "Conservative User"
    })
    token = reg_response.get_json()["access_token"]

    # Submit conservative risk assessment
    client.post(
        '/api/investments/risk-profile',
        json={"answers": {"age": 1, "horizon": 1, "experience": 1, "goal": 1, "reaction": 1, "income_stability": 1, "savings_rate": 1, "obligations": 1}},
        headers={"Authorization": f"Bearer {token}"}
    )

    # Fetch recommendations
    response = client.post(
        '/api/investments/recommendations',
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.get_json()
    
    assert data["risk_level"] == "Conservative"
    assert data["monthly_investable"] > 0
    # Validate sum equals 100%
    total_percentage = sum(item["percentage"] for item in data["allocation"])
    assert total_percentage == 100
    
    # Check conservative specific candidate contains TCS
    stock_symbols = [s["symbol"] for s in data["stocks"]]
    assert "TCS.BSE" in stock_symbols
    assert len(data["stocks"]) > 0
    assert len(data["mutual_funds"]) > 0
    assert len(data["etfs"]) > 0
    assert len(data["explanation"]) > 0

def test_recommendation_aggressive_user(client):
    # Register & log in
    reg_response = client.post('/api/auth/register', json={
        "email": "rec_agg@example.com",
        "password": "password123",
        "name": "Aggressive User"
    })
    token = reg_response.get_json()["access_token"]

    # Submit aggressive risk assessment
    client.post(
        '/api/investments/risk-profile',
        json={"answers": {"age": 4, "horizon": 4, "experience": 4, "goal": 4, "reaction": 4, "income_stability": 4, "savings_rate": 4, "obligations": 4}},
        headers={"Authorization": f"Bearer {token}"}
    )

    # Fetch recommendations
    response = client.get(
        '/api/investments/recommendations',
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.get_json()
    
    assert data["risk_level"] == "Aggressive"
    # Validate sum equals 100%
    total_percentage = sum(item["percentage"] for item in data["allocation"])
    assert total_percentage == 100
    
    # Check aggressive specific candidate contains INFY
    stock_symbols = [s["symbol"] for s in data["stocks"]]
    assert "INFY.BSE" in stock_symbols
    assert len(data["explanation"]) > 0
