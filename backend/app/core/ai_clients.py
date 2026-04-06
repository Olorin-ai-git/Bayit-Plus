"""
Shared AI client factories for Anthropic API.
Provides async clients with proper connection pooling and configuration.
"""

from functools import lru_cache

import anthropic

from app.core.config import settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)


@lru_cache(maxsize=1)
def get_anthropic_client() -> anthropic.AsyncAnthropic:
    """
    Get shared AsyncAnthropic client instance.

    Uses LRU cache to ensure single instance (connection pooling).
    All subtitle services should use this instead of creating clients inline.

    Returns:
        AsyncAnthropic: Configured async Anthropic client
    """
    if not settings.ANTHROPIC_API_KEY:
        logger.warning("ANTHROPIC_API_KEY not configured, AI features will fail")

    return anthropic.AsyncAnthropic(
        api_key=settings.ANTHROPIC_API_KEY,
        max_retries=2,  # Retry failed requests
        timeout=60.0,   # 60 second timeout
    )


def get_subtitle_ai_config() -> dict:
    """
    Get shared subtitle AI configuration.

    Returns:
        dict: Model name and other AI parameters for subtitles
    """
    return {
        "model": settings.SUBTITLE_AI_MODEL,
        "max_retries": 2,
        "timeout": 60.0,
    }
