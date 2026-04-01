"""
Router registry for Olorin Training Service.

Registers only the training routes extracted from the monolith.
Import paths match the monolith's router_registry.py exactly.
"""

import logging
from typing import List, Type

from beanie import Document
from fastapi import FastAPI

from app.core.config import settings

logger = logging.getLogger(__name__)

from app.models.integration_partner import IntegrationPartner
from app.models.training_user import TrainingUser
from app.models.training_progress import TrainingProgress
from app.models.training_assignment import TrainingAssignment
from app.models.ingest_job import IngestJob
from app.models.content import Content

SERVICE_MODELS: List[Type[Document]] = [
    IntegrationPartner,
    TrainingUser,
    TrainingProgress,
    TrainingAssignment,
    IngestJob,
    Content,
]


def register_routes(app: FastAPI) -> None:
    """Register training API routers (mirrors monolith Training section)."""
    prefix = settings.API_V1_PREFIX

    from app.api.routes.training import router as training_router

    app.include_router(training_router, prefix=prefix, tags=["training"])

    logger.info(
        "Training routes registered",
        extra={"prefix": prefix, "route_count": len(app.routes)},
    )
