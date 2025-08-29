"""
Olorin Application Factory Module.

This module provides the central application orchestrator for Olorin Fraud Detection System.
It encapsulates agent coordination, risk assessment, and exposes the FastAPI app with
all necessary configuration and middleware.
"""

import logging
import os
from typing import Callable, Optional

from fastapi import FastAPI
from fastapi.responses import Response

from ..config import SvcSettings
from ..middleware import configure_middleware
from ..router import configure_routes

logger = logging.getLogger(__name__)


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
        """Create the core FastAPI application with proper lifespan management."""
        # Import here to avoid circular dependency
        from .. import on_startup, on_shutdown
        
        async def default_lifespan(app: FastAPI):
            await on_startup(app)
            yield
            await on_shutdown(app)

        app = FastAPI(
            title="olorin",
            description="""
            Olorin Fraud Investigation Platform API
            
            A comprehensive fraud detection and investigation system that provides:
            • Multi-agent fraud analysis across device, location, network, and log domains
            • Real-time investigation orchestration with AI-powered risk assessment
            • Integration with external data sources and security tools
            • WebSocket-based autonomous investigation capabilities
            • RESTful API endpoints for fraud detection workflows
            
            Key use cases:
            - Automated fraud investigation coordination
            - Risk assessment and scoring across multiple domains
            - Real-time threat detection and response
            - Investigation workflow management and reporting
            """,
            docs_url="/apidoc/swagger",
            redoc_url="/apidoc/redoc",
            # Authentication now handled per-route basis
            contact={"url": "https://api.contact.info.olorin.com"},
            openapi_tags=[{"name": "example", "description": "Example API endpoints"}],
            lifespan=self.lifespan or default_lifespan,
        )
        return app

    def _configure_app(self):
        """Configure the application with middleware, routes, and utilities."""
        app = self.app
        app.state.config = self.config
        
        # Import here to avoid circular dependency
        from .. import configure_logger
        configure_logger(app)
        logger.info(f"config: {self.config}")

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