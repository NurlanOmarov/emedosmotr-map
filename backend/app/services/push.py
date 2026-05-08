import json
import structlog
from pywebpush import webpush, WebPushException

from app.config import settings
from app.models.push import PushSubscription

log = structlog.get_logger()

class PushService:
    def __init__(self):
        self.private_key = settings.VAPID_PRIVATE_KEY
        self.public_key = settings.VAPID_PUBLIC_KEY
        self.mailto = settings.VAPID_MAILTO

    def is_configured(self) -> bool:
        return bool(self.private_key and self.public_key)

    async def send_push(self, subscription: PushSubscription, title: str, body: str, data: dict = None):
        """Send a push notification to a specific subscription."""
        if not self.is_configured():
            log.warning("push_service_not_configured")
            return False

        message_data = {
            "title": title,
            "body": body,
            "icon": "/icons/icon-192x192.png", # Path to PWA icon
            "badge": "/icons/badge-72x72.png",
            "data": data or {}
        }

        try:
            webpush(
                subscription_info={
                    "endpoint": subscription.endpoint,
                    "keys": {
                        "p256dh": subscription.p256dh,
                        "auth": subscription.auth
                    }
                },
                data=json.dumps(message_data),
                vapid_private_key=self.private_key,
                vapid_claims={
                    "sub": self.mailto,
                }
            )
            return True
        except WebPushException as ex:
            log.error("push_send_error", endpoint=subscription.endpoint, error=str(ex))
            # If the endpoint is no longer valid, we should ideally remove it, 
            # but we'll leave that to the caller or a cleanup task
            return False
        except Exception as ex:
            log.error("push_unhandled_error", error=str(ex))
            return False

push_service = PushService()
