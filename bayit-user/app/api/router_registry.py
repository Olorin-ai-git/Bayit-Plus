"""
Router registry for Bayit+ User Service.

Registers user profile, subscription, favorites, downloads, history,
family controls, household, devices, playback, and notification routes.
"""

import logging
from typing import List, Type

from beanie import Document
from fastapi import FastAPI

from app.core.config import settings

logger = logging.getLogger(__name__)

from app.models.user import User
from app.models.profile import Profile
from app.models.subscription import Subscription, Invoice
from app.models.playback_progress import PlaybackProgress
from app.models.playback_session import PlaybackSession
from app.models.watchlist import WatchHistory, Conversation
from app.models.playlist import PlaylistItem
from app.models.family_controls import FamilyControls
from app.models.household import Household
from app.models.child_proficiency import ChildProficiency
from app.models.kids_content import KidsContentSource
from app.models.youngsters_content import YoungstersContentSource
from app.models.location_cache import LocationCache
from app.models.subtitle_preferences import SubtitlePreference
from app.models.user_podcast_subscription import UserPodcastSubscription
from app.models.user_audible_account import UserAudibleAccount
from app.models.user_audiobook import UserAudiobook, UserAudiobookReview
from app.models.notification_event import NotificationEvent, NotificationMetrics
from app.models.biometric_consent import BiometricConsent
from app.models.content import Content
from app.models.beta_credit import BetaCredit

SERVICE_MODELS: List[Type[Document]] = [
    User,
    Profile,
    Subscription,
    Invoice,
    PlaybackProgress,
    PlaybackSession,
    WatchHistory,
    Conversation,
    PlaylistItem,
    FamilyControls,
    Household,
    ChildProficiency,
    KidsContentSource,
    YoungstersContentSource,
    LocationCache,
    SubtitlePreference,
    UserPodcastSubscription,
    UserAudibleAccount,
    UserAudiobook,
    UserAudiobookReview,
    NotificationEvent,
    NotificationMetrics,
    BiometricConsent,
    Content,
    BetaCredit,
]


def register_routes(app: FastAPI) -> None:
    """Register user API routers (mirrors monolith User Routes section)."""
    prefix = settings.API_V1_PREFIX

    from app.api.endpoints.continue_watching import router as continue_watching_router
    from app.api.routes import (
        profiles_me,
        profiles,
        profiles_preferences,
        user_settings,
        subscriptions,
        extension_config,
        extension_subscriptions,
        watchlist,
        playlist,
        favorites,
        downloads,
        history,
        children,
        youngsters,
        family_controls,
        profile_controls,
        profile_stats,
        household,
        users,
        devices,
        playback_session,
        audible_integration,
        location,
        location_consent,
        notifications,
    )

    app.include_router(
        subscriptions.router,
        prefix=f"{prefix}/subscriptions",
        tags=["subscriptions"],
    )
    app.include_router(
        extension_config.router, prefix=prefix, tags=["extension-config"]
    )
    app.include_router(
        extension_subscriptions.router,
        prefix=prefix,
        tags=["extension-subscriptions"],
    )
    app.include_router(
        watchlist.router,
        prefix=f"{prefix}/watchlist",
        tags=["watchlist", "deprecated"],
    )
    app.include_router(
        playlist.router, prefix=f"{prefix}/playlist", tags=["playlist"]
    )
    app.include_router(
        favorites.router, prefix=f"{prefix}/favorites", tags=["favorites"]
    )
    app.include_router(
        downloads.router, prefix=f"{prefix}/downloads", tags=["downloads"]
    )
    app.include_router(
        history.router, prefix=f"{prefix}/history", tags=["history"]
    )
    app.include_router(
        continue_watching_router,
        prefix=f"{prefix}/user",
        tags=["user", "continue-watching"],
    )
    # IMPORTANT: Register /me routes BEFORE /{profile_id} to avoid path variable capture
    app.include_router(
        profiles_me.router, prefix=f"{prefix}/profiles", tags=["profiles"]
    )
    app.include_router(
        profiles.router, prefix=f"{prefix}/profiles", tags=["profiles"]
    )
    app.include_router(
        profiles_preferences.router,
        prefix=f"{prefix}/profiles",
        tags=["profiles"],
    )
    app.include_router(
        user_settings.router,
        prefix=f"{prefix}/profiles",
        tags=["user-settings"],
    )
    app.include_router(
        children.router, prefix=f"{prefix}/children", tags=["children"]
    )
    app.include_router(
        youngsters.router, prefix=f"{prefix}/youngsters", tags=["youngsters"]
    )
    app.include_router(
        family_controls.router,
        prefix=f"{prefix}/family",
        tags=["family-controls"],
    )
    app.include_router(
        profile_controls.router, prefix=prefix, tags=["profile-controls"]
    )
    app.include_router(
        household.router, prefix=f"{prefix}/household", tags=["household"]
    )
    app.include_router(users.router, prefix=f"{prefix}/users", tags=["users"])
    app.include_router(profile_stats.router, prefix=prefix, tags=["profile"])
    app.include_router(
        devices.router, prefix=f"{prefix}/devices", tags=["devices"]
    )
    app.include_router(
        playback_session.router,
        prefix=f"{prefix}/playback/session",
        tags=["playback", "session"],
    )
    app.include_router(
        audible_integration.router,
        prefix=prefix,
        tags=["audible-integration"],
    )
    app.include_router(location.router, prefix=prefix, tags=["location"])
    app.include_router(
        location_consent.router, prefix=prefix, tags=["location-consent"]
    )
    app.include_router(
        notifications.router,
        prefix=f"{prefix}/notifications",
        tags=["notifications"],
    )

    logger.info(
        "User routes registered",
        extra={"prefix": prefix, "route_count": len(app.routes)},
    )
