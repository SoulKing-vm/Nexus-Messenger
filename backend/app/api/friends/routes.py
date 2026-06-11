from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session

from app.api.deps import current_user
from app.db.models import FriendRequest, Friendship, User
from app.db.session import get_db
from app.schemas.models import UserPublic, UsernameRequest

router = APIRouter()


def friendship_pair(left: UUID, right: UUID) -> tuple[UUID, UUID]:
    return tuple(sorted((left, right), key=str))


def are_friends(db: Session, left: UUID, right: UUID) -> bool:
    user1, user2 = friendship_pair(left, right)
    return db.scalar(select(Friendship).where(Friendship.user1_id == user1, Friendship.user2_id == user2)) is not None


@router.post("/request", status_code=status.HTTP_201_CREATED)
def send_request(
    payload: UsernameRequest,
    db: Session = Depends(get_db),
    sender: User = Depends(current_user),
) -> dict[str, str]:
    receiver = db.scalar(select(User).where(User.username == payload.username))
    if not receiver:
        raise HTTPException(status_code=404, detail="User not found")
    if receiver.id == sender.id:
        raise HTTPException(status_code=400, detail="Cannot friend yourself")
    if are_friends(db, sender.id, receiver.id):
        raise HTTPException(status_code=409, detail="Already friends")

    existing = db.scalar(
        select(FriendRequest).where(
            FriendRequest.status == "pending",
            or_(
                and_(FriendRequest.sender_id == sender.id, FriendRequest.receiver_id == receiver.id),
                and_(FriendRequest.sender_id == receiver.id, FriendRequest.receiver_id == sender.id),
            ),
        )
    )
    if existing:
        raise HTTPException(status_code=409, detail="Friend request already pending")

    db.add(FriendRequest(sender_id=sender.id, receiver_id=receiver.id))
    db.commit()
    return {"status": "pending"}


@router.post("/accept")
def accept_request(
    payload: UsernameRequest,
    db: Session = Depends(get_db),
    receiver: User = Depends(current_user),
) -> dict[str, str]:
    sender = db.scalar(select(User).where(User.username == payload.username))
    if not sender:
        raise HTTPException(status_code=404, detail="User not found")

    request = db.scalar(
        select(FriendRequest).where(
            FriendRequest.sender_id == sender.id,
            FriendRequest.receiver_id == receiver.id,
            FriendRequest.status == "pending",
        )
    )
    if not request:
        raise HTTPException(status_code=404, detail="Pending request not found")

    request.status = "accepted"
    user1, user2 = friendship_pair(sender.id, receiver.id)
    db.add(Friendship(user1_id=user1, user2_id=user2))
    db.commit()
    return {"status": "accepted"}


@router.post("/reject")
def reject_request(
    payload: UsernameRequest,
    db: Session = Depends(get_db),
    receiver: User = Depends(current_user),
) -> dict[str, str]:
    sender = db.scalar(select(User).where(User.username == payload.username))
    if not sender:
        raise HTTPException(status_code=404, detail="User not found")
    request = db.scalar(
        select(FriendRequest).where(
            FriendRequest.sender_id == sender.id,
            FriendRequest.receiver_id == receiver.id,
            FriendRequest.status == "pending",
        )
    )
    if not request:
        raise HTTPException(status_code=404, detail="Pending request not found")
    request.status = "rejected"
    db.commit()
    return {"status": "rejected"}


@router.post("/cancel")
def cancel_request(
    payload: UsernameRequest,
    db: Session = Depends(get_db),
    sender: User = Depends(current_user),
) -> dict[str, str]:
    receiver = db.scalar(select(User).where(User.username == payload.username))
    if not receiver:
        raise HTTPException(status_code=404, detail="User not found")
    request = db.scalar(
        select(FriendRequest).where(
            FriendRequest.sender_id == sender.id,
            FriendRequest.receiver_id == receiver.id,
            FriendRequest.status == "pending",
        )
    )
    if not request:
        raise HTTPException(status_code=404, detail="Pending request not found")
    request.status = "cancelled"
    db.commit()
    return {"status": "cancelled"}


@router.delete("/remove")
def remove_friend(
    payload: UsernameRequest,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
) -> dict[str, bool]:
    friend = db.scalar(select(User).where(User.username == payload.username))
    if not friend:
        raise HTTPException(status_code=404, detail="User not found")
    user1, user2 = friendship_pair(user.id, friend.id)
    friendship = db.scalar(select(Friendship).where(Friendship.user1_id == user1, Friendship.user2_id == user2))
    if friendship:
        db.delete(friendship)
        db.commit()
    return {"ok": True}


@router.get("/list", response_model=list[UserPublic])
def list_friends(db: Session = Depends(get_db), user: User = Depends(current_user)) -> list[User]:
    friendships = db.scalars(
        select(Friendship).where(or_(Friendship.user1_id == user.id, Friendship.user2_id == user.id))
    ).all()
    friend_ids = [f.user2_id if f.user1_id == user.id else f.user1_id for f in friendships]
    if not friend_ids:
        return []
    return list(db.scalars(select(User).where(User.id.in_(friend_ids)).order_by(User.username)))


@router.get("/requests")
def list_requests(db: Session = Depends(get_db), user: User = Depends(current_user)) -> dict[str, list[dict]]:
    incoming = db.execute(
        select(FriendRequest, User)
        .join(User, User.id == FriendRequest.sender_id)
        .where(FriendRequest.receiver_id == user.id, FriendRequest.status == "pending")
    ).all()
    outgoing = db.execute(
        select(FriendRequest, User)
        .join(User, User.id == FriendRequest.receiver_id)
        .where(FriendRequest.sender_id == user.id, FriendRequest.status == "pending")
    ).all()
    return {
        "incoming": [{"id": str(req.id), "user": UserPublic.model_validate(other)} for req, other in incoming],
        "outgoing": [{"id": str(req.id), "user": UserPublic.model_validate(other)} for req, other in outgoing],
    }
