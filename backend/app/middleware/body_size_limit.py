"""Global request body size limiter.

Rejects requests whose Content-Length exceeds the configured max
BEFORE reading the body into memory. Upload routes that handle
their own validation are exempt.
"""

import logging

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

logger = logging.getLogger(__name__)

_EXEMPT_PREFIXES = (
    "/api/v1/training/content/portraits/",
    "/api/v1/olorin/dubbing/voice-training/",
    "/api/v1/subscriptions/webhook",
    "/api/v1/training/checkout/webhook",
)


class BodySizeLimitMiddleware(BaseHTTPMiddleware):
    """Reject requests with Content-Length exceeding max_bytes."""

    def __init__(self, app, *, max_bytes: int):
        super().__init__(app)
        self.max_bytes = max_bytes

    async def dispatch(self, request: Request, call_next):
        if request.method in ("POST", "PUT", "PATCH"):
            path = request.url.path
            if not any(path.startswith(p) for p in _EXEMPT_PREFIXES):
                cl = request.headers.get("content-length")
                if cl and int(cl) > self.max_bytes:
                    logger.warning(
                        "Request body too large",
                        extra={
                            "path": path,
                            "content_length": cl,
                            "max_bytes": self.max_bytes,
                        },
                    )
                    return JSONResponse(
                        status_code=413,
                        content={
                            "detail": f"Request body too large (max {self.max_bytes} bytes)",
                        },
                    )
        return await call_next(request)
