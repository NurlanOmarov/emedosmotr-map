import uuid
from datetime import date, datetime

from pydantic import BaseModel, Field


class CycleCreate(BaseModel):
    name: str = Field(..., max_length=200)
    start_date: date
    end_date: date


class CycleResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    name: str
    start_date: date
    end_date: date
    is_closed: bool
    created_at: datetime
    task_count: int | None = None
    done_count: int | None = None

    model_config = {"from_attributes": True}
