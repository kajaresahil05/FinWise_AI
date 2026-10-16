from datetime import date, timedelta

def test_add_goal_success(client):
    reg_response = client.post('/api/auth/register', json={
        "email": "test@example.com",
        "password": "password123",
        "name": "Test User"
    })
    token = reg_response.get_json()["access_token"]
    
    future_date = (date.today() + timedelta(days=365)).isoformat()
    
    response = client.post('/api/goals', json={
        "name": "New Laptop",
        "target_amount": 1200,
        "current_amount": 200,
        "target_date": future_date
    }, headers={"Authorization": f"Bearer {token}"})
    
    assert response.status_code == 201
    data = response.get_json()
    assert data["goal"]["name"] == "New Laptop"
    assert data["goal"]["target_amount"] == 1200.0
    assert data["goal"]["current_amount"] == 200.0
    assert data["goal"]["target_date"] == future_date


def test_add_goal_past_date_fails(client):
    reg_response = client.post('/api/auth/register', json={
        "email": "test@example.com",
        "password": "password123",
        "name": "Test User"
    })
    token = reg_response.get_json()["access_token"]
    
    past_date = (date.today() - timedelta(days=10)).isoformat()
    
    response = client.post('/api/goals', json={
        "name": "Past Goal",
        "target_amount": 500,
        "target_date": past_date
    }, headers={"Authorization": f"Bearer {token}"})
    
    assert response.status_code == 400
    assert "cannot be in the past" in response.get_json()["error"]


def test_update_and_delete_goal(client):
    reg_response = client.post('/api/auth/register', json={
        "email": "test@example.com",
        "password": "password123",
        "name": "Test User"
    })
    token = reg_response.get_json()["access_token"]
    
    future_date = (date.today() + timedelta(days=180)).isoformat()
    
    add_res = client.post('/api/goals', json={
        "name": "Vacation Fund",
        "target_amount": 2000,
        "target_date": future_date
    }, headers={"Authorization": f"Bearer {token}"})
    goal_id = add_res.get_json()["goal"]["id"]
    
    # Update
    up_res = client.put(f'/api/goals/{goal_id}', json={
        "current_amount": 500,
        "target_amount": 2500
    }, headers={"Authorization": f"Bearer {token}"})
    assert up_res.status_code == 200
    assert up_res.get_json()["goal"]["current_amount"] == 500.0
    assert up_res.get_json()["goal"]["target_amount"] == 2500.0
    
    # Delete
    del_res = client.delete(f'/api/goals/{goal_id}', headers={"Authorization": f"Bearer {token}"})
    assert del_res.status_code == 200
    
    # Verify
    get_res = client.get('/api/goals', headers={"Authorization": f"Bearer {token}"})
    assert len(get_res.get_json()["goals"]) == 0
