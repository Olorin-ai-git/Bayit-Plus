"""
Bayit+ WebSocket Gateway Service.

Dedicated Cloud Run service for WebSocket connections. Connects to the same
MongoDB cluster and Redis instance as the monolith, but handles only
WebSocket routes with a 3600s timeout (vs 300s for REST).

Imports shared code from the monolith via Poetry path dependency.
"""

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Shared imports from the monolith
from app.core.ai_clients import close_ai_clients
from app.core.config import settings
from app.core.database import close_mongo_connection, connect_to_mongo, get_database
from app.core.logging_config import setup_logging
from app.core.pubsub import close_pubsub_manager, get_pubsub_manager
from app.core.redis_client import close_redis_client, get_redis_client
from app.core.sentry_config import init_sentry

from app.api.router_registry import register_ws_routes

setup_logging(level=settings.LOG_LEVEL)
logger = logging.getLogger(__name__)

sentry_enabled = init_sentry()
if sentry_enabled:
    logger.info("Sentry error tracking enabled (ws-gateway)")


@asynccontextmanager
async def lifespan(gateway_app: FastAPI):
    """Gateway lifespan: MongoDB + Redis only (no REST middleware, no media processing)."""
    import asyncio

    logger.info("Starting Bayit+ WebSocket Gateway...")

    # Connect to MongoDB (same cluster as monolith)
    # Retry up to 3 times — locally, an unreachable Atlas shard can cause the
    # first attempt to time out before the driver falls back to healthy nodes.
    max_retries = int(os.getenv("MONGODB_CONNECT_RETRIES", "3"))
    for attempt in range(1, max_retries + 1):
        try:
            await connect_to_mongo()
            database = get_database()
            await database.command("ping")
            logger.info("MongoDB connection established (ws-gateway)")
            break
        except Exception as e:
            logger.warning(
                "MongoDB connection attempt %d/%d failed: %s",
                attempt, max_retries, e,
            )
            if attempt < max_retries:
                # Reset singleton so next attempt creates a fresh client
                from olorin_shared.database.mongodb import _mongodb_connection
                import olorin_shared.database.mongodb as _db_mod
                if _db_mod._mongodb_connection is not None:
                    try:
                        await _db_mod._mongodb_connection.close()
                    except Exception:
                        pass
                    _db_mod._mongodb_connection = None
                await asyncio.sleep(2)
            else:
                logger.error("MongoDB connection failed after %d attempts", max_retries)
                logger.error("Gateway will start in DEGRADED mode")

    # Initialize Redis client and pub/sub
    async def init_redis():
        try:
            await get_redis_client()
            await get_pubsub_manager()
            logger.info("Redis client and pub/sub manager initialized (ws-gateway)")
        except Exception as e:
            logger.warning("Redis initialization failed: %s", e)

    await init_redis()

    logger.info("WebSocket Gateway startup complete")

    yield

    # Shutdown
    logger.info("Shutting down WebSocket Gateway...")

    try:
        await close_pubsub_manager()
        await close_redis_client()
        logger.info("Redis connections closed (ws-gateway)")
    except Exception as e:
        logger.warning("Failed to close Redis: %s", e)

    try:
        await close_ai_clients()
        logger.info("AI provider clients closed (ws-gateway)")
    except Exception as e:
        logger.warning("Failed to close AI provider clients: %s", e)

    await close_mongo_connection()
    logger.info("WebSocket Gateway shutdown complete")


app = FastAPI(
    title="Bayit+ WebSocket Gateway",
    lifespan=lifespan,
)


# Health check
@app.get("/health")
async def health_check():
    """Gateway health check for Cloud Run."""
    return {"status": "healthy", "service": "bayit-ws-gateway"}


# CORS - same origins as monolith
cors_origins = settings.parsed_cors_origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Register WebSocket routes
register_ws_routes(app)


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8001"))
    log_level = os.getenv("LOG_LEVEL", "info").lower()
    uvicorn.run(
        "app.main:app", host="0.0.0.0", port=port, reload=True, log_level=log_level
    )
