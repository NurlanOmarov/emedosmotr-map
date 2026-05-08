from datetime import datetime
from pydantic import BaseModel, ConfigDict
from typing import Optional


class DistrictAccountBase(BaseModel):
    full_name: str
    login: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    phone: Optional[str] = None
    note: Optional[str] = None
    category: Optional[str] = None
    settlement_id: int


class DistrictAccountCreate(DistrictAccountBase):
    pass


class DistrictAccountUpdate(BaseModel):
    full_name: Optional[str] = None
    login: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    phone: Optional[str] = None
    note: Optional[str] = None
    category: Optional[str] = None


class DistrictAccount(DistrictAccountBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
