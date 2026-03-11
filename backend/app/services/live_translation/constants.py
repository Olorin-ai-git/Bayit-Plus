"""Constants for live translation service."""
import logging
import os

logger = logging.getLogger(__name__)

# Set Google Cloud credentials from settings if not already in environment
from app.core.config import settings

if (
    not os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    and settings.GOOGLE_APPLICATION_CREDENTIALS
    and os.path.isfile(settings.GOOGLE_APPLICATION_CREDENTIALS)
):
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = (
        settings.GOOGLE_APPLICATION_CREDENTIALS
    )
    logger.info("Set GOOGLE_APPLICATION_CREDENTIALS from settings")
elif settings.GOOGLE_APPLICATION_CREDENTIALS and not os.path.isfile(
    settings.GOOGLE_APPLICATION_CREDENTIALS
):
    logger.warning(
        "GOOGLE_APPLICATION_CREDENTIALS file not found: %s (using ADC)",
        settings.GOOGLE_APPLICATION_CREDENTIALS,
    )

# Conditional imports and feature flags
try:
    pass

    GOOGLE_AVAILABLE = True
except ImportError:
    GOOGLE_AVAILABLE = False
    logger.warning("Google Cloud libraries not available")

try:
    pass

    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    logger.warning("OpenAI library not available")

try:
    pass

    ELEVENLABS_AVAILABLE = True
except ImportError:
    ELEVENLABS_AVAILABLE = False
    logger.warning("ElevenLabs realtime service not available")

try:
    pass

    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False
    logger.warning("Anthropic library not available")

# Language code mapping for Google Speech-to-Text
LANGUAGE_CODES = {
    "he": "he-IL",
    "en": "en-US",
    "ar": "ar-IL",
    "es": "es-ES",
    "ru": "ru-RU",
    "fr": "fr-FR",
    "de": "de-DE",
    "it": "it-IT",
    "pt": "pt-PT",
    "yi": "yi",
    "ja": "ja-JP",
    "bn": "bn-IN",
    "ta": "ta-IN",
    "hi": "hi-IN",
}

# Language names for translation prompts
LANGUAGE_NAMES = {
    "he": "Hebrew",
    "en": "English",
    "ar": "Arabic",
    "es": "Spanish",
    "ru": "Russian",
    "fr": "French",
    "de": "German",
    "it": "Italian",
    "pt": "Portuguese",
    "yi": "Yiddish",
    "ja": "Japanese",
    "bn": "Bengali",
    "ta": "Tamil",
    "hi": "Hindi",
}
