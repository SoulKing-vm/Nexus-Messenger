from fastapi import APIRouter

from app.api import auth, chats, discovery, friends, messages, users

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(friends.router, prefix="/friends", tags=["friends"])
api_router.include_router(discovery.router, prefix="/discovery", tags=["discovery"])
api_router.include_router(chats.router, prefix="/chats", tags=["chats"])
api_router.include_router(messages.router, prefix="/messages", tags=["messages"])
