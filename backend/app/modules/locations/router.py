import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from geoalchemy2 import WKTElement
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import CurrentUser, require_roles, get_current_user
from app.models.user import User
from app.models.location import Commission, Location, MedicalOrganization
from app.models.status_history import StatusHistory
from app.models.task import Task
from app.schemas.common import PaginatedResponse
from app.schemas.location import (
    CommissionCreate,
    CommissionResponse,
    CommissionUpdate,
    LocationCreate,
    LocationMapFeature,
    LocationResponse,
    LocationUpdate,
    MedicalOrgCreate,
    MedicalOrgResponse,
    MedicalOrgUpdate,
    StatusUpdate,
)

router = APIRouter(prefix="/locations", tags=["Locations"])

WRITER_ROLES = ("superadmin", "regional_manager", "engineer")
MANAGER_ROLES = ("superadmin", "regional_manager")


def _make_point(lat: float, lon: float) -> WKTElement:
    return WKTElement(f"POINT({lon} {lat})", srid=4326)


def _apply_role_filter(q, user):
    if user.role == "engineer":
        return q  # engineers see only their assigned locations via tasks — handled separately
    if user.role == "regional_manager" and user.region_id:
        return q.where(Location.region_id == user.region_id)
    return q


@router.get("", response_model=PaginatedResponse[LocationResponse])
async def list_locations(
    region_id: int | None = Query(None),
    type: str | None = Query(None),
    status: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(Location).where(Location.deleted_at.is_(None), Location.is_active.is_(True))
    q = _apply_role_filter(q, current_user)
    if region_id:
        q = q.where(Location.region_id == region_id)
    if type:
        q = q.where(Location.type == type)
    if status:
        q = q.where(Location.status == status)

    total_q = select(func.count()).select_from(q.subquery())
    total = (await db.execute(total_q)).scalar_one()

    q = q.offset((page - 1) * per_page).limit(per_page)
    items = (await db.execute(q)).scalars().all()

    return PaginatedResponse(
        items=[LocationResponse.model_validate(i) for i in items],
        total=total,
        page=page,
        per_page=per_page,
        pages=(total + per_page - 1) // per_page,
    )


@router.post("", response_model=LocationResponse, status_code=status.HTTP_201_CREATED)
async def create_location(
    body: LocationCreate,
    current_user: User = Depends(require_roles(*MANAGER_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role == "regional_manager" and body.region_id != current_user.region_id:
        raise HTTPException(403, "Cannot create location in another region")

    loc = Location(**body.model_dump())
    if body.lat and body.lon:
        loc.geom = _make_point(body.lat, body.lon)
    db.add(loc)
    await db.commit()
    await db.refresh(loc)
    return loc


@router.get("/map/features")
async def get_map_features(
    region_id: int | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(Location).where(Location.deleted_at.is_(None), Location.is_active.is_(True))
    q = _apply_role_filter(q, current_user)
    if region_id:
        q = q.where(Location.region_id == region_id)
    if status_filter:
        q = q.where(Location.status == status_filter)

    items = (await db.execute(q)).scalars().all()
    features = []
    for loc in items:
        if loc.lat is None or loc.lon is None:
            continue
        features.append(
            LocationMapFeature(
                geometry={"type": "Point", "coordinates": [float(loc.lon), float(loc.lat)]},
                properties={
                    "id": str(loc.id),
                    "name": loc.name,
                    "type": loc.type,
                    "status": loc.status,
                    "region_id": loc.region_id,
                    "has_relay_server": loc.has_relay_server,
                },
            ).model_dump()
        )
    return {"type": "FeatureCollection", "features": features}


@router.get("/{location_id}", response_model=LocationResponse)
async def get_location(
    location_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Location).where(Location.id == location_id, Location.deleted_at.is_(None))
    )
    loc = result.scalar_one_or_none()
    if not loc:
        raise HTTPException(404, "Location not found")
    return loc


@router.put("/{location_id}", response_model=LocationResponse)
async def update_location(
    location_id: uuid.UUID,
    body: LocationUpdate,
    current_user: User = Depends(require_roles(*WRITER_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Location).where(Location.id == location_id, Location.deleted_at.is_(None))
    )
    loc = result.scalar_one_or_none()
    if not loc:
        raise HTTPException(404, "Location not found")
    if current_user.role == "regional_manager" and loc.region_id != current_user.region_id:
        raise HTTPException(403, "Access denied")

    for k, v in body.model_dump(exclude_none=True).items():
        setattr(loc, k, v)
    if body.lat and body.lon:
        loc.geom = _make_point(body.lat, body.lon)
    await db.commit()
    await db.refresh(loc)
    return loc


@router.patch("/{location_id}/status", response_model=LocationResponse)
async def update_status(
    location_id: uuid.UUID,
    body: StatusUpdate,
    current_user: User = Depends(require_roles(*WRITER_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Location).where(Location.id == location_id, Location.deleted_at.is_(None))
    )
    loc = result.scalar_one_or_none()
    if not loc:
        raise HTTPException(404, "Location not found")

    old_status = loc.status
    loc.status = body.status
    loc.status_reason = body.reason

    history = StatusHistory(
        entity_type="location",
        entity_id=location_id,
        old_status=old_status,
        new_status=body.status,
        changed_by=current_user.id,
        reason=body.reason,
    )
    db.add(history)
    await db.commit()
    await db.refresh(loc)
    return loc


@router.delete("/{location_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_location(
    location_id: uuid.UUID,
    current_user: User = Depends(require_roles("superadmin", "regional_manager")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Location).where(Location.id == location_id, Location.deleted_at.is_(None))
    )
    loc = result.scalar_one_or_none()
    if not loc:
        raise HTTPException(404, "Location not found")
    loc.deleted_at = datetime.now(timezone.utc)
    await db.commit()


# --- Commission ---

@router.get("/{location_id}/commission", response_model=CommissionResponse)
async def get_commission(
    location_id: uuid.UUID, _: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Commission).where(Commission.location_id == location_id)
    )
    comm = result.scalar_one_or_none()
    if not comm:
        raise HTTPException(404, "Commission not found")
    return comm


@router.post("/{location_id}/commission", response_model=CommissionResponse, status_code=201)
async def create_commission(
    location_id: uuid.UUID,
    body: CommissionCreate,
    current_user: User = Depends(require_roles(*WRITER_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    comm = Commission(location_id=location_id, last_updated_by=current_user.id, **body.model_dump())
    db.add(comm)
    await db.commit()
    await db.refresh(comm)
    return comm


# --- Medical Orgs ---

@router.get("/{location_id}/medical-orgs", response_model=list[MedicalOrgResponse])
async def get_medical_orgs(
    location_id: uuid.UUID, _: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(MedicalOrganization).where(MedicalOrganization.location_id == location_id)
    )
    return result.scalars().all()


@router.post("/{location_id}/medical-orgs", response_model=MedicalOrgResponse, status_code=201)
async def create_medical_org(
    location_id: uuid.UUID,
    body: MedicalOrgCreate,
    current_user: User = Depends(require_roles(*WRITER_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    org = MedicalOrganization(
        location_id=location_id, last_updated_by=current_user.id, **body.model_dump()
    )
    db.add(org)
    await db.commit()
    await db.refresh(org)
    return org
