
from pydantic import BaseModel


class Coordinate(BaseModel):
    lat: float
    lon: float

class RouteRequest(BaseModel):
    origin: Coordinate
    destination: Coordinate
    optimize: bool = False

class MultiStopRouteRequest(BaseModel):
    waypoints: list[Coordinate]
    optimize: bool = True

class RouteResponse(BaseModel):
    distance_meters: float
    duration_seconds: float
    geometry: list[list[float]] | None = None
    provider: str

class RoutingMatrixRequest(BaseModel):
    origins: list[Coordinate]
    destinations: list[Coordinate]

class MatrixElement(BaseModel):
    distance_meters: float
    duration_seconds: float
    status: str = "ok"

class RoutingMatrixResponse(BaseModel):
    rows: list[list[MatrixElement]]
