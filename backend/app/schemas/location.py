import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator


class LocationCreate(BaseModel):
    settlement_id: int | None = None
    region_id: int
    name: str = Field(max_length=300)
    type: Literal[
        "military_office",
        "district_hospital",
        "state_medical",
        "private_medical",
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
    chief_name: str | None = None
    chief_phone: str | None = None

    @model_validator(mode='after')
    def no_relay_server_for_military(self):
        if self.type == 'military_office' and self.has_relay_server:
            raise ValueError('Военкомат не может иметь перевалочный сервер')
        return self


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
    chief_name: str | None = None
    chief_phone: str | None = None


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
    chief_name: str | None = None
    chief_phone: str | None = None
    tasks_count: int | None = None
    last_updated: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class LocationMapFeature(BaseModel):
    type: Literal["Feature"] = "Feature"
    geometry: dict
    properties: dict


class RelayDetail(BaseModel):
    cabinet: str | None = None
    responsible_name: str | None = None
    responsible_contacts: str | None = None
    contract_info: str | None = None
    additional_notes: str | None = None


class CommissionCreate(BaseModel):
    address: str | None = None
    computers_available: int = 0
    computers_required: int = 0
    doctors_count: int = 0
    connected_computers_count: int = 0
    internet_status: bool = False
    internet_type: str | None = None
    internet_speed_mbps: float | None = None
    has_local_network: bool = True
    status: Literal["ready", "in_progress", "critical"] = "critical"
    comment: str | None = None


class CommissionUpdate(BaseModel):
    address: str | None = None
    computers_available: int | None = None
    computers_required: int | None = None
    doctors_count: int | None = None
    connected_computers_count: int | None = None
    internet_status: bool | None = None
    internet_type: str | None = None
    internet_speed_mbps: float | None = None
    has_local_network: bool | None = None
    status: str | None = None
    comment: str | None = None


class CommissionResponse(BaseModel):
    id: uuid.UUID
    location_id: uuid.UUID
    address: str | None
    computers_available: int
    computers_required: int
    doctors_count: int
    connected_computers_count: int
    internet_status: bool
    internet_type: str | None
    internet_speed_mbps: float | None
    has_local_network: bool
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
