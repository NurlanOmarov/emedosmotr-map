import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict

NotificationType = Literal["info", "success", "warning", "error", "new_task", "task_status", "deadline"]


class NotificationBase(BaseModel):
    type: NotificationType
    title: str
    body: str | None = None
    related_entity_type: str | None = None
    related_entity_id: uuid.UUID | None = None


class NotificationResponse(NotificationBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    is_read: bool
    created_at: datetime


class NotificationMarkRead(BaseModel):
    is_read: bool = True
