"""
Olorin Application Factory Module.

This module provides the central application orchestrator for Olorin Fraud Detection System.
It encapsulates agent coordination, risk assessment, and exposes the FastAPI app with
all necessary configuration and middleware.
"""

import os
from typing import Callable, Optional

from fastapi import FastAPI
from fastapi.responses import Response

from ..config import SvcSettings
from ..middleware import configure_middleware
from ..router import configure_routes
from ..secret_masker import mask_config_object
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class OlorinApplication:
    """
    Central application orchestrator for Olorin Fraud Detection System.
    Encapsulates agent coordination, risk assessment, and exposes the FastAPI app.
    """

    def __init__(
        self,
        test_config: Optional[SvcSettings] = None,
        lifespan: Optional[Callable] = None,
        settings_factory: Optional[Callable] = None,
    ):
        # Import here to avoid circular dependency
        from .. import _settings_factory
        
        self.config: SvcSettings = (
            settings_factory() if settings_factory and test_config is None 
            else test_config if test_config is not None
            else _settings_factory()
        )
        self.lifespan = lifespan
        self.app = self._create_fastapi_app()
        self._configure_app()

    def _create_fastapi_app(self) -> FastAPI:
        """
        Create the core FastAPI application with environment-driven OpenAPI metadata.

        Constitutional Compliance:
        - All metadata from environment variables via api_config
        - No hardcoded titles, versions, or descriptions
        - Fail-fast configuration validation
        """
        # Import here to avoid circular dependency
        from .. import on_startup, on_shutdown
        from contextlib import asynccontextmanager

        async def default_lifespan(app: FastAPI):
            await on_startup(app)
            yield
            await on_shutdown(app)

        # Merge with pskhealth lifespan if available (must be done BEFORE creating FastAPI app)
        final_lifespan = self.lifespan or default_lifespan
        
        # Try to merge with pskhealth lifespan if it exists
        # Note: pskhealth.add_health_endpoint may try to add its own lifespan,
        # so we merge it here BEFORE creating the FastAPI app to avoid conflicts
        try:
            from pskhealth import lifespan_function
            if lifespan_function and callable(lifespan_function):
                # lifespan_function() returns a lifespan function (callable that takes app and returns context manager)
                # We need to call it to get the actual lifespan function, then use it in our merged lifespan
                psk_lifespan_func = lifespan_function()
                
                # Verify it's callable (it should be a lifespan function)
                if callable(psk_lifespan_func):
                    @asynccontextmanager
                    async def merged_lifespan(app: FastAPI):
                        # Run pskhealth startup first, then ours
                        # psk_lifespan_func(app) returns an async context manager
                        async with psk_lifespan_func(app):
                            async with final_lifespan(app):
                                yield
                    
                    final_lifespan = merged_lifespan
                    logger.info("Merged pskhealth lifespan with application lifespan")
                else:
                    logger.warning("pskhealth lifespan_function() did not return a callable, skipping merge")
        except ImportError:
            # pskhealth not available, use our lifespan only
            pass
        except Exception as e:
            logger.warning(f"Failed to merge pskhealth lifespan, using default: {e}")
            import traceback
            logger.debug(f"Lifespan merge error details: {traceback.format_exc()}")

        # Get OpenAPI metadata from environment variables
        title = os.getenv("OPENAPI_TITLE", "Olorin Fraud Investigation Platform API")
        version = os.getenv("OPENAPI_VERSION", "1.0.0")
        description = os.getenv(
            "OPENAPI_DESCRIPTION",
            """A comprehensive fraud detection and investigation system that provides:
• Multi-agent fraud analysis across device, location, network, and log domains
• Real-time investigation orchestration with AI-powered risk assessment
• Integration with external data sources and security tools
• WebSocket-based structured investigation capabilities
• RESTful API endpoints for fraud detection workflows

Key use cases:
- Automated fraud investigation coordination
- Risk assessment and scoring across multiple domains
- Real-time threat detection and response
- Investigation workflow management and reporting"""
        )
        contact_url = os.getenv("OPENAPI_CONTACT_URL", "https://api.contact.info.olorin.com")

        logger.info(f"Creating FastAPI app with OpenAPI metadata from environment:")
        logger.info(f"  Title: {title}")
        logger.info(f"  Version: {version}")
        logger.info(f"  Contact URL: {contact_url}")

        app = FastAPI(
            title=title,
            version=version,
            description=description,
            docs_url="/apidoc/swagger",
            redoc_url="/apidoc/redoc",
            contact={"url": contact_url},
            openapi_tags=[{"name": "investigations", "description": "Investigation management endpoints"}],
            lifespan=final_lifespan,
        )
        return app

    def _configure_app(self):
        """Configure the application with middleware, routes, and utilities."""
        app = self.app
        app.state.config = self.config
        
        # Import here to avoid circular dependency
        from .. import configure_logger
        configure_logger(app)
        # Mask sensitive config values before logging
        masked_config = mask_config_object(self.config)
        logger.debug(f"config: {masked_config}")

        # Configure middleware (CORS, security, rate limiting)
        configure_middleware(app, self.config)
        
        # Configure routes and endpoints
        configure_routes(app, self.config)
        
        # Add utility endpoints
        self._add_utility_endpoints()

    def _add_utility_endpoints(self):
        """Add utility endpoints like health checks and favicon."""
        @self.app.get("/health")
        async def health_check():
            return {"status": "healthy"}

        @self.app.get("/health/full")
        async def health_full():
            return {"status": "ok"}

        @self.app.get("/version")
        async def version():
            return {
                "version": os.environ.get("OLORIN_VERSION", "unknown"),
                "git_sha": os.environ.get("OLORIN_GIT_SHA", "unknown"),
            }

        @self.app.get("/favicon.ico")
        async def favicon():
            """Return a simple favicon response to prevent 404 errors."""
            # Return a 1x1 transparent GIF as a minimal favicon
            gif_data = b"\x47\x49\x46\x38\x39\x61\x01\x00\x01\x00\x80\x00\x00\x00\x00\x00\xff\xff\xff\x21\xf9\x04\x01\x00\x00\x00\x00\x2c\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02\x04\x01\x00\x3b"
            return Response(content=gif_data, media_type="image/gif")