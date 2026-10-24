from decimal import Decimal

from sqlalchemy import CheckConstraint, Integer, String, JSON, ForeignKey, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"
    __table_args__ = (CheckConstraint("role IN ('customer', 'admin')", name="valid_role"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(20), default="customer")


class Vehicle(Base):
    __tablename__ = "vehicles"
    __table_args__ = (
        CheckConstraint("quantity >= 0 AND quantity <= 1000000", name="valid_quantity"),
        CheckConstraint("price_cents >= 0 AND price_cents <= 99999999999", name="valid_price"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    make: Mapped[str] = mapped_column(String(80), index=True)
    model: Mapped[str] = mapped_column(String(100), index=True)
    category: Mapped[str] = mapped_column(String(50), index=True)
    price_cents: Mapped[int] = mapped_column(Integer)
    quantity: Mapped[int] = mapped_column(Integer, default=0)
    currency: Mapped[str] = mapped_column(String(3), default="INR")
    seating_capacity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    description: Mapped[str] = mapped_column(String(2000), default="")
    image_url: Mapped[str] = mapped_column(String(2000), default="")
    source_url: Mapped[str] = mapped_column(String(2000), default="")
    specifications: Mapped[dict] = mapped_column(JSON, default=dict)
    features: Mapped[list] = mapped_column(JSON, default=list)
    price_note: Mapped[str] = mapped_column(String(500), default="Dealership listed price")

    @property
    def price(self) -> Decimal:
        return Decimal(self.price_cents) / 100


class Order(Base):
    __tablename__ = "orders"
    __table_args__ = (UniqueConstraint("user_id", "idempotency_key", name="uq_customer_checkout"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    reference: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    vehicle_id: Mapped[int | None] = mapped_column(ForeignKey("vehicles.id", ondelete="SET NULL"), nullable=True)
    idempotency_key: Mapped[str] = mapped_column(String(100))
    request_hash: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[str] = mapped_column(String(40))
    buyer_name: Mapped[str] = mapped_column(String(100))
    customer_email: Mapped[str] = mapped_column(String(254))
    city: Mapped[str] = mapped_column(String(100))
    summary: Mapped[dict] = mapped_column(JSON)
    quantity: Mapped[int] = mapped_column(Integer)
    payment_status: Mapped[str] = mapped_column(String(20), default="simulated")


class Wishlist(Base):
    __tablename__ = "wishlist"
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    vehicle_id: Mapped[int] = mapped_column(ForeignKey("vehicles.id", ondelete="CASCADE"), primary_key=True)


class TestDrive(Base):
    __tablename__ = "test_drives"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    vehicle_id: Mapped[int | None] = mapped_column(ForeignKey("vehicles.id", ondelete="SET NULL"), nullable=True)
    vehicle_name: Mapped[str] = mapped_column(String(200))
    name: Mapped[str] = mapped_column(String(100))
    phone: Mapped[str] = mapped_column(String(15))
    city: Mapped[str] = mapped_column(String(100))
    preferred_date: Mapped[str] = mapped_column(String(10))
    status: Mapped[str] = mapped_column(String(20), default="requested")
    created_at: Mapped[str] = mapped_column(String(40))
