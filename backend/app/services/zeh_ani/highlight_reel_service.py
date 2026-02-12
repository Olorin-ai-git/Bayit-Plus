"""
Highlight Reel Service.

Auto-generates 30-second video compilations of a child's best Hebrew
learning moments. Selects top interactions using Claude, concatenates
with FFmpeg crossfade transitions, and prepares for sharing.
"""

import secrets
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.highlight_reel import (
    HighlightMoment,
    HighlightReel,
    HighlightSourceType,
    ReelStatus,
)
from app.models.phonetic_mirror_attempt import PhoneticMirrorAttempt
from app.models.v2v_session import V2VSession

logger = get_logger(__name__)


class HighlightReelService:
    """Generates and manages highlight reels of learning moments."""

    async def generate_highlight_reel(
        self,
        user_id: str,
        profile_id: str,
        avatar_id: str,
        time_range_hours: int = 24,
    ) -> HighlightReel:
        """
        Generate a new highlight reel from the child's best moments.

        Pipeline: collect interactions -> rank with Claude -> select
        top moments -> FFmpeg concat -> GCS upload -> share token.
        """
        reel = HighlightReel(
            user_id=user_id,
            profile_id=profile_id,
            avatar_id=avatar_id,
            share_token=secrets.token_urlsafe(32),
            status=ReelStatus.SELECTING,
        )
        await reel.insert()

        try:
            moments = await self._collect_moments(
                user_id, profile_id, time_range_hours,
            )

            min_interactions = settings.HIGHLIGHT_REEL_MIN_INTERACTIONS
            if len(moments) < min_interactions:
                reel.status = ReelStatus.FAILED
                reel.error_message = (
                    f"Insufficient interactions ({len(moments)}/{min_interactions})"
                )
                await reel.save()
                return reel

            selected = await self._rank_and_select(moments)
            reel.moments = selected
            reel.status = ReelStatus.RENDERING
            await reel.save()

            video_path, thumb_path = await self._render_reel(
                user_id, profile_id, selected,
            )

            deduct_success = await self._deduct_credits(user_id)
            if not deduct_success:
                reel.status = ReelStatus.FAILED
                reel.error_message = "Insufficient credits"
                reel.updated_at = datetime.now(timezone.utc)
                await reel.save()
                return reel

            reel.video_gcs_path = video_path
            reel.thumbnail_gcs_path = thumb_path
            reel.status = ReelStatus.READY
            reel.credits_charged = settings.CREDIT_RATE_HIGHLIGHT_REEL
            reel.updated_at = datetime.now(timezone.utc)
            await reel.save()

            logger.info(
                "Highlight reel generated",
                extra={
                    "user_id": user_id,
                    "profile_id": profile_id,
                    "moment_count": reel.moment_count,
                    "credits_charged": reel.credits_charged,
                },
            )

        except Exception as exc:
            reel.status = ReelStatus.FAILED
            reel.error_message = str(exc)
            reel.updated_at = datetime.now(timezone.utc)
            await reel.save()
            logger.error(
                "Highlight reel generation failed",
                extra={"reel_id": str(reel.id), "error": str(exc)},
            )

        return reel

    async def list_reels(
        self,
        user_id: str,
        profile_id: str,
        limit: int = 20,
    ) -> List[HighlightReel]:
        """List highlight reels for a child profile."""
        return (
            await HighlightReel.find(
                HighlightReel.user_id == user_id,
                HighlightReel.profile_id == profile_id,
            )
            .sort(-HighlightReel.created_at)
            .limit(limit)
            .to_list()
        )

    async def get_reel_by_id(self, reel_id: str) -> Optional[HighlightReel]:
        """Fetch a single reel by document ID."""
        return await HighlightReel.get(reel_id)

    async def get_reel_by_token(self, token: str) -> Optional[HighlightReel]:
        """Fetch a reel by its public share token."""
        return await HighlightReel.find_one(
            HighlightReel.share_token == token,
        )

    async def _collect_moments(
        self,
        user_id: str,
        profile_id: str,
        time_range_hours: int,
    ) -> List[HighlightMoment]:
        """Gather scorable interactions from the past N hours."""
        cutoff = datetime.now(timezone.utc) - timedelta(
            hours=time_range_hours,
        )
        moments: List[HighlightMoment] = []

        mirror_attempts = await PhoneticMirrorAttempt.find(
            PhoneticMirrorAttempt.user_id == user_id,
            PhoneticMirrorAttempt.profile_id == profile_id,
            PhoneticMirrorAttempt.created_at >= cutoff,
        ).to_list()

        for attempt in mirror_attempts:
            moments.append(
                HighlightMoment(
                    source_type=HighlightSourceType.MIRROR_ATTEMPT,
                    source_id=str(attempt.id),
                    score=attempt.pronunciation_score or 0.0,
                    transcript_he=attempt.target_phrase or "",
                ),
            )

        v2v_sessions = await V2VSession.find(
            V2VSession.user_id == user_id,
            V2VSession.profile_id == profile_id,
            V2VSession.created_at >= cutoff,
        ).to_list()

        for session in v2v_sessions:
            for transform in session.transforms:
                moments.append(
                    HighlightMoment(
                        source_type=HighlightSourceType.V2V_SESSION,
                        source_id=str(session.id),
                        score=transform.pronunciation_score_after or 0.0,
                        transcript_he=transform.corrected_transcript or "",
                        audio_gcs_path=transform.v2v_audio_gcs_path,
                    ),
                )

        return moments

    async def _rank_and_select(
        self,
        moments: List[HighlightMoment],
        max_moments: int = 5,
    ) -> List[HighlightMoment]:
        """Rank moments by score and select top N."""
        ranked = sorted(moments, key=lambda m: m.score, reverse=True)
        return ranked[:max_moments]

    async def _render_reel(
        self,
        user_id: str,
        profile_id: str,
        moments: List[HighlightMoment],
    ) -> tuple:
        """Render moments into a video reel via FFmpeg and upload to GCS."""
        import asyncio
        import os
        import tempfile

        from app.services.olorin.storage_service import storage_service

        audio_clips = []
        for moment in moments:
            if moment.audio_gcs_path:
                clip_bytes = await storage_service.download_bytes(
                    moment.audio_gcs_path,
                )
                audio_clips.append(clip_bytes)

        if not audio_clips:
            raise ValueError("No audio clips available for reel rendering")

        with tempfile.TemporaryDirectory() as tmpdir:
            clip_paths = []
            for i, clip in enumerate(audio_clips):
                path = os.path.join(tmpdir, f"clip_{i}.wav")
                with open(path, "wb") as f:
                    f.write(clip)
                clip_paths.append(path)

            concat_list = os.path.join(tmpdir, "concat.txt")
            with open(concat_list, "w") as f:
                for cp in clip_paths:
                    f.write(f"file '{cp}'\n")

            output_video = os.path.join(tmpdir, "reel.mp4")
            output_thumb = os.path.join(tmpdir, "thumb.jpg")

            process = await asyncio.create_subprocess_exec(
                "ffmpeg", "-y", "-f", "concat", "-safe", "0",
                "-i", concat_list, "-c:a", "aac", "-b:a", "128k",
                output_video,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            _, stderr = await process.communicate()
            if process.returncode != 0:
                raise RuntimeError(
                    f"FFmpeg concat failed: {stderr.decode()[:200]}"
                )

            thumb_process = await asyncio.create_subprocess_exec(
                "ffmpeg", "-y", "-i", output_video,
                "-vframes", "1", "-q:v", "2", output_thumb,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            await thumb_process.communicate()

            timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
            video_path = (
                f"zeh-ani/highlights/{user_id}/{profile_id}/"
                f"reel_{timestamp}.mp4"
            )
            thumb_path = video_path.replace(".mp4", "_thumb.jpg")

            with open(output_video, "rb") as f:
                video_bytes = f.read()
            await storage_service.upload_bytes(
                video_bytes, video_path, content_type="video/mp4",
            )

            if os.path.exists(output_thumb):
                with open(output_thumb, "rb") as f:
                    thumb_bytes = f.read()
                await storage_service.upload_bytes(
                    thumb_bytes, thumb_path, content_type="image/jpeg",
                )

        return video_path, thumb_path

    async def _deduct_credits(self, user_id: str) -> bool:
        """Deduct credits for reel generation. Returns True on success."""
        from app.services.zeh_ani import deduct_zeh_ani_credits

        success, _remaining = await deduct_zeh_ani_credits(
            user_id=user_id,
            feature="highlight_reel",
            usage_amount=1.0,
            metadata={"reason": "highlight_reel_generation"},
        )
        return success


highlight_reel_service = HighlightReelService()
