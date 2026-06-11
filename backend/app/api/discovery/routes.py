from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import current_user
from app.db.models import User
from app.db.session import get_db
from app.schemas.models import UserPublic

router = APIRouter()


@router.get("/random", response_model=list[UserPublic])
def random_users(
    limit: int = Query(default=10, ge=1, le=30),
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
) -> list[User]:
    return list(
        db.scalars(
            select(User)
            .where(User.discoverable.is_(True), User.id != user.id)
            .order_by(func.random())
            .limit(limit)
        )
    )
