import uuid
from datetime import date, datetime

from pydantic import BaseModel


class EquipmentResponse(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    equipment_type: str
    count: int
    free_ports: int
    connection_status: bool
    port_status: str
    ecg_model: str | None
    smart_ecg_compatible: bool
    serial_number: str | None
    last_service_date: date | None
    notes: str | None
    updated_at: datetime


class EquipmentCreate(BaseModel):
    equipment_type: str
    serial_number: str | None = None
    count: int = 1
    free_ports: int = 0
    connection_status: bool = False
    port_status: str = "free"
    ecg_model: str | None = None
    smart_ecg_compatible: bool = False
    last_service_date: date | None = None
    notes: str | None = None
