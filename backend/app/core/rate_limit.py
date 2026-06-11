from collections import defaultdict, deque
from time import time

from fastapi import Request
from starlette.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware


class InMemoryRateLimitMiddleware(BaseHTTPMiddleware):
    limits = {
        ("POST", "/api/auth/login"): (5, 60),
        ("POST", "/api/auth/register"): (3, 60),
        ("GET", "/api/users/search"): (30, 60),
    }

    def __init__(self, app) -> None:
        super().__init__(app)
        self.hits: dict[str, deque[float]] = defaultdict(deque)

    async def dispatch(self, request: Request, call_next):
        rule = self.limits.get((request.method, request.url.path))
        if not rule:
            return await call_next(request)

        limit, window = rule
        key = f"{request.client.host if request.client else 'unknown'}:{request.method}:{request.url.path}"
        now = time()
        hits = self.hits[key]

        while hits and now - hits[0] > window:
            hits.popleft()

        if len(hits) >= limit:
            return JSONResponse({"detail": "Rate limit exceeded"}, status_code=429)

        hits.append(now)
        return await call_next(request)
