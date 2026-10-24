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

    @field_serializer("price")
    def serialize_price(self, value):
        return format(value, ".2f")


class VehiclePage(BaseModel):
    items: list[VehicleOut]
    total: int


class Restock(InputModel):
    quantity: int = Field(strict=True, gt=0, le=1_000_000)
