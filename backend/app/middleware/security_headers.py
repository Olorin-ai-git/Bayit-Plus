"""
Security Headers Middleware

Adds security headers to all responses to protect against common vulnerabilities:
- Content-Security-Policy (CSP): Prevents XSS attacks
- X-Content-Type-Options: Prevents MIME type sniffing
- X-Frame-Options: Prevents clickjacking
- X-XSS-Protection: Enables browser XSS filters
- Strict-Transport-Security (HSTS): Enforces HTTPS
- Referrer-Policy: Controls referrer information
- Permissions-Policy: Restricts browser features
"""

import logging
import os

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)

# CSP connect-src domains loaded from env (comma-separated) or sensible defaults.
# This covers every frontend, CDN, auth provider, and payment service that
# browsers need to reach from pages served by this API.
_CSP_CONNECT_SRC_ENV = os.getenv("CSP_CONNECT_SRC_EXTRA", "")

_CSP_CONNECT_SRC_DEFAULTS = [
    "'self'",
    # Olorin API endpoints
    "https://api.olorin.ai",
    "https://api.bayit.tv",
    # WebSocket endpoints
    "wss://api.olorin.ai",
    "wss://api.bayit.tv",
    "wss://ws.bayit.tv",
    "wss://m.bayit.tv",
    # CDN
    "https://cdn.bayit.tv",
    "https://storage.googleapis.com",
    # Stripe
    "https://api.stripe.com",
    # Firebase / Google Auth
    "https://www.googleapis.com",
    "https://securetoken.googleapis.com",
    "https://identitytoolkit.googleapis.com",
    "https://oauth2.googleapis.com",
    "https://apis.google.com",
    "https://*.firebaseio.com",
    # Apple Auth
    "https://appleid.apple.com",
    # ElevenLabs (TTS streaming)
    "https://api.elevenlabs.io",
]

_extra = [s.strip() for s in _CSP_CONNECT_SRC_ENV.split(",") if s.strip()]
_CSP_CONNECT_SRC = " ".join(_CSP_CONNECT_SRC_DEFAULTS + _extra)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Middleware to add security headers to all responses.

    Applied to all routes automatically via FastAPI middleware registration.
    Headers are based on OWASP security best practices.
    """

    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)

        # Content Security Policy (CSP)
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self' data:; "
            "media-src 'self' https: blob:; "
            f"connect-src {_CSP_CONNECT_SRC}; "
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self'"
        )

        # Prevent MIME type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"

        # Prevent clickjacking (deny all framing)
        response.headers["X-Frame-Options"] = "DENY"

        # Enable browser XSS protection (legacy, but still useful)
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # Enforce HTTPS (max-age = 1 year)
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains; preload"
        )

        # Control referrer information (privacy)
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Restrict browser features (permissions)
        response.headers["Permissions-Policy"] = (
            "geolocation=(), "
            "microphone=(), "
            "camera=(), "
            "payment=(), "
            "usb=(), "
            "magnetometer=(), "
            "gyroscope=(), "
            "accelerometer=()"
        )

        # Remove potentially sensitive headers
        if "Server" in response.headers:
            del response.headers["Server"]
        if "X-Powered-By" in response.headers:
            del response.headers["X-Powered-By"]

        return response
