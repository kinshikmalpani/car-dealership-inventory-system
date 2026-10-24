from concurrent.futures import ThreadPoolExecutor
from uuid import uuid4

from sqlalchemy import select

from app.models import Vehicle
from test_api import client, admin, customer, vehicle, add_vehicle, register, login


def test_seating_details_and_admin_cannot_purchase(client, admin, customer, vehicle):
    vehicle_id = add_vehicle(client, admin, {**vehicle, "seating_capacity": 7, "description": "Family car"})
    assert client.get(f"/api/vehicles/{vehicle_id}", headers=customer).json()["seating_capacity"] == 7
    assert client.get("/api/vehicles?seating_capacity=7", headers=customer).json()["total"] == 1
    assert client.get("/api/vehicles?seating_capacity=5", headers=customer).json()["total"] == 0
    assert client.post(f"/api/vehicles/{vehicle_id}/purchase", headers=admin).status_code == 403
    assert client.post("/api/vehicles", headers=admin, json={**vehicle, "seating_capacity": 0}).status_code == 422


def test_quote_purchase_history_invoice_and_ownership(client, admin, customer, vehicle):
    vehicle_id = add_vehicle(client, admin, vehicle)
    options = {"accessory_ids": ["floor-mats"], "registration_estimate": "1000", "insurance_estimate": "500"}
    quote = client.post(f"/api/vehicles/{vehicle_id}/quote", headers=customer, json=options)
    assert quote.status_code == 200
    assert quote.json()["total"] == "35500.50"
    payload = {**options, "idempotency_key": str(uuid4()), "buyer_name": "Asha Kumar", "city": "Pune", "expected_total": quote.json()["total"]}
    response = client.post(f"/api/vehicles/{vehicle_id}/purchase", headers=customer, json=payload)
    assert response.status_code == 200
    order = response.json()
    assert order["payment_status"] == "simulated"
    assert order["reference"].startswith("MR-IN-")
    assert order["quantity"] == 1
    assert order["summary"]["total"] == "35500.50"
    again = client.post(f"/api/vehicles/{vehicle_id}/purchase", headers=customer, json=payload)
    assert again.json()["reference"] == order["reference"]
    assert len(client.get("/api/orders", headers=customer).json()) == 1
    register(client, "other@example.com")
    other = login(client, "other@example.com")
    assert client.get("/api/orders", headers=other).json() == []
    for suffix in ("", "/invoice"):
        assert client.get(f"/api/orders/{order['reference']}{suffix}", headers=other).status_code == 404
    invoice = client.get(f"/api/orders/{order['reference']}/invoice", headers=customer)
    assert invoice.status_code == 200
    assert "attachment" in invoice.headers["content-disposition"]
    assert "₹35,500.50" in invoice.text
    assert "Payment simulated" in invoice.text
    assert "Asha Kumar" in invoice.text
    assert client.delete(f"/api/vehicles/{vehicle_id}", headers=admin).status_code == 204
    assert client.get(f"/api/orders/{order['reference']}/invoice", headers=customer).status_code == 200
    assert len(client.get("/api/admin/orders", headers=admin).json()) == 1
    assert client.get("/api/admin/orders", headers=customer).status_code == 403
    assert client.get("/api/admin/customers", headers=customer).status_code == 403


def test_purchase_rejects_tampering_and_rolls_back(client, admin, customer, vehicle):
    vehicle_id = add_vehicle(client, admin, vehicle)
    for body, status in [({"accessory_ids": ["unknown"]}, 422), ({"expected_total": "1"}, 409), ({"registration_estimate": "-1"}, 422), ({"accessory_ids": ["floor-mats", "floor-mats"]}, 422)]:
        assert client.post(f"/api/vehicles/{vehicle_id}/purchase", headers=customer, json=body).status_code == status
    assert client.get(f"/api/vehicles/{vehicle_id}", headers=customer).json()["quantity"] == 2
    assert client.get("/api/orders", headers=customer).json() == []


def test_concurrent_duplicate_checkout_creates_one_order(client, admin, customer, vehicle):
    vehicle_id = add_vehicle(client, admin, {**vehicle, "quantity": 1})
    payload = {"idempotency_key": str(uuid4())}
    with ThreadPoolExecutor(max_workers=4) as pool:
        responses = list(pool.map(lambda _: client.post(f"/api/vehicles/{vehicle_id}/purchase", headers=customer, json=payload), range(4)))
    assert all(response.status_code == 200 for response in responses)
    assert len({response.json()["reference"] for response in responses}) == 1
    assert len(client.get("/api/orders", headers=customer).json()) == 1
    assert client.get(f"/api/vehicles/{vehicle_id}", headers=customer).json()["quantity"] == 0


def test_wishlist_and_test_drive_are_private(client, admin, customer, vehicle):
    vehicle_id = add_vehicle(client, admin, vehicle)
    assert client.put(f"/api/wishlist/{vehicle_id}", headers=customer).status_code == 204
    assert client.put(f"/api/wishlist/{vehicle_id}", headers=customer).status_code == 204
    assert len(client.get("/api/wishlist", headers=customer).json()) == 1
    register(client, "second@example.com")
    other = login(client, "second@example.com")
    assert client.get("/api/wishlist", headers=other).json() == []
    response = client.post("/api/test-drives", headers=customer, json={"vehicle_id": vehicle_id, "name": "Asha", "phone": "9876543210", "city": "Pune", "preferred_date": "2099-01-01"})
    assert response.status_code == 201
    assert client.get("/api/test-drives", headers=other).json() == []
    request_id = response.json()["id"]
    assert client.patch(f"/api/admin/test-drives/{request_id}", headers=admin, json={"status": "contacted"}).status_code == 200
    assert client.patch(f"/api/admin/test-drives/{request_id}", headers=customer, json={"status": "contacted"}).status_code == 403
    assert client.delete(f"/api/wishlist/{vehicle_id}", headers=customer).status_code == 204


def test_legacy_currency_not_relabelled(client, admin, customer, vehicle):
    vehicle_id = add_vehicle(client, admin, vehicle)
    with client.app.state.session_factory() as session:
        session.get(Vehicle, vehicle_id).currency = "USD"
        session.commit()
    assert client.get("/api/vehicles", headers=customer).json()["total"] == 0
    assert client.post(f"/api/vehicles/{vehicle_id}/purchase", headers=customer).status_code == 409
    assert client.get("/api/vehicles?currency=USD", headers=customer).status_code == 403
    assert client.get("/api/vehicles?currency=USD", headers=admin).json()["total"] == 1
