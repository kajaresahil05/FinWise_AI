"""test_notifications.py — API tests for /api/notifications"""


def _auth(client, email="notif_user@example.com"):
    r = client.post('/api/auth/register', json={
        "email": email, "password": "password123", "name": "Notif User"
    })
    return {"Authorization": f"Bearer {r.get_json()['access_token']}"}


def test_notifications_unauthorized(client):
    assert client.get('/api/notifications').status_code == 401


def test_generate_notifications(client):
    headers = _auth(client, "notif_gen@example.com")
    r = client.post('/api/notifications/generate', headers=headers)
    assert r.status_code == 200
    data = r.get_json()
    assert "message" in data
    assert "new_notifications" in data


def test_list_notifications(client):
    headers = _auth(client, "notif_list@example.com")
    # Generate first
    client.post('/api/notifications/generate', headers=headers)
    r = client.get('/api/notifications', headers=headers)
    assert r.status_code == 200
    data = r.get_json()
    assert "notifications" in data
    assert "unread_count" in data
    assert isinstance(data["notifications"], list)


def test_mark_all_read(client):
    headers = _auth(client, "notif_read@example.com")
    r = client.post('/api/notifications/read-all', headers=headers)
    assert r.status_code == 200


def test_unread_only_filter(client):
    headers = _auth(client, "notif_filter@example.com")
    r = client.get('/api/notifications?unread_only=true', headers=headers)
    assert r.status_code == 200
    data = r.get_json()
    # All returned items should be unread
    for n in data["notifications"]:
        assert n["is_read"] is False
