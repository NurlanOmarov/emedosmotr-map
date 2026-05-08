from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import CurrentUser, get_current_user
from app.models.user import User
from app.models.oblast import Oblast
from app.models.geo import Region, Settlement
from app.schemas.geo import OblastCreate, OblastResponse, RegionResponse, SettlementResponse, SettlementCreate, RegionUpdate

router = APIRouter(prefix="/geo", tags=["Geo"])


@router.get("/oblasts", response_model=list[OblastResponse])
async def get_oblasts(
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Oblast).order_by(Oblast.name))
    return result.scalars().all()


@router.post("/oblasts", response_model=OblastResponse)
async def create_oblast(
    body: OblastCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role not in ["admin", "superadmin"]:
        raise HTTPException(403, "Access denied")
    oblast = Oblast(**body.model_dump())
    db.add(oblast)
    await db.commit()
    await db.refresh(oblast)
    return oblast


@router.delete("/oblasts/{oblast_id}")
async def delete_oblast(
    oblast_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role not in ["admin", "superadmin"]:
        raise HTTPException(403, "Access denied")
    result = await db.execute(select(Oblast).where(Oblast.oblast_id == oblast_id))
    oblast = result.scalar_one_or_none()
    if oblast:
        await db.delete(oblast)
        await db.commit()
    return {"status": "ok"}


@router.get("/regions", response_model=list[RegionResponse])
async def get_regions(
    oblast_id: int | None = Query(None),
    include_geometry: bool = Query(False),
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Region).order_by(Region.name)
    if oblast_id:
        query = query.where(Region.oblast_id == oblast_id)
    result = await db.execute(query)
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


@router.put("/regions/{region_id}", response_model=RegionResponse)
async def update_region(
    region_id: int,
    body: RegionUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role not in ["admin", "superadmin"]:
        from fastapi import HTTPException
        raise HTTPException(403, "Access denied")
        
    result = await db.execute(select(Region).where(Region.region_id == region_id))
    region = result.scalar_one_or_none()
    if not region:
        from fastapi import HTTPException
        raise HTTPException(404, "Region not found")
    
    if body.oblast_id is not None:
        region.oblast_id = body.oblast_id
    region.engineer_name = body.engineer_name
    region.engineer_phone = body.engineer_phone
    
    await db.commit()
    await db.refresh(region)
    return region


@router.get("/settlements", response_model=list[SettlementResponse])
async def get_settlements(
    region_id: int | None = Query(None),
    q: str | None = Query(None),
    limit: int | None = Query(None, ge=1, le=500),
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Settlement)
    if region_id:
        query = query.where(Settlement.region_id == region_id)
    if q:
        query = query.where(Settlement.name.ilike(f"%{q}%"))
    query = query.order_by(Settlement.name)
    if limit:
        query = query.limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/settlements/{settlement_id}", response_model=SettlementResponse)
async def get_settlement(
    settlement_id: int,
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Settlement).where(Settlement.settlement_id == settlement_id))
    settlement = result.scalar_one_or_none()
    if not settlement:
        raise HTTPException(404, "Settlement not found")
    return settlement


@router.post("/settlements", response_model=SettlementResponse)
async def create_settlement(
    body: SettlementCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role not in ["admin", "superadmin"]:
        from fastapi import HTTPException
        raise HTTPException(403, "Access denied")
    
    settlement = Settlement(**body.model_dump())
    db.add(settlement)
    await db.commit()
    await db.refresh(settlement)
    return settlement


@router.put("/settlements/{settlement_id}", response_model=SettlementResponse)
async def update_settlement(
    settlement_id: int,
    body: SettlementCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role not in ["admin", "superadmin"]:
        from fastapi import HTTPException
        raise HTTPException(403, "Access denied")
        
    result = await db.execute(select(Settlement).where(Settlement.settlement_id == settlement_id))
    settlement = result.scalar_one_or_none()
    if not settlement:
        from fastapi import HTTPException
        raise HTTPException(404, "Settlement not found")
    
    for k, v in body.model_dump().items():
        setattr(settlement, k, v)
    
    await db.commit()
    await db.refresh(settlement)
    return settlement


@router.delete("/settlements/{settlement_id}")
async def delete_settlement(
    settlement_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role not in ["admin", "superadmin"]:
        from fastapi import HTTPException
        raise HTTPException(403, "Access denied")
        
    result = await db.execute(select(Settlement).where(Settlement.settlement_id == settlement_id))
    settlement = result.scalar_one_or_none()
    if settlement:
        await db.delete(settlement)
        await db.commit()
    return {"status": "ok"}
