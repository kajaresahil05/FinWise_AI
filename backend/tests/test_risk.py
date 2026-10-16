import json

def test_submit_risk_profile_conservative(client):
    reg_response = client.post('/api/auth/register', json={
        "email": "risk_con@example.com",
        "password": "password123",
        "name": "Conservative Risk User"
    })
    token = reg_response.get_json()["access_token"]

    # Low scores on all: 1 * 8 = 8 (< 15)
    answers = {
        "age": 1,
        "horizon": 1,
        "experience": 1,
        "goal": 1,
        "reaction": 1,
        "income_stability": 1,
        "savings_rate": 1,
        "obligations": 1
    }

    response = client.post(
        '/api/investments/risk-profile',
        json={"answers": answers},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 201
    data = response.get_json()
    assert data["risk_profile"]["score"] == 8
    assert data["risk_profile"]["risk_level"] == "Conservative"

    # Verify latest returns conservative
    response_latest = client.get(
        '/api/investments/risk-profile/latest',
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response_latest.status_code == 200
    assert response_latest.get_json()["risk_level"] == "Conservative"

def test_submit_risk_profile_moderate(client):
    reg_response = client.post('/api/auth/register', json={
        "email": "risk_mod@example.com",
        "password": "password123",
        "name": "Moderate Risk User"
    })
    token = reg_response.get_json()["access_token"]

    # Medium scores: 2 * 8 = 16 (between 15 and 25)
    answers = {
        "age": 2,
        "horizon": 2,
        "experience": 2,
        "goal": 2,
        "reaction": 2,
        "income_stability": 2,
        "savings_rate": 2,
        "obligations": 2
    }

    response = client.post(
        '/api/investments/risk-profile',
        json={"answers": answers},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 201
    data = response.get_json()
    assert data["risk_profile"]["score"] == 16
    assert data["risk_profile"]["risk_level"] == "Moderate"

def test_submit_risk_profile_aggressive(client):
    reg_response = client.post('/api/auth/register', json={
        "email": "risk_agg@example.com",
        "password": "password123",
        "name": "Aggressive Risk User"
    })
    token = reg_response.get_json()["access_token"]

    # High scores: 4 * 8 = 32 (> 25)
    answers = {
        "age": 4,
        "horizon": 4,
        "experience": 4,
        "goal": 4,
        "reaction": 4,
        "income_stability": 4,
        "savings_rate": 4,
        "obligations": 4
    }

    response = client.post(
        '/api/investments/risk-profile',
        json={"answers": answers},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 201
    data = response.get_json()
    assert data["risk_profile"]["score"] == 32
    assert data["risk_profile"]["risk_level"] == "Aggressive"

def test_get_risk_profile_history(client):
    reg_response = client.post('/api/auth/register', json={
        "email": "risk_hist@example.com",
        "password": "password123",
        "name": "History User"
    })
    token = reg_response.get_json()["access_token"]

    # Post 1
    client.post(
        '/api/investments/risk-profile',
        json={"answers": {"age": 1, "horizon": 1, "experience": 1, "goal": 1, "reaction": 1, "income_stability": 1, "savings_rate": 1, "obligations": 1}},
        headers={"Authorization": f"Bearer {token}"}
    )
    # Post 2
    client.post(
        '/api/investments/risk-profile',
        json={"answers": {"age": 4, "horizon": 4, "experience": 4, "goal": 4, "reaction": 4, "income_stability": 4, "savings_rate": 4, "obligations": 4}},
        headers={"Authorization": f"Bearer {token}"}
    )

    response = client.get(
        '/api/investments/risk-profile/history',
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    history = response.get_json()
    assert len(history) == 2
    # Should be sorted desc, so first is Aggressive
    assert history[0]["risk_level"] == "Aggressive"
    assert history[1]["risk_level"] == "Conservative"
