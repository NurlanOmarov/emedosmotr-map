import asyncio
from passlib.context import CryptContext
from sqlalchemy import select, update
from app.database import engine
from app.models.user import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def reset_password():
    async with engine.connect() as conn:
        new_hash = pwd_context.hash("Admin1234!")
        await conn.execute(
            update(User)
            .where(User.username == "admin")
            .values(password_hash=new_hash)
        )
        await conn.commit()
        print("Password for 'admin' has been reset to 'Admin1234!'")

if __name__ == "__main__":
    asyncio.run(reset_password())
