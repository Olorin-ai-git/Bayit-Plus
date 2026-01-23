"""Station-AI - FastAPI Application Entry Point."""

import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.startup import lifespan, register_routers
from app.middleware import limiter, rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.log_level),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Create FastAPI application
app = FastAPI(
    title="Station-AI",
    description="AI-powered radio station management platform for Israeli Hebrew-speaking radio stations",
    version="0.1.0",
    lifespan=lifespan
)

# Add rate limiter to app state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

# CORS middleware for frontend - Station-AI
# Parse CORS origins from settings (comma-separated string)
cors_origins = [origin.strip() for origin in settings.cors_allowed_origins.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],  # Specific methods only
    allow_headers=["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With"],  # Specific headers
    max_age=3600,  # Cache preflight requests for 1 hour
)

# Register all API routers
register_routers(app)


@app.get("/")
async def root():
    """Root endpoint - health check."""
    return {
        "name": "Station-AI",
        "version": "0.1.0",
        "status": "running"
    }


@app.get("/api/health")
@limiter.limit("100/minute")
async def health_check(request: Request):
    """Health check endpoint with rate limiting (100 requests per minute)."""
    return {
        "status": "healthy",
        "environment": settings.environment,
        "agent_mode": settings.agent_mode
    }
