"""Constants for podcast translation service."""
from app.core.config import settings

# Weighted stage progress (total = 100%)
# These weights reflect the relative duration of each stage based on typical podcast processing
STAGE_WEIGHTS = {
    "downloaded": 2.0,  # Quick download (2%)
    "vocals_separated": 15.0,  # Vocal separation takes moderate time (15%)
    "transcribed": 20.0,  # Whisper transcription is computationally heavy (20%)
    "commercials_removed": 3.0,  # Commercial detection is fast (3%)
    "translated": 10.0,  # Claude API translation is moderate (10%)
    "tts_generated": 40.0,  # TTS generation is the slowest stage (40%)
    "mixed": 8.0,  # Audio mixing is moderately fast (8%)
    "uploaded": 2.0,  # Upload to GCS is quick (2%)
}

# Language mapping for auto-detection
# Map detected language to target language code
# For English audio -> translate to Hebrew (he)
# For Hebrew audio -> translate to English (en)
LANGUAGE_AUTO_MAP = {
    "en": "he",
    "en-US": "he",
    "english": "he",
    "he": "en",
    "he-IL": "en",
    "hebrew": "en",
}

# Map Whisper language names to ISO codes
SOURCE_LANG_MAP = {
    "english": "en",
    "hebrew": "he",
    "en": "en",
    "en-US": "en",
    "he": "he",
    "he-IL": "he",
}


def get_voice_id(language: str, gender: str = "female") -> str:
    """
    Get appropriate ElevenLabs voice ID for language and gender.

    Args:
        language: Language code ('he' or 'en')
        gender: Voice gender ('male' or 'female', default: 'female')

    Returns:
        ElevenLabs voice ID
    """
    if gender == "male":
        if language == "he":
            return settings.ELEVENLABS_HEBREW_MALE_VOICE_ID
        return settings.ELEVENLABS_ENGLISH_MALE_VOICE_ID
    else:
        if language == "he":
            return settings.ELEVENLABS_HEBREW_VOICE_ID
        return settings.ELEVENLABS_ENGLISH_VOICE_ID
