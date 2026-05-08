from celery import Celery
from app.config import settings

celery_app = Celery(
    "emedosmotr_map",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.tasks_celery.notifications"]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Almaty",
    enable_utc=True,
    beat_schedule={
        "check-deadlines-every-hour": {
            "task": "app.tasks_celery.notifications.check_deadlines_task",
            "schedule": 3600.0,  # every hour
        },
    },
)
