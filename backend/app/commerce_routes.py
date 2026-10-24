from fastapi import APIRouter, HTTPException, Response
from sqlalchemy import select, func
from sqlalchemy.dialects.sqlite import insert

from app.commerce import ACCESSORIES, create_purchase, make_quote, timestamp
from app.commerce_schemas import PurchaseInput, QuoteInput, OrderOut, TestDriveInput, TestDriveOut, EnquiryUpdate
from app.invoices import invoice_html
from app.models import Vehicle, Order, Wishlist, TestDrive, User
from app.schemas import VehicleOut
from app.security import SessionDep, CustomerDep, UserDep, AdminDep

router = APIRouter(prefix="/api")


@router.get("/accessories")
def accessories(user: UserDep):
    return ACCESSORIES


@router.get("/vehicles/{vehicle_id}", response_model=VehicleOut)
def details(vehicle_id: int, session: SessionDep, user: UserDep):
    vehicle = session.get(Vehicle, vehicle_id)
    if vehicle is None or (user.role != "admin" and vehicle.currency != "INR"):
        raise HTTPException(404, "Vehicle not found.")
    return vehicle


@router.post("/vehicles/{vehicle_id}/quote")
def quote(vehicle_id: int, payload: QuoteInput, session: SessionDep, user: CustomerDep):
    vehicle = session.get(Vehicle, vehicle_id)
    if vehicle is None:
        raise HTTPException(404, "Vehicle not found.")
    return make_quote(vehicle, payload)


@router.post("/vehicles/{vehicle_id}/purchase", response_model=OrderOut)
def purchase(vehicle_id: int, session: SessionDep, user: CustomerDep, payload: PurchaseInput | None = None):
    return create_purchase(session, user, vehicle_id, payload or PurchaseInput())


@router.get("/orders", response_model=list[OrderOut])
def my_orders(session: SessionDep, user: CustomerDep):
    return session.scalars(select(Order).where(Order.user_id == user.id).order_by(Order.id.desc())).all()


def owned_order(reference, session, user):
    statement = select(Order).where(Order.reference == reference)
    if user.role != "admin":
        statement = statement.where(Order.user_id == user.id)
    order = session.scalar(statement)
    if order is None:
        raise HTTPException(404, "Purchase not found.")
    return order


@router.get("/orders/{reference}", response_model=OrderOut)
def order(reference: str, session: SessionDep, user: UserDep):
    return owned_order(reference, session, user)


@router.get("/orders/{reference}/invoice")
def invoice(reference: str, session: SessionDep, user: UserDep):
    order = owned_order(reference, session, user)
    return Response(invoice_html(order), media_type="text/html", headers={"Content-Disposition": f'attachment; filename="invoice-{order.reference}.html"', "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'"})


@router.get("/admin/orders", response_model=list[OrderOut])
def admin_orders(session: SessionDep, admin: AdminDep):
    return session.scalars(select(Order).order_by(Order.id.desc())).all()


@router.get("/admin/customers")
def customers(session: SessionDep, admin: AdminDep):
    rows = session.execute(select(User.id, User.email, func.count(Order.id)).outerjoin(Order, Order.user_id == User.id).where(User.role == "customer").group_by(User.id).order_by(User.id.desc())).all()
    return [{"id": row[0], "email": row[1], "purchase_count": row[2]} for row in rows]


@router.get("/wishlist", response_model=list[VehicleOut])
def wishlist(session: SessionDep, user: CustomerDep):
    return session.scalars(select(Vehicle).join(Wishlist, Wishlist.vehicle_id == Vehicle.id).where(Wishlist.user_id == user.id, Vehicle.currency == "INR")).all()


@router.put("/wishlist/{vehicle_id}", status_code=204)
def save_vehicle(vehicle_id: int, session: SessionDep, user: CustomerDep):
    vehicle = session.get(Vehicle, vehicle_id)
    if vehicle is None or vehicle.currency != "INR":
        raise HTTPException(404, "Vehicle not found.")
    session.execute(insert(Wishlist).values(user_id=user.id, vehicle_id=vehicle_id).on_conflict_do_nothing())
    session.commit()
    return Response(status_code=204)


@router.delete("/wishlist/{vehicle_id}", status_code=204)
def unsave_vehicle(vehicle_id: int, session: SessionDep, user: CustomerDep):
    entry = session.get(Wishlist, (user.id, vehicle_id))
    if entry:
        session.delete(entry)
        session.commit()
    return Response(status_code=204)


@router.post("/test-drives", response_model=TestDriveOut, status_code=201)
def enquire(payload: TestDriveInput, session: SessionDep, user: CustomerDep):
    vehicle = session.get(Vehicle, payload.vehicle_id)
    if vehicle is None or vehicle.currency != "INR":
        raise HTTPException(404, "Vehicle not found.")
    enquiry = TestDrive(user_id=user.id, vehicle_id=vehicle.id, vehicle_name=f"{vehicle.make} {vehicle.model}", name=payload.name, phone=payload.phone, city=payload.city, preferred_date=payload.preferred_date.isoformat(), created_at=timestamp())
    session.add(enquiry)
    session.commit()
    return enquiry


@router.get("/test-drives", response_model=list[TestDriveOut])
def my_enquiries(session: SessionDep, user: CustomerDep):
    return session.scalars(select(TestDrive).where(TestDrive.user_id == user.id).order_by(TestDrive.id.desc())).all()


@router.get("/admin/test-drives", response_model=list[TestDriveOut])
def enquiries(session: SessionDep, admin: AdminDep):
    return session.scalars(select(TestDrive).order_by(TestDrive.id.desc())).all()


@router.patch("/admin/test-drives/{enquiry_id}", response_model=TestDriveOut)
def update_enquiry(enquiry_id: int, payload: EnquiryUpdate, session: SessionDep, admin: AdminDep):
    enquiry = session.get(TestDrive, enquiry_id)
    if enquiry is None:
        raise HTTPException(404, "Enquiry not found.")
    enquiry.status = payload.status
    session.commit()
    return enquiry
