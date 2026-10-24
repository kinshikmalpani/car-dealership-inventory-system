from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, Request, Response
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError

from app.inventory import change_stock
from app.models import User, Vehicle
from app.schemas import Login, Register, Restock, TokenOut, UserOut, VehicleCreate, VehicleEdit, VehicleOut, VehiclePage
from app.security import AdminDep, SessionDep, UserDep, dummy_hash, issue_token, password_hasher

router = APIRouter(prefix="/api")


@router.get("/health")
def health():
    return {"status": "ok"}


@router.post("/auth/register", response_model=UserOut, status_code=201)
def register(payload: Register, session: SessionDep):
    user = User(email=str(payload.email), password_hash=password_hasher.hash(payload.password), role="customer")
    session.add(user)
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        raise HTTPException(409, "An account with this email already exists.")
    return user


@router.post("/auth/login", response_model=TokenOut)
def login(payload: Login, request: Request, session: SessionDep):
    user = session.scalar(select(User).where(User.email == str(payload.email)))
    valid = password_hasher.verify(payload.password, user.password_hash if user else dummy_hash)
    if user is None or not valid:
        raise HTTPException(401, "Incorrect email or password.", headers={"WWW-Authenticate": "Bearer"})
    return {"access_token": issue_token(request, user), "user": user}


@router.get("/auth/me", response_model=UserOut)
def me(user: UserDep):
    return user


@router.get("/vehicles", response_model=VehiclePage)
@router.get("/vehicles/search", response_model=VehiclePage)
def list_vehicles(
    session: SessionDep, user: UserDep,
    q: Annotated[str, Query(max_length=100)] = "",
    make: Annotated[str, Query(max_length=80)] = "",
    model: Annotated[str, Query(max_length=100)] = "",
    category: Annotated[str, Query(max_length=50)] = "",
    min_price: Annotated[Decimal | None, Query(ge=0, max_digits=11, decimal_places=2)] = None,
    max_price: Annotated[Decimal | None, Query(ge=0, max_digits=11, decimal_places=2)] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 12,
    offset: Annotated[int, Query(ge=0)] = 0,
    seating_capacity: Annotated[int | None, Query(ge=2, le=12)] = None,
    currency: Annotated[str, Query(pattern="^(INR|USD)$")] = "INR",
):
    if min_price is not None and max_price is not None and min_price > max_price:
        raise HTTPException(422, "Minimum price must not exceed maximum price.")
    if currency != "INR" and user.role != "admin":
        raise HTTPException(403, "Legacy inventory is available only to administrators.")
    statement = select(Vehicle).where(Vehicle.currency == currency)
    if seating_capacity is not None:
        statement = statement.where(Vehicle.seating_capacity == seating_capacity)
    if q.strip():
        statement = statement.where(or_(*(column.icontains(q.strip(), autoescape=True) for column in (Vehicle.make, Vehicle.model, Vehicle.category))))
    for column, value in [(Vehicle.make, make), (Vehicle.model, model), (Vehicle.category, category)]:
        if value.strip():
            statement = statement.where(column.icontains(value.strip(), autoescape=True))
    if min_price is not None:
        statement = statement.where(Vehicle.price_cents >= int(min_price * 100))
    if max_price is not None:
        statement = statement.where(Vehicle.price_cents <= int(max_price * 100))
    total = session.scalar(select(func.count()).select_from(statement.subquery()))
    items = session.scalars(statement.order_by(Vehicle.id.desc()).offset(offset).limit(limit)).all()
    return {"items": items, "total": total}


@router.post("/vehicles", response_model=VehicleOut, status_code=201)
def create_vehicle(payload: VehicleCreate, session: SessionDep, admin: AdminDep):
    values = payload.model_dump(exclude={"price"})
    vehicle = Vehicle(**values, price_cents=int(payload.price * 100))
    session.add(vehicle)
    session.commit()
    return vehicle


@router.put("/vehicles/{vehicle_id}", response_model=VehicleOut)
def edit_vehicle(vehicle_id: int, payload: VehicleEdit, session: SessionDep, admin: AdminDep):
    vehicle = session.get(Vehicle, vehicle_id)
    if vehicle is None:
        raise HTTPException(404, "Vehicle not found.")
    for field, value in payload.model_dump(exclude={"price"}, exclude_unset=True).items():
        setattr(vehicle, field, value)
    vehicle.price_cents = int(payload.price * 100)
    session.commit()
    session.refresh(vehicle)
    return vehicle


@router.delete("/vehicles/{vehicle_id}", status_code=204)
def delete_vehicle(vehicle_id: int, session: SessionDep, admin: AdminDep):
    vehicle = session.get(Vehicle, vehicle_id)
    if vehicle is None:
        raise HTTPException(404, "Vehicle not found.")
    session.delete(vehicle)
    session.commit()
    return Response(status_code=204)


@router.post("/vehicles/{vehicle_id}/restock", response_model=VehicleOut)
def restock(vehicle_id: int, payload: Restock, session: SessionDep, admin: AdminDep):
    return change_stock(session, vehicle_id, payload.quantity)
