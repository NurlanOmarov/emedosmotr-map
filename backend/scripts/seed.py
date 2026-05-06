"""
Начальный seed: создаёт superadmin + тестовые данные (locations, tasks).
Запуск: python scripts/seed.py
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings
from app.models import User, Location, Task, Commission

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

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


async def seed():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    Session = async_sessionmaker(engine, expire_on_commit=False)

    async with Session() as db:
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
