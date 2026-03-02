"""
Bayit+ Background Workers Service.

Dedicated Cloud Run service for background tasks extracted from the monolith.
Runs periodic cleanup, monitoring, scheduling, and aggregation workers.
Connects to the same MongoDB cluster and Redis instance as the monolith.
"""

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import close_mongo_connection, connect_to_mongo_subset, get_database
from app.core.logging_config import setup_logging
from app.core.redis_client import close_redis_client, get_redis_client
from app.core.sentry_config import init_sentry

from app.api.router_registry import SERVICE_MODELS, register_routes

SERVICE_NAME = "bayit-workers"
SERVICE_TITLE = "Bayit+ Background Workers"

setup_logging(level=settings.LOG_LEVEL)
logger = logging.getLogger(__name__)

sentry_enabled = init_sentry()
if sentry_enabled:
    logger.info("Sentry error tracking enabled (%s)", SERVICE_NAME)


@asynccontextmanager
async def lifespan(workers_app: FastAPI):
    """Workers lifespan: MongoDB + Redis, then start all background workers."""
    logger.info("Starting %s...", SERVICE_TITLE)

    # Connect to MongoDB (subset of models)
    try:
        await connect_to_mongo_subset(document_models=SERVICE_MODELS)
        database = get_database()
        await database.command("ping")
        logger.info("MongoDB connection established (%s)", SERVICE_NAME)
    except Exception as e:
        logger.error("MongoDB connection failed: %s", e, exc_info=True)
        logger.error("Workers will start in DEGRADED mode")

    # Initialize Redis client
    try:
        await get_redis_client()
        logger.info("Redis client initialized (%s)", SERVICE_NAME)
    except Exception as e:
        logger.warning("Redis initialization failed: %s", e)

    # Start background task subsystem (upload cleanup, session cleanup, etc.)
    from app.services.startup import start_background_tasks
    start_background_tasks()

    # Initialize recording scheduler (EPG-scheduled recordings)
    from app.services.recording_scheduler_service import recording_scheduler_service
    try:
        await recording_scheduler_service.initialize()
        logger.info("Recording scheduler initialized")
    except Exception as e:
        logger.warning("Failed to initialize recording scheduler: %s", e)

    # Start audit recovery monitoring
    from app.services.audit_recovery_service import audit_recovery_service
    try:
        await audit_recovery_service.start_monitoring()
        logger.info("Audit recovery monitoring started")
    except Exception as e:
        logger.warning("Failed to start audit recovery monitoring: %s", e)

    logger.info("%s startup complete", SERVICE_TITLE)

    yield

    # Shutdown (reverse order)
    logger.info("Shutting down %s...", SERVICE_TITLE)

    try:
        await audit_recovery_service.stop_monitoring()
        logger.info("Audit recovery monitoring stopped")
    except Exception as e:
        logger.warning("Failed to stop audit recovery monitoring: %s", e)

    try:
        await recording_scheduler_service.shutdown()
        logger.info("Recording scheduler stopped")
    except Exception as e:
        logger.warning("Failed to stop recording scheduler: %s", e)

    from app.services.startup import stop_background_tasks
    await stop_background_tasks()

    try:
        await close_redis_client()
        logger.info("Redis connections closed (%s)", SERVICE_NAME)
    except Exception as e:
        logger.warning("Failed to close Redis: %s", e)

    await close_mongo_connection()
    logger.info("%s shutdown complete", SERVICE_TITLE)


app = FastAPI(title=SERVICE_TITLE, lifespan=lifespan)

cors_origins = settings.parsed_cors_origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "OPTIONS"],
    allow_headers=["*"],
)

register_routes(app)


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8002"))
    log_level = os.getenv("LOG_LEVEL", "info").lower()
    uvicorn.run(
        "app.main:app", host="0.0.0.0", port=port, reload=True, log_level=log_level
    )
