from collections import defaultdict
from uuid import UUID

from fastapi import WebSocket, WebSocketDisconnect


class ConnectionManager:
    def __init__(self) -> None:
        self.user_connections: dict[UUID, set[WebSocket]] = defaultdict(set)
        self.chat_connections: dict[UUID, set[WebSocket]] = defaultdict(set)

    async def connect(self, websocket: WebSocket, user_id: UUID) -> None:
        await websocket.accept()
        self.user_connections[user_id].add(websocket)

    def disconnect(self, websocket: WebSocket, user_id: UUID) -> None:
        self.user_connections[user_id].discard(websocket)
        for connections in self.chat_connections.values():
            connections.discard(websocket)

    def join_chat(self, websocket: WebSocket, chat_id: UUID) -> None:
        self.chat_connections[chat_id].add(websocket)

    async def send_user(self, user_id: UUID, payload: dict) -> None:
        for websocket in list(self.user_connections[user_id]):
            try:
                await websocket.send_json(payload)
            except (RuntimeError, WebSocketDisconnect):
                self.user_connections[user_id].discard(websocket)

    async def broadcast_chat(self, chat_id: UUID, payload: dict) -> None:
        for websocket in list(self.chat_connections[chat_id]):
            try:
                await websocket.send_json(payload)
            except (RuntimeError, WebSocketDisconnect):
                self.chat_connections[chat_id].discard(websocket)


manager = ConnectionManager()
