def test_add_budget_success(client):
    reg_response = client.post('/api/auth/register', json={
        "email": "test@example.com",
        "password": "password123",
        "name": "Test User"
    })
    token = reg_response.get_json()["access_token"]
    
    response = client.post('/api/budgets', json={
        "category": "Food",
        "amount": 500,
        "warning_threshold_1": 60.0,
        "warning_threshold_2": 85.0
    }, headers={"Authorization": f"Bearer {token}"})
    
    assert response.status_code == 201
    data = response.get_json()
    assert data["budget"]["category"] == "Food"
    assert data["budget"]["amount"] == 500.0
    assert data["budget"]["warning_threshold_1"] == 60.0


def test_add_budget_duplicate_fails(client):
    reg_response = client.post('/api/auth/register', json={
        "email": "test@example.com",
        "password": "password123",
        "name": "Test User"
    })
    token = reg_response.get_json()["access_token"]
    
    # Add first budget
    client.post('/api/budgets', json={
        "category": "Food",
        "amount": 500
    }, headers={"Authorization": f"Bearer {token}"})
    
    # Add second budget for same category
    res = client.post('/api/budgets', json={
        "category": "Food",
        "amount": 600
    }, headers={"Authorization": f"Bearer {token}"})
    
    assert res.status_code == 400
    assert "already exists" in res.get_json()["error"]


def test_budget_validation(client):
    reg_response = client.post('/api/auth/register', json={
        "email": "test@example.com",
        "password": "password123",
        "name": "Test User"
    })
    token = reg_response.get_json()["access_token"]
    
    # Zero amount
    res = client.post('/api/budgets', json={
        "category": "Food",
        "amount": 0
    }, headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 400
    
    # Threshold too large
    res = client.post('/api/budgets', json={
        "category": "Travel",
        "amount": 100,
        "warning_threshold_1": 150
    }, headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 400


def test_update_and_delete_budget(client):
    reg_response = client.post('/api/auth/register', json={
        "email": "test@example.com",
        "password": "password123",
        "name": "Test User"
    })
    token = reg_response.get_json()["access_token"]
    
    add_res = client.post('/api/budgets', json={
        "category": "Shopping",
        "amount": 300
    }, headers={"Authorization": f"Bearer {token}"})
    budget_id = add_res.get_json()["budget"]["id"]
    
    # Update
    up_res = client.put(f'/api/budgets/{budget_id}', json={
        "amount": 450,
        "warning_threshold_2": 95.0
    }, headers={"Authorization": f"Bearer {token}"})
    assert up_res.status_code == 200
    assert up_res.get_json()["budget"]["amount"] == 450.0
    assert up_res.get_json()["budget"]["warning_threshold_2"] == 95.0
    
    # Delete
    del_res = client.delete(f'/api/budgets/{budget_id}', headers={"Authorization": f"Bearer {token}"})
    assert del_res.status_code == 200
    
    # Verify
    get_res = client.get('/api/budgets', headers={"Authorization": f"Bearer {token}"})
    assert len(get_res.get_json()["budgets"]) == 0
