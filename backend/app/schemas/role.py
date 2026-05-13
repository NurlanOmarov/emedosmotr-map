from datetime import datetime

from pydantic import BaseModel, Field


class RoleCreate(BaseModel):
    name: str = Field(min_length=2, max_length=50, pattern=r"^[a-z][a-z0-9_]*$")
    display_name: str = Field(min_length=1, max_length=100)
    description: str | None = None
    color: str = Field(default="#6B7280", pattern=r"^#[0-9A-Fa-f]{6}$")
    permissions: list[str] = Field(default_factory=list)


class RoleUpdate(BaseModel):
    display_name: str | None = Field(None, max_length=100)
    description: str | None = None
    color: str | None = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    permissions: list[str] | None = None


class RoleResponse(BaseModel):
    name: str
    display_name: str
    description: str | None
    color: str
    is_system: bool
    permissions: list[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class FeatureItem(BaseModel):
    key: str
    name: str
    category: str
