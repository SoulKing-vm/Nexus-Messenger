from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=30)
    password: str = Field(min_length=8)
    display_name: str | None = Field(default=None, max_length=100)


class LoginRequest(BaseModel):
    username: str
    password: str


class GoogleLoginRequest(BaseModel):
    credential: str


class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    username: str
    display_name: str
    profile_picture: str | None = None
    bio: str | None = None
    discoverable: bool
    created_at: datetime


class ProfileUpdate(BaseModel):
    display_name: str | None = Field(default=None, max_length=100)
    profile_picture: str | None = None
    bio: str | None = Field(default=None, max_length=500)
    discoverable: bool | None = None


class UsernameRequest(BaseModel):
    username: str


class ChatCreateRequest(BaseModel):
    username: str


class ChatPublic(BaseModel):
    id: UUID
    member_ids: list[UUID]
    created_at: datetime


class MessageSendRequest(BaseModel):
    chat_id: UUID
    content: str = Field(min_length=1, max_length=7000000)


class MessagePublic(BaseModel):
    id: UUID
    conversation_id: UUID
    sender_id: UUID
    content: str
    status: str
    created_at: datetime
