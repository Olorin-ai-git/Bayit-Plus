"""
Bayit+ Admin Service.

Dedicated Cloud Run service for admin-only routes (~170 endpoints).
Connects to the same MongoDB cluster and Redis instance as the monolith,
but serves only admin routes with a lean startup footprint.

Imports shared code from the monolith via the overlay pattern.
"""

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.ai_clients import close_ai_clients
from app.core.config import settings
from app.core.database import (
    close_mongo_connection,
    connect_to_mongo_subset,
    get_database,
)
from app.core.logging_config import setup_logging
from app.core.redis_client import close_redis_client, get_redis_client
from app.core.sentry_config import init_sentry
from app.middleware.correlation_id import CorrelationIdMiddleware
from app.middleware.request_timing import RequestTimingMiddleware
from app.middleware.security_headers import SecurityHeadersMiddleware

from app.api.router_registry import (
    SERVICE_MODELS,
    register_routes,
    register_upload_serving,
)

SERVICE_NAME = "bayit-admin"
SERVICE_TITLE = "Bayit+ Admin Service"

setup_logging(level=settings.LOG_LEVEL)
logger = logging.getLogger(__name__)

sentry_enabled = init_sentry()
if sentry_enabled:
    logger.info("Sentry error tracking enabled (%s)", SERVICE_NAME)


@asynccontextmanager
async def lifespan(admin_app: FastAPI):
    """Admin service lifespan: MongoDB subset + Redis."""
    logger.info("Starting %s...", SERVICE_TITLE)

    # Connect to MongoDB with admin-specific model subset
    try:
        await connect_to_mongo_subset(document_models=SERVICE_MODELS)
        database = get_database()
        await database.command("ping")
        logger.info("MongoDB connection established (%s)", SERVICE_NAME)
    except Exception as exc:
        logger.error("MongoDB connection failed: %s", exc, exc_info=True)
        raise

    # Initialize Redis client
    try:
        await get_redis_client()
        logger.info("Redis client initialized (%s)", SERVICE_NAME)
    except Exception as exc:
        logger.warning("Redis initialization failed: %s", exc)

    logger.info("%s startup complete", SERVICE_TITLE)

    yield

    # Shutdown
    logger.info("Shutting down %s...", SERVICE_TITLE)

    try:
        await close_redis_client()
        logger.info("Redis connection closed (%s)", SERVICE_NAME)
    except Exception as exc:
        logger.warning("Failed to close Redis: %s", exc)

    await close_ai_clients()
    await close_mongo_connection()
    logger.info("%s shutdown complete", SERVICE_TITLE)


app = FastAPI(
    title=SERVICE_TITLE,
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    lifespan=lifespan,
)


@app.get("/health")
async def health_check():
    """Admin service health check for Cloud Run."""
    return {"status": "healthy", "service": SERVICE_NAME}


# Middleware (order: first added = innermost, last added = outermost)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestTimingMiddleware)
app.add_middleware(CorrelationIdMiddleware)

cors_origins = settings.parsed_cors_origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
)

# Register admin routes and upload serving
register_routes(app)
register_upload_serving(app)


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8002"))
    log_level = os.getenv("LOG_LEVEL", "info").lower()
    uvicorn.run(
        "app.main:app", host="0.0.0.0", port=port, reload=True, log_level=log_level
    )
