import uuid
from datetime import date, datetime

from pydantic import BaseModel, Field

from app.models.taskops import DependencyType, TaskPriority, TaskStatus


class TaskCreate(BaseModel):
    title: str = Field(..., max_length=200)
    description: str | None = None
    status: TaskStatus = TaskStatus.backlog
    priority: TaskPriority = TaskPriority.p2_medium
    assignee_id: uuid.UUID | None = None
    cycle_id: uuid.UUID | None = None
    parent_task_id: uuid.UUID | None = None
    estimate: str | None = Field(None, max_length=20)
    start_date: date | None = None
    due_date: date | None = None
    location_id: uuid.UUID | None = None
    is_external_visible: bool = False
    label_ids: list[uuid.UUID] = []


class TaskUpdate(BaseModel):
    title: str | None = Field(None, max_length=200)
    description: str | None = None
    status: TaskStatus | None = None
    priority: TaskPriority | None = None
    assignee_id: uuid.UUID | None = None
    cycle_id: uuid.UUID | None = None
    estimate: str | None = Field(None, max_length=20)
    start_date: date | None = None
    due_date: date | None = None
    location_id: uuid.UUID | None = None
    is_external_visible: bool | None = None
    position: int | None = None
    label_ids: list[uuid.UUID] | None = None


class LabelResponse(BaseModel):
    id: uuid.UUID
    name: str
    color: str

    model_config = {"from_attributes": True}


class TaskResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    cycle_id: uuid.UUID | None
    parent_task_id: uuid.UUID | None
    title: str
    description: str | None
    status: TaskStatus
    priority: TaskPriority
    assignee_id: uuid.UUID | None
    reporter_id: uuid.UUID
    estimate: str | None
    start_date: date | None
    due_date: date | None
    location_id: uuid.UUID | None
    is_external_visible: bool
    position: int
    completed_at: datetime | None
    created_at: datetime
    updated_at: datetime
    assignee_name: str | None = None
    reporter_name: str | None = None
    location_name: str | None = None
    labels: list[LabelResponse] = []
    attachments: list["AttachmentResponse"] = []
    subtask_count: int | None = None
    completed_subtask_count: int | None = None
    comment_count: int | None = None
    dependencies_incoming: list["DependencyResponse"] = []
    dependencies_outgoing: list["DependencyResponse"] = []

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
    author_name: str | None = None

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
    source_task_title: str | None = None
    target_task_title: str | None = None

    model_config = {"from_attributes": True}


class AttachmentResponse(BaseModel):
    id: uuid.UUID
    task_id: uuid.UUID
    filename: str
    content_type: str | None
    file_size: int | None
    created_at: datetime

    model_config = {"from_attributes": True}
