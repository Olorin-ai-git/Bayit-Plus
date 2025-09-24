"""
Olorin Service Module - Refactored for 200-line compliance.

This module provides the main service orchestration for the Olorin Fraud Detection System.
All functionality has been preserved through modular extraction while maintaining
backward compatibility with existing imports.
"""

import logging
from app.service.logging import get_bridge_logger
import os
import uuid
from typing import Callable, Optional

from fastapi import FastAPI, Request, Response
from starlette.datastructures import Headers

from .auth import check_route_allowed
from .config import (
    LocalSettings,
    PRDSettings,
    SvcSettings,
)
from .error_handling import register_error_handlers
from .factory import OlorinApplication
from .logging_helper import RequestFormatter, logging_context
from .performance import initialize_performance_system, shutdown_performance_system

# Import health functionality with fallback
try:
    from pskhealth import add_health_endpoint, lifespan_function
except ImportError:
    # Fallback for when pskhealth is not available (e.g., in tests)
    def add_health_endpoint(app):
        pass

    lifespan_function = None

logger = get_bridge_logger(__name__)
module_name = "olorin"
service_name = "olorin"


async def inject_transaction_id(request: Request, call_next: Callable) -> Response:
    """Middleware that Injects Olorin TID into the request & response

    Something to note is that Gateway automatically injects a tid if there isn't one,
    but it doesn't use UUIDs, it seems to use Amazons Trace ID, which looks like
    '1-61c4fe1f-515d47eb73b71369335f8225'. This has caused issues in the past if you
    assume tid will be a UUID. Consider it a string with any characters allowed.
    """
    # based on https://github.olorin.com/global-core/global-content-service/blob/master/app/api/middleware.py
    olorin_tid = request.headers.get("olorin_tid", str(uuid.uuid4()))
    request.state.olorin_tid = olorin_tid
    with logging_context(olorin_tid=olorin_tid):
        response: Response = await call_next(request)
        response.headers["olorin_tid"] = olorin_tid
        return response


def configure_logger(app):
    """Configure application logging with unified logging integration."""
    # Use unified logging bridge for enhanced functionality
    # while maintaining backward compatibility
    try:
        from .logging.integration_bridge import bridge_configure_logger
        bridge_configure_logger(app)
    except Exception as e:
        # Fallback to legacy logging configuration if bridge fails
        logger.warning(f"Unified logging bridge failed, using legacy configuration: {e}")
        _legacy_configure_logger(app)


def _legacy_configure_logger(app):
    """Legacy logging configuration as fallback."""
    handler = logging.StreamHandler()
    formatter = RequestFormatter(
        "[%(asctime)s] %(levelname)s [%(context)s] module=%(module)s: %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S%z",
    )
    handler.setFormatter(formatter)
    level = getattr(logging, app.state.config.log_level.upper())

    # see logs from other libraries
    root = logging.getLogger()
    # remove handlers created by libraries e.g. mlctl
    # copy the list because this mutates it
    for h in root.handlers[:]:
        root.removeHandler(h)
    root.addHandler(handler)
    root.setLevel(level)


_ENV_SETTINGS = {
    "local": LocalSettings,
    "prd": PRDSettings,
}


def _settings_factory() -> SvcSettings:
    """Create service settings based on environment."""
    env = os.getenv("APP_ENV", "local")
    return _ENV_SETTINGS[env]()


async def on_startup(app: FastAPI):
    """
    Application startup handler with performance optimization integration.

    This function is a co-routine and takes only one required argument app.
    It executes at the time of startup of the application.
    Tasks such as establishing a database connection or loading a ML model can be performed here.

    Args:
        app(FastAPI): FastAPI app object.
    """
    print("🚀 DEBUG: on_startup function called!")  # Debug print that should always show
    logger.info("🚀 Starting Olorin application...")
    # Initialize performance optimization system
    await initialize_performance_system(app)
    
    # Initialize the agent system
    from .agent_init import initialize_agent
    await initialize_agent(app)
    
    # Load top risk entities from Snowflake
    logger.info("🔄 Starting Snowflake connection process...")
    try:
        logger.info("📋 Loading top risk entities from Snowflake...")
        logger.info("📦 Importing risk analyzer...")
        from app.service.analytics.risk_analyzer import get_risk_analyzer

        logger.info("🏭 Creating risk analyzer instance...")
        analyzer = get_risk_analyzer()

        logger.info("🔌 Attempting to connect to Snowflake and fetch top risk entities...")
        results = await analyzer.get_top_risk_entities()

        logger.info(f"📊 Risk analyzer returned results: {type(results)} with keys: {list(results.keys()) if isinstance(results, dict) else 'Not a dict'}")

        if results.get('status') == 'success':
            entity_count = len(results.get('entities', []))
            logger.info(f"✅ Successfully loaded {entity_count} top risk entities from Snowflake")

            # Store in app state for quick access
            app.state.top_risk_entities = results
            app.state.risk_entities_loaded_at = results.get('timestamp')
            logger.info("💾 Stored risk entities in app state")
        else:
            error_msg = results.get('error', 'Unknown error')
            logger.warning(f"⚠️ Failed to load risk entities: {error_msg}")
            logger.warning(f"📄 Full results: {results}")
            app.state.top_risk_entities = None
    except Exception as e:
        logger.error(f"❌ Error loading risk entities on startup: {e}")
        logger.error(f"🔍 Exception type: {type(e).__name__}")
        import traceback
        logger.error(f"📜 Full traceback: {traceback.format_exc()}")
        app.state.top_risk_entities = None
    
    logger.info("Olorin application startup completed")


async def on_shutdown(app: FastAPI):
    """
    Application shutdown handler with performance system cleanup.
    
    This function is a co-routine and takes only one required argument app.
    It executes at the time of shutdown of the application.
    Tasks such as closing database connection can be performed here.

    Args:
        app(FastAPI): FastAPI app object.
    """
    logger.info("Shutting down Olorin application...")
    
    # Cleanup async HTTP clients to prevent unclosed session warnings
    try:
        from app.service.agent.tools.async_client_manager import cleanup_async_clients
        await cleanup_async_clients()
        logger.info("✅ Async client cleanup completed")
    except Exception as e:
        logger.warning(f"⚠️ Async client cleanup failed: {e}")
    
    # Shutdown performance optimization system
    await shutdown_performance_system(app)
    logger.info("Olorin application shutdown completed")


def create_app(
    test_config: Optional[SvcSettings] = None, lifespan: Optional[Callable] = None
) -> FastAPI:
    """
    Factory function to create the FastAPI app via OlorinApplication.
    
    Args:
        test_config: Optional test configuration override
        lifespan: Optional custom lifespan function
        
    Returns:
        Configured FastAPI application instance
    """
    return OlorinApplication(
        test_config=test_config, 
        lifespan=lifespan,
        settings_factory=_settings_factory
    ).app


# Dummy implementations for backward compatibility and test patching
def expose_metrics(app):
    """Dummy metrics exposure for backward compatibility."""
    pass


def add_actuator_endpoints(app):
    """Dummy actuator endpoints for backward compatibility."""
    pass


def get_app_kwargs(*args, **kwargs):
    """Dummy function for backward compatibility."""
    return {}


# Preserve all original exports for backward compatibility
__all__ = [
    # Configuration classes
    "LocalSettings", 
    "PRDSettings",
    "SvcSettings",
    # Factory functions
    "_settings_factory",
    "create_app",
    # Core classes
    "OlorinApplication",
    # Lifecycle functions
    "on_startup",
    "on_shutdown",
    # Middleware and utilities
    "inject_transaction_id",
    "configure_logger",
    # Backward compatibility
    "expose_metrics",
    "add_actuator_endpoints",
    "get_app_kwargs",
]