from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import current_user
from app.api.friends.routes import are_friends
from app.db.models import Conversation, ConversationMember, User
from app.db.session import get_db
from app.schemas.models import ChatCreateRequest, ChatPublic

router = APIRouter()


def chat_public(db: Session, conversation: Conversation) -> ChatPublic:
    member_ids = list(
        db.scalars(
            select(ConversationMember.user_id).where(ConversationMember.conversation_id == conversation.id)
        )
    )
    return ChatPublic(id=conversation.id, member_ids=member_ids, created_at=conversation.created_at)


def ensure_chat_member(db: Session, conversation_id: UUID, user_id: UUID) -> None:
    member = db.get(ConversationMember, {"conversation_id": conversation_id, "user_id": user_id})
    if not member:
        raise HTTPException(status_code=403, detail="Chat access denied")


@router.get("", response_model=list[ChatPublic])
def list_chats(db: Session = Depends(get_db), user: User = Depends(current_user)) -> list[ChatPublic]:
    conversations = db.scalars(
        select(Conversation)
        .join(ConversationMember, ConversationMember.conversation_id == Conversation.id)
        .where(ConversationMember.user_id == user.id)
        .order_by(Conversation.created_at.desc())
    ).all()
    return [chat_public(db, conversation) for conversation in conversations]


@router.post("/create", response_model=ChatPublic)
def create_chat(
    payload: ChatCreateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
) -> ChatPublic:
    friend = db.scalar(select(User).where(User.username == payload.username))
    if not friend:
        raise HTTPException(status_code=404, detail="User not found")
    if not are_friends(db, user.id, friend.id):
        raise HTTPException(status_code=403, detail="Messaging is allowed for friends only")

    existing = db.scalar(
        select(Conversation)
        .join(ConversationMember, ConversationMember.conversation_id == Conversation.id)
        .where(ConversationMember.user_id.in_([user.id, friend.id]))
        .group_by(Conversation.id)
        .having(func.count(ConversationMember.user_id) == 2)
    )
    if existing:
        return chat_public(db, existing)

    conversation = Conversation()
    db.add(conversation)
    db.flush()
    db.add_all(
        [
            ConversationMember(conversation_id=conversation.id, user_id=user.id),
            ConversationMember(conversation_id=conversation.id, user_id=friend.id),
        ]
    )
    db.commit()
    db.refresh(conversation)
    return chat_public(db, conversation)


@router.get("/{chat_id}", response_model=ChatPublic)
def get_chat(chat_id: UUID, db: Session = Depends(get_db), user: User = Depends(current_user)) -> ChatPublic:
    ensure_chat_member(db, chat_id, user.id)
    conversation = db.get(Conversation, chat_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Chat not found")
    return chat_public(db, conversation)
