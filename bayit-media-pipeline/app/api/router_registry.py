"""
Router registry for Bayit+ Media Pipeline Service.

Registers recording, schedule, and synced stream routes.
Resource-intensive service (ffmpeg, GCS) with independent CPU scaling.
"""

import logging
from typing import List, Type

from beanie import Document
from fastapi import FastAPI

from app.core.config import settings

logger = logging.getLogger(__name__)

from app.models.recording import RecordingSession, Recording, RecordingSchedule
from app.models.series_recording_rule import SeriesRecordingRule
from app.models.upload import (
    UploadJob,
    MonitoredFolder,
    BrowserUploadSession,
    UploadHashLock,
    UploadStats,
)
from app.models.content import Content, LiveChannel
from app.models.user import User

SERVICE_MODELS: List[Type[Document]] = [
    RecordingSession,
    Recording,
    RecordingSchedule,
    SeriesRecordingRule,
    UploadJob,
    MonitoredFolder,
    BrowserUploadSession,
    UploadHashLock,
    UploadStats,
    Content,
    LiveChannel,
    User,
]


def register_routes(app: FastAPI) -> None:
    """Register media pipeline API routers."""
    prefix = settings.API_V1_PREFIX

    from app.api.routes import (
        recordings,
        recording_queries,
        recording_schedules,
        recording_schedule_queries,
        series_recording_rules,
        synced_streams,
    )

    app.include_router(
        recordings.router,
        prefix=f"{prefix}/recordings",
        tags=["recordings"],
    )
    app.include_router(
        recording_queries.router,
        prefix=f"{prefix}/recordings",
        tags=["recordings"],
    )
    app.include_router(
        recording_schedules.router,
        prefix=f"{prefix}/recordings",
        tags=["recording-schedules"],
    )
    app.include_router(
        recording_schedule_queries.router,
        prefix=f"{prefix}/recordings",
        tags=["recording-schedules"],
    )
    app.include_router(
        series_recording_rules.router,
        prefix=f"{prefix}/recordings",
        tags=["series-recording-rules"],
    )
    app.include_router(
        synced_streams.router, prefix=prefix, tags=["synced-streams"]
    )

    logger.info(
        "Media pipeline routes registered",
        extra={"prefix": prefix, "route_count": len(app.routes)},
    )
