import os
import shutil
import uuid
from datetime import UTC, datetime

import structlog
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from geoalchemy2 import WKTElement
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db

from app.middleware.auth import get_current_user, require_roles
from app.models.equipment import MedicalEquipment
from app.models.location import Commission, Location, MedicalOrganization
from app.models.research import MedicalResearch
from app.models.status_history import StatusHistory
from app.models.user import User
from app.modules.ws.manager import ws_manager
from app.schemas.common import PaginatedResponse
from app.schemas.equipment import EquipmentCreate, EquipmentResponse
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
    RelayDetail,
    StatusUpdate,
)
from app.schemas.research import ResearchCreate, ResearchResponse, ResearchUpdate
from app.types import MANDATORY_RESEARCH_TYPES

log = structlog.get_logger()


def _escape_like(value: str) -> str:
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


WRITER_ROLES = ("superadmin", "regional_manager", "engineer")
MANAGER_ROLES = ("superadmin", "regional_manager", "director", "admin")

router = APIRouter(prefix="/locations", tags=["Locations"])

@router.post("/medical-orgs/{org_id}/equipment", response_model=EquipmentResponse, status_code=201)
async def create_equipment(
    org_id: uuid.UUID,
    body: EquipmentCreate,
    current_user: User = Depends(require_roles(*WRITER_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    eq = MedicalEquipment(organization_id=org_id, **body.model_dump())
    db.add(eq)
    await db.commit()
    await db.refresh(eq)
    return eq


@router.delete("/equipment/{eq_id}")
async def delete_equipment(
    eq_id: uuid.UUID,
    current_user: User = Depends(require_roles(*WRITER_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(MedicalEquipment).where(MedicalEquipment.id == eq_id))
    eq = result.scalar_one_or_none()
    if eq:
        await db.delete(eq)
        await db.commit()
    return {"status": "ok"}




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
    q: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Location).where(Location.deleted_at.is_(None), Location.is_active.is_(True))
    query = _apply_role_filter(query, current_user)
    if region_id:
        query = query.where(Location.region_id == region_id)
    if type:
        query = query.where(Location.type == type)
    if status:
        query = query.where(Location.status == status)
    if q:
        query = query.where(Location.name.ilike(f"%{_escape_like(q)}%"))

    total_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(total_q)).scalar_one()

    query = query.offset((page - 1) * per_page).limit(per_page)
    items = (await db.execute(query)).scalars().all()

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
    await db.flush()

    # Auto-create commission for military offices
    if loc.type == 'military_office':
        comm = Commission(
            location_id=loc.id,
            status="critical"
        )
        db.add(comm)

    # Auto-create medical org for medical types
    MEDICAL_TYPES = ["district_hospital", "state_medical", "private_medical", "private_clinic", "medical_center"]
    if loc.type in MEDICAL_TYPES:
        org = MedicalOrganization(
            location_id=loc.id,
            name=loc.name,
            address=loc.address,
            status=loc.status
        )
        db.add(org)
        await db.flush()
        
        # Initialize mandatory researches
        for r_type in MANDATORY_RESEARCH_TYPES:
            res = MedicalResearch(organization_id=org.id, research_type=r_type, status="critical")
            db.add(res)

    await db.commit()
    await db.refresh(loc)
    return loc


@router.get("/map/features")
async def get_map_features(
    region_id: int | None = Query(None),
    settlement_id: int | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
    # bbox: minLat,minLon,maxLat,maxLon — для пространственной фильтрации по viewport
    bbox: str | None = Query(None, description="minLat,minLon,maxLat,maxLon"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(Location).where(Location.deleted_at.is_(None), Location.is_active.is_(True))
    q = _apply_role_filter(q, current_user)
    if region_id:
        q = q.where(Location.region_id == region_id)
    if settlement_id:
        q = q.where(Location.settlement_id == settlement_id)
    if status_filter:
        q = q.where(Location.status == status_filter)
    if bbox:
        try:
            min_lat, min_lon, max_lat, max_lon = (float(v) for v in bbox.split(","))
            q = q.where(
                Location.lat.between(min_lat, max_lat),
                Location.lon.between(min_lon, max_lon),
            )
        except (ValueError, AttributeError):
            pass

    items = (await db.execute(q)).scalars().all()
    log.info("get_map_features", user=current_user.username, count=len(items))
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
                    "settlement_id": loc.settlement_id,
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

    if body.has_relay_server and loc.type == 'military_office':
        raise HTTPException(422, "Военкомат не может иметь перевалочный сервер")

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

    await ws_manager.broadcast_to_rooms(
        ["map_global", f"region_{loc.region_id}"],
        "location_status_changed",
        {
            "id": str(loc.id),
            "status": loc.status,
            "region_id": loc.region_id,
            "settlement_id": loc.settlement_id,
        },
    )

    return loc


@router.delete("/{location_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_location(
    location_id: uuid.UUID,
    current_user: User = Depends(require_roles("superadmin", "regional_manager", "director", "admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Location).where(Location.id == location_id, Location.deleted_at.is_(None))
    )
    loc = result.scalar_one_or_none()
    if not loc:
        raise HTTPException(404, "Location not found")
    loc.deleted_at = datetime.now(UTC)
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
    # Check if exists
    result = await db.execute(select(Commission).where(Commission.location_id == location_id))
    comm = result.scalar_one_or_none()
    if comm:
        raise HTTPException(400, "Commission already exists for this location. Use PUT to update.")

    comm = Commission(location_id=location_id, last_updated_by=current_user.id, **body.model_dump())
    db.add(comm)
    await db.commit()
    await db.refresh(comm)
    return comm


@router.put("/{location_id}/commission", response_model=CommissionResponse)
async def update_commission(
    location_id: uuid.UUID,
    body: CommissionUpdate,
    current_user: User = Depends(require_roles(*WRITER_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Commission).where(Commission.location_id == location_id))
    comm = result.scalar_one_or_none()
    if not comm:
        raise HTTPException(404, "Commission not found")

    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(comm, k, v)
    
    comm.last_updated_by = current_user.id
    comm.last_updated_at = datetime.now(UTC)
    
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
    orgs = result.scalars().all()

    # If it's a medical location but has no linked orgs, create a base one
    if not orgs:
        loc_res = await db.execute(select(Location).where(Location.id == location_id))
        loc = loc_res.scalar_one_or_none()
        MEDICAL_TYPES = ["district_hospital", "state_medical", "private_medical", "private_clinic", "medical_center"]
        if loc and loc.type in MEDICAL_TYPES:
            org = MedicalOrganization(
                location_id=loc.id,
                name=loc.name,
                address=loc.address,
                status=loc.status
            )
            db.add(org)
            await db.flush()

            # Initialize mandatory researches
            for r_type in MANDATORY_RESEARCH_TYPES:
                res = MedicalResearch(organization_id=org.id, research_type=r_type, status="critical")
                db.add(res)

            await db.commit()
            await db.refresh(org)
            return [org]

    return orgs


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


# --- Relay Server Detail ---

async def _get_location_or_404(location_id: uuid.UUID, db: AsyncSession) -> Location:
    result = await db.execute(
        select(Location).where(Location.id == location_id, Location.deleted_at.is_(None))
    )
    loc = result.scalar_one_or_none()
    if not loc:
        raise HTTPException(404, "Location not found")
    return loc


@router.get("/{location_id}/relay-detail", response_model=RelayDetail)
async def get_relay_detail(
    location_id: uuid.UUID,
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    loc = await _get_location_or_404(location_id, db)
    if loc.type != "relay_server_location":
        raise HTTPException(422, "Location is not a relay server")
    return RelayDetail(**(loc.meta.get("relay", {}) if loc.meta else {}))


@router.put("/{location_id}/relay-detail", response_model=RelayDetail)
async def update_relay_detail(
    location_id: uuid.UUID,
    body: RelayDetail,
    current_user: User = Depends(require_roles(*WRITER_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    loc = await _get_location_or_404(location_id, db)
    if loc.type != "relay_server_location":
        raise HTTPException(422, "Location is not a relay server")
    if current_user.role == "regional_manager" and loc.region_id != current_user.region_id:
        raise HTTPException(403, "Access denied")

    loc.meta = {**(loc.meta or {}), "relay": body.model_dump()}
    await db.commit()
    await db.refresh(loc)
    return RelayDetail(**loc.meta["relay"])


# --- Medical Researches ---

async def _recalculate_statuses(org_id: uuid.UUID, db: AsyncSession):
    # Fetch all available researches for this org
    result = await db.execute(
        select(MedicalResearch).where(MedicalResearch.organization_id == org_id, MedicalResearch.is_available.is_(True))
    )
    res_list = result.scalars().all()
    
    if not res_list:
        return
        
    status_ranks = {"ready": 0, "in_progress": 1, "critical": 2}
    max_rank = 0
    
    for r in res_list:
        # Logic: Connected? -> Trained? -> Data Streaming?
        if not r.is_connected:
            r.status = "critical"
        elif not r.staff_trained or not r.has_data_stream:
            r.status = "in_progress"
        else:
            r.status = "ready"
        
        max_rank = max(max_rank, status_ranks.get(r.status, 2))
    
    final_status = "ready"
    if max_rank == 2:
        final_status = "critical"
    elif max_rank == 1:
        final_status = "in_progress"
    
    # Update org status
    org_res = await db.execute(select(MedicalOrganization).where(MedicalOrganization.id == org_id))
    org = org_res.scalar_one()
    org.status = final_status
    
    # Update location status
    loc_res = await db.execute(select(Location).where(Location.id == org.location_id))
    loc = loc_res.scalar_one()
    loc.status = final_status
    await db.commit()

@router.get("/medical-orgs/{org_id}/researches", response_model=list[ResearchResponse])
async def get_researches(
    org_id: uuid.UUID, _: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(MedicalResearch).where(MedicalResearch.organization_id == org_id)
    )
    return result.scalars().all()


@router.post("/medical-orgs/{org_id}/researches", response_model=ResearchResponse, status_code=201)
async def create_research(
    org_id: uuid.UUID,
    body: ResearchCreate,
    current_user: User = Depends(require_roles(*WRITER_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    research = MedicalResearch(organization_id=org_id, **body.model_dump())
    db.add(research)
    await db.commit()
    await db.refresh(research)
    return research


@router.patch("/researches/{research_id}", response_model=ResearchResponse)
async def update_research(
    research_id: uuid.UUID,
    body: ResearchUpdate,
    current_user: User = Depends(require_roles(*WRITER_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(MedicalResearch).where(MedicalResearch.id == research_id)
    )
    research = result.scalar_one_or_none()
    if not research:
        raise HTTPException(404, "Research not found")

    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(research, key, value)
    
    await _recalculate_statuses(research.organization_id, db)
    await db.commit()
    await db.refresh(research)
    return research


@router.get("/medical-orgs/{org_id}/equipment", response_model=list[EquipmentResponse])
async def get_org_equipment(
    org_id: uuid.UUID, _: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(MedicalEquipment).where(MedicalEquipment.organization_id == org_id)
    )
    return result.scalars().all()


@router.post("/{location_id}/images")
async def upload_location_image(
    location_id: uuid.UUID,
    file: UploadFile = File(...),
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Location).where(Location.id == location_id))
    loc = result.scalar_one_or_none()
    if not loc:
        raise HTTPException(404, "Location not found")
    
    max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    if file.size and file.size > max_bytes:
        raise HTTPException(413, f"File too large (max {settings.MAX_FILE_SIZE_MB} MB)")

    # Create directory if not exists
    os.makedirs("uploads/locations", exist_ok=True)

    # Save file
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp"]:
        raise HTTPException(400, "Invalid image format")
        
    filename = f"{location_id}_{uuid.uuid4().hex}{ext}"
    file_path = os.path.join("uploads/locations", filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    url = f"/uploads/locations/{filename}"
    
    # Update meta
    meta = dict(loc.meta or {})
    images = meta.get("images", [])
    images.append(url)
    meta["images"] = images
    loc.meta = meta
    
    await db.commit()
    await db.refresh(loc)
    return {"url": url, "images": images}


@router.delete("/{location_id}/images")
async def delete_location_image(
    location_id: uuid.UUID,
    url: str,
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Location).where(Location.id == location_id))
    loc = result.scalar_one_or_none()
    if not loc:
        raise HTTPException(404, "Location not found")
    
    meta = dict(loc.meta or {})
    images = meta.get("images", [])
    if url in images:
        images.remove(url)
        # Optional: delete physical file
        try:
            p = url.lstrip("/")
            if os.path.exists(p):
                os.remove(p)
        except Exception:
            pass

    meta["images"] = images
    loc.meta = meta
    await db.commit()
    return {"images": images}
