import json

def test_portfolio_unauthorized(client):
    response = client.get('/api/portfolio')
    assert response.status_code == 401

def test_portfolio_crud_workflow(client):
    # Register & log in
    reg_response = client.post('/api/auth/register', json={
        "email": "portfolio_user@example.com",
        "password": "password123",
        "name": "Portfolio Tester"
    })
    token = reg_response.get_json()["access_token"]

    headers = {"Authorization": f"Bearer {token}"}

    # 1. Fetch initial portfolio summary (should be empty)
    response = client.get('/api/portfolio', headers=headers)
    assert response.status_code == 200
    data = response.get_json()
    assert len(data["holdings"]) == 0
    assert data["summary"]["total_invested"] == 0.0
    assert data["health"]["score"] == 100
    assert "No active portfolio holdings" in data["health"]["issues"][0]

    # 2. Add a stock holding (RELIANCE)
    add_stock_response = client.post(
        '/api/portfolio/holdings',
        json={
            "asset_class": "Stock",
            "symbol": "RELIANCE.BSE",
            "name": "Reliance Industries Ltd",
            "quantity": 10.0,
            "purchase_price": 2900.0
        },
        headers=headers
    )
    assert add_stock_response.status_code == 201
    stock_data = add_stock_response.get_json()
    assert stock_data["holding"]["symbol"] == "RELIANCE.BSE"
    assert stock_data["holding"]["quantity"] == 10.0
    stock_holding_id = stock_data["holding"]["id"]

    # 3. Add a mutual fund holding (PP_FLEXI)
    add_mf_response = client.post(
        '/api/portfolio/holdings',
        json={
            "asset_class": "Mutual Fund",
            "symbol": "PP_FLEXI",
            "name": "Parag Parikh Flexi Cap Direct",
            "quantity": 100.0,
            "purchase_price": 80.0
        },
        headers=headers
    )
    assert add_mf_response.status_code == 201
    mf_data = add_mf_response.get_json()
    assert mf_data["holding"]["symbol"] == "PP_FLEXI"
    assert mf_data["holding"]["quantity"] == 100.0
    mf_holding_id = mf_data["holding"]["id"]

    # 4. Fetch updated portfolio
    response = client.get('/api/portfolio', headers=headers)
    assert response.status_code == 200
    data = response.get_json()
    assert len(data["holdings"]) == 2
    # Total Invested: 10 * 2900 + 100 * 80 = 37,000
    assert data["summary"]["total_invested"] == 37000.0
    assert data["summary"]["total_current"] > 0.0
    assert len(data["asset_allocation"]) > 0
    assert len(data["sector_allocation"]) > 0

    # 5. Update stock holding quantity
    update_response = client.put(
        f'/api/portfolio/holdings/{stock_holding_id}',
        json={"quantity": 15.0, "purchase_price": 2850.0},
        headers=headers
    )
    assert update_response.status_code == 200
    updated_data = update_response.get_json()
    assert updated_data["holding"]["quantity"] == 15.0
    assert updated_data["holding"]["purchase_price"] == 2850.0

    # 6. Delete mutual fund holding
    delete_response = client.delete(
        f'/api/portfolio/holdings/{mf_holding_id}',
        headers=headers
    )
    assert delete_response.status_code == 200

    # 7. Fetch final portfolio list (should only contain updated stock holding)
    final_response = client.get('/api/portfolio', headers=headers)
    assert final_response.status_code == 200
    final_data = final_response.get_json()
    assert len(final_data["holdings"]) == 1
    assert final_data["holdings"][0]["id"] == stock_holding_id
    assert final_data["holdings"][0]["quantity"] == 15.0
