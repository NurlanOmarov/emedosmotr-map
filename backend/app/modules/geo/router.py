from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import CurrentUser, get_current_user
from app.models.user import User
from app.models.geo import Region, Settlement
from app.schemas.geo import RegionResponse, SettlementResponse

router = APIRouter(prefix="/geo", tags=["Geo"])


@router.get("/regions", response_model=list[RegionResponse])
async def get_regions(
    include_geometry: bool = Query(False),
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Region).order_by(Region.name))
    regions = result.scalars().all()
    out = []
    for r in regions:
        data = RegionResponse.model_validate(r)
        if not include_geometry:
            data.geometry_json = None
        out.append(data)
    return out


@router.get("/regions/{region_id}", response_model=RegionResponse)
async def get_region(region_id: int, _: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Region).where(Region.region_id == region_id))
    region = result.scalar_one_or_none()
    if not region:
        from fastapi import HTTPException
        raise HTTPException(404, "Region not found")
    return region


@router.get("/settlements", response_model=list[SettlementResponse])
async def get_settlements(
    region_id: int | None = Query(None),
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(Settlement)
    if region_id:
        q = q.where(Settlement.region_id == region_id)
    result = await db.execute(q.order_by(Settlement.name))
    return result.scalars().all()
