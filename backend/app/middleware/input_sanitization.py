"""
Input Sanitization Middleware
Protects against XSS, SQL injection, and other injection attacks.
"""

import html
import logging
import re
from typing import Callable

from fastapi import Request, Response
from starlette.datastructures import FormData, QueryParams
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)


class InputSanitizationMiddleware(BaseHTTPMiddleware):
    """
    Middleware to sanitize user input and prevent injection attacks.

    Features:
    - HTML escaping to prevent XSS
    - SQL injection pattern detection
    - Script tag detection and blocking
    - Dangerous character filtering
    - Configurable whitelist for trusted endpoints
    """

    # Patterns that indicate potential attacks
    DANGEROUS_PATTERNS = [
        r"<script[^>]*>.*?</script>",  # Script tags
        r"javascript:",  # JavaScript protocol
        r"on\w+\s*=",  # Event handlers (onclick, onload, etc.)
        r"<iframe[^>]*>",  # Iframes
        r"<object[^>]*>",  # Object tags
        r"<embed[^>]*>",  # Embed tags
        r"eval\s*\(",  # eval() calls
        r"expression\s*\(",  # CSS expressions
        # SQL injection patterns
        r"(\bUNION\b.*\bSELECT\b)|(\bSELECT\b.*\bFROM\b.*\bWHERE\b)",
        r"(\bDROP\b.*\bTABLE\b)|(\bDELETE\b.*\bFROM\b)",
        r"(\bINSERT\b.*\bINTO\b)|(\bUPDATE\b.*\bSET\b)",
        r"--\s*$",  # SQL comments
        r"/\*.*\*/",  # SQL block comments
    ]

    # Endpoints that should skip sanitization (e.g., content upload)
    WHITELIST_PATHS = [
        "/api/v1/admin/content",  # Admin content management
        "/api/v1/admin/uploads",  # File uploads
        "/docs",  # API documentation
        "/openapi.json",  # OpenAPI spec
    ]

    def __init__(self, app, enable_logging: bool = True):
        super().__init__(app)
        self.enable_logging = enable_logging
        self.compiled_patterns = [
            re.compile(pattern, re.IGNORECASE) for pattern in self.DANGEROUS_PATTERNS
        ]

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request and sanitize input."""

        # Skip whitelisted paths
        if any(request.url.path.startswith(path) for path in self.WHITELIST_PATHS):
            return await call_next(request)

        # Sanitize query parameters
        if request.query_params:
            sanitized_query = self._sanitize_dict(dict(request.query_params))
            if sanitized_query != dict(request.query_params):
                if self.enable_logging:
                    logger.warning(
                        f"Sanitized query params for {request.url.path} from IP: {request.client.host}"
                    )

        # Sanitize request body (for JSON and form data)
        if request.method in ["POST", "PUT", "PATCH"]:
            content_type = request.headers.get("content-type", "")

            if "application/json" in content_type:
                try:
                    body = await request.json()
                    sanitized_body = self._sanitize_dict(body)

                    # Check for dangerous patterns
                    if self._contains_dangerous_patterns(str(sanitized_body)):
                        logger.error(
                            f"Blocked request with dangerous patterns to {request.url.path} from IP: {request.client.host}"
                        )
                        from fastapi import HTTPException, status

                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Invalid input detected. Please remove any HTML or script content.",
                        )

                    # Log if sanitization occurred
                    if sanitized_body != body and self.enable_logging:
                        logger.warning(
                            f"Sanitized JSON body for {request.url.path} from IP: {request.client.host}"
                        )

                except Exception as e:
                    # If we can't parse JSON, let FastAPI handle it
                    if "Invalid input detected" not in str(e):
                        pass

        # Continue with request
        response = await call_next(request)
        return response

    def _sanitize_dict(self, data: dict) -> dict:
        """Recursively sanitize dictionary values."""
        sanitized = {}
        for key, value in data.items():
            if isinstance(value, str):
                sanitized[key] = self._sanitize_string(value)
            elif isinstance(value, dict):
                sanitized[key] = self._sanitize_dict(value)
            elif isinstance(value, list):
                sanitized[key] = [
                    (
                        self._sanitize_string(item)
                        if isinstance(item, str)
                        else (
                            self._sanitize_dict(item)
                            if isinstance(item, dict)
                            else item
                        )
                    )
                    for item in value
                ]
            else:
                sanitized[key] = value
        return sanitized

    def _sanitize_string(self, value: str) -> str:
        """
        Sanitize a string value.

        - HTML escape dangerous characters
        - Remove null bytes
        - Trim excessive whitespace
        """
        if not value:
            return value

        # Remove null bytes
        value = value.replace("\x00", "")

        # HTML escape to prevent XSS
        value = html.escape(value, quote=True)

        # Trim excessive whitespace
        value = " ".join(value.split())

        return value

    def _contains_dangerous_patterns(self, text: str) -> bool:
        """Check if text contains dangerous patterns."""
        for pattern in self.compiled_patterns:
            if pattern.search(text):
                return True
        return False
