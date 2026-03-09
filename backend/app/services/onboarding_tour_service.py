"""Onboarding tour state management service."""

import logging
from datetime import datetime, timezone
from typing import Optional

from app.models.user import OnboardingTour, User

logger = logging.getLogger(__name__)

CURRENT_TOUR_VERSION = 1

FEATURE_CARDS = [
    {
        "feature_key": "live_dubbing",
        "order": 1,
        "demo_type": "video_toggle",
        "introduced_in_version": 1,
        "platforms": ["ios", "tvos", "android", "android_tv"],
    },
    {
        "feature_key": "live_trivia",
        "order": 2,
        "demo_type": "video_toggle",
        "introduced_in_version": 1,
        "platforms": ["ios", "tvos", "android", "android_tv"],
    },
    {
        "feature_key": "subtitles_split",
        "order": 3,
        "demo_type": "subtitle_toggle",
        "introduced_in_version": 1,
        "platforms": ["ios", "tvos", "android", "android_tv"],
    },
    {
        "feature_key": "engrew_heblish",
        "order": 4,
        "demo_type": "subtitle_toggle",
        "introduced_in_version": 1,
        "platforms": ["ios", "tvos", "android", "android_tv"],
    },
    {
        "feature_key": "pause_and_ask",
        "order": 5,
        "demo_type": "interactive_chat",
        "introduced_in_version": 1,
        "platforms": ["ios", "tvos", "android", "android_tv"],
    },
    {
        "feature_key": "movie_interaction",
        "order": 6,
        "demo_type": "interactive_chat",
        "introduced_in_version": 1,
        "platforms": ["ios", "tvos", "android", "android_tv"],
    },
    {
        "feature_key": "zeh_ani",
        "order": 7,
        "demo_type": "camera_preview",
        "introduced_in_version": 1,
        "platforms": ["ios", "android"],
    },
    {
        "feature_key": "catchup",
        "order": 8,
        "demo_type": "timeline_scrub",
        "introduced_in_version": 1,
        "platforms": ["ios", "tvos", "android", "android_tv"],
    },
    {
        "feature_key": "byoc",
        "order": 9,
        "demo_type": "step_animation",
        "introduced_in_version": 1,
        "platforms": ["ios", "tvos", "android", "android_tv"],
    },
]


class OnboardingTourService:
    """Manages onboarding tour state for users."""

    async def get_state(self, user: User) -> Optional[dict]:
        """Get user's tour state. Returns None if no state exists."""
        if not user.onboarding_tour:
            return None
        tour = user.onboarding_tour
        return {
            "user_id": str(user.id),
            "platform": tour.platform,
            "tour_version": tour.tour_version,
            "current_card_index": tour.current_card_index,
            "completed_cards": tour.completed_cards,
            "demo_cards_tapped": tour.demo_cards_tapped,
            "completion_status": tour.completion_status,
            "language": tour.language,
            "started_at": tour.started_at.isoformat() if tour.started_at else None,
            "completed_at": (
                tour.completed_at.isoformat() if tour.completed_at else None
            ),
            "skipped_at": (
                tour.skipped_at.isoformat() if tour.skipped_at else None
            ),
        }

    async def update_state(
        self,
        user: User,
        platform: str,
        current_card_index: Optional[int] = None,
        card_viewed: Optional[str] = None,
        demo_tapped: Optional[str] = None,
        language: Optional[str] = None,
    ) -> dict:
        """Update tour progress. Creates state if not exists."""
        now = datetime.now(timezone.utc)

        if not user.onboarding_tour:
            user.onboarding_tour = OnboardingTour(
                platform=platform,
                started_at=now,
                completion_status="in_progress",
            )

        tour = user.onboarding_tour

        if tour.completion_status == "not_started":
            tour.completion_status = "in_progress"
            tour.started_at = now

        tour.platform = platform

        if current_card_index is not None:
            tour.current_card_index = current_card_index

        if card_viewed and card_viewed not in tour.completed_cards:
            tour.completed_cards.append(card_viewed)

        if demo_tapped and demo_tapped not in tour.demo_cards_tapped:
            tour.demo_cards_tapped.append(demo_tapped)

        if language:
            tour.language = language

        user.updated_at = now
        await user.save()

        logger.info(
            "Tour state updated for user %s, card_index=%s",
            str(user.id),
            tour.current_card_index,
        )
        return await self.get_state(user)

    async def complete_tour(
        self,
        user: User,
        platform: str,
        tour_version: int,
        preferences: Optional[dict] = None,
    ) -> dict:
        """Mark tour as completed and save preferences."""
        now = datetime.now(timezone.utc)

        if not user.onboarding_tour:
            user.onboarding_tour = OnboardingTour(
                platform=platform,
                started_at=now,
            )

        tour = user.onboarding_tour
        tour.completion_status = "completed"
        tour.completed_at = now
        tour.tour_version = tour_version
        tour.platform = platform

        if preferences:
            if "content_languages" in preferences:
                user.preferences["content_languages"] = preferences[
                    "content_languages"
                ]
            if "genres" in preferences:
                user.preferences["genres"] = preferences["genres"]
            if "has_children" in preferences:
                user.preferences["has_children"] = preferences["has_children"]

        user.updated_at = now
        await user.save()

        logger.info("Tour completed for user %s", str(user.id))
        return {"status": "completed", "recommendations_updated": bool(preferences)}

    async def skip_tour(
        self,
        user: User,
        platform: str,
        last_card_viewed: Optional[str] = None,
    ) -> dict:
        """Mark tour as skipped."""
        now = datetime.now(timezone.utc)

        if not user.onboarding_tour:
            user.onboarding_tour = OnboardingTour(
                platform=platform,
                started_at=now,
            )

        tour = user.onboarding_tour
        tour.completion_status = "skipped"
        tour.skipped_at = now
        tour.platform = platform

        if last_card_viewed and last_card_viewed not in tour.completed_cards:
            tour.completed_cards.append(last_card_viewed)

        user.updated_at = now
        await user.save()

        logger.info("Tour skipped for user %s", str(user.id))
        return await self.get_state(user)

    def get_available_cards(
        self,
        platform: str,
        since_version: Optional[int] = None,
    ) -> dict:
        """Get feature cards filtered by platform and version."""
        cards = []
        for card in FEATURE_CARDS:
            if platform not in card["platforms"]:
                continue
            if since_version and card["introduced_in_version"] <= since_version:
                continue
            cards.append(
                {
                    **card,
                    "is_new": (
                        card["introduced_in_version"] > since_version
                        if since_version
                        else False
                    ),
                }
            )
        return {"tour_version": CURRENT_TOUR_VERSION, "cards": cards}

    async def track_event(
        self, user: User, event_data: dict
    ) -> None:
        """Record analytics event (supplements Firebase)."""
        logger.info(
            "Tour analytics: user=%s event=%s platform=%s feature=%s",
            str(user.id),
            event_data.get("event_type"),
            event_data.get("platform"),
            event_data.get("feature_key"),
        )


onboarding_tour_service = OnboardingTourService()
