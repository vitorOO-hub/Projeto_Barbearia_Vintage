import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.api.v1.deps import get_current_user
from app.core.config import settings
from app.core.security import create_access_token, create_refresh_token, decode_access_token, verify_password
from app.db.session import get_db
from app.models import User
from app.schemas.auth import LoginRequest, TokenResponse
from app.schemas.user import UserOut

router = APIRouter(prefix="/auth", tags=["auth"])
limiter = Limiter(key_func=get_remote_address)

GENERIC_LOGIN_ERROR = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="E-mail ou senha inválidos.",
)

REFRESH_ERROR = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Sessão expirada. Faça login novamente.",
)

REFRESH_COOKIE_NAME = "refresh_token"
REFRESH_COOKIE_PATH = "/api/v1/auth"


def _set_refresh_cookie(response: Response, subject: str) -> None:
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=create_refresh_token(subject=subject),
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        httponly=True,
        secure=not settings.is_development,
        samesite="none" if not settings.is_development else "lax",
        path=REFRESH_COOKIE_PATH,
    )


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
async def login(request: Request, data: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    if user is None or not verify_password(data.password, user.password_hash):
        raise GENERIC_LOGIN_ERROR
    _set_refresh_cookie(response, subject=str(user.id))
    token = create_access_token(subject=str(user.id))
    return TokenResponse(access_token=token)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    refresh_cookie = request.cookies.get(REFRESH_COOKIE_NAME)
    if refresh_cookie is None:
        raise REFRESH_ERROR
    try:
        payload = decode_access_token(refresh_cookie)
    except ValueError:
        raise REFRESH_ERROR
    if payload.get("type") != "refresh":
        raise REFRESH_ERROR
    user_id = payload.get("sub")
    if user_id is None:
        raise REFRESH_ERROR
    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise REFRESH_ERROR

    result = await db.execute(select(User).where(User.id == user_uuid))
    user = result.scalar_one_or_none()
    if user is None:
        raise REFRESH_ERROR

    _set_refresh_cookie(response, subject=str(user.id))
    return TokenResponse(access_token=create_access_token(subject=str(user.id)))


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(response: Response) -> None:
    response.delete_cookie(key=REFRESH_COOKIE_NAME, path=REFRESH_COOKIE_PATH)


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    return current_user
