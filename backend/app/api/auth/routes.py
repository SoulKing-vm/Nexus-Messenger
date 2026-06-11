from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.jwt import create_access_token, create_refresh_token, decode_token
from app.core.security import hash_password, validate_username, verify_password
from app.db.models import User
from app.db.session import get_db
from app.schemas.models import LoginRequest, RegisterRequest, TokenPair, UserPublic

router = APIRouter()


@router.post("/register", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> User:
    if not validate_username(payload.username):
        raise HTTPException(status_code=422, detail="Username must match ^[a-zA-Z0-9_-]{3,30}$")

    existing = db.scalar(select(User).where(User.username == payload.username))
    if existing:
        raise HTTPException(status_code=409, detail="Username already exists")

    user = User(
        username=payload.username,
        display_name=payload.display_name or payload.username,
        password_hash=hash_password(payload.password),
        discoverable=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=TokenPair)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenPair:
    user = db.scalar(select(User).where(User.username == payload.username))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")

    return TokenPair(access_token=create_access_token(user.id), refresh_token=create_refresh_token(user.id))


@router.post("/refresh", response_model=TokenPair)
def refresh(refresh_token: str) -> TokenPair:
    try:
        payload = decode_token(refresh_token, refresh=True)
        if payload.get("type") != "refresh":
            raise ValueError("Wrong token type")
        user_id = UUID(payload["sub"])
    except (KeyError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token") from None

    return TokenPair(access_token=create_access_token(user_id), refresh_token=create_refresh_token(user_id))


@router.post("/logout")
def logout() -> dict[str, bool]:
    return {"ok": True}
