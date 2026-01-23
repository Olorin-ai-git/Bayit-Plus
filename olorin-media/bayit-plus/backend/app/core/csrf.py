"""
CSRF (Cross-Site Request Forgery) protection middleware
Protects state-changing endpoints from CSRF attacks
"""

import secrets
from typing import Optional

from fastapi import HTTPException, Request, status
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response

from app.core.config import settings


class CSRFProtectionMiddleware(BaseHTTPMiddleware):
    """
    CSRF protection middleware for state-changing HTTP methods.
    Validates CSRF tokens for POST, PUT, PATCH, DELETE requests.
    """

    SAFE_METHODS = {"GET", "HEAD", "OPTIONS", "TRACE"}
    CSRF_HEADER_NAME = "X-CSRF-Token"
    CSRF_COOKIE_NAME = "csrf_token"
    EXEMPT_PATHS = {
        "/api/v1/auth/login",
        "/api/v1/auth/register",
        "/api/v1/auth/refresh",
        "/api/v1/auth/google/callback",  # OAuth callbacks use state parameter for CSRF protection
        "/docs",
        "/openapi.json",
        "/health",
    }

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        """Process request and validate CSRF token if needed"""
        # Skip CSRF check for safe methods
        if request.method in self.SAFE_METHODS:
            response = await call_next(request)
            # Add CSRF token to response for safe methods
            if request.method == "GET":
                csrf_token = self._get_or_generate_csrf_token(request)
                response.set_cookie(
                    key=self.CSRF_COOKIE_NAME,
                    value=csrf_token,
                    httponly=True,
                    secure=not settings.DEBUG,
                    samesite="strict",
                    max_age=3600 * 24,  # 24 hours
                )
            return response

        # Skip CSRF check for exempt paths
        path = request.url.path
        if any(path.startswith(exempt) for exempt in self.EXEMPT_PATHS):
            return await call_next(request)

        # Validate CSRF token for state-changing methods
        if not self._validate_csrf_token(request):
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
