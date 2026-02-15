"""
Highlight Reel Service.

Auto-generates 30-second video compilations of a child's best Hebrew
learning moments. Selects top interactions using Claude, concatenates
with FFmpeg crossfade transitions, and prepares for sharing.
"""

import secrets
from datetime import datetime, timezone
from typing import List, Optional

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.highlight_reel import (
    HighlightMoment,
    HighlightReel,
    ReelStatus,
)
from app.services.zeh_ani.highlight_rendering import (
    collect_highlight_moments,
    render_reel,
)

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
            moments = await collect_highlight_moments(
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

            selected = self._rank_and_select(moments)
            reel.moments = selected
            reel.status = ReelStatus.RENDERING
            await reel.save()

            video_path, thumb_path = await render_reel(
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
                {"user_id": user_id, "profile_id": profile_id}
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
            {"share_token": token}
)

    def _rank_and_select(
        self,
        moments: List[HighlightMoment],
        max_moments: int = 5,
    ) -> List[HighlightMoment]:
        """Rank moments by score and select top N."""
        ranked = sorted(moments, key=lambda m: m.score, reverse=True)
        return ranked[:max_moments]

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
