import uuid
import re
from datetime import datetime, timezone, date, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select, and_, or_, case
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.taskops import (
    TaskopsProject, TaskopsProjectMember, TaskopsTask, TaskopsComment,
    TaskopsDependency, TaskopsCycle, TaskopsLabel, TaskStatus, TaskopsGoal,
    TaskopsAuditLog,
)
from app.services.notification import notification_service
from app.models.user import User
from app.models.location import Location
from app.schemas.common import PaginatedResponse
from app.modules.taskops.schemas import (
    ProjectCreate, ProjectUpdate, ProjectResponse,
    ProjectMemberAdd, ProjectMemberResponse,
    TaskCreate, TaskUpdate, TaskResponse,
    CommentCreate, CommentResponse,
    DependencyCreate, DependencyResponse,
    CycleCreate, CycleResponse,
    GoalCreate, GoalUpdate, GoalResponse,
)
from app.modules.taskops.permissions import get_accessible_project, can_manage_projects
from app.modules.ws.manager import ws_manager

router = APIRouter(prefix="/v1/taskops", tags=["TaskOps"])


async def _audit(
    db: AsyncSession,
    user: User,
    action: str,
    entity_type: str,
    entity_id=None,
    entity_title: str | None = None,
    project_id=None,
    details: str | None = None,
) -> None:
    log = TaskopsAuditLog(
        user_id=user.id,
        user_name=user.full_name or user.username,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        entity_title=entity_title,
        project_id=project_id,
        details=details,
    )
    db.add(log)


async def _notify_assignee(
    db: AsyncSession,
    task: TaskopsTask,
    assignee_id,
    actor: User,
    is_new: bool = True,
) -> None:
    if assignee_id and assignee_id != actor.id:
        verb = "назначена" if is_new else "обновлена"
        await notification_service.create_notification(
            db=db,
            user_id=assignee_id,
            type="new_task",
            title=f"Задача {verb}: {task.title}",
            body=f"Проект: {task.project_id}",
            related_entity_type="task",
            related_entity_id=task.id,
        )


async def _notify_mentions(
    db: AsyncSession,
    content: str,
    task: TaskopsTask,
    actor: User,
) -> None:
    handles = set(re.findall(r'@([\w.]+)', content))
    if not handles:
        return
    for handle in handles:
        result = await db.execute(
            select(User).where(
                or_(User.username == handle, User.full_name == handle),
                User.deleted_at.is_(None),
                User.id != actor.id,
            )
        )
        user = result.scalar_one_or_none()
        if user:
            await notification_service.create_notification(
                db=db,
                user_id=user.id,
                type="mention",
                title=f"{actor.full_name or actor.username} упомянул вас в комментарии",
                body=f"Задача: {task.title}",
                related_entity_type="task",
                related_entity_id=task.id,
            )


async def _broadcast_task(event: str, task: TaskopsTask, project_id: str | None = None) -> None:
    pid = str(project_id or task.project_id)
    data = {
        "id": str(task.id),
        "project_id": pid,
        "status": task.status,
        "priority": task.priority,
        "title": task.title,
        "assignee_id": str(task.assignee_id) if task.assignee_id else None,
        "updated_at": task.updated_at.isoformat() if task.updated_at else None,
    }
    await ws_manager.broadcast_to_rooms(
        ["taskops_global", f"taskops_project_{pid}"],
        event,
        data,
    )


# ─── Projects ────────────────────────────────────────────────────────────────

@router.get("/projects", response_model=list[ProjectResponse])
async def list_projects(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(TaskopsProject).where(TaskopsProject.deleted_at.is_(None))

    if current_user.role == "external_dev":
        # Only projects where user is a member
        member_sq = select(TaskopsProjectMember.project_id).where(
            TaskopsProjectMember.user_id == current_user.id
        )
        q = q.where(TaskopsProject.is_external == True, TaskopsProject.id.in_(member_sq))  # noqa: E712
    elif current_user.role not in {"superadmin", "director"}:
        # Internal non-admin: own + member-of
        member_sq = select(TaskopsProjectMember.project_id).where(
            TaskopsProjectMember.user_id == current_user.id
        )
        q = q.where(
            (TaskopsProject.owner_id == current_user.id) | TaskopsProject.id.in_(member_sq)
        )

    result = await db.execute(q.order_by(TaskopsProject.created_at.desc()))
    projects = result.scalars().all()
    return projects


@router.post("/projects", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    body: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not can_manage_projects(current_user):
        raise HTTPException(403, "Insufficient permissions to create projects")

    project = TaskopsProject(**body.model_dump(), owner_id=current_user.id)
    db.add(project)
    await db.flush()

    # Auto-add creator as owner member
    member = TaskopsProjectMember(project_id=project.id, user_id=current_user.id, role="owner")
    db.add(member)

    await db.commit()
    await db.refresh(project)
    return project


@router.get("/projects/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_accessible_project(project_id, current_user, db)


@router.patch("/projects/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: uuid.UUID,
    body: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await get_accessible_project(project_id, current_user, db, require_write=True)
    if not can_manage_projects(current_user) and project.owner_id != current_user.id:
        raise HTTPException(403, "Only project owner or manager can edit project")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(project, k, v)
    await db.commit()
    await db.refresh(project)
    return project


@router.delete("/projects/{project_id}", status_code=204)
async def delete_project(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await get_accessible_project(project_id, current_user, db, require_write=True)
    if current_user.role not in {"superadmin", "director"} and project.owner_id != current_user.id:
        raise HTTPException(403, "Only owner or admin can delete project")
    project.deleted_at = datetime.now(timezone.utc)
    await db.commit()


# ─── Project Members ─────────────────────────────────────────────────────────

@router.get("/projects/{project_id}/members", response_model=list[ProjectMemberResponse])
async def list_members(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await get_accessible_project(project_id, current_user, db)
    result = await db.execute(
        select(TaskopsProjectMember, User.full_name.label("user_full_name"))
        .join(User, TaskopsProjectMember.user_id == User.id)
        .where(TaskopsProjectMember.project_id == project_id)
    )
    rows = result.all()
    items = []
    for row in rows:
        m = row.TaskopsProjectMember
        data = {c.name: getattr(m, c.name) for c in m.__table__.columns}
        data["user_full_name"] = row.user_full_name
        items.append(ProjectMemberResponse(**data))
    return items


@router.post("/projects/{project_id}/members", response_model=ProjectMemberResponse, status_code=201)
async def add_member(
    project_id: uuid.UUID,
    body: ProjectMemberAdd,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await get_accessible_project(project_id, current_user, db, require_write=True)
    if not can_manage_projects(current_user):
        raise HTTPException(403, "Insufficient permissions")

    existing = await db.execute(
        select(TaskopsProjectMember).where(
            TaskopsProjectMember.project_id == project_id,
            TaskopsProjectMember.user_id == body.user_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(409, "User is already a member")

    member = TaskopsProjectMember(project_id=project_id, **body.model_dump())
    db.add(member)
    await db.commit()
    await db.refresh(member)
    return ProjectMemberResponse(
        id=member.id, user_id=member.user_id, role=member.role, created_at=member.created_at
    )


@router.delete("/projects/{project_id}/members/{user_id}", status_code=204)
async def remove_member(
    project_id: uuid.UUID,
    user_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await get_accessible_project(project_id, current_user, db, require_write=True)
    result = await db.execute(
        select(TaskopsProjectMember).where(
            TaskopsProjectMember.project_id == project_id,
            TaskopsProjectMember.user_id == user_id,
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(404, "Member not found")
    await db.delete(member)
    await db.commit()


# ─── Tasks ────────────────────────────────────────────────────────────────────

def _build_task_response(task: TaskopsTask, assignee_name=None, reporter_name=None, location_name=None) -> TaskResponse:
    data = {c.name: getattr(task, c.name) for c in task.__table__.columns}
    data["assignee_name"] = assignee_name
    data["reporter_name"] = reporter_name
    data["location_name"] = location_name
    data["labels"] = [{"id": l.id, "name": l.name, "color": l.color} for l in task.labels]
    return TaskResponse(**data)


@router.get("/projects/{project_id}/tasks", response_model=PaginatedResponse[TaskResponse])
async def list_tasks(
    project_id: uuid.UUID,
    task_status: Optional[str] = Query(None, alias="status"),
    priority: Optional[str] = Query(None),
    assignee_id: Optional[uuid.UUID] = Query(None),
    cycle_id: Optional[uuid.UUID] = Query(None),
    q: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await get_accessible_project(project_id, current_user, db)

    assignee_alias = User.__table__.alias("assignee_u")
    reporter_alias = User.__table__.alias("reporter_u")

    query = (
        select(TaskopsTask)
        .options(selectinload(TaskopsTask.labels))
        .where(TaskopsTask.project_id == project_id, TaskopsTask.deleted_at.is_(None))
    )

    if current_user.role == "external_dev":
        query = query.where(
            (TaskopsTask.assignee_id == current_user.id) | (TaskopsTask.is_external_visible == True)  # noqa: E712
        )

    if task_status:
        query = query.where(TaskopsTask.status == task_status)
    if priority:
        query = query.where(TaskopsTask.priority == priority)
    if assignee_id:
        query = query.where(TaskopsTask.assignee_id == assignee_id)
    if cycle_id:
        query = query.where(TaskopsTask.cycle_id == cycle_id)
    if q:
        query = query.where(TaskopsTask.title.ilike(f"%{q}%"))

    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar_one()
    result = await db.execute(
        query.order_by(TaskopsTask.position, TaskopsTask.created_at)
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    tasks = result.scalars().all()

    # Enrich with names
    user_ids = {t.assignee_id for t in tasks if t.assignee_id} | {t.reporter_id for t in tasks}
    loc_ids = {t.location_id for t in tasks if t.location_id}

    users_map: dict = {}
    if user_ids:
        ur = await db.execute(select(User.id, User.full_name).where(User.id.in_(user_ids)))
        users_map = {row.id: row.full_name for row in ur.all()}

    locs_map: dict = {}
    if loc_ids:
        lr = await db.execute(select(Location.id, Location.name).where(Location.id.in_(loc_ids)))
        locs_map = {row.id: row.name for row in lr.all()}

    items = [
        _build_task_response(
            t,
            assignee_name=users_map.get(t.assignee_id),
            reporter_name=users_map.get(t.reporter_id),
            location_name=locs_map.get(t.location_id),
        )
        for t in tasks
    ]

    return PaginatedResponse(
        items=items, total=total, page=page, per_page=per_page,
        pages=(total + per_page - 1) // per_page,
    )


@router.post("/projects/{project_id}/tasks", response_model=TaskResponse, status_code=201)
async def create_task(
    project_id: uuid.UUID,
    body: TaskCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await get_accessible_project(project_id, current_user, db, require_write=True)

    label_ids = body.label_ids
    task_data = body.model_dump(exclude={"label_ids"})
    task = TaskopsTask(**task_data, project_id=project_id, reporter_id=current_user.id)

    if label_ids:
        lr = await db.execute(
            select(TaskopsLabel).where(
                TaskopsLabel.id.in_(label_ids), TaskopsLabel.project_id == project_id
            )
        )
        task.labels = list(lr.scalars().all())

    db.add(task)
    await db.commit()
    await db.refresh(task)

    # Reload with labels
    result = await db.execute(
        select(TaskopsTask).options(selectinload(TaskopsTask.labels)).where(TaskopsTask.id == task.id)
    )
    task = result.scalar_one()

    await _audit(db, current_user, "task_created", "task", task.id, task.title, project_id)
    await _notify_assignee(db, task, task.assignee_id, current_user, is_new=True)
    await db.commit()

    await _broadcast_task("taskops:task:created", task)
    return _build_task_response(task)


@router.get("/tasks/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TaskopsTask)
        .options(selectinload(TaskopsTask.labels))
        .where(TaskopsTask.id == task_id, TaskopsTask.deleted_at.is_(None))
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(404, "Task not found")
    await get_accessible_project(task.project_id, current_user, db)

    if current_user.role == "external_dev":
        if task.assignee_id != current_user.id and not task.is_external_visible:
            raise HTTPException(403, "Access denied")

    return _build_task_response(task)


@router.patch("/tasks/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: uuid.UUID,
    body: TaskUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TaskopsTask)
        .options(selectinload(TaskopsTask.labels))
        .where(TaskopsTask.id == task_id, TaskopsTask.deleted_at.is_(None))
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(404, "Task not found")

    await get_accessible_project(task.project_id, current_user, db, require_write=True)

    if current_user.role == "external_dev" and task.assignee_id != current_user.id:
        raise HTTPException(403, "Access denied")

    data = body.model_dump(exclude_none=True, exclude={"label_ids"})

    # Auto-set completed_at
    if "status" in data:
        if data["status"] == TaskStatus.done and not task.completed_at:
            task.completed_at = datetime.now(timezone.utc)
        elif data["status"] != TaskStatus.done:
            task.completed_at = None

    for k, v in data.items():
        setattr(task, k, v)

    if body.label_ids is not None:
        lr = await db.execute(
            select(TaskopsLabel).where(
                TaskopsLabel.id.in_(body.label_ids), TaskopsLabel.project_id == task.project_id
            )
        )
        task.labels = list(lr.scalars().all())

    # Audit + notify
    details = ", ".join(f"{k}={v}" for k, v in data.items() if k not in ("updated_at",))
    await _audit(db, current_user, "task_updated", "task", task.id, task.title, task.project_id, details)
    if "assignee_id" in data:
        await _notify_assignee(db, task, data["assignee_id"], current_user, is_new=False)

    await db.commit()
    await db.refresh(task)

    result = await db.execute(
        select(TaskopsTask).options(selectinload(TaskopsTask.labels)).where(TaskopsTask.id == task.id)
    )
    task = result.scalar_one()
    await _broadcast_task("taskops:task:updated", task)
    return _build_task_response(task)


@router.delete("/tasks/{task_id}", status_code=204)
async def delete_task(
    task_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(TaskopsTask).where(TaskopsTask.id == task_id, TaskopsTask.deleted_at.is_(None)))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(404, "Task not found")
    await get_accessible_project(task.project_id, current_user, db, require_write=True)
    if not can_manage_projects(current_user):
        raise HTTPException(403, "Insufficient permissions to delete tasks")
    project_id = str(task.project_id)
    task.deleted_at = datetime.now(timezone.utc)
    await db.commit()
    await ws_manager.broadcast_to_rooms(
        ["taskops_global", f"taskops_project_{project_id}"],
        "taskops:task:deleted",
        {"id": str(task_id), "project_id": project_id},
    )


# ─── Comments ────────────────────────────────────────────────────────────────

@router.get("/tasks/{task_id}/comments", response_model=list[CommentResponse])
async def list_comments(
    task_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(TaskopsTask).where(TaskopsTask.id == task_id, TaskopsTask.deleted_at.is_(None)))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(404, "Task not found")
    await get_accessible_project(task.project_id, current_user, db)

    rows = await db.execute(
        select(TaskopsComment, User.full_name.label("author_name"))
        .join(User, TaskopsComment.author_id == User.id)
        .where(TaskopsComment.task_id == task_id)
        .order_by(TaskopsComment.created_at)
    )
    items = []
    for row in rows.all():
        c = row.TaskopsComment
        data = {col.name: getattr(c, col.name) for col in c.__table__.columns}
        data["author_name"] = row.author_name
        items.append(CommentResponse(**data))
    return items


@router.post("/tasks/{task_id}/comments", response_model=CommentResponse, status_code=201)
async def add_comment(
    task_id: uuid.UUID,
    body: CommentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(TaskopsTask).where(TaskopsTask.id == task_id, TaskopsTask.deleted_at.is_(None)))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(404, "Task not found")
    await get_accessible_project(task.project_id, current_user, db)

    if current_user.role == "external_dev" and task.assignee_id != current_user.id and not task.is_external_visible:
        raise HTTPException(403, "Access denied")

    comment = TaskopsComment(task_id=task_id, author_id=current_user.id, content=body.content)
    db.add(comment)
    await db.commit()
    await db.refresh(comment)

    # Notify @mentioned users
    await _notify_mentions(db, body.content, task, current_user)

    return CommentResponse(
        **{col.name: getattr(comment, col.name) for col in comment.__table__.columns},
        author_name=current_user.full_name,
    )


# ─── Dependencies ─────────────────────────────────────────────────────────────

@router.post("/tasks/{task_id}/dependencies", response_model=DependencyResponse, status_code=201)
async def add_dependency(
    task_id: uuid.UUID,
    body: DependencyCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(TaskopsTask).where(TaskopsTask.id == task_id, TaskopsTask.deleted_at.is_(None)))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(404, "Task not found")
    await get_accessible_project(task.project_id, current_user, db, require_write=True)

    dep = TaskopsDependency(source_task_id=task_id, **body.model_dump())
    db.add(dep)
    await db.commit()
    await db.refresh(dep)
    return dep


@router.delete("/tasks/{task_id}/dependencies/{dep_id}", status_code=204)
async def remove_dependency(
    task_id: uuid.UUID,
    dep_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(TaskopsTask).where(TaskopsTask.id == task_id, TaskopsTask.deleted_at.is_(None)))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(404, "Task not found")
    await get_accessible_project(task.project_id, current_user, db, require_write=True)

    dep_result = await db.execute(
        select(TaskopsDependency).where(TaskopsDependency.id == dep_id, TaskopsDependency.source_task_id == task_id)
    )
    dep = dep_result.scalar_one_or_none()
    if not dep:
        raise HTTPException(404, "Dependency not found")
    await db.delete(dep)
    await db.commit()


# ─── Inbox (My Tasks) ────────────────────────────────────────────────────────

@router.get("/me/inbox", response_model=list[TaskResponse])
async def my_inbox(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TaskopsTask)
        .options(selectinload(TaskopsTask.labels))
        .where(
            TaskopsTask.assignee_id == current_user.id,
            TaskopsTask.deleted_at.is_(None),
            TaskopsTask.status.not_in([TaskStatus.done, TaskStatus.cancelled]),
        )
        .order_by(TaskopsTask.due_date.asc().nulls_last(), TaskopsTask.priority)
    )
    tasks = result.scalars().all()
    return [_build_task_response(t) for t in tasks]


# ─── Cycles ──────────────────────────────────────────────────────────────────

@router.get("/projects/{project_id}/cycles", response_model=list[CycleResponse])
async def list_cycles(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await get_accessible_project(project_id, current_user, db)
    result = await db.execute(
        select(TaskopsCycle)
        .where(TaskopsCycle.project_id == project_id)
        .order_by(TaskopsCycle.start_date.desc())
    )
    return result.scalars().all()


@router.post("/projects/{project_id}/cycles", response_model=CycleResponse, status_code=201)
async def create_cycle(
    project_id: uuid.UUID,
    body: CycleCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await get_accessible_project(project_id, current_user, db, require_write=True)
    if not can_manage_projects(current_user):
        raise HTTPException(403, "Insufficient permissions to create cycles")
    cycle = TaskopsCycle(**body.model_dump(), project_id=project_id)
    db.add(cycle)
    await db.commit()
    await db.refresh(cycle)
    return cycle


@router.patch("/cycles/{cycle_id}/close", response_model=CycleResponse)
async def close_cycle(
    cycle_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(TaskopsCycle).where(TaskopsCycle.id == cycle_id))
    cycle = result.scalar_one_or_none()
    if not cycle:
        raise HTTPException(404, "Cycle not found")
    await get_accessible_project(cycle.project_id, current_user, db, require_write=True)
    if not can_manage_projects(current_user):
        raise HTTPException(403, "Insufficient permissions")

    cycle.is_closed = True
    # Move unfinished tasks to backlog (detach from cycle)
    unfinished_result = await db.execute(
        select(TaskopsTask).where(
            TaskopsTask.cycle_id == cycle_id,
            TaskopsTask.status.not_in([TaskStatus.done, TaskStatus.cancelled]),
            TaskopsTask.deleted_at.is_(None),
        )
    )
    unfinished = unfinished_result.scalars().all()
    for task in unfinished:
        task.cycle_id = None
        task.status = TaskStatus.backlog

    await db.commit()
    await db.refresh(cycle)
    return cycle


# ─── Goals ───────────────────────────────────────────────────────────────────

@router.get("/goals", response_model=list[GoalResponse])
async def list_goals(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(TaskopsGoal, User.full_name.label("owner_name")).join(User, TaskopsGoal.owner_id == User.id)
    if current_user.role not in {"superadmin", "director"}:
        q = q.where(TaskopsGoal.owner_id == current_user.id)
    result = await db.execute(q.order_by(TaskopsGoal.created_at.desc()))
    rows = result.all()
    out = []
    for row in rows:
        g = row.TaskopsGoal
        data = {c.name: getattr(g, c.name) for c in g.__table__.columns}
        data["owner_name"] = row.owner_name
        out.append(GoalResponse(**data))
    return out


@router.post("/goals", response_model=GoalResponse, status_code=201)
async def create_goal(
    body: GoalCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not can_manage_projects(current_user):
        raise HTTPException(403, "Insufficient permissions")
    goal = TaskopsGoal(**body.model_dump(), owner_id=current_user.id)
    db.add(goal)
    await db.commit()
    await db.refresh(goal)
    data = {c.name: getattr(goal, c.name) for c in goal.__table__.columns}
    data["owner_name"] = current_user.full_name
    return GoalResponse(**data)


@router.patch("/goals/{goal_id}", response_model=GoalResponse)
async def update_goal(
    goal_id: uuid.UUID,
    body: GoalUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(TaskopsGoal).where(TaskopsGoal.id == goal_id))
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(404, "Goal not found")
    if goal.owner_id != current_user.id and not can_manage_projects(current_user):
        raise HTTPException(403, "Insufficient permissions")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(goal, k, v)
    await db.commit()
    await db.refresh(goal)
    owner_result = await db.execute(select(User.full_name).where(User.id == goal.owner_id))
    owner_name = owner_result.scalar_one_or_none()
    data = {c.name: getattr(goal, c.name) for c in goal.__table__.columns}
    data["owner_name"] = owner_name
    return GoalResponse(**data)


@router.delete("/goals/{goal_id}", status_code=204)
async def delete_goal(
    goal_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(TaskopsGoal).where(TaskopsGoal.id == goal_id))
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(404, "Goal not found")
    if goal.owner_id != current_user.id and not can_manage_projects(current_user):
        raise HTTPException(403, "Insufficient permissions")
    await db.delete(goal)
    await db.commit()


# ─── Dashboard ────────────────────────────────────────────────────────────────

@router.get("/dashboard")
async def get_dashboard(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    today = date.today()

    if current_user.role in {"superadmin", "director"}:
        proj_sq = select(TaskopsProject.id).where(TaskopsProject.deleted_at.is_(None))
    elif current_user.role == "external_dev":
        member_sq = select(TaskopsProjectMember.project_id).where(
            TaskopsProjectMember.user_id == current_user.id
        )
        proj_sq = select(TaskopsProject.id).where(
            TaskopsProject.deleted_at.is_(None),
            TaskopsProject.is_external == True,  # noqa: E712
            TaskopsProject.id.in_(member_sq),
        )
    else:
        member_sq = select(TaskopsProjectMember.project_id).where(
            TaskopsProjectMember.user_id == current_user.id
        )
        proj_sq = select(TaskopsProject.id).where(
            TaskopsProject.deleted_at.is_(None),
            or_(
                TaskopsProject.owner_id == current_user.id,
                TaskopsProject.id.in_(member_sq),
            ),
        )

    base = and_(
        TaskopsTask.deleted_at.is_(None),
        TaskopsTask.project_id.in_(proj_sq),
    )

    kpi_result = await db.execute(
        select(
            func.count().label("total"),
            func.sum(case((TaskopsTask.status.not_in([TaskStatus.done, TaskStatus.cancelled]), 1), else_=0)).label("open"),
            func.sum(case((TaskopsTask.status == TaskStatus.in_progress, 1), else_=0)).label("in_progress"),
            func.sum(case((TaskopsTask.status == TaskStatus.done, 1), else_=0)).label("done"),
            func.sum(case((
                and_(
                    TaskopsTask.due_date < today,
                    TaskopsTask.status.not_in([TaskStatus.done, TaskStatus.cancelled]),
                ), 1), else_=0
            )).label("overdue"),
        ).where(base)
    )
    kpi = kpi_result.one()

    eight_weeks_ago = today - timedelta(weeks=8)
    done_by_week_result = await db.execute(
        select(
            func.to_char(TaskopsTask.completed_at, 'IYYY-IW').label("week"),
            func.count().label("count"),
        )
        .where(
            base,
            TaskopsTask.status == TaskStatus.done,
            TaskopsTask.completed_at >= eight_weeks_ago,
        )
        .group_by(func.to_char(TaskopsTask.completed_at, 'IYYY-IW'))
        .order_by(func.to_char(TaskopsTask.completed_at, 'IYYY-IW'))
    )
    done_by_week = [{"week": r.week, "count": r.count} for r in done_by_week_result.all()]

    assignee_result = await db.execute(
        select(
            User.full_name.label("name"),
            func.count().label("count"),
        )
        .join(User, TaskopsTask.assignee_id == User.id)
        .where(base, TaskopsTask.status.not_in([TaskStatus.done, TaskStatus.cancelled]))
        .group_by(User.full_name)
        .order_by(func.count().desc())
        .limit(10)
    )
    by_assignee = [{"name": r.name or "—", "count": r.count} for r in assignee_result.all()]

    risk_result = await db.execute(
        select(TaskopsTask)
        .options(selectinload(TaskopsTask.labels))
        .where(
            base,
            TaskopsTask.status.not_in([TaskStatus.done, TaskStatus.cancelled]),
            or_(
                TaskopsTask.due_date < today,
                and_(
                    TaskopsTask.due_date.isnot(None),
                    TaskopsTask.due_date <= today + timedelta(days=3),
                ),
            ),
        )
        .order_by(TaskopsTask.due_date.asc().nulls_last())
        .limit(10)
    )
    risk_tasks = [_build_task_response(t) for t in risk_result.scalars().all()]

    return {
        "kpi": {
            "total": kpi.total or 0,
            "open": kpi.open or 0,
            "in_progress": kpi.in_progress or 0,
            "done": kpi.done or 0,
            "overdue": kpi.overdue or 0,
        },
        "done_by_week": done_by_week,
        "by_assignee": by_assignee,
        "risk_tasks": risk_tasks,
    }


# ─── Audit Log ────────────────────────────────────────────────────────────────

@router.get("/audit-log")
async def get_audit_log(
    project_id: Optional[uuid.UUID] = Query(None),
    limit: int = Query(50, le=200),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role not in {"superadmin", "director", "analyst", "regional_manager"}:
        raise HTTPException(403, "Insufficient permissions")
    q = select(TaskopsAuditLog).order_by(TaskopsAuditLog.created_at.desc()).limit(limit)
    if project_id:
        q = q.where(TaskopsAuditLog.project_id == project_id)
    result = await db.execute(q)
    rows = result.scalars().all()
    return [
        {
            "id": str(r.id),
            "user_name": r.user_name,
            "action": r.action,
            "entity_type": r.entity_type,
            "entity_id": str(r.entity_id) if r.entity_id else None,
            "entity_title": r.entity_title,
            "project_id": str(r.project_id) if r.project_id else None,
            "details": r.details,
            "created_at": r.created_at.isoformat(),
        }
        for r in rows
    ]


# ─── Mention search ───────────────────────────────────────────────────────────

@router.get("/mentions/users")
async def search_mention_users(
    q: str = Query("", min_length=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return users matching q for @mention autocomplete."""
    stmt = select(User.id, User.username, User.full_name).where(User.deleted_at.is_(None))
    if q:
        pattern = f"%{q}%"
        stmt = stmt.where(
            or_(User.full_name.ilike(pattern), User.username.ilike(pattern))
        )
    # External devs only see project members they share projects with
    if current_user.role == "external_dev":
        my_proj = select(TaskopsProjectMember.project_id).where(
            TaskopsProjectMember.user_id == current_user.id
        )
        peer_ids = select(TaskopsProjectMember.user_id).where(
            TaskopsProjectMember.project_id.in_(my_proj)
        )
        stmt = stmt.where(User.id.in_(peer_ids))
    result = await db.execute(stmt.order_by(User.full_name).limit(20))
    return [
        {"id": str(r.id), "username": r.username, "full_name": r.full_name or r.username}
        for r in result.all()
    ]


# ─── Project Templates ────────────────────────────────────────────────────────

TEMPLATES: dict[str, dict] = {
    "implementation": {
        "name": "Внедрение в области",
        "tasks": [
            {"title": "Подписание договора с областью", "priority": "p1_high", "estimate": "S"},
            {"title": "Выезд команды в область", "priority": "p1_high", "estimate": "M"},
            {"title": "Аудит IT-инфраструктуры на местах", "priority": "p2_medium", "estimate": "M"},
            {"title": "Установка ПО eMedosmotr на рабочие места", "priority": "p1_high", "estimate": "L"},
            {"title": "Настройка сетевого оборудования", "priority": "p1_high", "estimate": "M"},
            {"title": "Импорт данных из старых систем", "priority": "p2_medium", "estimate": "L"},
            {"title": "Обучение сотрудников (1-я группа)", "priority": "p1_high", "estimate": "M"},
            {"title": "Обучение сотрудников (2-я группа)", "priority": "p2_medium", "estimate": "M"},
            {"title": "Тестовая эксплуатация (2 недели)", "priority": "p1_high", "estimate": "XL"},
            {"title": "Устранение замечаний по итогам теста", "priority": "p1_high", "estimate": "M"},
            {"title": "Подключение к центральной БД", "priority": "p0_urgent", "estimate": "S"},
            {"title": "Акт приёма-передачи и закрытие проекта", "priority": "p2_medium", "estimate": "S"},
        ],
    },
    "sprint": {
        "name": "Продуктовый спринт",
        "tasks": [
            {"title": "Планирование спринта", "priority": "p1_high", "estimate": "S"},
            {"title": "Декомпозиция задач с командой", "priority": "p2_medium", "estimate": "S"},
            {"title": "Разработка", "priority": "p1_high", "estimate": "XL"},
            {"title": "Code review", "priority": "p2_medium", "estimate": "M"},
            {"title": "Тестирование QA", "priority": "p1_high", "estimate": "L"},
            {"title": "Деплой на staging", "priority": "p1_high", "estimate": "S"},
            {"title": "Демо и ретроспектива", "priority": "p2_medium", "estimate": "S"},
        ],
    },
    "incident": {
        "name": "Инцидент на объекте",
        "tasks": [
            {"title": "Диагностика причины инцидента", "priority": "p0_urgent", "estimate": "S"},
            {"title": "Уведомление ответственных лиц", "priority": "p0_urgent", "estimate": "XS"},
            {"title": "Выезд инженера на объект", "priority": "p0_urgent", "estimate": "M"},
            {"title": "Устранение неисправности", "priority": "p0_urgent", "estimate": "M"},
            {"title": "Проверка восстановления данных", "priority": "p1_high", "estimate": "S"},
            {"title": "Подготовка отчёта по инциденту", "priority": "p2_medium", "estimate": "S"},
        ],
    },
}


@router.get("/templates")
async def list_templates(_: User = Depends(get_current_user)):
    return [
        {"id": k, "name": v["name"], "task_count": len(v["tasks"])}
        for k, v in TEMPLATES.items()
    ]


@router.post("/projects/{project_id}/apply-template", status_code=201)
async def apply_template(
    project_id: uuid.UUID,
    template_id: str = Query(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await get_accessible_project(project_id, current_user, db, require_write=True)
    if not can_manage_projects(current_user):
        raise HTTPException(403, "Insufficient permissions")
    tpl = TEMPLATES.get(template_id)
    if not tpl:
        raise HTTPException(404, f"Template '{template_id}' not found")

    created = []
    for i, t in enumerate(tpl["tasks"]):
        task = TaskopsTask(
            project_id=project_id,
            reporter_id=current_user.id,
            title=t["title"],
            priority=t.get("priority", "p2_medium"),
            estimate=t.get("estimate"),
            status=TaskStatus.backlog,
            position=i,
        )
        db.add(task)
        created.append(task)

    await _audit(db, current_user, "template_applied", "project", project_id, tpl["name"], project_id, template_id)
    await db.commit()
    return {"created": len(created), "template": tpl["name"]}
