from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator
from app.schemas import InputModel

Estimate = Annotated[Decimal, Field(ge=0, le=10000000, max_digits=10, decimal_places=2)]


class QuoteInput(InputModel):
    accessory_ids: list[str] = Field(default_factory=list, max_length=10)
    registration_estimate: Estimate = Decimal("0")
    insurance_estimate: Estimate = Decimal("0")

    @field_validator("accessory_ids")
    @classmethod
    def unique_accessories(cls, value):
        if len(value) != len(set(value)):
            raise ValueError("Select each accessory only once")
        return value


class PurchaseInput(QuoteInput):
    idempotency_key: str | None = Field(default=None, min_length=8, max_length=100)
    expected_total: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=2, allow_inf_nan=False)
    buyer_name: str = Field(default="", max_length=100)
    city: str = Field(default="", max_length=100)


class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    reference: str
    created_at: str
    buyer_name: str
    customer_email: str
    city: str
    summary: dict
    quantity: int
    payment_status: str


class TestDriveInput(InputModel):
    vehicle_id: int
    name: str = Field(min_length=1, max_length=100)
    phone: str = Field(pattern=r"^[6-9][0-9]{9}$")
    city: str = Field(min_length=1, max_length=100)
    preferred_date: date

    @field_validator("name", "city")
    @classmethod
    def nonempty(cls, value):
        if not value.strip():
            raise ValueError("This field is required")
        return value.strip()

    @field_validator("preferred_date")
    @classmethod
    def future_date(cls, value):
        if value < datetime.now(timezone(timedelta(hours=5, minutes=30))).date():
            raise ValueError("Choose today or a future date")
        return value


class TestDriveOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    vehicle_name: str
    name: str
    phone: str
    city: str
    preferred_date: str
    status: str
    created_at: str


class EnquiryUpdate(InputModel):
    status: Literal["requested", "contacted", "scheduled", "closed"]
