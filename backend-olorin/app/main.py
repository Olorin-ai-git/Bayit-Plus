"""
Olorin.ai Platform Backend

AI overlay services providing:
- Realtime Dubbing (Hebrew→English/Spanish)
- Semantic Search (vector-based content search)
- Cultural Context (Israeli/Jewish reference detection)
- Recap Agent (live broadcast summaries)
- Partner API (B2B integration)
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.core.config import settings
from app.core.database import connect_to_mongo, close_mongo_connection
from app.api.routes.olorin import (
    partners,
    search,
    dubbing,
    recap,
    cultural_context,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Startup
    logger.info("Starting Olorin.ai Platform Backend")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"API Version: {settings.olorin.api_version}")

    # Connect to MongoDB
    await connect_to_mongo()
    logger.info("Database connection established")

    # Initialize services based on enabled features
    if settings.olorin.semantic_search_enabled:
        from app.services.olorin.search.client import client_manager
        await client_manager.initialize()
        logger.info("Semantic search service initialized")

    logger.info("Olorin Platform ready")

    yield

    # Shutdown
    logger.info("Shutting down Olorin Platform")
    await close_mongo_connection()
    logger.info("Database connections closed")


# Create FastAPI application
app = FastAPI(
    title="Olorin.ai Platform API",
    description="AI overlay services for content providers",
    version="0.1.0",
    lifespan=lifespan,
)

# Add rate limiting middleware
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, limiter._rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint for load balancer."""
    return {
        "status": "healthy",
        "service": "olorin-platform",
        "version": "0.1.0",
    }

# Include Olorin API routes
API_PREFIX = f"/api/{settings.olorin.api_version}/olorin"

# Partner management
app.include_router(
    partners.router,
    prefix=f"{API_PREFIX}/partners",
    tags=["Partners"],
)

# Semantic search (if enabled)
if settings.olorin.semantic_search_enabled:
    app.include_router(
        search.router,
        prefix=f"{API_PREFIX}/search",
        tags=["Semantic Search"],
    )

# Dubbing (if enabled)
if settings.olorin.dubbing_enabled:
    app.include_router(
        dubbing.router,
        prefix=f"{API_PREFIX}/dubbing",
        tags=["Dubbing"],
    )

# Recap agent (if enabled)
if settings.olorin.recap_enabled:
    app.include_router(
        recap.router,
        prefix=f"{API_PREFIX}/recap",
        tags=["Recap Agent"],
    )

# Cultural context (if enabled)
if settings.olorin.cultural_context_enabled:
    app.include_router(
        cultural_context.router,
        prefix=f"{API_PREFIX}/cultural-context",
        tags=["Cultural Context"],
    )

# Error handlers
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler for unhandled errors."""
    logger.error(f"Unhandled error: {exc}", exc_info=True)
    return {
        "detail": "Internal server error",
        "error_id": id(exc),
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8080,
        reload=settings.ENVIRONMENT == "development",
    )
