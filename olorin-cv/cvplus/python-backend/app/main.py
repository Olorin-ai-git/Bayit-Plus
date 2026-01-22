"""
Olorin CVPlus - Main FastAPI Application
FastAPI backend for CV processing, analysis, and generation platform

INTEGRATES WITH:
- Olorin AI Agent for CV analysis
- Olorin Config patterns
- Olorin Logging and monitoring
- MongoDB Atlas (shared cluster)
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import routers
from app.api import cv, profile, analytics, auth

# Import core setup
from app.core.config import get_settings
from app.core.database import init_database, close_database
from app.core.logging_config import configure_logging, get_logger

# Import middleware
from app.middleware import RateLimitMiddleware
from app.middleware.csrf_middleware import CSRFMiddleware
from app.middleware.security_headers import SecurityHeadersMiddleware

# Configure Olorin structured logging
configure_logging()
logger = get_logger(__name__)

# Create FastAPI application
app = FastAPI(
    title="Olorin CVPlus API",
    description="AI-Powered CV Platform with intelligent analysis and generation",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# Get settings
settings = get_settings()

# Add Security Headers Middleware (first - applies to all responses)
app.add_middleware(SecurityHeadersMiddleware)

# Add CSRF Protection Middleware
app.add_middleware(CSRFMiddleware)

# Add Olorin rate limiting middleware
app.add_middleware(RateLimitMiddleware, requests_per_minute=60)

# Configure CORS (must be after other middlewares)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-CSRF-Token"],  # Expose CSRF token to frontend
)

# Include routers
app.include_router(auth.router, prefix="/api/v1", tags=["Authentication"])
app.include_router(cv.router, prefix="/api/v1/cv", tags=["CV Processing"])
app.include_router(profile.router, prefix="/api/v1/profile", tags=["Public Profiles"])
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["Analytics"])

@app.on_event("startup")
async def startup_event():
    """Initialize database connection on startup"""
    logger.info("Starting Olorin CVPlus API...")
    logger.info(f"Environment: {settings.environment}")
    logger.info(f"MongoDB: {settings.mongodb_db_name}")

    await init_database()
    logger.info("✅ Database initialized")

    logger.info("✅ Olorin CVPlus API started successfully")

@app.on_event("shutdown")
async def shutdown_event():
    """Close database connection on shutdown"""
    logger.info("Shutting down Olorin CVPlus API...")
    await close_database()
    logger.info("✅ Database connection closed")

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Olorin CVPlus API",
        "version": "1.0.0",
        "environment": settings.environment
    }

@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "service": "Olorin CVPlus API",
        "version": "1.0.0",
        "environment": settings.environment,
        "database": "connected",
        "timestamp": "2024-01-21T00:00:00Z"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.port,
        reload=settings.environment == "development"
    )
