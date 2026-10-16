"""test_achievements.py — API tests for /api/achievements"""
import datetime


def _auth(client, email="ach_user@example.com"):
    r = client.post('/api/auth/register', json={
        "email": email, "password": "password123", "name": "Ach User"
    })
    return {"Authorization": f"Bearer {r.get_json()['access_token']}"}


def test_achievements_unauthorized(client):
    assert client.get('/api/achievements').status_code == 401


def test_list_achievements_structure(client):
    headers = _auth(client, "ach_list@example.com")
    r = client.get('/api/achievements', headers=headers)
    assert r.status_code == 200
    data = r.get_json()
    assert "earned_count" in data
    assert "total_count" in data
    assert "achievements" in data
    assert data["total_count"] == 10  # matches ACHIEVEMENT_DEFINITIONS length
    for item in data["achievements"]:
        assert "code" in item
        assert "title" in item
        assert "icon" in item
        assert "earned" in item


def test_check_achievements_fresh_user(client):
    """Fresh user with no data should have 0 achievements."""
    headers = _auth(client, "ach_fresh@example.com")
    r = client.post('/api/achievements/check', headers=headers)
    assert r.status_code == 200
    data = r.get_json()
    assert "earned_achievements" in data
    assert isinstance(data["earned_achievements"], list)
    assert len(data["earned_achievements"]) == 0


def test_check_achievements_after_expense(client):
    """After adding an expense, first_expense badge should be awarded."""
    headers = _auth(client, "ach_expense@example.com")

    # Add an expense
    client.post('/api/expenses', json={
        "amount": 500,
        "category": "Food",
        "date": datetime.date.today().isoformat(),
        "description": "Lunch"
    }, headers=headers)

    # Check achievements
    r = client.post('/api/achievements/check', headers=headers)
    assert r.status_code == 200
    codes = [a["code"] for a in r.get_json()["earned_achievements"]]
    assert "first_expense" in codes


def test_achievements_idempotent(client):
    """Calling check twice should not duplicate badges."""
    headers = _auth(client, "ach_idem@example.com")
    client.post('/api/achievements/check', headers=headers)
    client.post('/api/achievements/check', headers=headers)
    r = client.get('/api/achievements', headers=headers)
    data = r.get_json()
    codes = [a["code"] for a in data["achievements"] if a["earned"]]
    assert len(codes) == len(set(codes))  # no duplicates
