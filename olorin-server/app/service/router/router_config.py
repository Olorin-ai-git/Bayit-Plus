"""
Router configuration module for Olorin application.

This module handles all router inclusion and endpoint registration including
API routes, WebSocket endpoints, health checks, and utility routes.
"""

import logging
from typing import Optional

from fastapi import FastAPI

from ..config import SvcSettings

logger = logging.getLogger(__name__)


def configure_routes(app: FastAPI, config: SvcSettings) -> None:
    """
    Configure all routes and endpoints for the Olorin application.
    
    Args:
        app: FastAPI application instance
        config: Service configuration settings
    """
    # Include core application routers
    _include_core_routers(app)
    
    # Register error handlers
    _register_error_handlers(app)
    
    # Add health and actuator endpoints
    _add_health_endpoints(app)
    
    # Add metrics if enabled
    _configure_metrics(app, config)


def _include_core_routers(app: FastAPI) -> None:
    """Include all core application routers."""
    from app.router import agent_router, api_router, websocket_router
    from app.router.auth_router import router as auth_router
    from app.router.mcp_bridge_router import router as mcp_bridge_router
    from app.router.performance_router import router as performance_router
    from app.router.autonomous_investigation_router import router as autonomous_router
    from .. import example

    # Include routers in order of dependency
    app.include_router(auth_router)  # Authentication routes (no auth required)
    app.include_router(example.router)
    app.include_router(agent_router.router)
    app.include_router(api_router.router)
    app.include_router(websocket_router.router)
    app.include_router(mcp_bridge_router)
    app.include_router(performance_router)  # Performance monitoring and optimization
    app.include_router(autonomous_router)  # Autonomous investigation testing

    logger.info("All core routers have been included")


def _register_error_handlers(app: FastAPI) -> None:
    """Register global error handlers."""
    from ..error_handling import register_error_handlers
    
    register_error_handlers(app)
    logger.info("Error handlers registered")


def _add_health_endpoints(app: FastAPI) -> None:
    """Add health check and actuator endpoints."""
    
    # Add a simple health endpoint for Cloud Run
    @app.get("/health")
    async def health():
        """Simple health check endpoint for Cloud Run."""
        return {"status": "healthy", "service": "olorin-backend"}
    
    @app.get("/")
    async def root():
        """Root endpoint for basic connectivity test."""
        return {"message": "Olorin Fraud Investigation Platform", "status": "running"}
    
    try:
        from pskhealth import add_health_endpoint
        add_health_endpoint(app)
        logger.info("pskhealth endpoints added successfully")
    except ImportError:
        logger.info("pskhealth not available, using simple health endpoints")
    
    # Add actuator endpoints
    _add_actuator_endpoints(app)


def _add_actuator_endpoints(app: FastAPI) -> None:
    """Add actuator endpoints (dummy implementation for now)."""
    # This is a placeholder for actuator endpoints
    # In a real implementation, this would add monitoring and management endpoints
    logger.debug("Actuator endpoints placeholder added")


def _configure_metrics(app: FastAPI, config: SvcSettings) -> None:
    """Configure metrics exposure if enabled."""
    if getattr(config, "expose_metrics", False):
        _expose_metrics(app)
        logger.info("App metrics exposed")
    else:
        logger.debug("Metrics exposure disabled in configuration")


def _expose_metrics(app: FastAPI) -> None:
    """Expose application metrics (dummy implementation for now)."""
    # This is a placeholder for metrics exposure
    # In a real implementation, this would integrate with PSKMetrics or similar
    logger.debug("Metrics exposure placeholder configured")