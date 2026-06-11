from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from app.api.router import api_router
from app.core.config import settings
from app.core.rate_limit import InMemoryRateLimitMiddleware
from app.db.session import Base, engine
from app.websocket.events import websocket_router

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
