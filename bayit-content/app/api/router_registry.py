"""
Router registry for Bayit+ Content Service.

Registers content catalog, live TV, radio, podcasts, audiobooks,
EPG, subtitles, audio tracks, and trending routes.
"""

import logging
from typing import List, Type

from beanie import Document
from fastapi import FastAPI

from app.core.config import settings

logger = logging.getLogger(__name__)

from app.models.content import (
    Content,
    LiveChannel,
    EPGEntry,
    RadioStation,
    Podcast,
    PodcastEpisode,
    TranslationStageMetrics,
)
from app.models.subtitles import (
    SubtitleTrackDoc,
    TranslationCacheDoc,
    SubtitleSearchCacheDoc,
    SubtitleQuotaTrackerDoc,
)
from app.models.subtitle_preferences import SubtitlePreference
from app.models.recording_subtitle_cue import RecordingSubtitleCue
from app.models.chat_translation import ChatTranslationCacheDoc
from app.models.ai_generation_job import AIGenerationJob
from app.models.audio_tracks import AudioTrackDoc
from app.models.content_taxonomy import ContentSection, SectionSubcategory, Genre, Audience
from app.models.chapters import VideoChapters
from app.models.trending import TrendingSnapshot, ContentTrendMatch
from app.models.user_podcast_subscription import UserPodcastSubscription
from app.models.character import Character
from app.models.user import User
from app.models.beta_credit import BetaCredit
from app.models.search_analytics import SearchQuery
from app.models.live_feature_quota import LiveFeatureQuota, LiveFeatureUsageSession
from app.models.kids_content import KidsContentSource
from app.models.youngsters_content import YoungstersContentSource

SERVICE_MODELS: List[Type[Document]] = [
    AIGenerationJob,
    Content,
    LiveChannel,
    EPGEntry,
    RadioStation,
    Podcast,
    PodcastEpisode,
    TranslationStageMetrics,
    SubtitleTrackDoc,
    TranslationCacheDoc,
    SubtitleSearchCacheDoc,
    SubtitleQuotaTrackerDoc,
    SubtitlePreference,
    RecordingSubtitleCue,
    ChatTranslationCacheDoc,
    AudioTrackDoc,
    ContentSection,
    SectionSubcategory,
    Genre,
    Audience,
    VideoChapters,
    TrendingSnapshot,
    ContentTrendMatch,
    UserPodcastSubscription,
    Character,
    User,
    BetaCredit,
    SearchQuery,
    LiveFeatureQuota,
    LiveFeatureUsageSession,
    KidsContentSource,
    YoungstersContentSource,
]


def register_routes(app: FastAPI) -> None:
    """Register content API routers (mirrors monolith Content Routes section)."""
    prefix = settings.API_V1_PREFIX

    from app.api.routes import (
        content,
        content_taxonomy,
        live,
        live_quota,
        radio,
        podcasts,
        audiobooks,
        epg,
        chapters,
        subtitles_tracks,
        subtitles_cues,
        subtitles_translation,
        subtitle_preferences,
        vod_audio_tracks,
        trending,
        media_proxy,
        channel_chat,
    )
    from app.api.v1.endpoints import subtitles as subtitles_vtt

    app.include_router(content.router, prefix=f"{prefix}/content", tags=["content"])
    app.include_router(
        content_taxonomy.router, prefix=prefix, tags=["content-taxonomy"]
    )
    app.include_router(live.router, prefix=f"{prefix}/live", tags=["live"])
    app.include_router(live_quota.router, prefix=prefix, tags=["live-quota"])
    app.include_router(radio.router, prefix=f"{prefix}/radio", tags=["radio"])
    app.include_router(podcasts.router, prefix=f"{prefix}/podcasts", tags=["podcasts"])
    app.include_router(
        audiobooks.router, prefix=f"{prefix}/audiobooks", tags=["audiobooks"]
    )
    app.include_router(epg.router, prefix=f"{prefix}/epg", tags=["epg"])
    app.include_router(chapters.router, prefix=f"{prefix}/chapters", tags=["chapters"])
    app.include_router(subtitles_tracks.router, prefix=prefix, tags=["subtitles"])
    app.include_router(subtitles_cues.router, prefix=prefix, tags=["subtitles"])
    app.include_router(
        subtitles_translation.router, prefix=prefix, tags=["subtitles"]
    )
    app.include_router(
        subtitles_vtt.router, prefix=f"{prefix}/subtitles", tags=["subtitles"]
    )
    app.include_router(
        subtitle_preferences.router,
        prefix=f"{prefix}/subtitles",
        tags=["subtitle-preferences"],
    )
    app.include_router(
        vod_audio_tracks.router,
        prefix=prefix,
        tags=["vod-audio-tracks"],
    )
    app.include_router(
        trending.router, prefix=f"{prefix}/trending", tags=["trending"]
    )
    app.include_router(
        media_proxy.router, prefix="/api", tags=["media-proxy", "transcode"]
    )
    # Channel chat REST (paths under /live/ and /content/)
    app.include_router(
        channel_chat.router,
        prefix=prefix,
        tags=["channel-chat"],
    )

    logger.info(
        "Content routes registered",
        extra={"prefix": prefix, "route_count": len(app.routes)},
    )
