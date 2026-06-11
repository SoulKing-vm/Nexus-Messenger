from uuid import UUID

from cryptography.fernet import InvalidToken
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.chats.routes import ensure_chat_member
from app.api.deps import current_user
from app.core.encryption import decrypt_message, encrypt_message
from app.db.models import Message, User
from app.db.session import get_db
from app.schemas.models import MessagePublic, MessageSendRequest
from app.websocket.manager import manager

router = APIRouter()


def serialize_message(message: Message) -> MessagePublic:
    try:
        content = decrypt_message(message.encrypted_content)
    except InvalidToken:
        content = "[This older message cannot be decrypted with the current local key]"

    return MessagePublic(
        id=message.id,
        conversation_id=message.conversation_id,
        sender_id=message.sender_id,
        content=content,
        status=message.status,
        created_at=message.created_at,
    )


@router.get("/{chat_id}", response_model=list[MessagePublic])
def history(
    chat_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
) -> list[MessagePublic]:
    ensure_chat_member(db, chat_id, user.id)
    messages = db.scalars(
        select(Message).where(Message.conversation_id == chat_id).order_by(Message.created_at.asc()).limit(100)
    ).all()
    return [serialize_message(message) for message in messages]


@router.post("/send", response_model=MessagePublic)
async def send_message(
    payload: MessageSendRequest,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
) -> MessagePublic:
    ensure_chat_member(db, payload.chat_id, user.id)
    message = Message(
        conversation_id=payload.chat_id,
        sender_id=user.id,
        encrypted_content=encrypt_message(payload.content),
        status="sent",
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    public_message = serialize_message(message)
    await manager.broadcast_chat(
        payload.chat_id,
        {
            "event": "message_sent",
            "chat_id": str(payload.chat_id),
            "message_id": str(message.id),
            "sender_id": str(user.id),
        },
    )
    return public_message


@router.post("/{message_id}/read")
def mark_read(message_id: UUID, db: Session = Depends(get_db), user: User = Depends(current_user)) -> dict[str, str]:
    message = db.get(Message, message_id)
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    ensure_chat_member(db, message.conversation_id, user.id)
    message.status = "read"
    db.commit()
    return {"status": "read"}


@router.delete("/{message_id}")
async def delete_message(message_id: UUID, db: Session = Depends(get_db), user: User = Depends(current_user)) -> dict[str, str]:
    message = db.get(Message, message_id)
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    ensure_chat_member(db, message.conversation_id, user.id)
    db.delete(message)
    db.commit()
    return {"status": "deleted"}


@router.delete("/history/{chat_id}")
async def clear_history(chat_id: UUID, db: Session = Depends(get_db), user: User = Depends(current_user)) -> dict[str, str]:
    ensure_chat_member(db, chat_id, user.id)
    messages = db.scalars(select(Message).where(Message.conversation_id == chat_id)).all()
    for message in messages:
        db.delete(message)
    db.commit()
    return {"status": "cleared"}
