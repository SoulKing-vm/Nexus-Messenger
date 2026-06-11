import os
from pathlib import Path
from uuid import UUID

os.environ["DATABASE_URL"] = "sqlite:///./test_nexus.db"
Path("test_nexus.db").unlink(missing_ok=True)

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.core.encryption import decrypt_message
from app.db.models import Message
from app.db.session import SessionLocal
from app.main import app


client = TestClient(app)


def register(username: str) -> None:
    response = client.post(
        "/api/auth/register",
        json={"username": username, "password": "password123", "display_name": username.title()},
    )
    assert response.status_code in {201, 409}


def login(username: str) -> str:
    response = client.post("/api/auth/login", json={"username": username, "password": "password123"})
    assert response.status_code == 200
    return response.json()["access_token"]


def test_friend_chat_and_encrypted_message_flow():
    register("alice_dev")
    register("bob-dev")
    alice = login("alice_dev")
    bob = login("bob-dev")

    response = client.post("/api/friends/request", json={"username": "bob-dev"}, headers={"Authorization": f"Bearer {alice}"})
    assert response.status_code in {201, 409}

    response = client.post("/api/friends/accept", json={"username": "alice_dev"}, headers={"Authorization": f"Bearer {bob}"})
    assert response.status_code in {200, 409}

    response = client.post("/api/chats/create", json={"username": "bob-dev"}, headers={"Authorization": f"Bearer {alice}"})
    assert response.status_code == 200
    chat_id = response.json()["id"]

    response = client.post(
        "/api/messages/send",
        json={"chat_id": chat_id, "content": "Hello friend"},
        headers={"Authorization": f"Bearer {alice}"},
    )
    assert response.status_code == 200
    assert response.json()["content"] == "Hello friend"

    with SessionLocal() as db:
        message = db.scalar(select(Message).where(Message.conversation_id == UUID(chat_id)))
        assert message is not None
        assert message.encrypted_content != "Hello friend"
        assert decrypt_message(message.encrypted_content) == "Hello friend"
        db.add(
            Message(
                conversation_id=UUID(chat_id),
                sender_id=message.sender_id,
                encrypted_content="encrypted-with-an-old-local-key",
                status="sent",
            )
        )
        db.commit()

    response = client.get(f"/api/messages/{chat_id}", headers={"Authorization": f"Bearer {bob}"})
    assert response.status_code == 200
    contents = [message["content"] for message in response.json()]
    assert "Hello friend" in contents
    assert "[This older message cannot be decrypted with the current local key]" in contents
