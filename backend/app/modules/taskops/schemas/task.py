import uuid
from datetime import date, datetime
from typing import Optional, List

from pydantic import BaseModel, Field

from app.models.taskops import TaskStatus, TaskPriority, DependencyType


class TaskCreate(BaseModel):
    title: str = Field(..., max_length=200)
    description: Optional[str] = None
    status: TaskStatus = TaskStatus.backlog
    priority: TaskPriority = TaskPriority.p2_medium
    assignee_id: Optional[uuid.UUID] = None
    cycle_id: Optional[uuid.UUID] = None
    parent_task_id: Optional[uuid.UUID] = None
    estimate: Optional[str] = Field(None, max_length=20)
    start_date: Optional[date] = None
    due_date: Optional[date] = None
    location_id: Optional[uuid.UUID] = None
    is_external_visible: bool = False
    label_ids: List[uuid.UUID] = []


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = None
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    assignee_id: Optional[uuid.UUID] = None
    cycle_id: Optional[uuid.UUID] = None
    estimate: Optional[str] = Field(None, max_length=20)
    start_date: Optional[date] = None
    due_date: Optional[date] = None
    location_id: Optional[uuid.UUID] = None
    is_external_visible: Optional[bool] = None
    position: Optional[int] = None
    label_ids: Optional[List[uuid.UUID]] = None


class LabelResponse(BaseModel):
    id: uuid.UUID
    name: str
    color: str

    model_config = {"from_attributes": True}


class TaskResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    cycle_id: Optional[uuid.UUID]
    parent_task_id: Optional[uuid.UUID]
    title: str
    description: Optional[str]
    status: TaskStatus
    priority: TaskPriority
    assignee_id: Optional[uuid.UUID]
    reporter_id: uuid.UUID
    estimate: Optional[str]
    start_date: Optional[date]
    due_date: Optional[date]
    location_id: Optional[uuid.UUID]
    is_external_visible: bool
    position: int
    completed_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    assignee_name: Optional[str] = None
    reporter_name: Optional[str] = None
    location_name: Optional[str] = None
    labels: List[LabelResponse] = []
    subtask_count: Optional[int] = None
    comment_count: Optional[int] = None

    model_config = {"from_attributes": True}


class CommentCreate(BaseModel):
    content: str = Field(..., min_length=1)


class CommentResponse(BaseModel):
    id: uuid.UUID
    task_id: uuid.UUID
    author_id: uuid.UUID
    content: str
    created_at: datetime
    updated_at: datetime
    author_name: Optional[str] = None

    model_config = {"from_attributes": True}


class DependencyCreate(BaseModel):
    target_task_id: uuid.UUID
    type: DependencyType


class DependencyResponse(BaseModel):
    id: uuid.UUID
    source_task_id: uuid.UUID
    target_task_id: uuid.UUID
    type: DependencyType
    created_at: datetime

    model_config = {"from_attributes": True}
