from typing import List, Optional
from pydantic import BaseModel

class Coordinate(BaseModel):
    lat: float
    lon: float

class RouteRequest(BaseModel):
    origin: Coordinate
    destination: Coordinate
    optimize: bool = False

class MultiStopRouteRequest(BaseModel):
    waypoints: List[Coordinate]
    optimize: bool = True

class RouteResponse(BaseModel):
    distance_meters: float
    duration_seconds: float
    geometry: Optional[List[List[float]]] = None
    provider: str

class RoutingMatrixRequest(BaseModel):
    origins: List[Coordinate]
    destinations: List[Coordinate]

class MatrixElement(BaseModel):
    distance_meters: float
    duration_seconds: float
    status: str = "ok"

class RoutingMatrixResponse(BaseModel):
    rows: List[List[MatrixElement]]
