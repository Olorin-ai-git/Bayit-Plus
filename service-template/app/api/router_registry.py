"""
Router registry for Bayit+ Service Template.

Registers only the routes this service is responsible for.
Import routes from the monolith's app/api/routes/ modules.

Customize SERVICE_MODELS with only the Beanie Document classes needed.
"""

import logging
from typing import List, Type

from beanie import Document
from fastapi import FastAPI

from app.core.config import settings

logger = logging.getLogger(__name__)

# Beanie models this service needs (registered during startup).
# Add only the Document subclasses your routes actually use.
SERVICE_MODELS: List[Type[Document]] = [
    # Example:
    # from app.models.user import User
    # User,
]


def register_routes(app: FastAPI) -> None:
    """Register this service's API routers."""
    prefix = settings.API_V1_PREFIX

    # Example:
    # from app.api.routes import some_module
    # app.include_router(some_module.router, prefix=f"{prefix}/path", tags=["tag"])

    logger.info(
        "Service routes registered",
        extra={"prefix": prefix, "route_count": len(app.routes)},
    )
