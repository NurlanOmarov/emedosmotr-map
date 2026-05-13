from datetime import datetime

from pydantic import BaseModel, ConfigDict


class DistrictAccountBase(BaseModel):
    full_name: str
    login: str | None = None
    password: str | None = None
    role: str | None = None
    phone: str | None = None
    note: str | None = None
    category: str | None = None
    settlement_id: int


class DistrictAccountCreate(DistrictAccountBase):
    pass


class DistrictAccountUpdate(BaseModel):
    full_name: str | None = None
    login: str | None = None
    password: str | None = None
    role: str | None = None
    phone: str | None = None
    note: str | None = None
    category: str | None = None


class DistrictAccount(DistrictAccountBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
