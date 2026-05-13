import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user, require_roles
from app.models.location import Location as MapLocation
from app.models.taskops import TaskopsProject, TaskopsTask, TaskPriority, TaskStatus
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.task import (
    TaskCreate,
    TaskResponse,
    TaskStatusUpdate,
)

router = APIRouter(prefix="/tasks", tags=["Tasks"])

CREATOR_ROLES = ("superadmin", "regional_manager", "director")
MAP_INCIDENTS_PROJECT_NAME = "🚩 Инциденты с карты"


async def get_incidents_project_id(db: AsyncSession, user_id: uuid.UUID) -> uuid.UUID:
    """Find or create the system project for map incidents."""
    result = await db.execute(
        select(TaskopsProject).where(
            TaskopsProject.name == MAP_INCIDENTS_PROJECT_NAME,
            TaskopsProject.deleted_at.is_(None)
        )
    )
    project = result.scalar_one_or_none()
    if not project:
        # Create it if it doesn't exist
        project = TaskopsProject(
            name=MAP_INCIDENTS_PROJECT_NAME,
            description="Системный контейнер для инцидентов, созданных на карте объектов",
            owner_id=user_id
        )
        db.add(project)
        await db.commit()
        await db.refresh(project)
    return project.id


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
    # This route now filters TaskopsTask but specifically for map incidents or location-linked tasks
    query = select(
        TaskopsTask,
        User.full_name.label("assignee_name"),
        MapLocation.name.label("location_name")
    ).outerjoin(User, TaskopsTask.assignee_id == User.id)\
     .outerjoin(MapLocation, TaskopsTask.location_id == MapLocation.id)\
     .where(TaskopsTask.deleted_at.is_(None))

    if location_id:
        query = query.where(TaskopsTask.location_id == location_id)
    if assigned_to:
        query = query.where(TaskopsTask.assignee_id == assigned_to)
    
    # Apply status mapping if needed, but TaskopsTask uses its own Enums
    if status:
        query = query.where(TaskopsTask.status == status)

    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar_one()
    results = (await db.execute(query.offset((page - 1) * per_page).limit(per_page))).all()
    
    items = []
    for row in results:
        task = row.TaskopsTask
        items.append(TaskResponse(
            id=task.id,
            title=task.title,
            description=task.description,
            status=task.status,
            priority=task.priority,
            location_id=task.location_id,
            location_name=row.location_name,
            assigned_to=task.assignee_id,
            assignee_name=row.assignee_name,
            due_date=task.due_date,
            created_at=task.created_at,
            completed_at=task.completed_at
        ))

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        pages=(total + per_page - 1) // per_page,
    )


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    body: TaskCreate,
    current_user: User = Depends(require_roles(*CREATOR_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    project_id = await get_incidents_project_id(db, current_user.id)
    
    task = TaskopsTask(
        project_id=project_id,
        reporter_id=current_user.id,
        title=body.title,
        description=body.description,
        location_id=body.location_id,
        assignee_id=body.assigned_to,
        status=TaskStatus.todo if body.assigned_to else TaskStatus.backlog,
        priority=body.priority or TaskPriority.p2_medium,
        due_date=body.due_date
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)

    return TaskResponse(
        id=task.id,
        title=task.title,
        description=task.description,
        status=task.status,
        priority=task.priority,
        location_id=task.location_id,
        assigned_to=task.assignee_id,
        created_at=task.created_at
    )


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: uuid.UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    query = select(
        TaskopsTask,
        User.full_name.label("assignee_name"),
        MapLocation.name.label("location_name")
    ).outerjoin(User, TaskopsTask.assignee_id == User.id)\
     .outerjoin(MapLocation, TaskopsTask.location_id == MapLocation.id)\
     .where(TaskopsTask.id == task_id, TaskopsTask.deleted_at.is_(None))
    
    row = (await db.execute(query)).first()
    if not row:
        raise HTTPException(404, "Task not found")
    
    task = row.TaskopsTask
    return TaskResponse(
        id=task.id,
        title=task.title,
        description=task.description,
        status=task.status,
        priority=task.priority,
        location_id=task.location_id,
        location_name=row.location_name,
        assigned_to=task.assignee_id,
        assignee_name=row.assignee_name,
        due_date=task.due_date,
        created_at=task.created_at,
        completed_at=task.completed_at
    )


@router.patch("/{task_id}/status", response_model=TaskResponse)
async def update_task_status(
    task_id: uuid.UUID,
    body: TaskStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(TaskopsTask).where(TaskopsTask.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(404, "Task not found")

    task.status = body.status
    if body.status == TaskStatus.done:
        task.completed_at = datetime.now(UTC)
    
    await db.commit()
    await db.refresh(task)
    return await get_task(task_id, current_user, db)
