"""Discover tab configuration endpoint for iOS/tvOS feature hub."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core.config import settings
from app.core.logging_config import get_logger
from app.core.security import get_current_active_user
from app.models.user import User

logger = get_logger(__name__)

router = APIRouter()

GCS_DISCOVER_BASE = (
    f"https://{settings.GCS_PATTERN}"
    f"/{settings.NEW_BUCKET_NAME}discover"
)

FEATURE_IDS = [
    "pause_ask",
    "interactive_subtitles",
    "vocabulary",
    "vod_moments",
    "cultural_context",
    "bilingual_bridge",
    "ai_companion",
    "live_dubbing",
    "live_subtitles",
    "live_trivia",
    "catch_up",
    "scene_search",
    "phonetic_mirror",
    "talk_back",
    "interactive_mission",
    "glossary",
    "llm_search",
    "proactive_voice",
    "chatbot",
]

DISABLED_FEATURES: set[str] = set()


class FeatureConfigResponse(BaseModel):
    """Individual feature configuration."""

    feature_id: str
    enabled: bool
    demo_video_url: str | None = None
    demo_thumbnail_url: str | None = None
    walkthrough_content_id: str | None = None


class DiscoverConfigResponse(BaseModel):
    """Full discover tab configuration."""

    features: list[FeatureConfigResponse]


class WalkthroughCompleteBody(BaseModel):
    """Request body for walkthrough completion."""

    feature_id: str
    steps_completed: int
    skipped: bool


def _build_feature_config(feature_id: str) -> FeatureConfigResponse:
    """Build config for a single feature with GCS media URLs."""
    enabled = feature_id not in DISABLED_FEATURES
    return FeatureConfigResponse(
        feature_id=feature_id,
        enabled=enabled,
        demo_video_url=(
            f"{GCS_DISCOVER_BASE}/{feature_id}/demo.mp4"
            if enabled
            else None
        ),
        demo_thumbnail_url=(
            f"{GCS_DISCOVER_BASE}/{feature_id}/thumbnail.jpg"
            if enabled
            else None
        ),
        walkthrough_content_id=(
            f"walkthrough_{feature_id}" if enabled else None
        ),
    )


@router.get("/config", response_model=DiscoverConfigResponse)
async def get_discover_config(
    current_user: User = Depends(get_current_active_user),
) -> DiscoverConfigResponse:
    """Return feature configuration for the Discover tab.

    Includes demo video/thumbnail URLs, kill switches, and
    walkthrough content IDs for all 19 AI features.
    """
    features = [_build_feature_config(fid) for fid in FEATURE_IDS]
    logger.info(
        "discover_config_served",
        extra={"user_id": str(current_user.id)},
    )
    return DiscoverConfigResponse(features=features)


@router.post("/walkthrough-complete")
async def record_walkthrough_complete(
    request: WalkthroughCompleteBody,
    current_user: User = Depends(get_current_active_user),
) -> dict[str, str]:
    """Record that a user completed or skipped a walkthrough."""
    logger.info(
        "walkthrough_completed",
        extra={
            "user_id": str(current_user.id),
            "feature_id": request.feature_id,
            "steps_completed": str(request.steps_completed),
            "skipped": str(request.skipped),
        },
    )
    return {"message": "Walkthrough completion recorded"}
