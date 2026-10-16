from datetime import date, timedelta

def test_analytics_summary_success(client):
    # 1. Register and get token
    reg_response = client.post('/api/auth/register', json={
        "email": "test@example.com",
        "password": "password123",
        "name": "Test User"
    })
    token = reg_response.get_json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Add income streams
    client.post('/api/income', json={
        "amount": 5000,
        "source": "Salary",
        "date": date.today().isoformat(),
        "is_recurring": False
    }, headers=headers)
    
    # Add an income from last month
    last_month_date = (date.today().replace(day=1) - timedelta(days=5)).isoformat()
    client.post('/api/income', json={
        "amount": 3000,
        "source": "Freelancing",
        "date": last_month_date,
        "is_recurring": False
    }, headers=headers)
    
    # 3. Add expenses
    client.post('/api/expenses', json={
        "amount": 1200,
        "category": "Food",
        "date": date.today().isoformat()
    }, headers=headers)
    
    client.post('/api/expenses', json={
        "amount": 800,
        "category": "Travel",
        "date": date.today().isoformat()
    }, headers=headers)
    
    client.post('/api/expenses', json={
        "amount": 600,
        "category": "Food",
        "date": last_month_date
    }, headers=headers)
    
    # 4. Add goal
    future_date = (date.today() + timedelta(days=100)).isoformat()
    client.post('/api/goals', json={
        "name": "Vacation Fund",
        "target_amount": 5000,
        "current_amount": 1000,
        "target_date": future_date
    }, headers=headers)
    
    # 5. Query analytics summary
    response = client.get('/api/analytics/summary', headers=headers)
    assert response.status_code == 200
    data = response.get_json()
    
    # Check totals
    assert data["summary"]["total_income"] == 8000.0
    assert data["summary"]["total_expense"] == 2600.0
    assert data["summary"]["net_savings"] == 5400.0
    assert data["summary"]["savings_rate"] == 67.5
    
    # Check category distribution
    categories = {item["category"]: item["amount"] for item in data["category_distribution"]}
    assert categories["Food"] == 1800.0
    assert categories["Travel"] == 800.0
    
    # Check goals
    assert len(data["goals"]) == 1
    assert data["goals"][0]["name"] == "Vacation Fund"
    assert data["goals"][0]["progress"] == 20.0
    
    assert len(data["recent_transactions"]) == 5
    assert len(data["recent_transactions"]) <= 5


def test_analytics_unauthorized(client):
    response = client.get('/api/analytics/summary')
    assert response.status_code == 401
