"""
CSRF (Cross-Site Request Forgery) protection middleware
"""

import hashlib
import hmac
import os
import secrets
import time
from typing import Optional

from fastapi import HTTPException, Request, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response


class CSRFProtection:
    """CSRF token management."""

    def __init__(self, secret_key: Optional[str] = None):
        self.secret_key = secret_key or os.getenv(
            "CSRF_SECRET_KEY", secrets.token_urlsafe(32)
        )
        self.token_timeout = 3600  # 1 hour

    def generate_token(self, session_id: str) -> str:
        """Generate a CSRF token for a session."""
        timestamp = str(int(time.time()))
        data = f"{session_id}:{timestamp}"
        signature = hmac.new(
            self.secret_key.encode(), data.encode(), hashlib.sha256
        ).hexdigest()
        token = f"{data}:{signature}"
        return token

    def verify_token(self, token: str, session_id: str) -> bool:
        """Verify a CSRF token."""
        try:
            parts = token.split(":")
            if len(parts) != 3:
                return False

            token_session_id, timestamp, signature = parts

            # Verify session ID matches
            if token_session_id != session_id:
                return False

            # Verify timestamp is not too old
            token_time = int(timestamp)
            current_time = int(time.time())
            if current_time - token_time > self.token_timeout:
                return False

            # Verify signature
            data = f"{token_session_id}:{timestamp}"
            expected_signature = hmac.new(
                self.secret_key.encode(), data.encode(), hashlib.sha256
            ).hexdigest()

            return hmac.compare_digest(signature, expected_signature)

        except (ValueError, IndexError):
            return False


class CSRFMiddleware(BaseHTTPMiddleware):
    """CSRF protection middleware."""

    def __init__(self, app, secret_key: Optional[str] = None):
        super().__init__(app)
        self.csrf = CSRFProtection(secret_key)

        # Methods that require CSRF protection
        self.protected_methods = {"POST", "PUT", "PATCH", "DELETE"}

        # Paths that don't require CSRF protection
        self.exempt_paths = {
            "/auth/login",
            "/auth/login-json",
            "/health",
            "/docs",
            "/redoc",
            "/openapi.json",
        }

    def get_session_id(self, request: Request) -> str:
        """Get or create a session ID for the request."""
        # Try to get session ID from headers or cookies
        session_id = request.headers.get("X-Session-ID")
        if not session_id:
            # Try to get from cookies
            session_id = request.cookies.get("session_id")

        if not session_id:
            # Generate a new session ID
            session_id = secrets.token_urlsafe(32)

        return session_id

    def should_protect(self, request: Request) -> bool:
        """Determine if the request should be protected."""
        # Skip if method is not in protected methods
        if request.method not in self.protected_methods:
            return False

        # Skip if path is exempt
        if request.url.path in self.exempt_paths:
            return False

        # Skip if path starts with exempt prefixes
        exempt_prefixes = ["/auth/", "/health"]
        for prefix in exempt_prefixes:
            if request.url.path.startswith(prefix):
                return False

        return True

    async def dispatch(self, request: Request, call_next) -> Response:
        """Process request with CSRF protection."""
        session_id = self.get_session_id(request)

        # Check if this request needs CSRF protection
        if self.should_protect(request):
            csrf_token = request.headers.get("X-CSRF-Token")

            if not csrf_token:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN, detail="CSRF token missing"
                )

            if not self.csrf.verify_token(csrf_token, session_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN, detail="Invalid CSRF token"
                )

        # Process the request
        response = await call_next(request)

        # Add session ID to response if it was generated
        if not request.cookies.get("session_id"):
            response.set_cookie(
                key="session_id",
                value=session_id,
                httponly=True,
                secure=True,  # Only send over HTTPS
                samesite="strict",
                max_age=3600,  # 1 hour
            )

        # Add CSRF token to response headers for client use
        if request.method == "GET" and not request.url.path.startswith("/api/"):
            csrf_token = self.csrf.generate_token(session_id)
            response.headers["X-CSRF-Token"] = csrf_token

        return response


def create_csrf_middleware(secret_key: Optional[str] = None) -> CSRFMiddleware:
    """Factory function to create CSRF middleware."""
    return lambda app: CSRFMiddleware(app, secret_key)
