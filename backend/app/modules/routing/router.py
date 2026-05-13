
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.modules.routing.schemas import (
    MatrixElement,
    MultiStopRouteRequest,
    RouteRequest,
    RouteResponse,
    RoutingMatrixRequest,
    RoutingMatrixResponse,
)
from app.modules.routing.service import routing_service

router = APIRouter(prefix="/routing", tags=["Logistics"])

@router.post("/distance", response_model=RouteResponse)
async def get_distance(
    req: RouteRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return await routing_service.get_route(db, req.origin, req.destination)

@router.post("/multi-stop", response_model=list[RouteResponse])
async def get_multi_stop(
    req: MultiStopRouteRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    if len(req.waypoints) < 2:
        raise HTTPException(status_code=400, detail="At least 2 points required")
    
    results = []
    # If optimization needed, backend can implement TSP/NN
    # For now, we assume sequential or handled by service
    for i in range(len(req.waypoints) - 1):
        res = await routing_service.get_route(db, req.waypoints[i], req.waypoints[i+1])
        results.append(res)
    
    return results

@router.post("/matrix", response_model=RoutingMatrixResponse)
async def get_matrix(
    req: RoutingMatrixRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    rows = []
    for origin in req.origins:
        row = []
        for destination in req.destinations:
            res = await routing_service.get_route(db, origin, destination)
            row.append(MatrixElement(
                distance_meters=res.distance_meters,
                duration_seconds=res.duration_seconds
            ))
        rows.append(row)
    
    return RoutingMatrixResponse(rows=rows)
