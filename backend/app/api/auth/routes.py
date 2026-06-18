from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.jwt import create_access_token, create_refresh_token, decode_token
from app.core.security import hash_password, validate_username, verify_password
from app.db.models import User
from app.db.session import get_db
from app.schemas.models import LoginRequest, RegisterRequest, TokenPair, UserPublic, GoogleLoginRequest
from google.oauth2 import id_token
from google.auth.transport import requests
from app.core.config import settings

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
    if not user or not user.password_hash or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")

    return TokenPair(access_token=create_access_token(user.id), refresh_token=create_refresh_token(user.id))


@router.post("/google", response_model=TokenPair)
def google_login(payload: GoogleLoginRequest, db: Session = Depends(get_db)) -> TokenPair:
    try:
        idinfo = id_token.verify_oauth2_token(payload.credential, requests.Request(), settings.google_client_id)
        email = idinfo.get("email")
        google_id = idinfo.get("sub")
        display_name = idinfo.get("name")
        picture = idinfo.get("picture")
        
        if not email or not google_id:
            raise HTTPException(status_code=400, detail="Invalid Google token payload")
            
        user = db.scalar(select(User).where(User.email == email))
        
        if not user:
            # Create a new user automatically
            # Derive a base username from email
            base_username = email.split("@")[0].lower()
            base_username = ''.join(c for c in base_username if c.isalnum() or c in '_-')[:20]
            if not base_username or len(base_username) < 3:
                base_username = f"user_{google_id[:8]}"
                
            username = base_username
            counter = 1
            while db.scalar(select(User).where(User.username == username)):
                username = f"{base_username}{counter}"
                counter += 1
                
            user = User(
                username=username,
                email=email,
                google_id=google_id,
                display_name=display_name or username,
                profile_picture=picture,
                password_hash=None,
                discoverable=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            # Update existing user if needed
            if not user.google_id:
                user.google_id = google_id
            if not user.profile_picture and picture:
                user.profile_picture = picture
            db.commit()
            
        return TokenPair(access_token=create_access_token(user.id), refresh_token=create_refresh_token(user.id))
        
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google token")


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
