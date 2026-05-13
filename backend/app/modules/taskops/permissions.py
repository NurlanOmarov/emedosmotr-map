import uuid

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.taskops import TaskopsProject, TaskopsProjectMember
from app.models.user import User

INTERNAL_ROLES = {"superadmin", "director", "regional_manager", "analyst", "operator"}
EXTERNAL_ROLE = "external_dev"


async def get_accessible_project(
    project_id: uuid.UUID,
    user: User,
    db: AsyncSession,
    require_write: bool = False,
) -> TaskopsProject:
    result = await db.execute(
        select(TaskopsProject).where(
            TaskopsProject.id == project_id,
            TaskopsProject.deleted_at.is_(None),
        )
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(404, "Project not found")

    if user.role in INTERNAL_ROLES:
        # Internal users: admins/directors see all, others see assigned or own
        if user.role == "superadmin":
            return project
        # Check membership or ownership
        membership = await _get_membership(project_id, user.id, db)
        if project.owner_id != user.id and not membership:
            raise HTTPException(403, "Access denied")
        if require_write and membership and membership.role == "reader":
            raise HTTPException(403, "Write access required")
        return project

    # external_dev: only external projects they are members of
    if not project.is_external:
        raise HTTPException(403, "Access denied")
    membership = await _get_membership(project_id, user.id, db)
    if not membership:
        raise HTTPException(403, "Access denied")
    if require_write and membership.role == "reader":
        raise HTTPException(403, "Write access required")
    return project


async def _get_membership(
    project_id: uuid.UUID, user_id: uuid.UUID, db: AsyncSession
) -> TaskopsProjectMember | None:
    result = await db.execute(
        select(TaskopsProjectMember).where(
            TaskopsProjectMember.project_id == project_id,
            TaskopsProjectMember.user_id == user_id,
        )
    )
    return result.scalar_one_or_none()


def can_manage_projects(user: User) -> bool:
    return user.role in {"superadmin", "director", "regional_manager", "analyst"}
