"""
Bayit+ AI Service.

Dedicated Cloud Run service for all AI-powered features (~75 endpoints).
Handles chat, voice, dubbing, gamification, avatar interactions, NLP,
quizzes, comprehension, missions, and generative content features.

Imports shared code from the monolith via Poetry path dependency.
"""

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.ai_clients import close_ai_clients
from app.core.config import settings
from app.core.database import close_mongo_connection, connect_to_mongo_subset, get_database
from app.core.logging_config import setup_logging
from app.core.pubsub import close_pubsub_manager, get_pubsub_manager
from app.core.redis_client import close_redis_client, get_redis_client
from app.core.sentry_config import init_sentry
from app.middleware.correlation_id import CorrelationIdMiddleware
from app.middleware.request_timing import RequestTimingMiddleware

from app.api.router_registry import SERVICE_MODELS, register_routes

SERVICE_NAME = "bayit-ai"
SERVICE_TITLE = "Bayit+ AI Service"

setup_logging(level=settings.LOG_LEVEL)
logger = logging.getLogger(__name__)

sentry_enabled = init_sentry()
if sentry_enabled:
    logger.info("Sentry error tracking enabled (%s)", SERVICE_NAME)


@asynccontextmanager
async def lifespan(ai_app: FastAPI):
    """AI service lifespan: MongoDB subset + Redis + pub/sub."""
    import asyncio

    logger.info("Starting %s...", SERVICE_TITLE)

    # Connect to MongoDB with AI-specific model subset
    try:
        await connect_to_mongo_subset(document_models=SERVICE_MODELS)
        database = get_database()
        await database.command("ping")
        logger.info("MongoDB connection established (%s)", SERVICE_NAME)
    except Exception as e:
        logger.error("MongoDB connection failed: %s", e, exc_info=True)
        raise

    # Initialize Redis client and pub/sub
    async def init_redis():
        try:
            await get_redis_client()
            await get_pubsub_manager()
            logger.info("Redis client and pub/sub manager initialized (%s)", SERVICE_NAME)
        except Exception as e:
            logger.warning("Redis initialization failed: %s", e)

    await init_redis()

    logger.info("%s startup complete", SERVICE_TITLE)

    yield

    # Shutdown
    logger.info("Shutting down %s...", SERVICE_TITLE)

    try:
        await close_pubsub_manager()
        await close_redis_client()
        logger.info("Redis connections closed (%s)", SERVICE_NAME)
    except Exception as e:
        logger.warning("Failed to close Redis: %s", e)

    try:
        await close_ai_clients()
        logger.info("AI provider clients closed (%s)", SERVICE_NAME)
    except Exception as e:
        logger.warning("Failed to close AI provider clients: %s", e)

    await close_mongo_connection()
    logger.info("%s shutdown complete", SERVICE_TITLE)


app = FastAPI(
    title=SERVICE_TITLE,
    lifespan=lifespan,
)


@app.get("/health")
async def health_check():
    """AI service health check for Cloud Run."""
    return {"status": "healthy", "service": SERVICE_NAME}


# Middleware (order: first added = innermost, last added = outermost)
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

# Register AI feature routes
register_routes(app)


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8002"))
    log_level = os.getenv("LOG_LEVEL", "info").lower()
    uvicorn.run(
        "app.main:app", host="0.0.0.0", port=port, reload=True, log_level=log_level
    )
