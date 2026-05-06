import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class LocationCreate(BaseModel):
    settlement_id: int | None = None
    region_id: int
    name: str = Field(max_length=300)
    type: Literal[
        "military_office",
        "district_hospital",
        "private_clinic",
        "medical_center",
        "relay_server_location",
    ]
    address: str | None = None
    lat: float | None = None
    lon: float | None = None
    upload_mode: Literal["auto", "manual", "mixed"] = "manual"
    has_relay_server: bool = False
    relay_server_notes: str | None = None
    notes: str | None = None


class LocationUpdate(BaseModel):
    name: str | None = Field(None, max_length=300)
    address: str | None = None
    lat: float | None = None
    lon: float | None = None
    upload_mode: str | None = None
    has_relay_server: bool | None = None
    relay_server_notes: str | None = None
    notes: str | None = None
    is_active: bool | None = None


class StatusUpdate(BaseModel):
    status: Literal["ready", "in_progress", "critical"]
    reason: str | None = Field(None, max_length=1000)


class LocationResponse(BaseModel):
    id: uuid.UUID
    settlement_id: int | None
    region_id: int
    name: str
    type: str
    address: str | None
    lat: float | None
    lon: float | None
    status: str
    status_reason: str | None
    upload_mode: str
    has_relay_server: bool
    is_active: bool
    notes: str | None
    tasks_count: int | None = None
    last_updated: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class LocationMapFeature(BaseModel):
    type: Literal["Feature"] = "Feature"
    geometry: dict
    properties: dict


class CommissionCreate(BaseModel):
    address: str | None = None
    computers_available: int = 0
    computers_required: int = 0
    internet_status: bool = False
    internet_speed_mbps: float | None = None
    status: Literal["ready", "in_progress", "critical"] = "critical"
    comment: str | None = None


class CommissionUpdate(BaseModel):
    address: str | None = None
    computers_available: int | None = None
    computers_required: int | None = None
    internet_status: bool | None = None
    internet_speed_mbps: float | None = None
    status: str | None = None
    comment: str | None = None


class CommissionResponse(BaseModel):
    id: uuid.UUID
    location_id: uuid.UUID
    address: str | None
    computers_available: int
    computers_required: int
    internet_status: bool
    internet_speed_mbps: float | None
    status: str
    comment: str | None
    last_updated_at: datetime
    created_at: datetime

    model_config = {"from_attributes": True}


class MedicalOrgCreate(BaseModel):
    name: str = Field(max_length=300)
    address: str | None = None
    internet_status: bool = False
    status: Literal["ready", "in_progress", "critical"] = "critical"
    comment: str | None = None


class MedicalOrgUpdate(BaseModel):
    name: str | None = Field(None, max_length=300)
    address: str | None = None
    internet_status: bool | None = None
    status: str | None = None
    comment: str | None = None


class MedicalOrgResponse(BaseModel):
    id: uuid.UUID
    location_id: uuid.UUID
    name: str
    address: str | None
    internet_status: bool
    status: str
    comment: str | None
    last_updated_at: datetime
    created_at: datetime

    model_config = {"from_attributes": True}
