"""
Reel Compositor Service

Generates shareable video reels from VOD interaction sessions.
Collects dialogue exchange videos from sessions, concatenates via FFmpeg,
uploads to GCS, and returns a VODInteractionReel document.
"""

import secrets
from datetime import datetime, timezone
from typing import List

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.vod_interaction import (
    VODInteractionReel,
    VODInteractionSession,
    VideoSegment,
)

logger = get_logger(__name__)


class ReelCompositorService:
    """Generates highlight reels from VOD interaction sessions."""

    async def generate_reel(
        self,
        user_id: str,
        profile_id: str,
        content_id: str,
        session_ids: List[str],
    ) -> VODInteractionReel:
        """
        Generate a reel from completed interaction sessions.

        Pipeline: validate sessions -> collect video segments ->
        FFmpeg concat -> GCS upload -> persist reel document.
        """
        sessions = await self._validate_sessions(
            user_id, session_ids,
        )

        segments = self._collect_video_segments(sessions)
        if not segments:
            raise ValueError(
                "No video segments found in provided sessions"
            )

        total_duration = sum(seg.duration for seg in segments)

        reel = VODInteractionReel(
            user_id=user_id,
            profile_id=profile_id,
            content_id=content_id,
            session_ids=session_ids,
            duration=total_duration,
            video_gcs_path="",
            thumbnail_url="",
            share_token=secrets.token_urlsafe(32),
            credits_charged=settings.CREDIT_RATE_VOD_INTERACTION_REEL,
        )
        await reel.insert()

        try:
            video_path = await self._render_and_upload(
                reel_id=str(reel.id),
                user_id=user_id,
                segments=segments,
            )

            thumbnail_path = self._derive_thumbnail_path(video_path)

            reel.video_gcs_path = video_path
            reel.thumbnail_url = thumbnail_path
            await reel.save()

            logger.info(
                "VOD interaction reel generated",
                extra={
                    "reel_id": str(reel.id),
                    "user_id": user_id,
                    "session_count": len(session_ids),
                    "duration": total_duration,
                    "credits_charged": reel.credits_charged,
                },
            )

        except Exception as exc:
            await reel.delete()
            logger.error(
                "Reel generation failed",
                extra={
                    "reel_id": str(reel.id),
                    "error": str(exc),
                },
            )
            raise

        return reel

    async def _validate_sessions(
        self,
        user_id: str,
        session_ids: List[str],
    ) -> List[VODInteractionSession]:
        """Fetch and validate ownership of all sessions."""
        sessions: List[VODInteractionSession] = []
        for sid in session_ids:
            session = await VODInteractionSession.get(sid)
            if not session:
                raise ValueError(f"Session not found: {sid}")
            if session.user_id != user_id:
                raise ValueError(f"Session not owned by user: {sid}")
            if session.status != "completed":
                raise ValueError(f"Session not completed: {sid}")
            sessions.append(session)
        return sessions

    def _collect_video_segments(
        self,
        sessions: List[VODInteractionSession],
    ) -> List[VideoSegment]:
        """Extract animated video URLs from dialogue exchanges."""
        segments: List[VideoSegment] = []
        for session in sessions:
            for exchange in session.dialogue_exchanges:
                if exchange.animated_video_url:
                    segments.append(
                        VideoSegment(
                            path=exchange.animated_video_url,
                            start_time=0.0,
                            end_time=0.0,
                            duration=0.0,
                        )
                    )
        return segments

    async def _render_and_upload(
        self,
        reel_id: str,
        user_id: str,
        segments: List[VideoSegment],
    ) -> str:
        """Concatenate segments with FFmpeg and upload to GCS."""
        from app.services.olorin.storage_service import storage_service

        from app.services.zeh_ani.highlight_rendering import (
            render_reel,
        )

        video_path, _thumb = await render_reel(
            user_id, reel_id, segments,
        )

        gcs_path = (
            f"vod-interaction-reels/{user_id}/{reel_id}.mp4"
        )
        await storage_service.upload_file(video_path, gcs_path)

        return gcs_path

    @staticmethod
    def _derive_thumbnail_path(video_path: str) -> str:
        """Derive thumbnail GCS path from video path."""
        return video_path.replace(".mp4", "_thumb.jpg")


reel_compositor_service = ReelCompositorService()
