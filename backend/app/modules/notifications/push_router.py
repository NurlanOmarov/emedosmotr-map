from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.models.push import PushSubscription
from app.schemas.push import PushSubscriptionCreate, PushSubscriptionResponse
from app.config import settings

router = APIRouter(prefix="/push", tags=["Push Notifications"])


@router.get("/vapid-public-key")
async def get_vapid_public_key():
    """Return the VAPID public key for frontend subscription."""
    return {"publicKey": settings.VAPID_PUBLIC_KEY}


@router.post("/subscribe", response_model=PushSubscriptionResponse, status_code=status.HTTP_201_CREATED)
async def subscribe(
    body: PushSubscriptionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Subscribe current user for push notifications."""
    # Check if subscription already exists
    q = select(PushSubscription).where(PushSubscription.endpoint == body.endpoint)
    result = await db.execute(q)
    existing = result.scalar_one_or_none()
    
    if existing:
        # Update user association if it changed
        existing.user_id = current_user.id
        existing.p256dh = body.p256dh
        existing.auth = body.auth
        await db.commit()
        await db.refresh(existing)
        return existing
    
    subscription = PushSubscription(
        user_id=current_user.id,
        endpoint=body.endpoint,
        p256dh=body.p256dh,
        auth=body.auth
    )
    db.add(subscription)
    await db.commit()
    await db.refresh(subscription)
    return subscription


@router.post("/unsubscribe", status_code=status.HTTP_204_NO_CONTENT)
async def unsubscribe(
    endpoint: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Unsubscribe current user from push notifications for a specific endpoint."""
    q = delete(PushSubscription).where(
        PushSubscription.endpoint == endpoint,
        PushSubscription.user_id == current_user.id
    )
    await db.execute(q)
    await db.commit()
    return None
