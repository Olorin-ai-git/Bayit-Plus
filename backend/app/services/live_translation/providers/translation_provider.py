"""Translation provider initialization and configuration."""
import logging
from typing import Optional

from app.core.ai_clients import get_anthropic_client, get_openai_client

from app.core.config import settings
from ..constants import (
    GOOGLE_AVAILABLE,
    OPENAI_AVAILABLE,
    ANTHROPIC_AVAILABLE,
)

logger = logging.getLogger(__name__)


class TranslationProviderManager:
    """Manages translation provider initialization."""

    def __init__(self, provider: Optional[str] = None):
        """
        Initialize translation provider manager.

        Args:
            provider: Translation provider - "google", "openai", or "claude".
                     If None, uses LIVE_TRANSLATION_PROVIDER from config.
        """
        self.provider = provider or settings.LIVE_TRANSLATION_PROVIDER
        self.translate_client = None
        self.openai_client = None
        self.anthropic_client = None
        self._init_provider()

    def _init_provider(self) -> None:
        """Initialize translation providers (primary + fallbacks)."""
        valid_providers = {"google", "openai", "claude"}
        if self.provider not in valid_providers:
            raise ValueError(
                f"Invalid translation provider: {self.provider}. "
                f"Must be one of {valid_providers}"
            )

        self._init_google()
        self._init_openai()
        self._init_anthropic()

        if self.provider == "google" and not self.translate_client:
            raise ImportError("Primary provider google failed to initialize")
        elif self.provider == "openai" and not self.openai_client:
            raise ImportError("Primary provider openai failed to initialize")
        elif self.provider == "claude" and not self.anthropic_client:
            raise ImportError("Primary provider claude failed to initialize")

    def _init_google(self) -> None:
        """Initialize Google Cloud Translate (best-effort for fallback)."""
        if not GOOGLE_AVAILABLE:
            logger.debug("Google Cloud Translate not installed, skipping")
            return
        try:
            from google.cloud import translate_v2 as translate

            self.translate_client = translate.Client()
            logger.info("Google Cloud Translate initialized")
        except Exception as e:
            logger.warning("Google Cloud Translate init failed: %s", e)

    def _init_openai(self) -> None:
        """Initialize OpenAI client (best-effort for fallback)."""
        if not OPENAI_AVAILABLE:
            logger.debug("OpenAI library not installed, skipping")
            return
        if not settings.OPENAI_API_KEY:
            logger.debug("OPENAI_API_KEY not configured, skipping")
            return
        try:
            self.openai_client = get_openai_client(api_key=settings.OPENAI_API_KEY)
            logger.info("OpenAI translation initialized")
        except Exception as e:
            logger.warning("OpenAI client init failed: %s", e)

    def _init_anthropic(self) -> None:
        """Initialize Anthropic client (best-effort for fallback)."""
        if not ANTHROPIC_AVAILABLE:
            logger.debug("Anthropic library not installed, skipping")
            return
        if not settings.ANTHROPIC_API_KEY:
            logger.debug("ANTHROPIC_API_KEY not configured, skipping")
            return
        try:
            self.anthropic_client = get_anthropic_client(
                api_key=settings.ANTHROPIC_API_KEY
            )
            logger.info("Claude translation initialized")
        except Exception as e:
            logger.warning("Anthropic client init failed: %s", e)

    def verify_availability(self) -> bool:
        """
        Verify translation provider is available.

        Returns:
            True if provider is available
        """
        try:
            if self.provider == "google" and self.translate_client:
                self.translate_client.translate("test", target_language="en")
                return True
            elif self.provider == "openai" and self.openai_client:
                # OpenAI client is already initialized, just check it exists
                return True
            elif self.provider == "claude" and self.anthropic_client:
                # Anthropic client is already initialized, just check it exists
                return True
        except Exception as e:
            logger.error(f"Translation provider ({self.provider}) unavailable: {str(e)}")
        return False
