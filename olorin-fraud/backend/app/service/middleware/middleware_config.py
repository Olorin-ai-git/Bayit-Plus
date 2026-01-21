"""
Middleware configuration module for Olorin application.

This module handles all middleware setup including security headers, CORS,
rate limiting, and authentication middleware configuration.
"""

import os
from typing import Optional

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from app.service.logging import get_bridge_logger

from ..config import SvcSettings

logger = get_bridge_logger(__name__)


def configure_middleware(app: FastAPI, config: SvcSettings) -> None:
    """
    Configure all middleware for the Olorin application.

    Args:
        app: FastAPI application instance
        config: Service configuration settings
    """
    # CORS must be first to wrap all other middleware and ensure proper headers on all responses
    # including error responses from rate limiter
    _configure_cors_middleware(app)

    # Add transaction ID middleware
    _configure_transaction_id_middleware(app)

    # Add investigation ID middleware
    _configure_investigation_id_middleware(app)

    # Add rate limiting middleware
    _configure_rate_limiting(app)

    # Add log stream-specific rate limiting
    _configure_logstream_rate_limiting(app)

    # Add security middleware
    _configure_security_middleware(app)

    # Add production error handling middleware (wrapped by all above)
    _configure_error_middleware(app)


def _configure_security_middleware(app: FastAPI) -> None:
    """Configure security headers middleware."""
    from app.security.auth import SecurityHeaders

    @app.middleware("http")
    async def add_security_headers(request: Request, call_next):
        response = await call_next(request)
        headers = SecurityHeaders.get_headers()
        for key, value in headers.items():
            response.headers[key] = value
        return response


def _configure_rate_limiting(app: FastAPI) -> None:
    """Configure rate limiting middleware with environment-specific settings."""
    from app.middleware.rate_limiter import RateLimitMiddleware

    environment = os.getenv("APP_ENV", "local")

    # Development: More lenient rate limits for faster iteration
    # Production: Stricter limits for security
    if environment == "prd":
        # Production: 100 requests per 60 seconds (more restrictive)
        calls = int(os.getenv("RATE_LIMIT_CALLS", "100"))
        period = int(os.getenv("RATE_LIMIT_PERIOD", "60"))
    else:
        # Development/Staging: 500 requests per 60 seconds (very lenient)
        calls = int(os.getenv("RATE_LIMIT_CALLS", "500"))
        period = int(os.getenv("RATE_LIMIT_PERIOD", "60"))

    app.add_middleware(RateLimitMiddleware, calls=calls, period=period)
    logger.info(
        f"Rate limiting configured for {environment}: {calls} requests per {period} seconds"
    )


def _configure_cors_middleware(app: FastAPI) -> None:
    """Configure CORS middleware with environment-specific security."""
    environment = os.getenv("APP_ENV", "local")
    is_production = environment in ["prd", "production", "prod"]

    # Environment-specific CORS configuration
    if is_production:
        # Production: Use only environment-specified origins, no fallback
        allowed_origins_str = os.getenv("ALLOWED_ORIGINS")
        if not allowed_origins_str:
            logger.error(
                "ALLOWED_ORIGINS not set in production - CORS will deny all requests"
            )
            allowed_origins = []
        else:
            allowed_origins = [
                origin.strip() for origin in allowed_origins_str.split(",")
            ]
        allow_credentials = False  # Disable credentials in production for security
    else:
        # Development/staging: Allow localhost origins for development (all microservice ports)
        # Include common frontend ports and allow any localhost port for flexibility
        default_origins = [
            "http://localhost:3000",
            "http://localhost:3001",
            "http://localhost:3002",
            "http://localhost:3003",
            "http://localhost:3004",
            "http://localhost:3005",
            "http://localhost:3006",
            "http://localhost:3007",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:3001",
            "http://127.0.0.1:3002",
            "http://127.0.0.1:3003",
            "http://127.0.0.1:3004",
            "http://127.0.0.1:3005",
            "http://127.0.0.1:3006",
            "http://127.0.0.1:3007",
        ]
        allowed_origins_str = os.getenv("ALLOWED_ORIGINS", ",".join(default_origins))
        allowed_origins = [
            origin.strip()
            for origin in allowed_origins_str.split(",")
            if origin.strip()
        ]
        allow_credentials = True  # Allow credentials in development

    # Security validation: reject wildcard origins if credentials are enabled
    if allow_credentials and "*" in allowed_origins:
        logger.error(
            "SECURITY RISK: Cannot use wildcard origins with credentials enabled"
        )
        allowed_origins = [origin for origin in allowed_origins if origin != "*"]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=allow_credentials,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        allow_headers=[
            "Authorization",
            "Content-Type",
            "Accept",
            "X-Requested-With",
            "Cache-Control",
            "Pragma",
            "If-None-Match",  # ETag header for conditional requests
            "X-User-ID",  # Custom header used by the application
            "olorin_originatingip",  # Custom header for IP tracking
            "olorin_tid",  # Custom header for transaction ID
            "X-Request-ID",  # Additional request ID header
            "X-Investigation-Id",  # Investigation correlation ID for log streaming
            "Origin",  # Origin header for CORS
            "Access-Control-Request-Method",  # CORS preflight
            "Access-Control-Request-Headers",  # CORS preflight
        ],
        expose_headers=[
            "X-Request-ID",
            "olorin_tid",
            "X-Investigation-Id",
            "Content-Range",
            "X-Total-Count",
        ],
        max_age=600,  # Cache preflight requests for 10 minutes
    )

    logger.info(
        f"CORS configured for {environment} environment (production={is_production}) with {len(allowed_origins)} allowed origins"
    )
    if not is_production and len(allowed_origins) > 0:
        logger.debug(
            f"CORS allowed origins: {allowed_origins[:5]}{'...' if len(allowed_origins) > 5 else ''}"
        )


def _configure_error_middleware(app: FastAPI) -> None:
    """Configure production error handling middleware."""
    from app.middleware.production_error_middleware import ProductionErrorMiddleware

    # Add error handling middleware (must be first middleware)
    environment = os.getenv("APP_ENV", "local")
    app.add_middleware(ProductionErrorMiddleware, environment=environment)

    logger.info(
        f"Production error middleware configured for environment: {environment}"
    )


def _configure_transaction_id_middleware(app: FastAPI) -> None:
    """Configure Olorin transaction ID middleware."""
    # Import here to avoid circular dependency
    from .. import inject_transaction_id

    app.add_middleware(BaseHTTPMiddleware, dispatch=inject_transaction_id)


def _configure_investigation_id_middleware(app: FastAPI) -> None:
    """Configure investigation ID correlation middleware."""
    from .investigation_id_middleware import inject_investigation_id

    app.add_middleware(BaseHTTPMiddleware, dispatch=inject_investigation_id)
    logger.info("Investigation ID middleware configured for log stream correlation")


def _configure_logstream_rate_limiting(app: FastAPI) -> None:
    """Configure log stream-specific rate limiting."""
    from app.middleware.logstream_rate_limiter import configure_logstream_rate_limiting

    configure_logstream_rate_limiting(app)
