import asyncio
from app.celery_app import celery_app
from app.database import AsyncSessionLocal
from app.modules.routing.service import routing_service

@celery_app.task
def invalidate_route_cache_task():
    """
    Background task to clear old routing cache entries.
    """
    async def _work():
        async with AsyncSessionLocal() as db:
            await routing_service.invalidate_cache(db)
            
    asyncio.run(_work())
