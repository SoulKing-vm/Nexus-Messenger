from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from app.api.router import api_router
from app.core.config import settings
from app.core.rate_limit import InMemoryRateLimitMiddleware
from app.db.session import Base, engine
from app.websocket.events import websocket_router
from sqlalchemy import text
import logging

try:
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE users ADD COLUMN email VARCHAR(255)"))
        conn.execute(text("ALTER TABLE users ADD COLUMN google_id VARCHAR(255)"))
        logging.info("Successfully added email and google_id columns to users table")
except Exception as e:
    logging.info(f"Migration columns likely already exist (or error): {e}")

try:
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE users ADD CONSTRAINT uq_users_email UNIQUE (email)"))
        conn.execute(text("ALTER TABLE users ADD CONSTRAINT uq_users_google_id UNIQUE (google_id)"))
except Exception:
    pass

try:
    with engine.begin() as conn:
        # PostgreSQL syntax to make column nullable
        conn.execute(text("ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL"))
        logging.info("Successfully dropped NOT NULL constraint on password_hash")
except Exception as e:
    logging.info(f"Could not drop NOT NULL on password_hash (might be sqlite or already dropped): {e}")

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Nexus Messenger API", version="1.0.0")

app.add_middleware(InMemoryRateLimitMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")
app.include_router(websocket_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/", include_in_schema=False)
def web_ui() -> FileResponse:
    return FileResponse(Path(__file__).parent / "static" / "index.html")
