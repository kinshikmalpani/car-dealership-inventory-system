from datetime import datetime, timedelta, timezone

import jwt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.main import create_app
from app.models import User
from test_api import admin, client, customer, register, login, vehicle, add_vehicle


def test_expired_token_and_tampered_signature(client, customer):
    now = datetime.now(timezone.utc)
    claims = {"sub": "1", "iat": now - timedelta(hours=2), "exp": now - timedelta(hours=1)}
    expired = jwt.encode(claims, client.app.state.jwt_secret, algorithm="HS256")
    wrong_key = jwt.encode({**claims, "exp": now + timedelta(hours=1)}, "wrong-secret-but-still-long-enough-123", algorithm="HS256")
    for token in (expired, wrong_key):
        assert client.get("/api/vehicles", headers={"Authorization": f"Bearer {token}"}).status_code == 401


def test_removed_user_and_changed_role_take_effect_immediately(client, admin, vehicle):
    with client.app.state.session_factory() as session:
        user = session.scalar(select(User).where(User.email == "admin@example.com"))
        user.role = "customer"
        session.commit()
    assert client.post("/api/vehicles", headers=admin, json=vehicle).status_code == 403
    with client.app.state.session_factory() as session:
        session.delete(session.scalar(select(User).where(User.email == "admin@example.com")))
        session.commit()
    assert client.get("/api/vehicles", headers=admin).status_code == 401


def test_stock_upper_limit_and_missing_edit(client, admin, vehicle):
    vehicle_id = add_vehicle(client, admin, {**vehicle, "quantity": 1_000_000})
    assert client.post(f"/api/vehicles/{vehicle_id}/restock", headers=admin, json={"quantity": 1}).status_code == 409
    details = {key: value for key, value in vehicle.items() if key != "quantity"}
    assert client.put("/api/vehicles/999", headers=admin, json=details).status_code == 404
    assert client.get("/api/health").json() == {"status": "ok"}


def test_data_survives_application_restart(tmp_path):
    url = f"sqlite:///{tmp_path / 'persistent.db'}"
    secret = "persistent-test-secret-longer-than-32-characters"
    with TestClient(create_app(url, secret, initialize_database=True)) as first:
        assert register(first).status_code == 201
    with TestClient(create_app(url, secret)) as second:
        assert login(second)["Authorization"].startswith("Bearer ")


def test_insecure_secret_rejected():
    with pytest.raises(RuntimeError, match="JWT_SECRET"):
        create_app(jwt_secret="short")
