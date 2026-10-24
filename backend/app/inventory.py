from fastapi import HTTPException
from sqlalchemy import update
from sqlalchemy.orm import Session

from app.models import Vehicle


def change_stock(session: Session, vehicle_id: int, delta: int) -> Vehicle:
    # The condition and arithmetic are one SQL statement: concurrent requests
    # cannot both purchase the last unit or overwrite one another's updates.
    statement = (
        update(Vehicle)
        .where(Vehicle.id == vehicle_id, Vehicle.quantity + delta >= 0, Vehicle.quantity + delta <= 1_000_000)
        .values(quantity=Vehicle.quantity + delta)
        .returning(Vehicle)
    )
    vehicle = session.scalar(statement)
    if vehicle is None:
        session.rollback()
        if session.get(Vehicle, vehicle_id) is None:
            raise HTTPException(404, "Vehicle not found.")
        raise HTTPException(409, "Vehicle is out of stock." if delta < 0 else "Stock limit exceeded.")
    session.commit()
    return vehicle
