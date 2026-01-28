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

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Middleware to add security headers to all responses.

    Applied to all routes automatically via FastAPI middleware registration.
    Headers are based on OWASP security best practices.
    """

    async def dispatch(self, request: Request, call_next):
        """
        Add security headers to response.

        Args:
            request: FastAPI request object
            call_next: Next middleware in chain

        Returns:
            Response with security headers added
        """
        response: Response = await call_next(request)

        # Content Security Policy (CSP)
        # Restricts resource loading to prevent XSS
        # Note: Chrome Extension popup pages may need 'unsafe-inline' for inline styles
        # Extension pages loaded via chrome-extension:// protocol are not affected by CSP
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self'; "
            "style-src 'self' 'unsafe-inline'; "  # Allow inline styles for Glass UI
            "img-src 'self' data: https:; "
            "font-src 'self' data:; "
            "connect-src 'self' https://api.stripe.com wss://api.bayit.tv; "
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
        # includeSubDomains: Apply to all subdomains
        # preload: Allow inclusion in browser HSTS preload lists
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains; preload"
        )

        # Control referrer information (privacy)
        # strict-origin-when-cross-origin: Send full URL for same-origin, only origin for cross-origin
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
        response.headers.pop("Server", None)  # Hide server information
        response.headers.pop("X-Powered-By", None)  # Hide framework

        return response
