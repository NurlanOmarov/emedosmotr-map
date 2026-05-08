from fastapi import APIRouter, Request, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.user import User
from app.services.telegram import telegram_service
from app.middleware.auth import get_current_user
import redis.asyncio as redis
from app.config import settings

router = APIRouter(prefix="/telegram", tags=["Telegram"])

# Redis for temporary binding codes
redis_client = redis.from_url(settings.REDIS_URL)

@router.post("/webhook")
async def telegram_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    data = await request.json()
    
    if "message" not in data:
        return {"ok": True}
    
    message = data["message"]
    chat_id = str(message["chat"]["id"])
    text = message.get("text", "")
    
    if text.startswith("/start"):
        parts = text.split()
        if len(parts) > 1 and parts[1].startswith("bind_"):
            code = parts[1].replace("bind_", "")
            # Continue with binding logic (duplicated for now or we can refactor)
            user_id_str = await redis_client.get(f"tg_bind:{code}")
            if user_id_str:
                import uuid
                user_id = uuid.UUID(user_id_str.decode())
                stmt = select(User).where(User.id == user_id)
                res = await db.execute(stmt)
                user = res.scalar_one_or_none()
                if user:
                    user.telegram_chat_id = chat_id
                    user.telegram_username = message["from"].get("username")
                    await db.commit()
                    await redis_client.delete(f"tg_bind:{code}")
                    await telegram_service.send_message(chat_id, f"✅ Аккаунт {user.username} успешно привязан!")
                    return {"ok": True}

        # Regular /start or failed bind
        stmt = select(User).where(User.telegram_chat_id == chat_id)
        res = await db.execute(stmt)
        user = res.scalar_one_or_none()
        
        if user:
            await telegram_service.send_message(chat_id, f"Привет, {user.full_name or user.username}! Твой аккаунт уже привязан.")
        else:
            await telegram_service.send_message(
                chat_id, 
                "Привет! Чтобы получать уведомления, привяжи свой аккаунт.\n"
                "Нажми кнопку на сайте или введи команду: <code>/bind КОД</code>"
            )
            
    elif text.startswith("/bind"):
        parts = text.split()
        if len(parts) < 2:
            await telegram_service.send_message(chat_id, "Введи код: /bind 123456")
            return {"ok": True}
        
        code = parts[1]
        user_id_str = await redis_client.get(f"tg_bind:{code}")
        
        if not user_id_str:
            await telegram_service.send_message(chat_id, "Неверный или истекший код. Получи новый код на сайте.")
            return {"ok": True}
        
        # Bind user
        import uuid
        user_id = uuid.UUID(user_id_str.decode())
        stmt = select(User).where(User.id == user_id)
        res = await db.execute(stmt)
        user = res.scalar_one_or_none()
        
        if user:
            user.telegram_chat_id = chat_id
            user.telegram_username = message["from"].get("username")
            await db.commit()
            await redis_client.delete(f"tg_bind:{code}")
            await telegram_service.send_message(chat_id, f"✅ Аккаунт {user.username} успешно привязан!")
        else:
            await telegram_service.send_message(chat_id, "Ошибка: пользователь не найден.")

    return {"ok": True}

@router.post("/generate-bind-code")
async def generate_bind_code(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    import random
    code = "".join([str(random.randint(0, 9)) for _ in range(6)])
    # Expire in 10 minutes
    await redis_client.set(f"tg_bind:{code}", str(current_user.id), ex=600)
    return {"code": code, "bot_username": settings.TELEGRAM_BOT_USERNAME}

@router.post("/unbind")
async def unbind_telegram(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Unbind Telegram account from user."""
    stmt = select(User).where(User.id == current_user.id)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()
    
    if user:
        user.telegram_chat_id = None
        user.telegram_username = None
        await db.commit()
    
    return {"ok": True}
