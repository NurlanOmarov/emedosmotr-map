import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class ResearchCreate(BaseModel):
    research_type: str = Field(max_length=50)
    input_method: Literal["manual", "auto"] = "manual"
    integration_type: str | None = Field(None, max_length=50)
    
    specialist_name: str | None = Field(None, max_length=200)
    specialist_position: str | None = Field(None, max_length=200)
    room_number: str | None = Field(None, max_length=20)
    phone: str | None = Field(None, max_length=20)
    
    equipment_id: uuid.UUID | None = None
    
    status: Literal["ready", "in_progress", "critical"] = "critical"
    notes: str | None = None
    problems: str | None = None
    
    has_image: bool = False
    image_source: str | None = Field(None, max_length=50)
    
    has_conclusion: bool = False
    conclusion_source: str | None = Field(None, max_length=50)
    is_available: bool = True
    is_connected: bool = False
    staff_trained: bool = False
    has_data_stream: bool = False


class ResearchUpdate(BaseModel):
    input_method: Literal["manual", "auto"] | None = None
    integration_type: str | None = None
    specialist_name: str | None = None
    specialist_position: str | None = None
    room_number: str | None = None
    phone: str | None = None
    equipment_id: uuid.UUID | None = None
    status: Literal["ready", "in_progress", "critical"] | None = None
    notes: str | None = None
    problems: str | None = None
    has_image: bool | None = None
    image_source: str | None = None
    has_conclusion: bool | None = None
    conclusion_source: str | None = None
    is_available: bool | None = None
    is_connected: bool | None = None
    staff_trained: bool | None = None
    has_data_stream: bool | None = None


class ResearchResponse(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    research_type: str
    input_method: str
    integration_type: str | None
    specialist_name: str | None
    specialist_position: str | None
    room_number: str | None
    phone: str | None
    equipment_id: uuid.UUID | None
    status: str
    is_connected: bool
    staff_trained: bool
    has_data_stream: bool
    notes: str | None
    problems: str | None
    has_image: bool
    image_source: str | None
    has_conclusion: bool
    conclusion_source: str | None
    is_available: bool
    updated_at: datetime
    created_at: datetime

    model_config = {"from_attributes": True}
