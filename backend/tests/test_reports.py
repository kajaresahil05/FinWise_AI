"""
test_reports.py — Unit tests for GET /api/ai/financial-report
"""
from datetime import datetime


def _register_and_login(client, email="report_user@example.com"):
    resp = client.post('/api/auth/register', json={
        "email": email,
        "password": "password123",
        "name": "Report User"
    })
    return resp.get_json()["access_token"]


def test_report_unauthorized(client):
    """Unauthenticated request must return 401."""
    response = client.get('/api/ai/financial-report')
    assert response.status_code == 401


def test_report_default_month(client):
    """Authenticated request with no params returns current month report."""
    token = _register_and_login(client, "report_default@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get('/api/ai/financial-report', headers=headers)
    assert response.status_code == 200

    data = response.get_json()
    today = datetime.utcnow()

    # Top-level keys must all be present
    required_keys = [
        "year", "month", "month_name",
        "income", "expenses", "savings",
        "budget_performance", "goal_progress",
        "portfolio", "health_score", "ai_narrative"
    ]
    for key in required_keys:
        assert key in data, f"Missing key: {key}"

    # Default month/year should match current
    assert data["year"] == today.year
    assert data["month"] == today.month


def test_report_custom_month(client):
    """Query params ?year=&month= correctly target a specific period."""
    token = _register_and_login(client, "report_custom@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get('/api/ai/financial-report?year=2025&month=6', headers=headers)
    assert response.status_code == 200

    data = response.get_json()
    assert data["year"] == 2025
    assert data["month"] == 6
    assert data["month_name"] == "June 2025"


def test_report_invalid_month(client):
    """Month value outside 1–12 must return 400."""
    token = _register_and_login(client, "report_invalid@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get('/api/ai/financial-report?year=2025&month=13', headers=headers)
    assert response.status_code == 400


def test_report_structure_income_expenses(client):
    """Income and expenses sub-keys are present."""
    token = _register_and_login(client, "report_struct@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get('/api/ai/financial-report', headers=headers)
    assert response.status_code == 200
    data = response.get_json()

    assert "total" in data["income"]
    assert "sources" in data["income"]
    assert "total" in data["expenses"]
    assert "by_category" in data["expenses"]
    assert "biggest_category" in data["expenses"]
    assert "total" in data["savings"]
    assert "savings_rate" in data["savings"]

    # ai_narrative must be a string (even if fallback rule-based)
    assert isinstance(data["ai_narrative"], str)
    assert len(data["ai_narrative"]) > 0
