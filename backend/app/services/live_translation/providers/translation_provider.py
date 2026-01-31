"""Translation provider initialization and configuration."""
import logging
from typing import Optional

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
        """Initialize the translation provider."""
        if self.provider == "google":
            if not GOOGLE_AVAILABLE:
                raise ImportError(
                    "Google Cloud Translate not installed. "
                    "Install: pip install google-cloud-translate"
                )

            logger.info("📡 Initializing Google Cloud Translate client...")
            from google.cloud import translate_v2 as translate

            self.translate_client = translate.Client()
            logger.info("✅ Google Cloud Translate initialized")

        elif self.provider == "openai":
            if not OPENAI_AVAILABLE:
                raise ImportError(
                    "OpenAI library not installed. Install: pip install openai"
                )

            if not settings.OPENAI_API_KEY:
                raise ValueError("OPENAI_API_KEY not configured")

            logger.info("📡 Initializing OpenAI client for translation...")
            from openai import AsyncOpenAI

            self.openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            logger.info("✅ OpenAI translation initialized (GPT-4o-mini)")

        elif self.provider == "claude":
            if not ANTHROPIC_AVAILABLE:
                raise ImportError(
                    "Anthropic library not installed. Install: pip install anthropic"
                )

            if not settings.ANTHROPIC_API_KEY:
                raise ValueError("ANTHROPIC_API_KEY not configured")

            logger.info("📡 Initializing Anthropic client for translation...")
            from anthropic import AsyncAnthropic

            self.anthropic_client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
            logger.info("✅ Claude translation initialized")

        else:
            raise ValueError(
                f"Invalid translation provider: {self.provider}. "
                "Must be 'google', 'openai', or 'claude'"
            )

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
