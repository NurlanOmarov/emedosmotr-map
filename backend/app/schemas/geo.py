from pydantic import BaseModel


class RegionResponse(BaseModel):
    region_id: int
    name: str
    code: str | None
    center_lat: float | None
    center_lon: float | None
    geometry_json: dict | None = None

    model_config = {"from_attributes": True}


class SettlementResponse(BaseModel):
    settlement_id: int
    region_id: int | None
    name: str
    latitude: float
    longitude: float
    status: str | None
    population: int | None

    model_config = {"from_attributes": True}
