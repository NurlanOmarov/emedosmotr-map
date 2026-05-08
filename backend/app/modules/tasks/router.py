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
from app.services.notification import notification_service

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
    region_id: int | None = Query(None),
    settlement_id: int | None = Query(None),
    assigned_to: uuid.UUID | None = Query(None),
    q: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.models.location import Location as MapLocation
    query = select(
        Task,
        User.full_name.label("assignee_name"),
        MapLocation.name.label("location_name")
    ).outerjoin(User, Task.assigned_to == User.id)\
     .outerjoin(MapLocation, Task.location_id == MapLocation.id)\
     .where(Task.deleted_at.is_(None))

    query = _apply_task_role_filter(query, current_user)
    if status:
        query = query.where(Task.status == status)
    if priority:
        query = query.where(Task.priority == priority)
    if location_id:
        query = query.where(Task.location_id == location_id)
    if region_id:
        query = query.where(Task.region_id == region_id)
    if settlement_id:
        query = query.where(Task.settlement_id == settlement_id)
    if assigned_to:
        query = query.where(Task.assigned_to == assigned_to)
    if q:
        query = query.where(Task.title.ilike(f"%{q}%"))

    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar_one()

    results = (await db.execute(query.offset((page - 1) * per_page).limit(per_page))).all()
    
    items = []
    for row in results:
        task_data = {c.name: getattr(row.Task, c.name) for c in row.Task.__table__.columns}
        task_data["assignee_name"] = row.assignee_name
        task_data["location_name"] = row.location_name
        items.append(TaskResponse(**task_data))

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        pages=(total + per_page - 1) // per_page,
    )


@router.get("/my", response_model=list[TaskResponse])
async def my_tasks(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    from app.models.location import Location as MapLocation
    q = select(
        Task, 
        User.full_name.label("assignee_name"),
        MapLocation.name.label("location_name")
    ).outerjoin(User, Task.assigned_to == User.id)\
     .outerjoin(MapLocation, Task.location_id == MapLocation.id)\
     .where(Task.assigned_to == current_user.id, Task.deleted_at.is_(None))
    
    results = (await db.execute(q)).all()
    
    items = []
    for row in results:
        task_data = {c.name: getattr(row.Task, c.name) for c in row.Task.__table__.columns}
        task_data["assignee_name"] = row.assignee_name
        task_data["location_name"] = row.location_name
        items.append(TaskResponse(**task_data))
        
    return items


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

    # Notify assignee
    if task.assigned_to:
        await notification_service.create_notification(
            db=db,
            user_id=task.assigned_to,
            type="info",
            title="Новая задача",
            body=f"Вам назначена новая задача: {task.title}",
            related_entity_type="task",
            related_entity_id=task.id
        )

    return task


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: uuid.UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    from app.models.location import Location as MapLocation
    q = select(
        Task, 
        User.full_name.label("assignee_name"),
        MapLocation.name.label("location_name")
    ).outerjoin(User, Task.assigned_to == User.id)\
     .outerjoin(MapLocation, Task.location_id == MapLocation.id)\
     .where(Task.id == task_id, Task.deleted_at.is_(None))
    
    row = (await db.execute(q)).first()
    if not row:
        raise HTTPException(404, "Task not found")
    
    task = row.Task
    if current_user.role == "engineer" and task.assigned_to != current_user.id:
        raise HTTPException(403, "Access denied")
        
    task_data = {c.name: getattr(task, c.name) for c in task.__table__.columns}
    task_data["assignee_name"] = row.assignee_name
    task_data["location_name"] = row.location_name
    
    return TaskResponse(**task_data)


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
    # Track old assignee to notify if changed
    old_assignee = task.assigned_to
    
    for k, v in data.items():
        setattr(task, k, v)
    await db.commit()
    await db.refresh(task)

    # Notify if assignee changed
    if task.assigned_to and task.assigned_to != old_assignee:
        await notification_service.create_notification(
            db=db,
            user_id=task.assigned_to,
            type="info",
            title="Назначена задача",
            body=f"Вам назначена задача: {task.title}",
            related_entity_type="task",
            related_entity_id=task.id
        )

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

    # Notify creator if task is completed
    if task.status == "done" and task.created_by != current_user.id:
        await notification_service.create_notification(
            db=db,
            user_id=task.created_by,
            type="success",
            title="Задача завершена",
            body=f"Задача '{task.title}' была выполнена инженером {current_user.full_name}",
            related_entity_type="task",
            related_entity_id=task.id
        )
    # Notify assignee if status changed by someone else (e.g. manager cancelled)
    elif task.assigned_to and task.assigned_to != current_user.id:
        await notification_service.create_notification(
            db=db,
            user_id=task.assigned_to,
            type="info",
            title="Статус задачи изменен",
            body=f"Статус вашей задачи '{task.title}' изменен на: {task.status}",
            related_entity_type="task",
            related_entity_id=task.id
        )

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

    # Notify participants
    # 1. Notify assignee if the comment is from creator
    if task.assigned_to and task.assigned_to != current_user.id:
        await notification_service.create_notification(
            db=db,
            user_id=task.assigned_to,
            type="info",
            title="Новый комментарий",
            body=f"{current_user.full_name} оставил комментарий к задаче: {task.title}",
            related_entity_type="task",
            related_entity_id=task.id
        )
    # 2. Notify creator if the comment is from assignee
    if task.created_by != current_user.id:
        await notification_service.create_notification(
            db=db,
            user_id=task.created_by,
            type="info",
            title="Новый комментарий",
            body=f"{current_user.full_name} оставил комментарий к задаче: {task.title}",
            related_entity_type="task",
            related_entity_id=task.id
        )

    return comment


@router.delete("/{task_id}", status_code=204)
async def delete_task(
    task_id: uuid.UUID,
    current_user: User = Depends(require_roles(*CREATOR_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Task).where(Task.id == task_id, Task.deleted_at.is_(None)))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(404, "Task not found")
    
    task.deleted_at = datetime.now(timezone.utc)
    await db.commit()
