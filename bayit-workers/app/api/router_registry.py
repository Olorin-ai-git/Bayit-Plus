"""
Background Workers Router Registry.

Defines the subset of Beanie document models required by background workers
and registers a minimal health endpoint. Workers do not serve REST routes.
"""

import logging
from typing import List, Type

from beanie import Document
from fastapi import FastAPI

logger = logging.getLogger(__name__)

# Content models (podcast translation, EPG sync, folder monitoring)
from app.models.content import (
    Content,
    EPGEntry,
    LiveChannel,
    Podcast,
    PodcastEpisode,
    RadioStation,
    TranslationStageMetrics,
)

# Upload models (upload session cleanup, failed job cleanup)
from app.models.upload import (
    BrowserUploadSession,
    MonitoredFolder,
    UploadHashLock,
    UploadJob,
    UploadStats,
)

# Recording models (recording scheduler)
from app.models.recording import (
    Recording,
    RecordingSchedule,
    RecordingSession,
    RecordingSubtitleCue,
)
from app.models.series_recording_rule import SeriesRecordingRule

# Audit models (audit recovery service)
from app.models.admin import AuditLog

# Transcript Event Bus models (used by session/cleanup workers)
from app.models.highlight import LiveHighlight
from app.models.live_transcript_index import LiveTranscriptIndex

# Playback models (session cleanup)
from app.models.playback_session import PlaybackSession

# Cost models (cost rollup job)
from app.models.cost_breakdown import CostBreakdown, UserCostBreakdown

# Subtitle models (referenced by translation workers)
from app.models.subtitles import SubtitleTrackDoc, TranslationCacheDoc

# Live dubbing / feature quota models (session monitor)
from app.models.live_dubbing import LiveDubbingSession
from app.models.live_feature_quota import LiveFeatureQuota, LiveFeatureUsageSession

# User model (referenced by cost rollup and session queries)
from app.models.user import User

SERVICE_MODELS: List[Type[Document]] = [
    # Content
    Content,
    LiveChannel,
    Podcast,
    PodcastEpisode,
    TranslationStageMetrics,
    EPGEntry,
    RadioStation,
    # Uploads
    UploadJob,
    MonitoredFolder,
    UploadStats,
    BrowserUploadSession,
    UploadHashLock,
    # Recordings
    Recording,
    RecordingSchedule,
    RecordingSession,
    RecordingSubtitleCue,
    SeriesRecordingRule,
    # Audit
    AuditLog,
    # Transcript
    LiveHighlight,
    LiveTranscriptIndex,
    # Playback
    PlaybackSession,
    # Cost
    UserCostBreakdown,
    CostBreakdown,
    # Subtitles
    SubtitleTrackDoc,
    TranslationCacheDoc,
    # Live features
    LiveDubbingSession,
    LiveFeatureQuota,
    LiveFeatureUsageSession,
    # User
    User,
]


def register_routes(app: FastAPI) -> None:
    """Register minimal routes for the workers service (health only)."""

    @app.get("/health")
    async def health_check():
        """Workers health check for Cloud Run."""
        return {"status": "healthy", "service": "bayit-workers"}

    logger.info("Workers routes registered: /health")
