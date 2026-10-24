"""Server-owned checkout arithmetic and transactional order creation."""
from datetime import datetime, timezone
from decimal import Decimal
import hashlib
import json
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import select, update

from app.commerce_schemas import PurchaseInput
from app.models import Order, Vehicle

# These are explicitly labelled demo estimates, not OEM accessory quotations.
ACCESSORIES = [
    {"id": "floor-mats", "name": "Floor mat set", "price": "1500.00"},
    {"id": "car-cover", "name": "Protective car cover", "price": "2500.00"},
    {"id": "emergency-kit", "name": "Roadside emergency kit", "price": "2000.00"},
]


def timestamp():
    return datetime.now(timezone.utc).isoformat()


def make_quote(vehicle, payload):
    if vehicle.currency != "INR":
        raise HTTPException(409, "This legacy listing must be repriced in INR by an administrator.")
    by_id = {item["id"]: item for item in ACCESSORIES}
    if any(key not in by_id for key in payload.accessory_ids):
        raise HTTPException(422, "Unknown accessory selection.")
    accessories = [by_id[key] for key in payload.accessory_ids]
    total = vehicle.price + payload.registration_estimate + payload.insurance_estimate + sum((Decimal(item["price"]) for item in accessories), Decimal(0))
    return {
        "vehicle": {"make": vehicle.make, "model": vehicle.model, "category": vehicle.category, "seating_capacity": vehicle.seating_capacity, "image_url": vehicle.image_url, "price_note": vehicle.price_note},
        "currency": "INR", "vehicle_price": format(vehicle.price, ".2f"),
        "registration_estimate": format(payload.registration_estimate, ".2f"),
        "insurance_estimate": format(payload.insurance_estimate, ".2f"),
        "accessories": accessories, "total": format(total, ".2f"),
        "estimate_note": "Registration and insurance are customer-entered planning estimates, not statutory or insurer quotations. Zero means not quoted. Accessories use demo estimates. Payment is simulated.",
    }


def create_purchase(session, user, vehicle_id: int, payload: PurchaseInput):
    user_id, email = user.id, user.email
    key = payload.idempotency_key or str(uuid4())
    fingerprint = hashlib.sha256(json.dumps({"vehicle_id": vehicle_id, **payload.model_dump(mode="json", exclude={"idempotency_key"})}, sort_keys=True).encode()).hexdigest()
    # SQLite serializes writers. Acquire its write lock before checking the
    # idempotency key, reading prices, and decrementing inventory.
    session.rollback()
    session.connection().exec_driver_sql("BEGIN IMMEDIATE")
    try:
        existing = session.scalar(select(Order).where(Order.user_id == user_id, Order.idempotency_key == key))
        if existing:
            if existing.request_hash != fingerprint:
                raise HTTPException(409, "This checkout reference was already used with different details.")
            session.commit()
            return existing
        vehicle = session.get(Vehicle, vehicle_id)
        if vehicle is None:
            raise HTTPException(404, "Vehicle not found.")
        summary = make_quote(vehicle, payload)
        if payload.expected_total is not None and payload.expected_total != Decimal(summary["total"]):
            raise HTTPException(409, "The price has changed. Review a fresh estimate before confirming.")
        remaining = session.scalar(update(Vehicle).where(Vehicle.id == vehicle_id, Vehicle.quantity > 0).values(quantity=Vehicle.quantity - 1).returning(Vehicle.quantity))
        if remaining is None:
            raise HTTPException(409, "Vehicle is out of stock.")
        order = Order(reference="MR-IN-" + uuid4().hex[:16].upper(), user_id=user_id, vehicle_id=vehicle_id, idempotency_key=key, request_hash=fingerprint, created_at=timestamp(), buyer_name=payload.buyer_name.strip() or email, customer_email=email, city=payload.city.strip(), summary=summary, quantity=remaining, payment_status="simulated")
        session.add(order)
        session.commit()
        return order
    except Exception:
        session.rollback()
        raise
