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

from ..config import SvcSettings
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def configure_middleware(app: FastAPI, config: SvcSettings) -> None:
    """
    Configure all middleware for the Olorin application.
    
    Args:
        app: FastAPI application instance
        config: Service configuration settings
    """
    # Add production error handling middleware (must be first)
    _configure_error_middleware(app)
    
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
    """Configure CORS middleware with environment-specific security."""
    environment = os.getenv("APP_ENV", "local")
    
    # Environment-specific CORS configuration
    if environment == "prd":
        # Production: Use only environment-specified origins, no fallback
        allowed_origins_str = os.getenv("ALLOWED_ORIGINS")
        if not allowed_origins_str:
            logger.error("ALLOWED_ORIGINS not set in production - CORS will deny all requests")
            allowed_origins = []
        else:
            allowed_origins = [origin.strip() for origin in allowed_origins_str.split(",")]
        allow_credentials = False  # Disable credentials in production for security
    else:
        # Development/staging: Allow localhost origins for development
        allowed_origins_str = os.getenv(
            "ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001"
        )
        allowed_origins = [origin.strip() for origin in allowed_origins_str.split(",")]
        allow_credentials = True  # Allow credentials in development
    
    # Security validation: reject wildcard origins if credentials are enabled
    if allow_credentials and "*" in allowed_origins:
        logger.error("SECURITY RISK: Cannot use wildcard origins with credentials enabled")
        allowed_origins = [origin for origin in allowed_origins if origin != "*"]
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=allow_credentials,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=[
            "Authorization",
            "Content-Type", 
            "Accept",
            "X-Requested-With",
            "Cache-Control",
            "Pragma",
            "X-User-ID",  # Custom header used by the application
            "olorin_originatingip"  # Custom header for IP tracking
        ],
        max_age=600,  # Cache preflight requests for 10 minutes
    )
    
    logger.info(f"CORS configured for {environment} environment with origins: {allowed_origins}")


def _configure_error_middleware(app: FastAPI) -> None:
    """Configure production error handling middleware."""
    from app.middleware.production_error_middleware import ProductionErrorMiddleware
    
    # Add error handling middleware (must be first middleware)
    environment = os.getenv("APP_ENV", "local")
    app.add_middleware(ProductionErrorMiddleware, environment=environment)
    
    logger.info(f"Production error middleware configured for environment: {environment}")


def _configure_transaction_id_middleware(app: FastAPI) -> None:
    """Configure Olorin transaction ID middleware."""
    # Import here to avoid circular dependency
    from .. import inject_transaction_id
    
    app.add_middleware(BaseHTTPMiddleware, dispatch=inject_transaction_id)