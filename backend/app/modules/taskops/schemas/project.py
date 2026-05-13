import uuid
from datetime import date, datetime

from pydantic import BaseModel, Field

from app.models.taskops import EstimateType, ProjectMemberRole


class ProjectCreate(BaseModel):
    name: str = Field(..., max_length=200)
    description: str | None = None
    is_external: bool = False
    estimate_type: EstimateType = EstimateType.t_shirt
    start_date: date | None = None
    end_date: date | None = None


class ProjectUpdate(BaseModel):
    name: str | None = Field(None, max_length=200)
    description: str | None = None
    status: str | None = None
    is_external: bool | None = None
    estimate_type: EstimateType | None = None
    start_date: date | None = None
    end_date: date | None = None


class ProjectMemberAdd(BaseModel):
    user_id: uuid.UUID
    role: ProjectMemberRole = ProjectMemberRole.reader


class ProjectMemberResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    role: ProjectMemberRole
    created_at: datetime
    user_full_name: str | None = None

    model_config = {"from_attributes": True}


class ProjectResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    status: str
    is_external: bool
    estimate_type: EstimateType
    owner_id: uuid.UUID
    start_date: date | None
    end_date: date | None
    created_at: datetime
    updated_at: datetime
    task_count: int | None = None
    open_task_count: int | None = None

    model_config = {"from_attributes": True}
