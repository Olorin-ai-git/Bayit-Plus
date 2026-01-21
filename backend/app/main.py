"""
Bayit+ Backend API Server.

This is the main entry point for the FastAPI application.
All initialization logic is delegated to specialized modules.
"""

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router_registry import (register_all_routers,
                                     register_upload_serving)
from app.core.config import settings
from app.core.config_validation import log_configuration_warnings
from app.core.database import close_mongo_connection, connect_to_mongo
from app.core.database_olorin import (close_olorin_mongo_connection,
                                      connect_to_olorin_mongo)
from app.core.logging_config import setup_logging
from app.core.sentry_config import init_sentry
from app.middleware.correlation_id import CorrelationIdMiddleware
from app.middleware.request_timing import RequestTimingMiddleware
from app.services.olorin.content_metadata_service import \
    content_metadata_service
from app.services.startup import (init_default_cultures, init_default_widgets,
                                  start_background_tasks,
                                  stop_background_tasks)

# Initialize structured logging for Cloud Run
setup_logging(debug=settings.DEBUG)
logger = logging.getLogger(__name__)

# Initialize Sentry error tracking (before app startup)
sentry_enabled = init_sentry()
if sentry_enabled:
    logger.info("Sentry error tracking enabled")


def _validate_configuration() -> None:
    """Validate critical configuration on startup."""
    warnings = []

    # Check TMDB API key
    if not settings.TMDB_API_KEY:
        warnings.append("TMDB_API_KEY not configured - metadata fetching will not work")

    # Check GCS bucket configuration
    if not settings.GCS_BUCKET_NAME:
        warnings.append("GCS_BUCKET_NAME not configured - storage operations may fail")

    # Check Google OAuth if needed
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        warnings.append(
            "Google OAuth not fully configured (GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET)"
        )

    # Check SendGrid if email is needed
    if hasattr(settings, "SENDGRID_API_KEY") and not settings.SENDGRID_API_KEY:
        warnings.append(
            "SENDGRID_API_KEY not configured - email notifications will not work"
        )

    # Validate storage configuration
    if settings.STORAGE_TYPE == "gcs":
        if not settings.GCS_BUCKET_NAME:
            warnings.append("STORAGE_TYPE is 'gcs' but GCS_BUCKET_NAME not configured")
    elif settings.STORAGE_TYPE == "local":
        if settings.GCS_BUCKET_NAME:
            warnings.append("GCS_BUCKET_NAME configured but STORAGE_TYPE is 'local'")

    # Log all warnings
    if warnings:
        logger.warning("\n" + "=" * 60)
        logger.warning("CONFIGURATION WARNINGS:")
        for warning in warnings:
            logger.warning(f"  - {warning}")
        logger.warning("=" * 60 + "\n")
    else:
        logger.info("All critical configuration validated")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.

    Handles startup and shutdown tasks:
    - Database connection
    - Upload directory setup
    - Widget seeding
    - Background task management
    """
    # ============================================
    # Startup
    # ============================================
    logger.info("Starting Bayit+ Backend Server...")

    # Validate configuration
    _validate_configuration()
    log_configuration_warnings()

    # Connect to MongoDB
    await connect_to_mongo()

    # Connect to Olorin database (Phase 2 - separate database if enabled)
    await connect_to_olorin_mongo()

    # Initialize Content metadata service for Olorin cross-database access
    await content_metadata_service.initialize()

    # Ensure upload directory exists
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)
    logger.info(f"Upload directory ready: {upload_dir}")

    # Initialize default data (widgets)
    try:
        await init_default_widgets()
    except Exception as e:
        logger.warning(f"Failed to initialize default data: {e}")

    # Initialize default cultures (Israeli)
    try:
        await init_default_cultures()
    except Exception as e:
        logger.warning(f"Failed to initialize default cultures: {e}")

    # Start background tasks
    start_background_tasks()

    # Upload queue processor is now manual-only (triggered from UI)
    from app.services.upload_service import upload_service  # noqa: F401

    logger.info("Upload queue processor ready (manual trigger only)")

    logger.info("Server startup complete - Ready to accept connections")

    yield

    # ============================================
    # Shutdown
    # ============================================
    logger.info("Shutting down server...")

    # Stop background tasks gracefully
    await stop_background_tasks()

    # Close database connection
    await close_mongo_connection()

    # Close Olorin database connection (if separate database enabled)
    await close_olorin_mongo_connection()

    logger.info("Server shutdown complete")


# ============================================
# Application Setup
# ============================================
app = FastAPI(
    title=settings.APP_NAME,
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    lifespan=lifespan,
)

# ============================================
# Middleware (order matters - first added = innermost, last added = outermost)
# ============================================

# Security middleware - input sanitization (innermost)
from app.middleware.input_sanitization import InputSanitizationMiddleware

app.add_middleware(InputSanitizationMiddleware, enable_logging=True)
logger.info("Input sanitization middleware enabled")

# Request timing middleware - tracks request duration
app.add_middleware(RequestTimingMiddleware)
logger.info("Request timing middleware enabled")

# Correlation ID middleware - adds request tracing
app.add_middleware(CorrelationIdMiddleware)
logger.info("Correlation ID middleware enabled")

# CORS middleware - added LAST = outermost (wraps all responses including errors)
# This ensures CORS headers are added even to error responses
cors_origins = settings.parsed_cors_origins
logger.info(f"CORS Origins configured: {cors_origins}")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*", "X-Correlation-ID", "X-Request-Duration-Ms"],
)

# ============================================
# Routes
# ============================================
register_all_routers(app)
register_upload_serving(app)


# ============================================
# Entry Point
# ============================================
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
