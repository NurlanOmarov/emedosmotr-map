import os
import re
import shutil
import uuid
from datetime import UTC, date, datetime, timedelta

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import and_, case, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.location import Location
from app.models.taskops import (
    TaskopsAttachment,
    TaskopsAuditLog,
    TaskopsComment,
    TaskopsCycle,
    TaskopsDependency,
    TaskopsGoal,
    TaskopsLabel,
    TaskopsNote,
    TaskopsProject,
    TaskopsProjectMember,
    TaskopsTask,
    TaskStatus,
)
from app.models.user import User
from app.modules.taskops.permissions import can_manage_projects, get_accessible_project
from app.modules.taskops.schemas import (
    AttachmentResponse,
    CommentCreate,
    CommentResponse,
    CycleCreate,
    CycleResponse,
    DependencyCreate,
    DependencyResponse,
    GoalCreate,
    GoalResponse,
    GoalUpdate,
    NoteCreate,
    NoteResponse,
    NoteUpdate,
    ProjectCreate,
    ProjectMemberAdd,
    ProjectMemberResponse,
    ProjectResponse,
    ProjectUpdate,
    TaskCreate,
    TaskResponse,
    TaskUpdate,
)
from app.modules.ws.manager import ws_manager
from app.schemas.common import PaginatedResponse
from app.services.notification import notification_service

router = APIRouter(prefix="/v1/taskops", tags=["TaskOps"])


def _escape_like(value: str) -> str:
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


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


# ─── Assignable Users ────────────────────────────────────────────────────────

@router.get("/assignable-users")
async def list_assignable_users(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Returns users that can be assigned to tasks. Available to all authenticated users."""
    q = select(User.id, User.full_name, User.username, User.role).where(
        User.deleted_at.is_(None),
        User.role.not_in(["external_dev"]),
    )
    result = await db.execute(q.order_by(User.full_name))
    rows = result.all()
    return [
        {"id": str(r.id), "full_name": r.full_name or r.username, "role": r.role}
        for r in rows
    ]


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
    project.deleted_at = datetime.now(UTC)
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
    data["labels"] = [{"id": lbl.id, "name": lbl.name, "color": lbl.color} for lbl in task.labels]
    data["attachments"] = [
        {
            "id": a.id,
            "task_id": a.task_id,
            "filename": a.filename,
            "content_type": a.content_type,
            "file_size": a.file_size,
            "created_at": a.created_at,
        }
        for a in getattr(task, "attachments", [])
    ]
    
    # Hierarchical data
    subtasks = getattr(task, "subtasks", [])
    data["subtask_count"] = len(subtasks)
    data["completed_subtask_count"] = sum(1 for s in subtasks if s.status == TaskStatus.done)
    data["comment_count"] = len(getattr(task, "comments", []))
    
    # Dependencies
    data["dependencies_incoming"] = [
        {
            "id": d.id, 
            "source_task_id": d.source_task_id, 
            "target_task_id": d.target_task_id, 
            "type": d.type, 
            "created_at": d.created_at,
            "source_task_title": d.source_task.title if d.source_task else None,
            "target_task_title": d.target_task.title if d.target_task else None,
        }
        for d in getattr(task, "dependencies_incoming", [])
    ]
    data["dependencies_outgoing"] = [
        {
            "id": d.id, 
            "source_task_id": d.source_task_id, 
            "target_task_id": d.target_task_id, 
            "type": d.type, 
            "created_at": d.created_at,
            "source_task_title": d.source_task.title if d.source_task else None,
            "target_task_title": d.target_task.title if d.target_task else None,
        }
        for d in getattr(task, "dependencies_outgoing", [])
    ]
    
    return TaskResponse(**data)


@router.get("/projects/{project_id}/tasks", response_model=PaginatedResponse[TaskResponse])
async def list_tasks(
    project_id: uuid.UUID,
    task_status: str | None = Query(None, alias="status"),
    priority: str | None = Query(None),
    assignee_id: uuid.UUID | None = Query(None),
    cycle_id: uuid.UUID | None = Query(None),
    q: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await get_accessible_project(project_id, current_user, db)

    query = (
        select(TaskopsTask)
        .options(
            selectinload(TaskopsTask.labels), 
            selectinload(TaskopsTask.attachments),
            selectinload(TaskopsTask.subtasks),
            selectinload(TaskopsTask.comments),
            selectinload(TaskopsTask.dependencies_incoming),
            selectinload(TaskopsTask.dependencies_outgoing),
        )
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
        query = query.where(TaskopsTask.title.ilike(f"%{_escape_like(q)}%"))

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
        select(TaskopsTask)
        .options(
            selectinload(TaskopsTask.labels), 
            selectinload(TaskopsTask.attachments),
            selectinload(TaskopsTask.subtasks),
            selectinload(TaskopsTask.comments),
            selectinload(TaskopsTask.dependencies_incoming),
            selectinload(TaskopsTask.dependencies_outgoing),
        )
        .where(TaskopsTask.id == task.id)
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
        .options(
            selectinload(TaskopsTask.labels), 
            selectinload(TaskopsTask.attachments),
            selectinload(TaskopsTask.subtasks),
            selectinload(TaskopsTask.comments),
            selectinload(TaskopsTask.dependencies_incoming),
            selectinload(TaskopsTask.dependencies_outgoing),
        )
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


@router.get("/tasks/{task_id}/subtasks", response_model=list[TaskResponse])
async def get_subtasks(
    task_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify access to parent task
    result = await db.execute(
        select(TaskopsTask).where(TaskopsTask.id == task_id, TaskopsTask.deleted_at.is_(None))
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    await get_accessible_project(task.project_id, current_user, db)

    # Fetch subtasks
    result = await db.execute(
        select(TaskopsTask)
        .options(
            selectinload(TaskopsTask.labels), 
            selectinload(TaskopsTask.attachments),
            selectinload(TaskopsTask.subtasks),
            selectinload(TaskopsTask.comments),
            selectinload(TaskopsTask.dependencies_incoming),
            selectinload(TaskopsTask.dependencies_outgoing),
        )
        .where(TaskopsTask.parent_task_id == task_id, TaskopsTask.deleted_at.is_(None))
        .order_by(TaskopsTask.position, TaskopsTask.created_at)
    )
    subtasks = result.scalars().all()
    
    # Enrich with names
    user_ids = {t.assignee_id for t in subtasks if t.assignee_id} | {t.reporter_id for t in subtasks}
    users_map: dict = {}
    if user_ids:
        ur = await db.execute(select(User.id, User.full_name).where(User.id.in_(user_ids)))
        users_map = {row.id: row.full_name for row in ur.all()}

    return [
        _build_task_response(t, assignee_name=users_map.get(t.assignee_id), reporter_name=users_map.get(t.reporter_id))
        for t in subtasks
    ]


@router.patch("/tasks/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: uuid.UUID,
    body: TaskUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TaskopsTask)
        .options(
            selectinload(TaskopsTask.labels), 
            selectinload(TaskopsTask.attachments),
            selectinload(TaskopsTask.subtasks),
            selectinload(TaskopsTask.comments),
            selectinload(TaskopsTask.dependencies_incoming),
            selectinload(TaskopsTask.dependencies_outgoing),
        )
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
            task.completed_at = datetime.now(UTC)
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
        select(TaskopsTask)
        .options(
            selectinload(TaskopsTask.labels), 
            selectinload(TaskopsTask.attachments),
            selectinload(TaskopsTask.subtasks),
            selectinload(TaskopsTask.comments),
            selectinload(TaskopsTask.dependencies_incoming),
            selectinload(TaskopsTask.dependencies_outgoing),
        )
        .where(TaskopsTask.id == task.id)
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
    task.deleted_at = datetime.now(UTC)
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

@router.get("/me/inbox", response_model=dict)
async def my_inbox(
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    base_stmt = select(TaskopsTask).where(
        TaskopsTask.assignee_id == current_user.id,
        TaskopsTask.deleted_at.is_(None),
        TaskopsTask.status.not_in([TaskStatus.done, TaskStatus.cancelled]),
    )
    
    total_result = await db.execute(select(func.count()).select_from(base_stmt.subquery()))
    total = total_result.scalar() or 0

    result = await db.execute(
        base_stmt
        .options(
            selectinload(TaskopsTask.labels), 
            selectinload(TaskopsTask.attachments),
            selectinload(TaskopsTask.subtasks),
            selectinload(TaskopsTask.comments),
            selectinload(TaskopsTask.dependencies_incoming),
            selectinload(TaskopsTask.dependencies_outgoing),
        )
        .order_by(TaskopsTask.due_date.asc().nulls_last(), TaskopsTask.priority)
        .limit(limit)
        .offset(offset)
    )
    tasks = result.scalars().all()
    return {
        "items": [_build_task_response(t) for t in tasks],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/me/assigned", response_model=list[TaskResponse])
async def my_assigned(
    include_done: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Tasks created by the current user and assigned to someone else."""
    query = (
        select(TaskopsTask)
        .options(
            selectinload(TaskopsTask.labels),
            selectinload(TaskopsTask.attachments),
            selectinload(TaskopsTask.subtasks),
            selectinload(TaskopsTask.comments),
            selectinload(TaskopsTask.dependencies_incoming),
            selectinload(TaskopsTask.dependencies_outgoing),
        )
        .where(
            TaskopsTask.reporter_id == current_user.id,
            TaskopsTask.deleted_at.is_(None),
        )
    )
    if not include_done:
        query = query.where(TaskopsTask.status.not_in([TaskStatus.done, TaskStatus.cancelled]))
    query = query.order_by(TaskopsTask.due_date.asc().nulls_last(), TaskopsTask.created_at.desc())
    result = await db.execute(query)
    tasks = result.scalars().all()

    user_ids = {t.assignee_id for t in tasks if t.assignee_id}
    users_map: dict = {}
    if user_ids:
        ur = await db.execute(select(User).where(User.id.in_(user_ids)))
        users_map = {u.id: u.full_name for u in ur.scalars()}

    return [_build_task_response(t, assignee_name=users_map.get(t.assignee_id)) for t in tasks]


# ─── User Task Load (for managers) ───────────────────────────────────────────

@router.get("/users/{user_id}/tasks", response_model=list[TaskResponse])
async def get_user_tasks(
    user_id: uuid.UUID,
    include_done: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Returns all tasks assigned to a specific user. Accessible to managers and admins."""
    if current_user.role == "external_dev":
        raise HTTPException(status_code=403, detail="Access denied")

    query = (
        select(TaskopsTask)
        .options(
            selectinload(TaskopsTask.labels), 
            selectinload(TaskopsTask.attachments),
            selectinload(TaskopsTask.subtasks),
            selectinload(TaskopsTask.comments),
            selectinload(TaskopsTask.dependencies_incoming),
            selectinload(TaskopsTask.dependencies_outgoing),
        )
        .where(
            TaskopsTask.assignee_id == user_id,
            TaskopsTask.deleted_at.is_(None),
        )
    )
    if not include_done:
        query = query.where(TaskopsTask.status.not_in([TaskStatus.done, TaskStatus.cancelled]))

    query = query.order_by(TaskopsTask.due_date.asc().nulls_last(), TaskopsTask.priority)
    result = await db.execute(query)
    tasks = result.scalars().all()

    # Enrich with project names
    project_ids = {t.project_id for t in tasks}
    projects_map: dict = {}
    if project_ids:
        pr = await db.execute(
            select(TaskopsProject.id, TaskopsProject.name).where(TaskopsProject.id.in_(project_ids))
        )
        projects_map = {row.id: row.name for row in pr.all()}

    def build(t: TaskopsTask) -> TaskResponse:
        resp = _build_task_response(t)
        # Embed project name in location_name slot for display convenience
        # Use a custom extra field instead
        data = resp.model_dump()
        data["project_name"] = projects_map.get(t.project_id, "")
        return TaskResponse(**{k: v for k, v in data.items() if k in TaskResponse.model_fields})

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

@router.get("/goals", response_model=dict)
async def list_goals(
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    sort_by: str = Query("created_at"),
    order: str = Query("desc"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(TaskopsGoal, User.full_name.label("owner_name")).join(User, TaskopsGoal.owner_id == User.id)
    if current_user.role not in {"superadmin", "director"}:
        q = q.where(TaskopsGoal.owner_id == current_user.id)
    
    total_result = await db.execute(select(func.count()).select_from(q.subquery()))
    total = total_result.scalar() or 0

    sort_col = getattr(TaskopsGoal, sort_by, TaskopsGoal.created_at)
    if order == "desc":
        q = q.order_by(sort_col.desc())
    else:
        q = q.order_by(sort_col.asc())

    result = await db.execute(q.limit(limit).offset(offset))
    rows = result.all()
    items = []
    for row in rows:
        g = row.TaskopsGoal
        data = {c.name: getattr(g, c.name) for c in g.__table__.columns}
        data["owner_name"] = row.owner_name
        items.append(GoalResponse(**data))
    return {
        "items": items,
        "total": total,
        "limit": limit,
        "offset": offset,
    }


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
    by_assignee_limit: int = Query(10, le=100),
    risk_tasks_limit: int = Query(10, le=100),
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
    week_expr = func.to_char(TaskopsTask.completed_at, 'IYYY-IW')
    done_by_week_result = await db.execute(
        select(
            week_expr.label("week"),
            func.count().label("count"),
        )
        .where(
            base,
            TaskopsTask.status == TaskStatus.done,
            TaskopsTask.completed_at >= eight_weeks_ago,
        )
        .group_by(week_expr)
        .order_by(week_expr)
    )
    done_by_week = [{"week": r.week, "count": r.count} for r in done_by_week_result.all()]

    assignee_result = await db.execute(
        select(
            User.full_name.label("name"),
            func.count().label("count"),
        )
        .select_from(TaskopsTask)
        .join(User, TaskopsTask.assignee_id == User.id)
        .where(base, TaskopsTask.status.not_in([TaskStatus.done, TaskStatus.cancelled]))
        .group_by(User.full_name)
        .order_by(func.count().desc())
        .limit(by_assignee_limit)
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
        .limit(risk_tasks_limit)
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
    project_id: uuid.UUID | None = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role not in {"superadmin", "director", "analyst", "regional_manager"}:
        raise HTTPException(403, "Insufficient permissions")

    base_q = select(TaskopsAuditLog)
    if project_id:
        base_q = base_q.where(TaskopsAuditLog.project_id == project_id)

    total_result = await db.execute(select(func.count()).select_from(base_q.subquery()))
    total = total_result.scalar() or 0

    result = await db.execute(base_q.order_by(TaskopsAuditLog.created_at.desc()).limit(limit).offset(offset))
    rows = result.scalars().all()
    items = [
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
    return {
        "items": items,
        "total": total,
        "limit": limit,
        "offset": offset,
    }


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
        pattern = f"%{_escape_like(q)}%"
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

# ─── Attachments ─────────────────────────────────────────────────────────────

@router.post("/tasks/{task_id}/attachments", response_model=AttachmentResponse, status_code=201)
async def upload_attachment(
    task_id: uuid.UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(TaskopsTask).where(TaskopsTask.id == task_id, TaskopsTask.deleted_at.is_(None)))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(404, "Task not found")
    
    await get_accessible_project(task.project_id, current_user, db, require_write=True)

    # Validate file size
    from app.config import settings
    content = await file.read()
    if len(content) > settings.MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(413, f"File too large. Max size is {settings.MAX_FILE_SIZE_MB}MB")
    await file.seek(0)

    # Create directory
    upload_dir = os.path.join("uploads", "taskops", str(task.project_id))
    os.makedirs(upload_dir, exist_ok=True)

    # Save file
    safe_filename = "".join([c if c.isalnum() or c in "._-" else "_" for c in (file.filename or "file")])
    unique_filename = f"{uuid.uuid4().hex}_{safe_filename}"
    file_path = os.path.join(upload_dir, unique_filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    attachment = TaskopsAttachment(
        task_id=task_id,
        user_id=current_user.id,
        filename=file.filename,
        file_path=file_path,
        content_type=file.content_type,
        file_size=len(content),
    )
    db.add(attachment)
    await db.commit()
    await db.refresh(attachment)

    await _audit(db, current_user, "attachment_uploaded", "task", task.id, task.title, task.project_id, f"file={file.filename}")
    await _broadcast_task("taskops:task:updated", task)
    
    return attachment


@router.get("/attachments/{attachment_id}")
async def get_attachment(
    attachment_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TaskopsAttachment).where(TaskopsAttachment.id == attachment_id)
    )
    attachment = result.scalar_one_or_none()
    if not attachment:
        raise HTTPException(404, "Attachment not found")

    # Check access to task
    task_result = await db.execute(select(TaskopsTask).where(TaskopsTask.id == attachment.task_id))
    task = task_result.scalar_one()
    await get_accessible_project(task.project_id, current_user, db)

    if not os.path.exists(attachment.file_path):
        raise HTTPException(404, "File not found on disk")

    return FileResponse(
        attachment.file_path,
        media_type=attachment.content_type,
        filename=attachment.filename
    )


@router.delete("/attachments/{attachment_id}", status_code=204)
async def delete_attachment(
    attachment_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TaskopsAttachment).where(TaskopsAttachment.id == attachment_id)
    )
    attachment = result.scalar_one_or_none()
    if not attachment:
        raise HTTPException(404, "Attachment not found")

    # Check access to task
    task_result = await db.execute(select(TaskopsTask).where(TaskopsTask.id == attachment.task_id))
    task = task_result.scalar_one()
    await get_accessible_project(task.project_id, current_user, db, require_write=True)

    if current_user.role == "external_dev" and attachment.user_id != current_user.id:
        raise HTTPException(403, "Access denied")

    # Delete physical file
    if os.path.exists(attachment.file_path):
        os.remove(attachment.file_path)

    await db.delete(attachment)
    await db.commit()
    
    await _audit(db, current_user, "attachment_deleted", "task", task.id, task.title, task.project_id, f"file={attachment.filename}")
    await _broadcast_task("taskops:task:updated", task)


# ─── Notes (private per-user) ─────────────────────────────────────────────────

@router.get("/notes", response_model=dict)
async def list_notes(
    q: str = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(TaskopsNote).where(TaskopsNote.user_id == current_user.id, TaskopsNote.deleted_at.is_(None))
    if q:
        pattern = f"%{_escape_like(q)}%"
        stmt = stmt.where(or_(TaskopsNote.title.ilike(pattern), TaskopsNote.content.ilike(pattern)))
    
    result = await db.execute(
        stmt.order_by(TaskopsNote.is_pinned.desc(), TaskopsNote.updated_at.desc())
    )
    notes = result.scalars().all()
    return {"items": notes}


@router.post("/notes", response_model=NoteResponse, status_code=201)
async def create_note(
    body: NoteCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    note = TaskopsNote(user_id=current_user.id, **body.model_dump())
    db.add(note)
    await db.commit()
    await db.refresh(note)
    return note


@router.patch("/notes/{note_id}", response_model=NoteResponse)
async def update_note(
    note_id: uuid.UUID,
    body: NoteUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TaskopsNote).where(
            TaskopsNote.id == note_id,
            TaskopsNote.user_id == current_user.id,
            TaskopsNote.deleted_at.is_(None),
        )
    )
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(404, "Note not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(note, k, v)
    note.updated_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(note)
    return note


@router.delete("/notes/{note_id}", status_code=204)
async def delete_note(
    note_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TaskopsNote).where(
            TaskopsNote.id == note_id,
            TaskopsNote.user_id == current_user.id,
            TaskopsNote.deleted_at.is_(None),
        )
    )
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(404, "Note not found")
    note.deleted_at = datetime.now(UTC)
    await db.commit()
