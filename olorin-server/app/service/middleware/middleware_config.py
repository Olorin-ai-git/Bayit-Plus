"""
Middleware configuration module for Olorin application.

This module handles all middleware setup including security headers, CORS,
rate limiting, and authentication middleware configuration.
"""

import logging
import os
from typing import Optional

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from ..config import SvcSettings

logger = logging.getLogger(__name__)


def configure_middleware(app: FastAPI, config: SvcSettings) -> None:
    """
    Configure all middleware for the Olorin application.
    
    Args:
        app: FastAPI application instance
        config: Service configuration settings
    """
    # Add security middleware
    _configure_security_middleware(app)
    
    # Add rate limiting middleware  
    _configure_rate_limiting(app)
    
    # Add CORS middleware
    _configure_cors_middleware(app)
    
    # Add transaction ID middleware
    _configure_transaction_id_middleware(app)


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
    """Configure rate limiting middleware."""
    from app.middleware.rate_limiter import RateLimitMiddleware
    
    # Add rate limiting middleware with default limits
    app.add_middleware(RateLimitMiddleware, calls=60, period=60)


def _configure_cors_middleware(app: FastAPI) -> None:
    """Configure CORS middleware with restricted origins."""
    # Get allowed origins from environment with fallback
    allowed_origins = os.getenv(
        "ALLOWED_ORIGINS", "http://localhost:3000,https://localhost:3000"
    ).split(",")
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,  # Restrict to specific origins
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Requested-With"],
    )
    
    logger.info(f"CORS configured with allowed origins: {allowed_origins}")


def _configure_transaction_id_middleware(app: FastAPI) -> None:
    """Configure Olorin transaction ID middleware."""
    # Import here to avoid circular dependency
    from .. import inject_transaction_id
    
    app.add_middleware(BaseHTTPMiddleware, dispatch=inject_transaction_id)