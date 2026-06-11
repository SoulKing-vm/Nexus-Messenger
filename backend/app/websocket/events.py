from uuid import UUID

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.jwt import decode_token
from app.websocket.manager import manager

websocket_router = APIRouter()


@websocket_router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4401)
        return

    try:
        payload = decode_token(token)
        user_id = UUID(payload["sub"])
    except (KeyError, ValueError):
        await websocket.close(code=4401)
        return

    await manager.connect(websocket, user_id)
    await manager.send_user(user_id, {"event": "presence", "status": "online"})

    try:
        while True:
            data = await websocket.receive_json()
            event = data.get("event")
            if event == "join_chat":
                manager.join_chat(websocket, UUID(data["chat_id"]))
            elif event in {"typing", "stop_typing", "read", "message_received"}:
                chat_id = data.get("chat_id")
                if chat_id:
                    await manager.broadcast_chat(UUID(chat_id), data)
            elif event == "presence":
                await manager.send_user(user_id, {"event": "presence", "status": data.get("status", "online")})
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
