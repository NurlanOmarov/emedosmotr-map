import uuid
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models.taskops import EstimateType, ProjectMemberRole


class ProjectCreate(BaseModel):
    name: str = Field(..., max_length=200)
    description: Optional[str] = None
    is_external: bool = False
    estimate_type: EstimateType = EstimateType.t_shirt
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = None
    status: Optional[str] = None
    is_external: Optional[bool] = None
    estimate_type: Optional[EstimateType] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class ProjectMemberAdd(BaseModel):
    user_id: uuid.UUID
    role: ProjectMemberRole = ProjectMemberRole.reader


class ProjectMemberResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    role: ProjectMemberRole
    created_at: datetime
    user_full_name: Optional[str] = None

    model_config = {"from_attributes": True}


class ProjectResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str]
    status: str
    is_external: bool
    estimate_type: EstimateType
    owner_id: uuid.UUID
    start_date: Optional[date]
    end_date: Optional[date]
    created_at: datetime
    updated_at: datetime
    task_count: Optional[int] = None
    open_task_count: Optional[int] = None

    model_config = {"from_attributes": True}
