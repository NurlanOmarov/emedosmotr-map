"""
Начальный seed: создаёт системные роли, пользователей, локации и тестовые задачи.
Запуск: python scripts/seed.py
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from passlib.context import CryptContext
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.config import settings
from app.models import Location, Task, User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SYSTEM_ROLES = [
    {
        "name": "superadmin",
        "display_name": "Суперадминистратор",
        "description": "Полный доступ ко всем функциям системы",
        "color": "#DC2626",
        "is_system": True,
        "permissions": ["*"],
    },
    {
        "name": "admin",
        "display_name": "Администратор",
        "description": "Управление пользователями и настройками",
        "color": "#EA580C",
        "is_system": True,
        "permissions": ["users:read", "users:write", "locations:*", "tasks:*", "analytics:read"],
    },
    {
        "name": "director",
        "display_name": "Директор",
        "description": "Просмотр всей аналитики и управление регионами",
        "color": "#7C3AED",
        "is_system": True,
        "permissions": ["analytics:*", "locations:read", "tasks:read", "users:read"],
    },
    {
        "name": "regional_manager",
        "display_name": "Региональный менеджер",
        "description": "Управление задачами и локациями своего региона",
        "color": "#2563EB",
        "is_system": True,
        "permissions": ["locations:read", "locations:write", "tasks:*", "analytics:read"],
    },
    {
        "name": "engineer",
        "display_name": "Инженер",
        "description": "Выполнение задач и обновление статусов локаций",
        "color": "#059669",
        "is_system": True,
        "permissions": ["locations:read", "tasks:read", "tasks:write"],
    },
    {
        "name": "analyst",
        "display_name": "Аналитик",
        "description": "Просмотр аналитики и отчётов",
        "color": "#0891B2",
        "is_system": True,
        "permissions": ["analytics:*", "locations:read", "tasks:read"],
    },
]

TEST_USERS = [
    {
        "username": "admin",
        "email": "admin@emedosmotr.kz",
        "password": "Admin1234!",
        "full_name": "Системный Администратор",
        "role": "superadmin",
        "region_id": None,
    },
    {
        "username": "director",
        "email": "director@emedosmotr.kz",
        "password": "Director1234!",
        "full_name": "Генеральный Директор",
        "role": "director",
        "region_id": None,
    },
    {
        "username": "manager_almaty",
        "email": "manager.almaty@emedosmotr.kz",
        "password": "Manager1234!",
        "full_name": "Ахметов Берік",
        "role": "regional_manager",
        "region_id": 1,
    },
    {
        "username": "engineer_001",
        "email": "engineer.001@emedosmotr.kz",
        "password": "Engineer1234!",
        "full_name": "Сейткали Нұрлан",
        "role": "engineer",
        "region_id": 1,
    },
    {
        "username": "analyst",
        "email": "analyst@emedosmotr.kz",
        "password": "Analyst1234!",
        "full_name": "Жаксыбекова Айгүл",
        "role": "analyst",
        "region_id": None,
    },
]

TEST_LOCATIONS = [
    {
        "region_id": 1,
        "name": "Военный комиссариат г. Алматы",
        "type": "military_office",
        "address": "ул. Панфилова, 88, Алматы",
        "lat": 43.2567,
        "lon": 76.9286,
        "status": "ready",
        "upload_mode": "auto",
        "has_relay_server": True,
        "notes": "Полностью оснащён, все врачи работают в системе",
    },
    {
        "region_id": 1,
        "name": "ЦРБ Алатауского района",
        "type": "district_hospital",
        "address": "пр. Алтынемел, 15, Алматы",
        "lat": 43.2107,
        "lon": 76.8513,
        "status": "in_progress",
        "upload_mode": "mixed",
        "has_relay_server": True,
        "notes": "УЗИ подключено автоматически, ЭКГ загружается вручную",
    },
    {
        "region_id": 1,
        "name": "Военкомат Медеуского района",
        "type": "military_office",
        "address": "ул. Горная, 55, Алматы",
        "lat": 43.2780,
        "lon": 76.9505,
        "status": "critical",
        "upload_mode": "manual",
        "has_relay_server": False,
        "notes": "Призывники уходят в ЧАС Медикал — данные не поступают",
        "status_reason": "Отсутствие мотивации у врачей ВВК направлять в ЦРБ",
    },
    {
        "region_id": 2,
        "name": "Военкомат Астаны",
        "type": "military_office",
        "address": "пр. Республики, 12, Астана",
        "lat": 51.1801,
        "lon": 71.4460,
        "status": "ready",
        "upload_mode": "auto",
        "has_relay_server": True,
        "notes": "Флагманский объект — полная автоматизация",
    },
    {
        "region_id": 2,
        "name": "ЦРБ №1 г. Астана",
        "type": "district_hospital",
        "address": "ул. Сейфуллина, 41, Астана",
        "lat": 51.1895,
        "lon": 71.4358,
        "status": "ready",
        "upload_mode": "auto",
        "has_relay_server": True,
    },
]


async def seed() -> None:
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    Session = async_sessionmaker(engine, expire_on_commit=False)

    async with Session() as db:
        # Roles
        import json
        for role in SYSTEM_ROLES:
            existing = await db.execute(
                text("SELECT name FROM roles WHERE name = :name"),
                {"name": role["name"]},
            )
            if existing.scalar_one_or_none():
                print(f"  [skip] Role '{role['name']}' already exists")
                continue
            await db.execute(
                text(
                    "INSERT INTO roles (name, display_name, description, color, is_system, permissions) "
                    "VALUES (:name, :display_name, :description, :color, :is_system, CAST(:permissions AS jsonb))"
                ),
                {
                    "name": role["name"],
                    "display_name": role["display_name"],
                    "description": role["description"],
                    "color": role["color"],
                    "is_system": role["is_system"],
                    "permissions": json.dumps(role["permissions"]),
                },
            )
            print(f"  [+] Role '{role['name']}'")

        # Users
        created_users = {}
        for data in TEST_USERS:
            existing = await db.execute(select(User).where(User.username == data["username"]))
            if existing.scalar_one_or_none():
                print(f"  [skip] User '{data['username']}' already exists")
                result = await db.execute(select(User).where(User.username == data["username"]))
                created_users[data["username"]] = result.scalar_one()
                continue
            user = User(
                username=data["username"],
                email=data["email"],
                password_hash=pwd_context.hash(data["password"]),
                full_name=data["full_name"],
                role=data["role"],
                region_id=data["region_id"],
            )
            db.add(user)
            await db.flush()
            created_users[data["username"]] = user
            print(f"  [+] User '{data['username']}' ({data['role']})")

        # Locations
        created_locations = []
        for data in TEST_LOCATIONS:
            existing = await db.execute(select(Location).where(Location.name == data["name"]))
            if existing.scalar_one_or_none():
                print(f"  [skip] Location '{data['name']}' already exists")
                continue
            loc = Location(**data)
            db.add(loc)
            await db.flush()
            created_locations.append(loc)
            print(f"  [+] Location '{data['name']}' ({data['status']})")

        # Tasks
        admin = created_users.get("admin")
        engineer = created_users.get("engineer_001")
        if created_locations and admin and engineer:
            loc = created_locations[2]  # критичный объект
            existing = await db.execute(
                select(Task).where(Task.title.contains("Подключить перевалочный сервер"))
            )
            if not existing.scalar_one_or_none():
                task = Task(
                    location_id=loc.id,
                    region_id=loc.region_id,
                    title="Подключить перевалочный сервер в Медеуском военкомате",
                    description="Настроить ноутбук + хаб, подключить ЭКГ и УЗИ к системе",
                    type="equipment_setup",
                    status="assigned",
                    priority="critical",
                    assigned_to=engineer.id,
                    created_by=admin.id,
                )
                db.add(task)
                print(f"  [+] Task (critical) -> {engineer.username}")

        await db.commit()

    await engine.dispose()
    print("\n✅ Seed завершён успешно!")
    print("\nУчётные данные для входа:")
    for u in TEST_USERS:
        print(f"  {u['role']:20} | login: {u['username']:20} | pass: {u['password']}")


if __name__ == "__main__":
    asyncio.run(seed())
