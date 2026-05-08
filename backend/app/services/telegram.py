import httpx
import structlog
from app.config import settings

log = structlog.get_logger()

class TelegramService:
    def __init__(self):
        self.token = settings.TELEGRAM_BOT_TOKEN
        self.api_url = f"https://api.telegram.org/bot{self.token}"

    def is_configured(self) -> bool:
        return bool(self.token)

    async def send_message(self, chat_id: str, text: str, parse_mode: str = "HTML"):
        if not self.is_configured():
            log.warning("telegram_bot_token_not_set")
            return False

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    f"{self.api_url}/sendMessage",
                    json={
                        "chat_id": chat_id,
                        "text": text,
                        "parse_mode": parse_mode
                    }
                )
                if resp.status_code == 200:
                    return True
                else:
                    log.error("telegram_send_error", status=resp.status_code, body=resp.text)
                    return False
        except Exception as e:
            log.error("telegram_exception", error=str(e))
            return False

    async def set_webhook(self, url: str):
        if not self.is_configured(): return False
        async with httpx.AsyncClient() as client:
            resp = await client.post(f"{self.api_url}/setWebhook", json={"url": url})
            return resp.status_code == 200

telegram_service = TelegramService()
