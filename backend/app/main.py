"""
Bayit+ Backend API Server.

This is the main entry point for the FastAPI application.
All initialization logic is delegated to specialized modules.
"""

import asyncio
import logging
import os
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
from app.core.database import (close_mongo_connection, connect_to_mongo,
                                    ensure_ttl_indexes_background,
                                    get_database)
from app.core.database_olorin import (close_olorin_mongo_connection,
                                      connect_to_olorin_mongo)
from app.core.pubsub import close_pubsub_manager, get_pubsub_manager
from app.core.redis_client import close_redis_client, get_redis_client
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

    # Check interactive mission API keys (non-blocking warnings)
    if hasattr(settings, "STABILITY_API_KEY") and not settings.STABILITY_API_KEY:
        warnings.append(
            "STABILITY_API_KEY not configured - scene in-painting will not work"
        )
    if hasattr(settings, "FERNET_ENCRYPTION_KEY") and not settings.FERNET_ENCRYPTION_KEY:
        warnings.append(
            "FERNET_ENCRYPTION_KEY not configured - avatar encryption will not work"
        )

    # Check VOD interaction dependencies when features are enabled
    if settings.VOD_INTERACTION_VOICE_ENABLED or settings.VOD_INTERACTION_MULTI_CHARACTER_ENABLED:
        if not settings.ANTHROPIC_API_KEY:
            warnings.append(
                "ANTHROPIC_API_KEY not configured - VOD character AI will not work"
            )
    if not settings.CREATIFY_API_URL or not settings.CREATIFY_API_KEY:
        warnings.append(
            "CREATIFY_API_URL/CREATIFY_API_KEY not configured - character animation will not work"
        )
    if not settings.ELEVENLABS_API_KEY:
        warnings.append(
            "ELEVENLABS_API_KEY not configured - character voice TTS will not work"
        )

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
    try:
        _validate_configuration()
        log_configuration_warnings()
    except Exception as e:
        logger.error(f"Configuration validation failed: {e}", exc_info=True)
        # Continue anyway - configuration warnings are non-fatal

    # Connect to MongoDB (CRITICAL - retry with backoff, fail hard if exhausted)
    max_retries = int(os.getenv("MONGODB_CONNECT_RETRIES", "3"))
    for attempt in range(1, max_retries + 1):
        try:
            await connect_to_mongo()
            database = get_database()
            await database.command("ping")
            logger.info("MongoDB connection established (pool warmed)")
            break
        except Exception as e:
            if attempt < max_retries:
                wait = 2 ** attempt
                logger.warning(
                    "MongoDB connection attempt %d/%d failed, retrying in %ds: %s",
                    attempt, max_retries, wait, e,
                )
                await asyncio.sleep(wait)
            else:
                logger.critical(
                    "MongoDB connection failed after %d attempts: %s",
                    max_retries, e, exc_info=True,
                )
                raise

    # Parallelize independent initializations for faster startup
    async def init_olorin_database():
        """Initialize Olorin database (Phase 2 - separate database if enabled)."""
        try:
            await connect_to_olorin_mongo()
            logger.info("[OK] Olorin database connection established")
        except Exception as e:
            logger.warning(f"Olorin database connection failed: {e}")

    async def init_content_metadata():
        """Initialize Content metadata service for Olorin cross-database access."""
        try:
            await content_metadata_service.initialize()
            logger.info("Content metadata service initialized")
        except Exception as e:
            logger.warning(f"Content metadata service initialization failed: {e}")

    async def init_redis():
        """Initialize Redis client and pub/sub manager."""
        try:
            await get_redis_client()
            await get_pubsub_manager()
            logger.info("Redis client and pub/sub manager initialized")
        except Exception as e:
            logger.warning(f"Redis initialization failed (graceful degradation): {e}")

    # Run Olorin database, content metadata, and Redis initialization in parallel
    # These are independent and don't need to block each other
    await asyncio.gather(
        init_olorin_database(),
        init_content_metadata(),
        init_redis(),
        return_exceptions=True,  # Don't fail if one fails
    )

    # Ensure upload directory exists
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)
    logger.info(f"Upload directory ready: {upload_dir}")

    # Start background tasks
    start_background_tasks()

    # Initialize default data (widgets and cultures) in background
    # Don't block server startup - these can initialize after server is ready
    async def _warm_content_caches():
        """
        Pre-warm slow external-data caches so first mobile clients never hit cold latency.
        Targets: trending/topics (LLM ~15s cold), tel-aviv/featured (RSS ~25s cold),
        jerusalem/featured (RSS ~25s cold).
        """
        from app.services.news_analyzer import get_trending_analysis
        from app.services.tel_aviv_content_service import tel_aviv_content_service
        from app.services.jerusalem_content_service import jerusalem_content_service

        async def _warm_trending():
            try:
                await get_trending_analysis()
                logger.info("Cache warm-up: trending analysis ready")
            except Exception as e:
                logger.warning(f"Cache warm-up: trending analysis failed: {e}")

        async def _warm_tel_aviv():
            try:
                await tel_aviv_content_service.get_featured_content()
                logger.info("Cache warm-up: Tel Aviv featured ready")
            except Exception as e:
                logger.warning(f"Cache warm-up: Tel Aviv featured failed: {e}")

        async def _warm_jerusalem():
            try:
                await jerusalem_content_service.get_featured_content()
                logger.info("Cache warm-up: Jerusalem featured ready")
            except Exception as e:
                logger.warning(f"Cache warm-up: Jerusalem featured failed: {e}")

        await asyncio.gather(
            _warm_trending(),
            _warm_tel_aviv(),
            _warm_jerusalem(),
            return_exceptions=True,
        )

    async def _background_seeding():
        """Background task to seed default data after server startup."""
        # Collections are ready immediately after init_beanie() with skip_indexes=True
        # (Beanie registers models synchronously; no async index creation to wait for)

        # Initialize default widgets
        try:
            await init_default_widgets()
            logger.info("[OK] Background seeding: Default widgets initialized")
        except Exception as e:
            logger.warning(f"Background seeding: Failed to initialize default widgets: {e}")

        # Initialize default cultures (Israeli)
        try:
            await init_default_cultures()
            logger.info("[OK] Background seeding: Default cultures initialized")
        except Exception as e:
            logger.warning(f"Background seeding: Failed to initialize default cultures: {e}")

    async def _init_embedding_classifier():
        """Initialize voice intent embedding classifier in background."""
        try:
            from app.services.voice.embedding_cache import embedding_classifier
            await embedding_classifier.initialize()
            logger.info("Voice intent embedding classifier initialized")
        except Exception as e:
            logger.warning(f"Embedding classifier initialization failed: {e}")

    # Launch background tasks without blocking startup
    asyncio.create_task(_background_seeding())
    asyncio.create_task(ensure_ttl_indexes_background())
    asyncio.create_task(_warm_content_caches())
    asyncio.create_task(_init_embedding_classifier())
    from app.services.vod_interaction.job_reaper import run_reaper_loop
    asyncio.create_task(run_reaper_loop(), name="pause-ask-job-reaper")

    async def _reap_pending_documents():
        """Re-enqueue knowledge documents stranded mid-ingestion by a restart."""
        try:
            from app.services.training.document_orchestrator import (
                reap_pending_documents,
            )
            await reap_pending_documents()
        except Exception as e:
            logger.warning(f"Document ingestion reaper failed: {e}")

    asyncio.create_task(_reap_pending_documents())
    logger.info("Background tasks scheduled: data seeding, TTL index creation, cache warm-up, job reaper, document reaper")

    # Upload queue processor is now manual-only (triggered from UI)
    from app.services.upload_service import upload_service  # noqa: F401

    logger.info("Upload queue processor ready (manual trigger only)")

    # Parallelize service initializations for faster startup
    from app.services.audit_recovery_service import audit_recovery_service
    from app.services.recording_scheduler_service import recording_scheduler_service

    async def init_audit_recovery():
        """Initialize audit recovery monitoring."""
        try:
            await audit_recovery_service.start_monitoring()
            logger.info("Audit recovery monitoring started")
        except Exception as e:
            logger.warning(f"Failed to start audit recovery monitoring: {e}")

    async def init_recording_scheduler():
        """Initialize recording scheduler (EPG-scheduled recordings)."""
        try:
            await recording_scheduler_service.initialize()
            logger.info("Recording scheduler initialized")
        except Exception as e:
            logger.warning(f"Failed to initialize recording scheduler: {e}")

    # Run service initializations in parallel (they're independent)
    await asyncio.gather(
        init_audit_recovery(),
        init_recording_scheduler(),
        return_exceptions=True,
    )

    logger.info("Server startup complete - Ready to accept connections")
    logger.info(
        "Startup optimizations enabled: "
        "index creation skipped (managed via migration scripts), "
        "data seeding in background, parallel service init"
    )

    yield

    # ============================================
    # Shutdown
    # ============================================
    logger.info("Shutting down server...")

    # Stop recording scheduler
    try:
        await recording_scheduler_service.shutdown()
        logger.info("Recording scheduler stopped")
    except Exception as e:
        logger.warning(f"Failed to stop recording scheduler: {e}")

    # Stop audit recovery monitoring
    try:
        await audit_recovery_service.stop_monitoring()
        logger.info("Audit recovery monitoring stopped")
    except Exception as e:
        logger.warning(f"Failed to stop audit recovery monitoring: {e}")

    # Stop background tasks gracefully
    await stop_background_tasks()

    # Close Redis connections
    try:
        await close_pubsub_manager()
        await close_redis_client()
        logger.info("Redis connections closed")
    except Exception as e:
        logger.warning(f"Failed to close Redis connections: {e}")

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
# Only RequestValidationError maps to 422 — pydantic.ValidationError from internal
# model/document deserialization is a server-side error and falls through to 500.
app.add_exception_handler(RequestValidationError, validation_exception_handler)

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

logger.info("[OK] Global exception handlers registered - server will remain responsive on errors")

# ============================================
# Middleware (order matters - first added = innermost, last added = outermost)
# ============================================

# Security middleware - input sanitization (innermost)
from app.middleware.input_sanitization import InputSanitizationMiddleware
from app.middleware.security_headers import SecurityHeadersMiddleware

app.add_middleware(InputSanitizationMiddleware, enable_logging=True)
logger.info("Input sanitization middleware enabled")

from app.middleware.body_size_limit import BodySizeLimitMiddleware

app.add_middleware(BodySizeLimitMiddleware, max_bytes=settings.MAX_REQUEST_BODY_BYTES)
logger.info("Body size limit middleware enabled (max %d bytes)", settings.MAX_REQUEST_BODY_BYTES)

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

# Security: Use specific allow lists instead of wildcards
allowed_methods = ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]
allowed_headers = ["*"]  # Wildcard is safe with allow_credentials=True (Starlette echoes requested headers)
exposed_headers = [
    "Content-Type",
    "X-Correlation-ID",
    "X-Request-Duration-Ms",
    "X-RateLimit-Limit",
    "X-RateLimit-Remaining",
    "X-RateLimit-Reset",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,  # Whitelist from settings (no wildcards allowed)
    allow_credentials=True,
    allow_methods=allowed_methods,  # Specific HTTP methods (no wildcard)
    allow_headers=allowed_headers,  # Specific headers (no wildcard)
    expose_headers=exposed_headers,  # Specific exposed headers (no wildcard)
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
    import os
    import uvicorn

    # Read PORT from environment variable (Cloud Run compatibility)
    # Falls back to 8000 for local development
    port = int(os.getenv("PORT", "8000"))
    log_level = os.getenv("LOG_LEVEL", "info").lower()

    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=True, log_level=log_level)
