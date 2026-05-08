import uuid
from pydantic import BaseModel, ConfigDict


class PushSubscriptionBase(BaseModel):
    endpoint: str
    p256dh: str
    auth: str


class PushSubscriptionCreate(PushSubscriptionBase):
    pass


class PushSubscriptionResponse(PushSubscriptionBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    user_id: uuid.UUID
