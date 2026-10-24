from decimal import Decimal
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_serializer, field_validator


class InputModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Login(InputModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value):
        return value.lower()


class Register(Login):
    password: str = Field(min_length=10, max_length=128)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: str
    role: Literal["customer", "admin"]


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class VehicleEdit(InputModel):
    make: str = Field(min_length=1, max_length=80)
    model: str = Field(min_length=1, max_length=100)
    category: str = Field(min_length=1, max_length=50)
    price: Decimal = Field(ge=0, max_digits=11, decimal_places=2, allow_inf_nan=False)
    currency: Literal["INR"] = "INR"
    seating_capacity: int | None = Field(default=None, ge=2, le=12, strict=True)
    description: str = Field(default="", max_length=2000)
    image_url: str = Field(default="", max_length=2000)
    source_url: str = Field(default="", max_length=2000)
    specifications: dict[str, str] = Field(default_factory=dict, max_length=20)
    features: list[str] = Field(default_factory=list, max_length=20)
    price_note: str = Field(default="Dealership listed price", max_length=500)

    @field_validator("image_url", "source_url")
    @classmethod
    def safe_url(cls, value):
        if value and not value.startswith("https://") and not (value.startswith("/images/") and ".." not in value):
            raise ValueError("Use an HTTPS URL or a local /images/ path")
        return value

    @field_validator("make", "model", "category", mode="before")
    @classmethod
    def trim_text(cls, value):
        return value.strip() if isinstance(value, str) else value


Stock = Annotated[int, Field(strict=True, ge=0, le=1_000_000)]


class VehicleCreate(VehicleEdit):
    quantity: Stock = 0


class VehicleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    make: str
    model: str
    category: str
    price: Decimal
    quantity: int
    currency: str
    seating_capacity: int | None
    description: str
    image_url: str
    source_url: str
    specifications: dict[str, str]
    features: list[str]
    price_note: str

    @field_serializer("price")
    def serialize_price(self, value):
        return format(value, ".2f")


class VehiclePage(BaseModel):
    items: list[VehicleOut]
    total: int


class Restock(InputModel):
    quantity: int = Field(strict=True, gt=0, le=1_000_000)
