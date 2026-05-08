import uuid
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.notification import Notification
from app.models.user import User
from app.modules.ws.manager import ws_manager
from app.schemas.notification import NotificationType
from app.tasks_celery.notifications import send_push_notifications_task, send_telegram_notification_task
from sqlalchemy import select

class NotificationService:
    @staticmethod
    async def create_notification(
        db: AsyncSession,
        user_id: uuid.UUID,
        type: NotificationType,
        title: str,
        body: str | None = None,
        related_entity_type: str | None = None,
        related_entity_id: uuid.UUID | None = None,
    ) -> Notification:
        # 1. Save to database
        notification = Notification(
            user_id=user_id,
            type=type,
            title=title,
            body=body,
            related_entity_type=related_entity_type,
            related_entity_id=related_entity_id,
        )
        db.add(notification)
        await db.commit()
        await db.refresh(notification)

        # 2. Get User Settings
        stmt = select(User).where(User.id == user_id)
        res = await db.execute(stmt)
        user = res.scalar_one_or_none()
        
        # Default settings if user not found or settings missing
        settings = getattr(user, 'notification_settings', {}) if user else {}
        if isinstance(settings, str): # Handle if it's still stored as string
            import json
            try: settings = json.loads(settings)
            except: settings = {}

        # 3. Broadcast via WebSocket (In-App)
        # Always send in-app unless explicitly disabled (if we had that option)
        # For now, if "in-app" is in settings for this type, or type not in settings
        active_channels = settings.get(type, ["in-app", "push", "telegram"])
        
        if "in-app" in active_channels:
            ws_data = {
                "id": str(notification.id),
                "type": notification.type,
                "title": notification.title,
                "message": notification.body or "",
                "timestamp": notification.created_at.isoformat(),
                "read": notification.is_read,
                "related_entity_type": notification.related_entity_type,
                "related_entity_id": str(notification.related_entity_id) if notification.related_entity_id else None,
            }
            
            await ws_manager.broadcast_to_room(
                f"user_{user_id}", 
                "new_notification", 
                ws_data
            )

        # 4. Send Push Notification (Async)
        if "push" in active_channels:
            send_push_notifications_task.delay(
                str(user_id), 
                notification.title, 
                notification.body or "",
                {
                    "notification_id": str(notification.id),
                    "type": notification.type,
                    "related_entity_type": notification.related_entity_type,
                    "related_entity_id": str(notification.related_entity_id) if notification.related_entity_id else None,
                }
            )

        # 5. Send Telegram Notification (Async)
        if "telegram" in active_channels:
            send_telegram_notification_task.delay(
                str(user_id),
                notification.title,
                notification.body or "",
                {
                    "notification_id": str(notification.id),
                    "type": notification.type,
                    "related_entity_type": notification.related_entity_type,
                    "related_entity_id": str(notification.related_entity_id) if notification.related_entity_id else None,
                }
            )
        
        return notification

notification_service = NotificationService()
