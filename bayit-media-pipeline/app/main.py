"""
Bayit+ Media Pipeline Service.

Extracted Cloud Run service for recording, schedule, and synced stream routes.
Connects to the same MongoDB cluster and Redis instance as the monolith, but
handles only media pipeline endpoints with independent CPU scaling for
resource-intensive ffmpeg and GCS workloads.

Imports shared code from the monolith via Poetry path dependency.
"""

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.ai_clients import close_ai_clients
from app.core.config import settings
from app.core.database import close_mongo_connection, get_database
from app.core.logging_config import setup_logging
from app.core.redis_client import close_redis_client, get_redis_client
from app.core.sentry_config import init_sentry
from app.middleware.correlation_id import CorrelationIdMiddleware
from app.middleware.request_timing import RequestTimingMiddleware

from app.api.router_registry import register_routes

SERVICE_NAME = "bayit-media-pipeline"
SERVICE_TITLE = "Bayit+ Media Pipeline Service"

setup_logging(level=settings.LOG_LEVEL)
logger = logging.getLogger(__name__)

sentry_enabled = init_sentry()
if sentry_enabled:
    logger.info("Sentry error tracking enabled", extra={"service": SERVICE_NAME})


@asynccontextmanager
async def lifespan(service_app: FastAPI):
    """Service lifespan: MongoDB subset + Redis."""
    logger.info("Starting %s...", SERVICE_TITLE)

    # Connect to MongoDB with only the models this service needs
    try:
        from app.core.database import connect_to_mongo_subset
        from app.api.router_registry import SERVICE_MODELS

        await connect_to_mongo_subset(document_models=SERVICE_MODELS)
        database = get_database()
        await database.command("ping")
        logger.info(
            "MongoDB connection established",
            extra={"service": SERVICE_NAME, "model_count": len(SERVICE_MODELS)},
        )
    except Exception as e:
        logger.error("MongoDB connection failed: %s", e, exc_info=True)
        raise

    # Initialize Redis client (rate limiting, job state)
    try:
        await get_redis_client()
        logger.info("Redis client initialized", extra={"service": SERVICE_NAME})
    except Exception as e:
        logger.warning("Redis initialization failed: %s", e)

    logger.info("%s startup complete", SERVICE_TITLE)

    yield

    # Shutdown
    logger.info("Shutting down %s...", SERVICE_TITLE)

    try:
        await close_redis_client()
    except Exception as e:
        logger.warning("Failed to close Redis: %s", e)

    await close_ai_clients()
    await close_mongo_connection()
    logger.info("%s shutdown complete", SERVICE_TITLE)


app = FastAPI(
    title=SERVICE_TITLE,
    lifespan=lifespan,
)


@app.get("/health")
async def health_check():
    """Service health check for Cloud Run."""
    return {"status": "healthy", "service": SERVICE_NAME}


# CORS - same origins as monolith
cors_origins = settings.parsed_cors_origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request timing middleware for latency tracking
app.add_middleware(RequestTimingMiddleware)

# Correlation ID middleware for end-to-end request tracing
app.add_middleware(CorrelationIdMiddleware)

# Register media pipeline routes
register_routes(app)


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8080"))
    log_level = os.getenv("LOG_LEVEL", "info").lower()
    uvicorn.run(
        "app.main:app", host="0.0.0.0", port=port, reload=True, log_level=log_level
    )
