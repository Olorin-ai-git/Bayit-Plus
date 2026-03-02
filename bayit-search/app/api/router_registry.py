"""
Router registry for Bayit+ Search Service.

Registers only the search routes extracted from the monolith's Content Routes
section. Import paths match the monolith's router_registry.py exactly.
"""

import logging
from typing import List, Type

from beanie import Document
from fastapi import FastAPI

from app.core.config import settings

logger = logging.getLogger(__name__)

# Beanie Document models this service needs (registered during startup).
# Covers search queries, content lookups, embeddings, subtitles, and auth.
from app.models.content import Content
from app.models.subtitles import SubtitleTrackDoc
from app.models.live_transcript_index import LiveTranscriptIndex
from app.models.search_analytics import SearchQuery
from app.models.search_history import SearchHistory
from app.models.content_embedding import ContentEmbedding
from app.models.user import User
from app.models.beta_credit import BetaCredit

SERVICE_MODELS: List[Type[Document]] = [
    Content,
    SubtitleTrackDoc,
    LiveTranscriptIndex,
    SearchQuery,
    SearchHistory,
    ContentEmbedding,
    User,
    BetaCredit,
]


def register_routes(app: FastAPI) -> None:
    """Register search API routers (mirrors monolith Content Routes section)."""
    prefix = settings.API_V1_PREFIX

    from app.api.routes import (
        search,
        search_client,
        search_history,
        search_analytics,
        search_suggestions,
        search_scenes,
        search_llm,
    )

    app.include_router(search.router, prefix=prefix, tags=["search"])
    app.include_router(search_client.router, prefix=prefix, tags=["search"])
    app.include_router(
        search_history.router, prefix=prefix, tags=["search", "history"]
    )
    app.include_router(
        search_analytics.router, prefix=prefix, tags=["search", "analytics"]
    )
    app.include_router(
        search_suggestions.router, prefix=prefix, tags=["search", "suggestions"]
    )
    app.include_router(
        search_scenes.router, prefix=prefix, tags=["search", "scenes"]
    )
    app.include_router(search_llm.router, prefix=prefix, tags=["search", "llm"])

    logger.info(
        "Search routes registered",
        extra={"prefix": prefix, "route_count": len(app.routes)},
    )
