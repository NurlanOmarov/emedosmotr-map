import uuid
from datetime import datetime

from pydantic import BaseModel


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenRefreshResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserMe(BaseModel):
    id: uuid.UUID
    username: str
    email: str
    full_name: str | None
    role: str
    region_id: int | None
    is_active: bool
    avatar_url: str | None
    last_login_at: datetime | None

    model_config = {"from_attributes": True}
