import asyncio
import uuid
from datetime import datetime, timedelta, date
from sqlalchemy import select, and_, not_
from app.celery_app import celery_app
from app.database import AsyncSessionLocal
from app.models.push import PushSubscription
from app.models.user import User
from app.models.task import Task
from app.models.notification import Notification
from app.services.push import push_service
from app.services.telegram import telegram_service

@celery_app.task
def send_push_notifications_task(user_id_str: str, title: str, body: str, data: dict = None):
    """
    Background task to send push notifications to all user's subscriptions.
    """
    user_id = uuid.UUID(user_id_str)
    
    async def _work():
        async with AsyncSessionLocal() as db:
            q = select(PushSubscription).where(PushSubscription.user_id == user_id)
            result = await db.execute(q)
            subscriptions = result.scalars().all()
            
            for sub in subscriptions:
                await push_service.send_push(sub, title, body, data)
                
    asyncio.run(_work())

@celery_app.task
def send_telegram_notification_task(user_id_str: str, title: str, body: str, data: dict = None):
    """
    Background task to send notification via Telegram bot.
    """
    user_id = uuid.UUID(user_id_str)
    
    async def _work():
        async with AsyncSessionLocal() as db:
            q = select(User).where(User.id == user_id)
            result = await db.execute(q)
            user = result.scalar_one_or_none()
            
            if user and user.telegram_chat_id:
                # Format message
                text = f"🔔 <b>{title}</b>\n\n{body}"
                
                # Add link if possible
                if data and data.get("related_entity_type") == "task":
                    # For production, use real domain
                    domain = "https://emap.emedosmotr.kz" 
                    text += f"\n\n👉 <a href='{domain}/tasks/{data['related_entity_id']}'>Открыть задачу</a>"
                
                await telegram_service.send_message(user.telegram_chat_id, text)
                
    asyncio.run(_work())

@celery_app.task
def check_deadlines_task():
    """
    Periodic task to check for approaching or overdue tasks and send notifications.
    """
    async def _work():
        async with AsyncSessionLocal() as db:
            # Check tasks due tomorrow or already overdue
            tomorrow = date.today() + timedelta(days=1)
            
            # Find tasks where:
            # 1. status is not 'done' or 'cancelled'
            # 2. assigned_to is not null
            # 3. due_date is tomorrow or in the past
            q = select(Task).where(
                and_(
                    Task.status.in_(["new", "assigned", "in_progress", "waiting"]),
                    Task.assigned_to.isnot(None),
                    Task.due_date <= tomorrow
                )
            )
            result = await db.execute(q)
            tasks = result.scalars().all()
            
            for task in tasks:
                # Check if we already sent a 'deadline' notification for this task in the last 24h
                # to avoid spamming every hour
                notif_q = select(Notification).where(
                    and_(
                        Notification.user_id == task.assigned_to,
                        Notification.related_entity_type == "task",
                        Notification.related_entity_id == task.id,
                        Notification.type == "deadline",
                        Notification.created_at >= datetime.now() - timedelta(hours=23)
                    )
                )
                notif_result = await db.execute(notif_q)
                if notif_result.scalar_one_or_none():
                    continue

                # Prepare notification
                is_overdue = task.due_date < date.today()
                title = "🔥 Просроченная задача" if is_overdue else "⏳ Срок задачи истекает"
                body = f"Задача: {task.title}\nСрок: {task.due_date.strftime('%d.%m.%Y')}"
                
                # Lazy import to avoid circular dependency
                from app.services.notification import notification_service
                # Use notification_service.create_notification to handle all channels + DB
                await notification_service.create_notification(
                    db=db,
                    user_id=task.assigned_to,
                    type="deadline",
                    title=title,
                    message=body,
                    related_entity_type="task",
                    related_entity_id=task.id
                )
                
    asyncio.run(_work())
