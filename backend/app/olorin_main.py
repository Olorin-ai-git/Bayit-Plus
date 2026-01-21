"""
Olorin.ai Platform Backend Entry Point

Separate FastAPI application for Olorin AI overlay services.
Deployed independently from main Bayit+ backend for:
- Independent scaling
- Isolated failures
- Partner-specific rate limiting
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address

from app.api.routes.olorin import context, dubbing, partner, recap, search
from app.core.database import close_mongo_connection, connect_to_mongo
from app.core.olorin_settings import settings

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
    logger.info(f"API Version: {settings.OLORIN_API_VERSION}")

    # Connect to MongoDB (non-blocking - allow startup even if DB unavailable)
    try:
        await connect_to_mongo()
        logger.info("Database connection established")
    except Exception as e:
        logger.warning(f"Failed to establish database connection on startup: {e}")
        logger.info("Continuing startup without database - will retry on first request")

    # Initialize services based on enabled features (non-blocking)
    if settings.OLORIN_SEMANTIC_SEARCH_ENABLED:
        try:
            from app.services.olorin.search.client import client_manager
            await client_manager.initialize()
            logger.info("Semantic search service initialized")
        except Exception as e:
            logger.warning(f"Failed to initialize semantic search: {e}")

    logger.info("Olorin Platform ready")

    yield

    # Shutdown
    logger.info("Shutting down Olorin Platform")
    try:
        await close_mongo_connection()
        logger.info("Database connections closed")
    except Exception as e:
        logger.warning(f"Error during shutdown: {e}")


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
    allow_origins=(
        settings.BACKEND_CORS_ORIGINS.split(",")
        if settings.BACKEND_CORS_ORIGINS != "*"
        else ["*"]
    ),
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
API_PREFIX = f"/api/{settings.OLORIN_API_VERSION}/olorin"

# Partner management (always enabled for API key auth)
app.include_router(
    partner.router,
    prefix=f"{API_PREFIX}/partners",
    tags=["Partners"],
)

# Semantic search (if enabled)
if settings.OLORIN_SEMANTIC_SEARCH_ENABLED:
    app.include_router(
        search.router,
        prefix=f"{API_PREFIX}/search",
        tags=["Semantic Search"],
    )

# Dubbing (if enabled)
if settings.OLORIN_DUBBING_ENABLED:
    app.include_router(
        dubbing.router,
        prefix=f"{API_PREFIX}/dubbing",
        tags=["Dubbing"],
    )

# Recap agent (if enabled)
if settings.OLORIN_RECAP_ENABLED:
    app.include_router(
        recap.router,
        prefix=f"{API_PREFIX}/recap",
        tags=["Recap Agent"],
    )

# Cultural context (if enabled)
if settings.OLORIN_CULTURAL_CONTEXT_ENABLED:
    app.include_router(
        context.router,
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
        "error_id": str(id(exc)),
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.olorin_main:app",
        host="0.0.0.0",
        port=8080,
        reload=settings.ENVIRONMENT == "development",
    )
