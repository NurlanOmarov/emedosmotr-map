from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user,
)
from app.models.user import User
from app.redis_client import get_redis
from app.schemas.auth import LoginRequest, LoginResponse, TokenRefreshResponse, UserMe

router = APIRouter(prefix="/auth", tags=["Auth"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

_BLACKLIST_PREFIX = "rt_blacklist:"


async def _blacklist_token(payload: dict) -> None:
    jti = payload.get("jti")
    exp = payload.get("exp")
    if not jti or not exp:
        return
    ttl = int(exp - datetime.now(UTC).timestamp())
    if ttl > 0:
        await get_redis().set(f"{_BLACKLIST_PREFIX}{jti}", "1", ex=ttl)


async def _is_blacklisted(jti: str | None) -> bool:
    if not jti:
        return False
    return bool(await get_redis().exists(f"{_BLACKLIST_PREFIX}{jti}"))


@router.post("/login", response_model=LoginResponse)
async def login(body: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User).where(User.username == body.username, User.deleted_at.is_(None))
    )
    user = result.scalar_one_or_none()

    if not user or not pwd_context.verify(body.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled")

    user.last_login_at = datetime.now(UTC)
    await db.commit()

    access_token = create_access_token(str(user.id), user.role)
    refresh_token = create_refresh_token(str(user.id))

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        max_age=7 * 24 * 3600,
        samesite="lax",
    )
    return LoginResponse(access_token=access_token)


@router.post("/refresh", response_model=TokenRefreshResponse)
async def refresh(request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No refresh token")

    payload = decode_token(token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")

    if await _is_blacklisted(payload.get("jti")):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has been revoked")

    result = await db.execute(
        select(User).where(User.id == payload["sub"], User.deleted_at.is_(None))
    )
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    # Rotate: blacklist old token, issue fresh one
    await _blacklist_token(payload)
    new_refresh = create_refresh_token(str(user.id))
    response.set_cookie(
        key="refresh_token",
        value=new_refresh,
        httponly=True,
        max_age=7 * 24 * 3600,
        samesite="lax",
    )
    return TokenRefreshResponse(access_token=create_access_token(str(user.id), user.role))


@router.post("/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if token:
        try:
            payload = decode_token(token)
            await _blacklist_token(payload)
        except Exception:
            pass  # invalid token — cookie still cleared
    response.delete_cookie("refresh_token")
    return {"message": "Logged out"}


@router.get("/me", response_model=UserMe)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user
