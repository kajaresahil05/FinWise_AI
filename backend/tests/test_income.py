def test_add_income_success(client):
    # Register and get token
    reg_response = client.post('/api/auth/register', json={
        "email": "test@example.com",
        "password": "password123",
        "name": "Test User"
    })
    token = reg_response.get_json()["access_token"]
    
    response = client.post('/api/income', json={
        "amount": 5000,
        "source": "Salary",
        "date": "2026-08-01",
        "description": "Monthly pay",
        "is_recurring": True,
        "recurrence_period": "Monthly"
    }, headers={"Authorization": f"Bearer {token}"})
    
    assert response.status_code == 201
    data = response.get_json()
    assert data["income"]["amount"] == 5000.0
    assert data["income"]["source"] == "Salary"
    assert data["income"]["date"] == "2026-08-01"


def test_add_income_validation_errors(client):
    # Register and get token
    reg_response = client.post('/api/auth/register', json={
        "email": "test@example.com",
        "password": "password123",
        "name": "Test User"
    })
    token = reg_response.get_json()["access_token"]
    
    # Missing fields
    res = client.post('/api/income', json={
        "source": "Salary",
        "date": "2026-08-01"
    }, headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 400
    
    # Negative amount
    res = client.post('/api/income', json={
        "amount": -100,
        "source": "Salary",
        "date": "2026-08-01"
    }, headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 400
    
    # Invalid date
    res = client.post('/api/income', json={
        "amount": 100,
        "source": "Salary",
        "date": "invalid-date"
    }, headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 400


def test_get_incomes_isolation(client):
    # Register User A
    res_a = client.post('/api/auth/register', json={
        "email": "usera@example.com",
        "password": "password123",
        "name": "User A"
    })
    token_a = res_a.get_json()["access_token"]
    
    # Register User B
    res_b = client.post('/api/auth/register', json={
        "email": "userb@example.com",
        "password": "password123",
        "name": "User B"
    })
    token_b = res_b.get_json()["access_token"]
    
    # Add income for User A
    client.post('/api/income', json={
        "amount": 1000,
        "source": "Freelancing",
        "date": "2026-08-01"
    }, headers={"Authorization": f"Bearer {token_a}"})
    
    # Get incomes for User A
    get_a = client.get('/api/income', headers={"Authorization": f"Bearer {token_a}"})
    assert len(get_a.get_json()["incomes"]) == 1
    
    # Get incomes for User B
    get_b = client.get('/api/income', headers={"Authorization": f"Bearer {token_b}"})
    assert len(get_b.get_json()["incomes"]) == 0


def test_update_and_delete_income(client):
    # Register and get token
    reg_response = client.post('/api/auth/register', json={
        "email": "test@example.com",
        "password": "password123",
        "name": "Test User"
    })
    token = reg_response.get_json()["access_token"]
    
    # Add income
    add_res = client.post('/api/income', json={
        "amount": 200,
        "source": "Other",
        "date": "2026-08-05"
    }, headers={"Authorization": f"Bearer {token}"})
    income_id = add_res.get_json()["income"]["id"]
    
    # Update income
    up_res = client.put(f'/api/income/{income_id}', json={
        "amount": 350,
        "source": "Freelancing",
        "description": "Updated Freelance payment"
    }, headers={"Authorization": f"Bearer {token}"})
    assert up_res.status_code == 200
    assert up_res.get_json()["income"]["amount"] == 350.0
    assert up_res.get_json()["income"]["source"] == "Freelancing"
    assert up_res.get_json()["income"]["description"] == "Updated Freelance payment"
    
    # Delete income
    del_res = client.delete(f'/api/income/{income_id}', headers={"Authorization": f"Bearer {token}"})
    assert del_res.status_code == 200
    
    # Verify deleted
    get_res = client.get('/api/income', headers={"Authorization": f"Bearer {token}"})
    assert len(get_res.get_json()["incomes"]) == 0
