import asyncio

from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models.user import User


async def check():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(User))
        users = res.scalars().all()
        print("Users found:")
        for u in users:
            print(f" - {u.username} (Role: {u.role})")

if __name__ == "__main__":
    asyncio.run(check())
