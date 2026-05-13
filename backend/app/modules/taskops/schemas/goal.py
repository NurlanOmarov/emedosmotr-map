from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, Field


class GoalCreate(BaseModel):
    title: str = Field(..., max_length=200)
    description: str | None = None
    due_date: date | None = None


class GoalUpdate(BaseModel):
    title: str | None = Field(None, max_length=200)
    description: str | None = None
    status: str | None = None
    progress: int | None = Field(None, ge=0, le=100)
    due_date: date | None = None


class GoalResponse(BaseModel):
    id: UUID
    title: str
    description: str | None
    status: str
    progress: int
    due_date: date | None
    owner_id: UUID
    owner_name: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
