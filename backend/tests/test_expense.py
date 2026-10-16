def test_add_expense_success(client):
    reg_response = client.post('/api/auth/register', json={
        "email": "test@example.com",
        "password": "password123",
        "name": "Test User"
    })
    token = reg_response.get_json()["access_token"]
    
    response = client.post('/api/expenses', json={
        "amount": 1500,
        "category": "Rent",
        "subcategory": "Apartment",
        "date": "2026-08-01",
        "payment_method": "Net Banking",
        "description": "August rent payment",
        "merchant": "Landlord Corp",
        "notes": "Paid on time"
    }, headers={"Authorization": f"Bearer {token}"})
    
    assert response.status_code == 201
    data = response.get_json()
    assert data["expense"]["amount"] == 1500.0
    assert data["expense"]["category"] == "Rent"
    assert data["expense"]["merchant"] == "Landlord Corp"


def test_expense_filtering_and_sorting(client):
    reg_response = client.post('/api/auth/register', json={
        "email": "test@example.com",
        "password": "password123",
        "name": "Test User"
    })
    token = reg_response.get_json()["access_token"]
    
    # Add Expense 1
    client.post('/api/expenses', json={
        "amount": 25.50,
        "category": "Food",
        "date": "2026-08-02",
        "description": "Taco Tuesday",
        "merchant": "Taco Shop"
    }, headers={"Authorization": f"Bearer {token}"})
    
    # Add Expense 2
    client.post('/api/expenses', json={
        "amount": 120.00,
        "category": "Bills",
        "date": "2026-08-05",
        "description": "Internet Bill",
        "merchant": "Comcast"
    }, headers={"Authorization": f"Bearer {token}"})
    
    # Add Expense 3
    client.post('/api/expenses', json={
        "amount": 45.00,
        "category": "Food",
        "date": "2026-08-08",
        "description": "Sushi dinner",
        "merchant": "Sushi Express"
    }, headers={"Authorization": f"Bearer {token}"})
    
    # 1. Filter by category
    res = client.get('/api/expenses?category=Food', headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.get_json()
    assert len(data["expenses"]) == 2
    
    # 2. Filter by search keyword
    res = client.get('/api/expenses?search=internet', headers={"Authorization": f"Bearer {token}"})
    data = res.get_json()
    assert len(data["expenses"]) == 1
    assert data["expenses"][0]["merchant"] == "Comcast"
    
    # 3. Sort by amount asc
    res = client.get('/api/expenses?sort_by=amount&order=asc', headers={"Authorization": f"Bearer {token}"})
    data = res.get_json()
    assert data["expenses"][0]["amount"] == 25.50
    assert data["expenses"][1]["amount"] == 45.00
    assert data["expenses"][2]["amount"] == 120.00


def test_update_and_delete_expense(client):
    reg_response = client.post('/api/auth/register', json={
        "email": "test@example.com",
        "password": "password123",
        "name": "Test User"
    })
    token = reg_response.get_json()["access_token"]
    
    # Add
    add_res = client.post('/api/expenses', json={
        "amount": 50,
        "category": "Travel",
        "date": "2026-08-10",
        "merchant": "Uber"
    }, headers={"Authorization": f"Bearer {token}"})
    exp_id = add_res.get_json()["expense"]["id"]
    
    # Update
    up_res = client.put(f'/api/expenses/{exp_id}', json={
        "amount": 65,
        "notes": "Added tip"
    }, headers={"Authorization": f"Bearer {token}"})
    assert up_res.status_code == 200
    assert up_res.get_json()["expense"]["amount"] == 65.0
    assert up_res.get_json()["expense"]["notes"] == "Added tip"
    
    # Delete
    del_res = client.delete(f'/api/expenses/{exp_id}', headers={"Authorization": f"Bearer {token}"})
    assert del_res.status_code == 200
    
    # Verify
    get_res = client.get('/api/expenses', headers={"Authorization": f"Bearer {token}"})
    assert len(get_res.get_json()["expenses"]) == 0
