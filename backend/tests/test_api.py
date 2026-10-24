from concurrent.futures import ThreadPoolExecutor

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.main import create_app
from app.models import User


@pytest.fixture
def client(tmp_path):
    application = create_app(
        database_url=f"sqlite:///{tmp_path / 'test.db'}",
        jwt_secret="test-secret-only-32-characters-long-enough",
        initialize_database=True,
    )
    with TestClient(application) as client:
        yield client


def register(client, email="customer@example.com"):
    return client.post("/api/auth/register", json={"email": email, "password": "SafePassword123!"})


def login(client, email="customer@example.com"):
    response = client.post("/api/auth/login", json={"email": email, "password": "SafePassword123!"})
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


@pytest.fixture
def customer(client):
    assert register(client).status_code == 201
    return login(client)


@pytest.fixture
def admin(client):
    assert register(client, "admin@example.com").status_code == 201
    with client.app.state.session_factory() as session:
        user = session.scalar(select(User).where(User.email == "admin@example.com"))
        user.role = "admin"
        session.commit()
    return login(client, "admin@example.com")


@pytest.fixture
def vehicle():
    return {"make": "Toyota", "model": "Camry", "category": "Sedan", "price": "32500.50", "quantity": 2}


def add_vehicle(client, admin, vehicle):
    response = client.post("/api/vehicles", json=vehicle, headers=admin)
    assert response.status_code == 201, response.text
    return response.json()["id"]


def test_registration_login_and_identity(client):
    response = register(client)
    assert response.status_code == 201
    assert response.json()["role"] == "customer"
    assert "password" not in response.text
    assert register(client).status_code == 409
    headers = login(client)
    assert client.get("/api/auth/me", headers=headers).json()["email"] == "customer@example.com"
    assert client.post("/api/auth/login", json={"email": "customer@example.com", "password": "wrong"}).status_code == 401


def test_registration_cannot_elevate_role(client):
    response = client.post("/api/auth/register", json={"email": "evil@example.com", "password": "SafePassword123!", "role": "admin"})
    assert response.status_code == 422


@pytest.mark.parametrize("payload", [
    {"email": "invalid", "password": "SafePassword123!"},
    {"email": "valid@example.com", "password": "short"},
])
def test_registration_validation(client, payload):
    assert client.post("/api/auth/register", json=payload).status_code == 422


def test_authentication_required(client):
    assert client.get("/api/vehicles").status_code == 401
    assert client.get("/api/vehicles", headers={"Authorization": "Bearer invalid"}).status_code == 401


def test_customer_permissions(client, customer, admin, vehicle):
    vehicle_id = add_vehicle(client, admin, vehicle)
    assert client.get("/api/vehicles", headers=customer).status_code == 200
    assert client.post("/api/vehicles", headers=customer, json=vehicle).status_code == 403
    assert client.put(f"/api/vehicles/{vehicle_id}", headers=customer, json=vehicle).status_code == 403
    assert client.delete(f"/api/vehicles/{vehicle_id}", headers=customer).status_code == 403
    assert client.post(f"/api/vehicles/{vehicle_id}/restock", headers=customer, json={"quantity": 2}).status_code == 403


def test_crud_and_search(client, admin, vehicle):
    vehicle_id = add_vehicle(client, admin, vehicle)
    add_vehicle(client, admin, {**vehicle, "make": "Ford", "model": "Explorer", "category": "SUV", "price": "45000.00"})
    response = client.get("/api/vehicles/search?make=toy&model=cam&category=Sedan&min_price=32000&max_price=33000", headers=admin)
    assert response.status_code == 200
    assert response.json()["total"] == 1
    assert response.json()["items"][0]["price"] == "32500.50"
    assert client.get("/api/vehicles/search?q=explorer", headers=admin).json()["total"] == 1
    assert client.get("/api/vehicles/search?min_price=500&max_price=1", headers=admin).status_code == 422
    response = client.put(f"/api/vehicles/{vehicle_id}", headers=admin, json={"make": "Toyota", "model": "Camry Hybrid", "category": "Sedan", "price": "35000.00"})
    assert response.status_code == 200
    assert response.json()["quantity"] == 2
    assert client.delete(f"/api/vehicles/{vehicle_id}", headers=admin).status_code == 204
    assert client.delete(f"/api/vehicles/{vehicle_id}", headers=admin).status_code == 404


def test_purchase_and_restock(client, admin, customer, vehicle):
    vehicle_id = add_vehicle(client, admin, vehicle)
    url = f"/api/vehicles/{vehicle_id}"
    assert client.post(f"{url}/purchase", headers=customer).json()["quantity"] == 1
    assert client.post(f"{url}/purchase", headers=customer).json()["quantity"] == 0
    assert client.post(f"{url}/purchase", headers=customer).status_code == 409
    assert client.post(f"{url}/restock", headers=admin, json={"quantity": 3}).json()["quantity"] == 3
    for amount in [0, -1, 1.5, True]:
        assert client.post(f"{url}/restock", headers=admin, json={"quantity": amount}).status_code == 422
    assert client.post("/api/vehicles/999/purchase", headers=customer).status_code == 404
    assert client.post("/api/vehicles/999/restock", headers=admin, json={"quantity": 1}).status_code == 404


def test_concurrent_purchase_cannot_oversell(client, admin, customer, vehicle):
    vehicle_id = add_vehicle(client, admin, {**vehicle, "quantity": 1})
    with ThreadPoolExecutor(max_workers=5) as pool:
        results = list(pool.map(lambda _: client.post(f"/api/vehicles/{vehicle_id}/purchase", headers=customer).status_code, range(5)))
    assert results.count(200) == 1
    assert results.count(409) == 4
    assert client.get("/api/vehicles", headers=customer).json()["items"][0]["quantity"] == 0


@pytest.mark.parametrize("changes", [{"price": "-1"}, {"price": "1.001"}, {"quantity": -1}, {"quantity": 1.5}, {"make": " "}])
def test_vehicle_validation(client, admin, vehicle, changes):
    assert client.post("/api/vehicles", headers=admin, json={**vehicle, **changes}).status_code == 422


def test_stock_cannot_be_overwritten_through_edit(client, admin, vehicle):
    vehicle_id = add_vehicle(client, admin, vehicle)
    assert client.put(f"/api/vehicles/{vehicle_id}", headers=admin, json=vehicle).status_code == 422


def test_pagination_and_empty_results(client, admin, vehicle):
    add_vehicle(client, admin, vehicle)
    assert client.get("/api/vehicles?limit=1&offset=1", headers=admin).json() == {"items": [], "total": 1}
    assert client.get("/api/vehicles/search?q=missing", headers=admin).json() == {"items": [], "total": 0}
