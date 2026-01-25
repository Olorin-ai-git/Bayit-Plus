"""
CSRF (Cross-Site Request Forgery) protection middleware
Protects state-changing endpoints from CSRF attacks
"""

import logging
import secrets
from typing import Optional

from fastapi import HTTPException, Request, status
from starlette.middleware.base import (BaseHTTPMiddleware,
                                       RequestResponseEndpoint)
from starlette.responses import Response

from app.core.config import settings

logger = logging.getLogger(__name__)


class CSRFProtectionMiddleware(BaseHTTPMiddleware):
    """
    CSRF protection middleware for state-changing HTTP methods.
    Validates CSRF tokens for POST, PUT, PATCH, DELETE requests.

    Uses dual-cookie approach:
    - csrf_token (httpOnly=True) - secure cookie, cannot be read by JavaScript
    - csrf_token_client (httpOnly=False) - readable by JavaScript client
    Both contain the same value. Client reads from csrf_token_client and sends in header.
    Server validates header matches csrf_token (the httpOnly one).
    """

    SAFE_METHODS = {"GET", "HEAD", "OPTIONS", "TRACE"}
    CSRF_HEADER_NAME = "X-CSRF-Token"
    CSRF_COOKIE_NAME = "csrf_token"  # HttpOnly cookie (secure)
    CSRF_CLIENT_COOKIE_NAME = "csrf_token_client"  # Non-HttpOnly (client-readable)
    EXEMPT_PATH_PREFIXES = [
        # Authentication endpoints (login creates session, can't have token yet)
        "/api/v1/auth/login",
        "/api/v1/auth/register",
        "/api/v1/auth/refresh",
        "/api/v1/auth/google/callback",  # OAuth callbacks use state parameter
        "/api/v1/auth/password-reset",  # Password reset endpoints
        "/api/v1/webauthn",  # WebAuthn endpoints
        # Admin endpoints (protected by JWT authentication)
        "/api/v1/admin",
        # User data endpoints (protected by JWT authentication)
        "/api/v1/history",
        "/api/v1/profiles",
        "/api/v1/users",
        # Content endpoints (protected by JWT authentication)
        "/api/v1/subtitles",
        "/api/v1/trivia",
        "/api/v1/widgets",
        "/api/v1/notifications",
        "/api/v1/search",  # Search endpoint (read-only, uses POST for complex filters)
        # WebSocket endpoints (use JWT via query params or headers)
        "/api/v1/ws/",
        "/ws/",
        # Live feature endpoints (protected by JWT and quota validation)
        "/api/v1/live-quota",
        "/api/v1/live-dubbing",
        # Proxy service endpoints (backend-only, no user authentication)
        "/api/v1/proxy/",
        "/proxy/",
        # Olorin platform endpoints (separate authentication system)
        "/api/v1/olorin",
        # Documentation and health
        "/docs",
        "/openapi.json",
        "/health",
        "/redoc",
    ]

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        """Process request and validate CSRF token if needed"""
        path = request.url.path

        # Skip CSRF check for WebSocket upgrade requests
        # WebSockets use different authentication (JWT in query params or headers)
        if self._is_websocket_request(request):
            logger.debug(f"Skipping CSRF check for WebSocket upgrade request: {path}")
            return await call_next(request)

        # Skip CSRF check for safe methods
        if request.method in self.SAFE_METHODS:
            response = await call_next(request)
            # Add CSRF token to response for safe methods
            if request.method == "GET":
                csrf_token = self._get_or_generate_csrf_token(request)
                # Set dual cookies for CSRF protection:
                # 1. HttpOnly cookie (secure, cannot be read by JavaScript)
                response.set_cookie(
                    key=self.CSRF_COOKIE_NAME,
                    value=csrf_token,
                    httponly=True,
                    secure=not settings.DEBUG,
                    samesite=(
                        "lax" if settings.DEBUG else "strict"
                    ),  # Lax for local dev (different ports)
                    max_age=3600 * 24,  # 24 hours
                )
                # 2. Client-readable cookie (non-HttpOnly, allows JavaScript access)
                response.set_cookie(
                    key=self.CSRF_CLIENT_COOKIE_NAME,
                    value=csrf_token,
                    httponly=False,  # Allows JavaScript to read for X-CSRF-Token header
                    secure=not settings.DEBUG,
                    samesite="lax" if settings.DEBUG else "strict",
                    max_age=3600 * 24,  # 24 hours
                )
            return response

        # Skip CSRF check for exempt paths
        if self._is_exempt_path(path):
            logger.debug(f"Skipping CSRF check for exempt path: {path}")
            return await call_next(request)

        # Validate CSRF token for state-changing methods
        if not self._validate_csrf_token(request):
            logger.warning(
                f"CSRF validation failed for {request.method} {path}",
                extra={
                    "method": request.method,
                    "path": path,
                    "has_header": self.CSRF_HEADER_NAME in request.headers,
                    "has_cookie": self.CSRF_COOKIE_NAME in request.cookies,
                },
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="CSRF token validation failed",
            )

        return await call_next(request)

    def _get_or_generate_csrf_token(self, request: Request) -> str:
        """Get existing CSRF token from cookie or generate new one"""
        csrf_token = request.cookies.get(self.CSRF_COOKIE_NAME)
        if not csrf_token:
            csrf_token = secrets.token_urlsafe(32)
        return csrf_token

    def _is_websocket_request(self, request: Request) -> bool:
        """Check if request is a WebSocket upgrade request"""
        # Check for WebSocket upgrade headers
        connection = request.headers.get("connection", "").lower()
        upgrade = request.headers.get("upgrade", "").lower()
        return "upgrade" in connection and upgrade == "websocket"

    def _is_exempt_path(self, path: str) -> bool:
        """Check if path is exempt from CSRF protection"""
        return any(path.startswith(prefix) for prefix in self.EXEMPT_PATH_PREFIXES)

    def _validate_csrf_token(self, request: Request) -> bool:
        """Validate CSRF token from header matches cookie"""
        # Get token from header
        header_token = request.headers.get(self.CSRF_HEADER_NAME)
        if not header_token:
            return False

        # Get token from cookie
        cookie_token = request.cookies.get(self.CSRF_COOKIE_NAME)
        if not cookie_token:
            return False

        # Compare tokens (constant-time comparison)
        return secrets.compare_digest(header_token, cookie_token)


def get_csrf_token(request: Request) -> Optional[str]:
    """Helper to get current CSRF token from request"""
    return request.cookies.get(CSRFProtectionMiddleware.CSRF_COOKIE_NAME)
