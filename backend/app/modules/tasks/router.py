import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import CurrentUser, require_roles, get_current_user
from app.models.user import User
from app.models.task import Task, TaskComment
from app.schemas.common import PaginatedResponse
from app.schemas.task import (
    TaskCommentCreate,
    TaskCommentResponse,
    TaskCreate,
    TaskResponse,
    TaskStatusUpdate,
    TaskUpdate,
)

router = APIRouter(prefix="/tasks", tags=["Tasks"])

CREATOR_ROLES = ("superadmin", "regional_manager")


def _apply_task_role_filter(q, user):
    if user.role == "engineer":
        return q.where(Task.assigned_to == user.id)
    if user.role == "regional_manager" and user.region_id:
        return q.where(Task.region_id == user.region_id)
    return q


@router.get("", response_model=PaginatedResponse[TaskResponse])
async def list_tasks(
    status: str | None = Query(None),
    priority: str | None = Query(None),
    location_id: uuid.UUID | None = Query(None),
    assigned_to: uuid.UUID | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(Task).where(Task.deleted_at.is_(None))
    q = _apply_task_role_filter(q, current_user)
    if status:
        q = q.where(Task.status == status)
    if priority:
        q = q.where(Task.priority == priority)
    if location_id:
        q = q.where(Task.location_id == location_id)
    if assigned_to:
        q = q.where(Task.assigned_to == assigned_to)

    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
    items = (await db.execute(q.offset((page - 1) * per_page).limit(per_page))).scalars().all()

    return PaginatedResponse(
        items=[TaskResponse.model_validate(i) for i in items],
        total=total,
        page=page,
        per_page=per_page,
        pages=(total + per_page - 1) // per_page,
    )


@router.get("/my", response_model=list[TaskResponse])
async def my_tasks(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Task).where(Task.assigned_to == current_user.id, Task.deleted_at.is_(None))
    )
    return result.scalars().all()


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    body: TaskCreate,
    current_user: User = Depends(require_roles(*CREATOR_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    task = Task(**body.model_dump(), created_by=current_user.id)
    if body.assigned_to:
        task.status = "assigned"
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return task


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: uuid.UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Task).where(Task.id == task_id, Task.deleted_at.is_(None))
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(404, "Task not found")
    if current_user.role == "engineer" and task.assigned_to != current_user.id:
        raise HTTPException(403, "Access denied")
    return task


@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: uuid.UUID,
    body: TaskUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Task).where(Task.id == task_id, Task.deleted_at.is_(None)))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(404, "Task not found")
    if current_user.role == "engineer" and task.assigned_to != current_user.id:
        raise HTTPException(403, "Access denied")
    if current_user.role == "engineer":
        allowed = {"actual_hours"}
        data = {k: v for k, v in body.model_dump(exclude_none=True).items() if k in allowed}
    else:
        data = body.model_dump(exclude_none=True)
    for k, v in data.items():
        setattr(task, k, v)
    await db.commit()
    await db.refresh(task)
    return task


@router.patch("/{task_id}/status", response_model=TaskResponse)
async def update_task_status(
    task_id: uuid.UUID,
    body: TaskStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Task).where(Task.id == task_id, Task.deleted_at.is_(None)))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(404, "Task not found")
    if current_user.role == "engineer" and task.assigned_to != current_user.id:
        raise HTTPException(403, "Access denied")

    task.status = body.status
    if body.status == "done":
        task.completed_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(task)
    return task


@router.post("/{task_id}/comments", response_model=TaskCommentResponse, status_code=201)
async def add_comment(
    task_id: uuid.UUID,
    body: TaskCommentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Task).where(Task.id == task_id, Task.deleted_at.is_(None)))
    if not result.scalar_one_or_none():
        raise HTTPException(404, "Task not found")
    comment = TaskComment(task_id=task_id, user_id=current_user.id, content=body.content)
    db.add(comment)
    await db.commit()
    await db.refresh(comment)
    return comment
