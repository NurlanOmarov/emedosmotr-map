from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import require_roles
from app.models.role import Role
from app.models.user import User
from app.schemas.role import FeatureItem, RoleCreate, RoleResponse, RoleUpdate

router = APIRouter(prefix="/admin/roles", tags=["Admin: Roles"])

SYSTEM_FEATURES: list[dict] = [
    {"key": "map.view", "name": "Карта: просмотр", "category": "Карта"},
    {"key": "map.edit", "name": "Карта: редактирование объектов", "category": "Карта"},
    {"key": "map.analytics", "name": "Карта: аналитика", "category": "Карта"},
    {"key": "map.all_regions", "name": "Карта: доступ ко всем регионам", "category": "Карта"},
    {"key": "locations.view", "name": "Объекты: просмотр", "category": "Объекты"},
    {"key": "locations.create", "name": "Объекты: создание", "category": "Объекты"},
    {"key": "locations.edit", "name": "Объекты: редактирование", "category": "Объекты"},
    {"key": "locations.delete", "name": "Объекты: удаление", "category": "Объекты"},
    {"key": "tasks.view", "name": "Задачи: просмотр", "category": "Задачи"},
    {"key": "tasks.create", "name": "Задачи: создание", "category": "Задачи"},
    {"key": "tasks.assign", "name": "Задачи: назначение исполнителей", "category": "Задачи"},
    {"key": "taskops.view", "name": "TaskOps: доступ к модулю", "category": "TaskOps"},
    {"key": "taskops.projects.create", "name": "TaskOps: создание проектов", "category": "TaskOps"},
    {"key": "taskops.external_only", "name": "TaskOps: только внешние проекты", "category": "TaskOps"},
    {"key": "analytics.view", "name": "Аналитика: просмотр дашборда", "category": "Аналитика"},
    {"key": "analytics.export", "name": "Аналитика: экспорт данных", "category": "Аналитика"},
    {"key": "district_accounts.view", "name": "Районные кабинеты: просмотр", "category": "Районные кабинеты"},
    {"key": "users.manage", "name": "Пользователи: полное управление", "category": "Администрирование"},
    {"key": "roles.manage", "name": "Роли: управление и матрица доступа", "category": "Администрирование"},
    {"key": "settings.system", "name": "Системные настройки", "category": "Администрирование"},
]

SYSTEM_ROLES_SEED: list[dict] = [
    {
        "name": "superadmin",
        "display_name": "Суперадмин",
        "description": "IT-администратор системы с полным доступом",
        "color": "#EF4444",
        "is_system": True,
        "permissions": [f["key"] for f in SYSTEM_FEATURES],
    },
    {
        "name": "director",
        "display_name": "Директор",
        "description": "Руководитель компании — дашборд, аналитика по всем регионам",
        "color": "#8B5CF6",
        "is_system": True,
        "permissions": [
            "map.view", "map.analytics", "map.all_regions",
            "locations.view",
            "tasks.view",
            "taskops.view",
            "analytics.view", "analytics.export",
            "district_accounts.view",
        ],
    },
    {
        "name": "regional_manager",
        "display_name": "Региональный менеджер",
        "description": "Управление объектами своего региона, постановка задач инженерам",
        "color": "#3B82F6",
        "is_system": True,
        "permissions": [
            "map.view", "map.edit", "map.analytics",
            "locations.view", "locations.create", "locations.edit",
            "tasks.view", "tasks.create", "tasks.assign",
            "taskops.view", "taskops.projects.create",
            "analytics.view",
            "district_accounts.view",
        ],
    },
    {
        "name": "engineer",
        "display_name": "Инженер",
        "description": "Обновление статусов назначенных объектов, выполнение задач",
        "color": "#10B981",
        "is_system": True,
        "permissions": [
            "map.view",
            "locations.view", "locations.edit",
            "tasks.view",
            "taskops.view",
        ],
    },
    {
        "name": "operator",
        "display_name": "Оператор",
        "description": "Оператор 1-й линии поддержки",
        "color": "#F59E0B",
        "is_system": True,
        "permissions": [
            "map.view",
            "locations.view",
            "tasks.view", "tasks.create",
            "district_accounts.view",
        ],
    },
    {
        "name": "analyst",
        "display_name": "Аналитик",
        "description": "Просмотр аналитики, карта только для чтения",
        "color": "#06B6D4",
        "is_system": True,
        "permissions": [
            "map.view", "map.analytics", "map.all_regions",
            "locations.view",
            "tasks.view",
            "taskops.view", "taskops.projects.create",
            "analytics.view", "analytics.export",
            "district_accounts.view",
        ],
    },
    {
        "name": "external_dev",
        "display_name": "Внешний разработчик",
        "description": "Только модуль TaskOps — видит проекты и задачи, назначенные на него",
        "color": "#6B7280",
        "is_system": True,
        "permissions": [
            "taskops.view",
            "taskops.external_only",
        ],
    },
]


@router.get("/features", response_model=list[FeatureItem])
async def list_features(_: User = Depends(require_roles("superadmin"))):
    return SYSTEM_FEATURES


@router.post("/seed", status_code=status.HTTP_200_OK)
async def seed_roles(
    _: User = Depends(require_roles("superadmin")),
    db: AsyncSession = Depends(get_db),
):
    """Создаёт системные роли если их ещё нет в БД."""
    created = []
    for role_data in SYSTEM_ROLES_SEED:
        existing = await db.execute(select(Role).where(Role.name == role_data["name"]))
        if not existing.scalar_one_or_none():
            role = Role(**role_data)
            db.add(role)
            created.append(role_data["name"])
    await db.commit()
    return {"created": created, "message": f"Создано {len(created)} ролей"}


@router.get("", response_model=list[RoleResponse])
async def list_roles(
    _: User = Depends(require_roles("superadmin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Role).order_by(Role.is_system.desc(), Role.name))
    return result.scalars().all()


@router.post("", response_model=RoleResponse, status_code=status.HTTP_201_CREATED)
async def create_role(
    body: RoleCreate,
    _: User = Depends(require_roles("superadmin")),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(select(Role).where(Role.name == body.name))
    if existing.scalar_one_or_none():
        raise HTTPException(status.HTTP_409_CONFLICT, f"Роль '{body.name}' уже существует")

    valid_keys = {f["key"] for f in SYSTEM_FEATURES}
    invalid = [p for p in body.permissions if p not in valid_keys]
    if invalid:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"Неизвестные разрешения: {invalid}")

    role = Role(**body.model_dump())
    db.add(role)
    await db.commit()
    await db.refresh(role)
    return role


@router.get("/{role_name}", response_model=RoleResponse)
async def get_role(
    role_name: str,
    _: User = Depends(require_roles("superadmin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Role).where(Role.name == role_name))
    role = result.scalar_one_or_none()
    if not role:
        raise HTTPException(404, "Роль не найдена")
    return role


@router.put("/{role_name}", response_model=RoleResponse)
async def update_role(
    role_name: str,
    body: RoleUpdate,
    _: User = Depends(require_roles("superadmin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Role).where(Role.name == role_name))
    role = result.scalar_one_or_none()
    if not role:
        raise HTTPException(404, "Роль не найдена")

    if body.permissions is not None:
        valid_keys = {f["key"] for f in SYSTEM_FEATURES}
        invalid = [p for p in body.permissions if p not in valid_keys]
        if invalid:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"Неизвестные разрешения: {invalid}")

    for k, v in body.model_dump(exclude_none=True).items():
        setattr(role, k, v)
    await db.commit()
    await db.refresh(role)
    return role


@router.delete("/{role_name}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_role(
    role_name: str,
    _: User = Depends(require_roles("superadmin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Role).where(Role.name == role_name))
    role = result.scalar_one_or_none()
    if not role:
        raise HTTPException(404, "Роль не найдена")
    if role.is_system:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Системные роли нельзя удалять")

    users_with_role = await db.execute(
        select(User).where(User.role == role_name, User.deleted_at.is_(None))
    )
    if users_with_role.scalars().first():
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Невозможно удалить роль: есть активные пользователи с этой ролью",
        )

    await db.delete(role)
    await db.commit()
