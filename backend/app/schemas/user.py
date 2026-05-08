import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str | None = Field(None, max_length=200)
    role: Literal[
        "superadmin", "director", "regional_manager", "engineer", "operator", "analyst"
    ]
    region_id: int | None = None
    phone: str | None = Field(None, max_length=20)


class UserUpdate(BaseModel):
    email: EmailStr | None = None
    full_name: str | None = Field(None, max_length=200)
    role: str | None = None
    region_id: int | None = None
    phone: str | None = None
    is_active: bool | None = None


class UserResponse(BaseModel):
    id: uuid.UUID
    username: str
    email: str
    full_name: str | None
    role: str
    region_id: int | None
    is_active: bool
    phone: str | None
    avatar_url: str | None
    telegram_chat_id: str | None
    telegram_username: str | None
    notification_settings: dict
    created_at: datetime

    model_config = {"from_attributes": True}
