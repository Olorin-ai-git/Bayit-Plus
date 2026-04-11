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
from app.models.vod_interaction import VODInteractionSession
from app.models.b2b_content_source import B2BContentSource
from app.models.chapters import VideoChapters
from app.models.talk_back_point import ContentTalkBack
from app.models.talk_back_attempt import TalkBackAttempt
from app.models.user import User

SERVICE_MODELS: List[Type[Document]] = [
    IntegrationPartner,
    TrainingUser,
    TrainingProgress,
    TrainingAssignment,
    IngestJob,
    Content,
    VODInteractionSession,
    B2BContentSource,
    VideoChapters,
    ContentTalkBack,
    TalkBackAttempt,
    User,
]


def register_routes(app: FastAPI) -> None:
    """Register training API routers (mirrors monolith Training section)."""
    prefix = settings.API_V1_PREFIX

    from app.api.routes.training import router as training_router
    from app.api.routes.companion import router as companion_router
    from app.api.routes.vod_interactions import router as vod_router
    from app.api.routes.pause_ask_jobs import router as pause_ask_router
    from app.api.routes.talk_back.talk_back_core import (
        router as talk_back_router,
    )

    app.include_router(training_router, prefix=prefix, tags=["training"])
    app.include_router(
        companion_router,
        prefix=f"{prefix}/training/companion",
        tags=["companion"],
    )
    app.include_router(vod_router, prefix=prefix, tags=["vod-interactions"])
    app.include_router(pause_ask_router, prefix=prefix, tags=["pause-ask"])
    app.include_router(talk_back_router, prefix=prefix, tags=["talk-back"])

    logger.info(
        "Training routes registered",
        extra={"prefix": prefix, "route_count": len(app.routes)},
    )
