from pydantic import BaseModel


class OblastResponse(BaseModel):
    oblast_id: int
    name: str
    code: str | None = None

    model_config = {"from_attributes": True}


class OblastCreate(BaseModel):
    name: str
    code: str | None = None


class RegionResponse(BaseModel):
    region_id: int
    oblast_id: int | None = None
    name: str
    code: str | None
    center_lat: float | None
    center_lon: float | None
    geometry_json: dict | None = None
    engineer_name: str | None = None
    engineer_phone: str | None = None
    is_connected: bool = False

    model_config = {"from_attributes": True}


class RegionUpdate(BaseModel):
    oblast_id: int | None = None
    engineer_name: str | None = None
    engineer_phone: str | None = None
    is_connected: bool | None = None


class SettlementResponse(BaseModel):
    settlement_id: int
    region_id: int | None
    name: str
    latitude: float
    longitude: float
    status: str | None
    population: int | None

    model_config = {"from_attributes": True}


class SettlementCreate(BaseModel):
    region_id: int
    name: str
    latitude: float
    longitude: float
    status: str | None = None
    population: int | None = None
