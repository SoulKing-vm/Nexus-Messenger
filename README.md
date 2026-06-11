# Nexus Messenger

Nexus Messenger is an MVP chat platform inspired by Telegram and WhatsApp. It includes secure authentication, friends-only messaging, random discovery, encrypted message storage, and a WebSocket event path for real-time chat.

## Stack

- Frontend: Next.js 15, TypeScript, TailwindCSS, Zustand, TanStack Query
- Backend: FastAPI, Python 3.12, SQLAlchemy 2.0, Pydantic, JWT, Argon2, Fernet
- Data: PostgreSQL, Redis
- Infra: Docker Compose, Nginx, GitHub Actions

## Quick Start

1. Copy `.env.example` to `.env`.
2. Generate a Fernet key:

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

3. Start the stack:

```bash
docker compose up --build
```

Services:

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API docs: http://localhost:8000/docs

## Local Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The default local `DATABASE_URL` uses SQLite for convenience. Docker Compose uses PostgreSQL and Redis.

## Local Frontend

```bash
cd frontend
npm install
npm run dev
```

Set `NEXT_PUBLIC_API_URL=http://localhost:8000` when running outside Docker.
