from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import require_roles
from app.models.location import Location
from app.models.task import Task
from app.models.user import User

router = APIRouter(prefix="/analytics", tags=["Analytics"])

ANALYTICS_ROLES = ("superadmin", "director", "regional_manager", "analyst")


@router.get("/dashboard")
async def dashboard(
    current_user: User = Depends(require_roles(*ANALYTICS_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    q = select(Location).where(Location.deleted_at.is_(None), Location.is_active.is_(True))
    if current_user.role == "regional_manager" and current_user.region_id:
        q = q.where(Location.region_id == current_user.region_id)

    locations = (await db.execute(q)).scalars().all()
    total = len(locations)
    by_status = {"ready": 0, "in_progress": 0, "critical": 0}
    for loc in locations:
        if loc.status in by_status:
            by_status[loc.status] += 1

    tasks_q = select(func.count()).where(
        Task.status.notin_(["done", "cancelled"]), Task.deleted_at.is_(None)
    )
    open_tasks = (await db.execute(tasks_q)).scalar_one()

    return {
        "total_locations": total,
        "by_status": by_status,
        "open_tasks": open_tasks,
        "completion_rate": round(by_status["ready"] / total * 100, 1) if total > 0 else 0,
    }


@router.get("/regions")
async def regions_summary(
    current_user: User = Depends(require_roles(*ANALYTICS_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    q = (
        select(
            Location.region_id,
            func.count(Location.id).label("total"),
            func.sum(func.cast(Location.status == "ready", sqltype=None)).label("ready"),
            func.sum(func.cast(Location.status == "critical", sqltype=None)).label("critical"),
        )
        .where(Location.deleted_at.is_(None))
        .group_by(Location.region_id)
    )
    if current_user.role == "regional_manager" and current_user.region_id:
        q = q.where(Location.region_id == current_user.region_id)

    rows = (await db.execute(q)).all()
    return [
        {
            "region_id": r.region_id,
            "total": r.total,
            "ready": int(r.ready or 0),
            "critical": int(r.critical or 0),
        }
        for r in rows
    ]
