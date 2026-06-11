from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import current_user
from app.db.models import User
from app.db.session import get_db
from app.schemas.models import ProfileUpdate, UserPublic

router = APIRouter()


@router.get("/me", response_model=UserPublic)
def me(user: User = Depends(current_user)) -> User:
    return user


@router.patch("/me", response_model=UserPublic)
def update_me(
    payload: ProfileUpdate,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> User:
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/search", response_model=list[UserPublic])
def search_users(
    q: str = Query(min_length=1, max_length=30),
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
) -> list[User]:
    return list(
        db.scalars(
            select(User)
            .where(User.username.ilike(f"%{q}%"))
            .where(User.id != user.id)
            .order_by(User.username)
            .limit(30)
        )
    )


@router.get("/profile/{username}", response_model=UserPublic)
def profile(username: str, db: Session = Depends(get_db), _: User = Depends(current_user)) -> User:
    user = db.scalar(select(User).where(User.username == username))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
