import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field


class TaskCreate(BaseModel):
    location_id: uuid.UUID | None = None
    region_id: int | None = None
    settlement_id: int | None = None
    title: str = Field(max_length=500)
    description: str | None = None
    type: Literal[
        "equipment_setup",
        "internet_setup",
        "training",
        "inspection",
        "data_upload",
        "maintenance",
        "other",
    ]
    priority: Literal["low", "normal", "high", "critical"] = "normal"
    assigned_to: uuid.UUID | None = None
    due_date: date | None = None
    estimated_hours: float | None = None


class TaskUpdate(BaseModel):
    title: str | None = Field(None, max_length=500)
    description: str | None = None
    type: str | None = None
    priority: str | None = None
    assigned_to: uuid.UUID | None = None
    due_date: date | None = None
    estimated_hours: float | None = None
    actual_hours: float | None = None


class TaskStatusUpdate(BaseModel):
    status: Literal["new", "assigned", "in_progress", "waiting", "done", "cancelled"]


class TaskCommentCreate(BaseModel):
    content: str = Field(min_length=1, max_length=5000)


class TaskCommentResponse(BaseModel):
    id: uuid.UUID
    task_id: uuid.UUID
    user_id: uuid.UUID
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


class TaskResponse(BaseModel):
    id: uuid.UUID
    location_id: uuid.UUID | None
    location_name: str | None = None
    region_id: int | None
    settlement_id: int | None = None
    title: str
    description: str | None
    type: str
    status: str
    priority: str
    assigned_to: uuid.UUID | None
    assignee_name: str | None = None
    created_by: uuid.UUID
    due_date: date | None
    completed_at: datetime | None
    estimated_hours: float | None
    actual_hours: float | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
