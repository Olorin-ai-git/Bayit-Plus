"""
Extension Configuration Endpoint

Public (no auth) endpoint returning runtime configuration
for the Bayit+ Companion Chrome extension.
"""

from fastapi import APIRouter
from pydantic import BaseModel

from app.core.config import settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)
router = APIRouter()


class ExtensionConfigResponse(BaseModel):
    """Runtime configuration for the Chrome extension."""

    free_tier_minutes_per_day: float
    premium_tier_price_usd: float
    supported_languages: list[str]
    supported_sites: list[str]
    audio_sample_rate: int
    max_session_duration_minutes: int


@router.get(
    "/config/extension",
    response_model=ExtensionConfigResponse,
    tags=["extension-config"],
)
async def get_extension_config() -> ExtensionConfigResponse:
    """
    Return runtime configuration for the Chrome extension.

    Public endpoint (no authentication required).
    The extension fetches this on startup to avoid hardcoded values.
    """
    return ExtensionConfigResponse(
        free_tier_minutes_per_day=settings.FREE_TIER_MINUTES_PER_DAY,
        premium_tier_price_usd=settings.PREMIUM_TIER_PRICE_USD,
        supported_languages=settings.SUPPORTED_EXTENSION_LANGUAGES,
        supported_sites=settings.SUPPORTED_EXTENSION_SITES,
        audio_sample_rate=settings.AUDIO_SAMPLE_RATE,
        max_session_duration_minutes=settings.MAX_SESSION_DURATION_MINUTES,
    )
