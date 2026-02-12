"""
Zine Scheduler.

Triggers weekly zine generation for eligible users on the configured day.
Queries profiles with kids mode enabled and generates personalized zines
using viewing history themes and vocabulary targets.
"""

import logging
from datetime import datetime, timezone

from app.core.config import settings
from app.models.profile import Profile
from app.services.zine.zine_generation_service import zine_generation_service

logger = logging.getLogger(__name__)


def _current_week_key() -> str:
    """Return the ISO week key for the current UTC date (e.g. '2026-W07')."""
    now = datetime.now(timezone.utc)
    iso_year, iso_week, _ = now.isocalendar()
    return f"{iso_year}-W{iso_week:02d}"


class ZineScheduler:
    """Schedules weekly zine generation for eligible kid profiles."""

    async def schedule_weekly_generation(self) -> dict:
        """
        Generate zines for all eligible kids profiles.

        Runs on the configured ZINE_GENERATION_DAY (0=Monday, 6=Sunday).
        Skips execution if the current weekday does not match.

        Returns:
            Dict with generated count, skipped count, and errors.
        """
        now = datetime.now(timezone.utc)
        current_weekday = now.weekday()

        if current_weekday != settings.ZINE_GENERATION_DAY:
            logger.info(
                "Skipping zine generation: not the scheduled day",
                extra={
                    "current_weekday": current_weekday,
                    "scheduled_day": settings.ZINE_GENERATION_DAY,
                },
            )
            return {"generated": 0, "skipped": 0, "errors": 0}

        week_key = _current_week_key()
        profiles = await Profile.find(
            Profile.is_kids_profile == True  # noqa: E712
        ).to_list()

        generated = 0
        skipped = 0
        errors = 0

        for profile in profiles:
            try:
                zine = await zine_generation_service.generate_zine(
                    user_id=profile.user_id,
                    profile_id=str(profile.id),
                    week_key=week_key,
                    content_themes=profile.favorite_categories,
                    vocabulary_targets=[],
                )
                if zine.status.value == "ready":
                    generated += 1
                else:
                    skipped += 1
            except Exception as exc:
                errors += 1
                logger.error(
                    "Zine generation failed for profile",
                    extra={
                        "profile_id": str(profile.id),
                        "user_id": profile.user_id,
                        "week_key": week_key,
                        "error": str(exc),
                    },
                )

        logger.info(
            "Weekly zine generation completed",
            extra={
                "week_key": week_key,
                "generated": generated,
                "skipped": skipped,
                "errors": errors,
                "total_profiles": len(profiles),
            },
        )

        return {
            "generated": generated,
            "skipped": skipped,
            "errors": errors,
        }


zine_scheduler = ZineScheduler()
