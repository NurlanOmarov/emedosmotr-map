import asyncio
import sys

from passlib.context import CryptContext
from sqlalchemy import update
from sqlalchemy.engine import CursorResult

from app.database import engine
from app.models.user import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


async def reset_password() -> None:
    async with engine.connect() as conn:
        new_hash = pwd_context.hash("Admin1234!")
        result: CursorResult = await conn.execute(
            update(User)
            .where(User.username == "admin")
            .values(password_hash=new_hash)
        )
        await conn.commit()

        if result.rowcount == 0:
            print(
                "ERROR: User 'admin' not found in the database.\n"
                "Run 'python scripts/seed.py' first to create the admin user.",
                file=sys.stderr,
            )
            sys.exit(1)

        print("Password for 'admin' has been reset to 'Admin1234!'")


if __name__ == "__main__":
    asyncio.run(reset_password())
