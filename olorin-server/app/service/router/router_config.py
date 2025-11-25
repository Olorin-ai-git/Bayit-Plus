"""
Router configuration module for Olorin application.

This module handles all router inclusion and endpoint registration including
API routes, WebSocket endpoints, health checks, and utility routes.
"""

from typing import Optional

from fastapi import FastAPI

from app.service.logging import get_bridge_logger

from ..config import SvcSettings

logger = get_bridge_logger(__name__)


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

    # Add legacy health and actuator endpoints (enhanced health via router)
    _add_health_endpoints(app)

    # Add metrics if enabled
    _configure_metrics(app, config)


def _include_core_routers(app: FastAPI) -> None:
    """Include all core application routers."""
    from app.router import agent_router, api_router
    from app.router.auth_router import router as auth_router
    from app.router.autonomous_investigation_router import router as structured_router
    from app.router.health_router import router as health_router
    from app.router.hybrid_graph_investigations_router import hybrid_graph_router
    from app.router.investigation_api import router as investigation_api_router
    from app.router.investigation_comparison_router import (
        router as investigation_comparison_router,
    )
    from app.router.investigation_state_router import (
        router as investigation_state_router,
    )
    from app.router.investigation_stream_router import (
        router as investigation_stream_router,
    )
    from app.router.kpi_router import router as kpi_router
    from app.router.mcp_bridge_router import router as mcp_bridge_router
    from app.router.performance_router import router as performance_router
    from app.router.polling_router import router as polling_router
    from app.router.reports_router import router as reports_router
    from app.router.smoke_test_router import router as smoke_test_router
    from app.router.template_router import router as template_router

    from .. import example

    # Include routers in order of dependency
    app.include_router(health_router)  # Enhanced health endpoints (no auth required)
    app.include_router(auth_router)  # Authentication routes (no auth required)
    app.include_router(smoke_test_router)  # Smoke test endpoints (no auth required)
    app.include_router(example.router)
    app.include_router(agent_router.router)
    app.include_router(api_router.router)
    app.include_router(
        investigation_state_router
    )  # Investigation state management (Feature 005)
    app.include_router(
        investigation_stream_router
    )  # Investigation event stream (Feature 001)
    app.include_router(template_router)  # Template management (Feature 005)
    app.include_router(polling_router)  # Adaptive polling (Feature 005)
    app.include_router(reports_router)  # Reports microservice (Feature 001)
    app.include_router(kpi_router)  # KPI Dashboard microservice
    # WebSocket router disabled - using polling only
    # app.include_router(websocket_router.router)
    app.include_router(mcp_bridge_router)
    app.include_router(performance_router)  # Performance monitoring and optimization
    app.include_router(structured_router)  # Structured investigation testing
    app.include_router(
        hybrid_graph_router, prefix="/api"
    )  # Hybrid graph investigations (Feature 006)
    app.include_router(
        investigation_api_router
    )  # OpenAPI schema-driven investigation API (Feature 001)
    app.include_router(
        investigation_comparison_router
    )  # Investigation comparison API (Feature 001-you-editing-fraud)

    logger.info("All core routers have been included (WebSocket disabled)")


def _register_error_handlers(app: FastAPI) -> None:
    """Register global error handlers."""
    from ..error_handling import register_error_handlers

    register_error_handlers(app)
    logger.info("Error handlers registered")


def _add_health_endpoints(app: FastAPI) -> None:
    """Add legacy health check and root endpoints for backward compatibility."""

    @app.get("/")
    async def root():
        """Root endpoint for basic connectivity test."""
        return {"message": "Olorin Fraud Investigation Platform", "status": "running"}

    try:
        from pskhealth import add_health_endpoint

        # Note: add_health_endpoint may try to add a lifespan, but we've already
        # merged pskhealth lifespan in olorin_factory.py before creating the app.
        # If add_health_endpoint tries to add another lifespan, it could cause
        # infinite recursion in FastAPI's merged_lifespan. We call it anyway
        # because it should detect that a lifespan already exists and skip adding one.
        add_health_endpoint(app)
        logger.info("pskhealth endpoints added successfully")
    except ImportError:
        logger.info("pskhealth not available, using enhanced health router")
    except Exception as e:
        # If add_health_endpoint fails (e.g., due to lifespan conflict), log and continue
        logger.warning(f"pskhealth add_health_endpoint failed (non-fatal): {e}")
        logger.info(
            "Continuing without pskhealth endpoints - enhanced health router available"
        )

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
