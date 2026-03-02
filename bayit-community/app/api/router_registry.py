"""
Router registry for Bayit+ Community Service.

Registers Judaism, news, Jerusalem, Tel Aviv, cultures, support,
widgets, trivia, feature validation, and onboarding routes.
"""

import logging
from typing import List, Type

from beanie import Document
from fastapi import FastAPI

from app.core.config import settings

logger = logging.getLogger(__name__)

from app.models.user import User
from app.models.content import Content
from app.models.jewish_news import JewishNewsSource, JewishNewsItem
from app.models.jewish_calendar import JewishCalendarCache
from app.models.jewish_community import JewishOrganization, CommunityEvent, ScrapingJob
from app.models.jerusalem_content import JerusalemContentSource, JerusalemContentItem
from app.models.tel_aviv_content import TelAvivContentSource, TelAvivContentItem
from app.models.culture import Culture, CultureCity, CultureNewsSource, CultureContentItem
from app.models.cultural_reference import CulturalReference
from app.models.support import SupportTicket, SupportConversation, SupportAnalytics, FAQEntry
from app.models.widget import Widget
from app.models.user_system_widget import UserSystemWidget
from app.models.trivia import ContentTrivia
from app.models.live_trivia import LiveTriviaTopic, LiveTriviaSession
from app.models.documentation import DocumentationArticle, DocumentationCategory

SERVICE_MODELS: List[Type[Document]] = [
    User,
    Content,
    JewishNewsSource,
    JewishNewsItem,
    JewishCalendarCache,
    JewishOrganization,
    CommunityEvent,
    ScrapingJob,
    JerusalemContentSource,
    JerusalemContentItem,
    TelAvivContentSource,
    TelAvivContentItem,
    Culture,
    CultureCity,
    CultureNewsSource,
    CultureContentItem,
    CulturalReference,
    SupportTicket,
    SupportConversation,
    SupportAnalytics,
    FAQEntry,
    Widget,
    UserSystemWidget,
    ContentTrivia,
    LiveTriviaTopic,
    LiveTriviaSession,
    DocumentationArticle,
    DocumentationCategory,
]


def register_routes(app: FastAPI) -> None:
    """Register community API routers."""
    prefix = settings.API_V1_PREFIX

    from app.api.routes import (
        judaism,
        news,
        jerusalem,
        tel_aviv,
        cultures,
        support,
        zman,
        ritual,
        onboarding,
        widget_toggle,
        widgets,
        user_system_widgets,
        trivia,
    )
    from app.api.routes.features import validation as features_validation

    # Feature validation for iOS/tvOS (server-side security)
    app.include_router(
        features_validation.router,
        prefix=prefix,
        tags=["feature-validation"],
    )
    # IMPORTANT: Register widget_toggle BEFORE widgets to avoid routing conflicts
    app.include_router(
        widget_toggle.router,
        prefix=prefix,
        tags=["widget-toggle"],
    )
    app.include_router(
        widgets.router, prefix=f"{prefix}/widgets", tags=["widgets"]
    )
    app.include_router(
        user_system_widgets.router,
        prefix=f"{prefix}/widgets/system",
        tags=["user-system-widgets"],
    )
    app.include_router(zman.router, prefix=f"{prefix}/zman", tags=["zman"])
    app.include_router(ritual.router, prefix=prefix, tags=["ritual"])
    app.include_router(
        onboarding.router,
        prefix=f"{prefix}/onboarding/ai",
        tags=["ai-onboarding"],
    )
    app.include_router(news.router, prefix=f"{prefix}/news", tags=["news"])
    app.include_router(
        support.router, prefix=f"{prefix}/support", tags=["support"]
    )
    app.include_router(
        trivia.router, prefix=f"{prefix}/trivia", tags=["trivia"]
    )
    app.include_router(
        judaism.router, prefix=f"{prefix}/judaism", tags=["judaism"]
    )
    app.include_router(
        jerusalem.router, prefix=f"{prefix}/jerusalem", tags=["jerusalem"]
    )
    app.include_router(
        tel_aviv.router, prefix=f"{prefix}/tel-aviv", tags=["tel-aviv"]
    )
    app.include_router(
        cultures.router, prefix=f"{prefix}/cultures", tags=["cultures"]
    )

    logger.info(
        "Community routes registered",
        extra={"prefix": prefix, "route_count": len(app.routes)},
    )
