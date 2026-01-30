"""
Bayit+ Backend API Server.

This is the main entry point for the FastAPI application.
All initialization logic is delegated to specialized modules.
"""

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.exceptions import HTTPException, RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from pydantic import ValidationError
from pymongo.errors import PyMongoError
from starlette.exceptions import HTTPException as StarletteHTTPException

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
from app.middleware.options_handler import OptionsHandlerMiddleware
from app.middleware.request_timing import RequestTimingMiddleware
from app.services.olorin.content_metadata_service import \
    content_metadata_service
from app.services.startup import (init_default_cultures, init_default_widgets,
                                  start_background_tasks,
                                  stop_background_tasks)

# Initialize structured logging for Cloud Run
setup_logging(level=settings.LOG_LEVEL)
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


async def _verify_collections_initialized() -> None:
    """
    Verify that Beanie collections are initialized and ready.

    Checks if Widget and Culture collections can be accessed by attempting
    simple count queries. Includes retry logic to handle race conditions.
    """
    import asyncio
    from app.models.widget import Widget
    from app.models.culture import Culture
    from app.models.tel_aviv_content import TelAvivContentSource
    from app.models.jerusalem_content import JerusalemContentSource

    max_retries = 3
    retry_delay = 0.5  # seconds

    for attempt in range(max_retries):
        try:
            # Attempt to count documents in critical collections
            # This will fail with CollectionWasNotInitialized if not ready
            await Widget.count()
            await Culture.count()
            await TelAvivContentSource.count()
            await JerusalemContentSource.count()
            logger.debug(f"Collection verification successful (attempt {attempt + 1})")
            return
        except Exception as e:
            if attempt < max_retries - 1:
                logger.debug(
                    f"Collections not ready yet (attempt {attempt + 1}/{max_retries}), "
                    f"retrying in {retry_delay}s..."
                )
                await asyncio.sleep(retry_delay)
            else:
                logger.warning(
                    f"Collection verification failed after {max_retries} attempts: {e}"
                )
                raise


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
    try:
        _validate_configuration()
        log_configuration_warnings()
    except Exception as e:
        logger.error(f"Configuration validation failed: {e}", exc_info=True)
        # Continue anyway - configuration warnings are non-fatal

    # Connect to MongoDB (CRITICAL - will retry on failure)
    try:
        await connect_to_mongo()
        logger.info("✅ MongoDB connection established")
    except Exception as e:
        logger.error(f"❌ MongoDB connection failed: {e}", exc_info=True)
        logger.error("Server will start in DEGRADED mode - database operations will fail")
        # Continue anyway - exception handlers will catch database errors in requests

    # Connect to Olorin database (Phase 2 - separate database if enabled)
    try:
        await connect_to_olorin_mongo()
        logger.info("✅ Olorin database connection established")
    except Exception as e:
        logger.warning(f"Olorin database connection failed: {e}")
        # Non-fatal - main database is primary

    # Initialize Content metadata service for Olorin cross-database access
    try:
        await content_metadata_service.initialize()
        logger.info("✅ Content metadata service initialized")
    except Exception as e:
        logger.warning(f"Content metadata service initialization failed: {e}")
        # Non-fatal

    # Ensure upload directory exists
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)
    logger.info(f"Upload directory ready: {upload_dir}")

    # Wait for Beanie collections to be fully initialized
    try:
        await _verify_collections_initialized()
        logger.info("✅ Database collections verified and ready")
    except Exception as e:
        logger.warning(f"Collection verification failed: {e}")
        # Continue anyway - seeders will handle errors gracefully

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

    # Start audit recovery monitoring
    from app.services.audit_recovery_service import audit_recovery_service

    try:
        await audit_recovery_service.start_monitoring()
        logger.info("Audit recovery monitoring started")
    except Exception as e:
        logger.warning(f"Failed to start audit recovery monitoring: {e}")

    logger.info("Server startup complete - Ready to accept connections")

    yield

    # ============================================
    # Shutdown
    # ============================================
    logger.info("Shutting down server...")

    # Stop audit recovery monitoring
    try:
        await audit_recovery_service.stop_monitoring()
        logger.info("Audit recovery monitoring stopped")
    except Exception as e:
        logger.warning(f"Failed to stop audit recovery monitoring: {e}")

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
# Exception Handlers (registered early to catch all errors)
# ============================================
from app.middleware.error_handlers import (
    database_exception_handler,
    global_exception_handler,
    http_exception_handler,
    rate_limit_exception_handler,
    validation_exception_handler,
)

# Register exception handlers in order of specificity (most specific first)
# HTTP exceptions (400-level errors)
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)

# Validation errors (422 Unprocessable Entity)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(ValidationError, validation_exception_handler)

# Database errors (503 Service Unavailable)
app.add_exception_handler(PyMongoError, database_exception_handler)

# Rate limiting errors (429 Too Many Requests) - if slowapi is installed
try:
    from slowapi.errors import RateLimitExceeded

    app.add_exception_handler(RateLimitExceeded, rate_limit_exception_handler)
    logger.info("Rate limit exception handler registered")
except ImportError:
    logger.debug("slowapi not installed - rate limit exception handler not registered")

# Global catch-all for any unhandled exceptions (500 Internal Server Error)
# This MUST be last to catch everything that wasn't caught above
app.add_exception_handler(Exception, global_exception_handler)

logger.info("✅ Global exception handlers registered - server will remain responsive on errors")

# ============================================
# Middleware (order matters - first added = innermost, last added = outermost)
# ============================================

# Security middleware - input sanitization (innermost)
from app.middleware.input_sanitization import InputSanitizationMiddleware
from app.middleware.security_headers import SecurityHeadersMiddleware

app.add_middleware(InputSanitizationMiddleware, enable_logging=True)
logger.info("Input sanitization middleware enabled")

# Security headers middleware - adds OWASP security headers to all responses
app.add_middleware(SecurityHeadersMiddleware)
logger.info("Security headers middleware enabled (CSP, HSTS, X-Frame-Options, etc.)")

# CSRF protection middleware - conditionally enabled via settings
if settings.CSRF_ENABLED:
    from app.core.csrf import CSRFProtectionMiddleware

    app.add_middleware(CSRFProtectionMiddleware)
    logger.info("CSRF protection middleware enabled")
else:
    logger.warning(
        "CSRF protection middleware DISABLED - not recommended for production"
    )

# Request timing middleware - tracks request duration
app.add_middleware(RequestTimingMiddleware)
logger.info("Request timing middleware enabled")

# Correlation ID middleware - adds request tracing
app.add_middleware(CorrelationIdMiddleware)
logger.info("Correlation ID middleware enabled")

# Rate limiting middleware - protects against abuse
from app.core.rate_limiter import RATE_LIMITING_ENABLED, limiter

if RATE_LIMITING_ENABLED:
    app.state.limiter = limiter
    # Rate limit exception handler already registered above
    logger.info("Global rate limiting middleware enabled (slowapi)")
else:
    logger.warning("Rate limiting disabled - slowapi not installed")

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

# OPTIONS handler - handles CORS preflight before validation
# Must be added AFTER CORS middleware (executed BEFORE CORS on request path)
app.add_middleware(OptionsHandlerMiddleware)
logger.info("OPTIONS handler middleware enabled - bypasses validation for CORS preflight")

# ============================================
# Routes
# ============================================
register_all_routers(app)
register_upload_serving(app)


# ============================================
# Entry Point
# ============================================
if __name__ == "__main__":
    import os
    import uvicorn

    # Read PORT from environment variable (Cloud Run compatibility)
    # Falls back to 8000 for local development
    port = int(os.getenv("PORT", "8000"))
    log_level = os.getenv("LOG_LEVEL", "info").lower()

    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=True, log_level=log_level)
