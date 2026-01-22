"""
CSRF Protection Middleware
Implements Cross-Site Request Forgery protection using double-submit cookie pattern
"""

import secrets
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from app.core.config import get_settings

settings = get_settings()

# Methods that require CSRF protection (state-changing operations)
PROTECTED_METHODS = {"POST", "PUT", "PATCH", "DELETE"}

# Paths that are exempt from CSRF protection
EXEMPT_PATHS = {
    "/api/v1/auth/login",
    "/api/v1/auth/register",
    "/docs",
    "/openapi.json",
    "/health",
}


class CSRFMiddleware(BaseHTTPMiddleware):
    """
    CSRF protection using double-submit cookie pattern.

    How it works:
    1. Backend sets a CSRF token in a cookie (not httpOnly)
    2. Frontend reads cookie and includes token in X-CSRF-Token header
    3. Backend validates that cookie value matches header value
    """

    async def dispatch(self, request: Request, call_next):
        # Check if this request needs CSRF protection
        if self._should_protect(request):
            self._validate_csrf_token(request)

        # Process the request
        response: Response = await call_next(request)

        # Set CSRF token cookie if not present
        if "csrf_token" not in request.cookies:
            csrf_token = self._generate_token()
            response.set_cookie(
                key="csrf_token",
                value=csrf_token,
                httponly=False,  # Frontend needs to read this
                secure=True,
                samesite="strict",
                max_age=86400 * 7,  # 7 days
            )

        return response

    def _should_protect(self, request: Request) -> bool:
        """Check if request requires CSRF protection."""
        # Skip if not a state-changing method
        if request.method not in PROTECTED_METHODS:
            return False

        # Skip if path is exempt
        if request.url.path in EXEMPT_PATHS:
            return False

        # Skip health check endpoints
        if request.url.path.startswith("/health"):
            return False

        return True

    def _validate_csrf_token(self, request: Request) -> None:
        """Validate CSRF token from cookie and header."""
        cookie_token = request.cookies.get("csrf_token")
        header_token = request.headers.get("X-CSRF-Token")

        if not cookie_token or not header_token:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="CSRF token missing. Please refresh the page.",
            )

        if not secrets.compare_digest(cookie_token, header_token):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="CSRF token mismatch. Possible CSRF attack detected.",
            )

    @staticmethod
    def _generate_token() -> str:
        """Generate a secure random CSRF token."""
        return secrets.token_urlsafe(32)
