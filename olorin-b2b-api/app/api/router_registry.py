"""
Olorin B2B API Router Registry.

Registers only the Olorin platform routers for third-party B2B integration:
partner management, dubbing, semantic search, cultural context, recap, and
webhooks. Defines the MongoDB model subset needed by these routes.
"""

import logging

from fastapi import FastAPI

from app.core.config import settings

# MongoDB document models required by Olorin B2B routes
from app.models.content import Content
from app.models.content_embedding import ContentEmbedding, RecapSession
from app.models.cultural_reference import CulturalReference
from app.models.integration_partner import (
    DubbingSession,
    IntegrationPartner,
    UsageRecord,
    WebhookDelivery,
)
from app.models.live_dubbing import LiveDubbingSession
from app.models.user import User

logger = logging.getLogger(__name__)

SERVICE_MODELS: list[type] = [
    Content,
    User,
    IntegrationPartner,
    UsageRecord,
    DubbingSession,
    WebhookDelivery,
    ContentEmbedding,
    RecapSession,
    CulturalReference,
    LiveDubbingSession,
]


def register_routes(app: FastAPI) -> None:
    """Register Olorin B2B platform routers."""
    prefix = settings.API_V1_PREFIX

    from app.api.routes.olorin import (
        legacy_router as olorin_legacy_router,
        router as olorin_router,
    )

    app.include_router(olorin_router, prefix=prefix, tags=["olorin"])
    app.include_router(olorin_legacy_router, prefix=prefix, tags=["olorin-legacy"])

    logger.info(
        "Olorin B2B routes registered",
        extra={"prefix": prefix, "model_count": len(SERVICE_MODELS)},
    )
