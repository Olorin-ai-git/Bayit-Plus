"""
Mirror Greeting Helpers.

Vocabulary selection, greeting text construction, TTS audio generation,
and Creatify lip-sync video production for the Magic Mirror greeting pipeline.
"""

from typing import Optional

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.child_avatar import ChildAvatar
from app.models.child_proficiency import ChildProficiency

logger = get_logger(__name__)


def select_vocabulary_of_the_day(
    proficiency: Optional[ChildProficiency],
) -> str:
    """Pick a vocabulary word based on the child's learning progress."""
    from random import choice

    common_words = [
        "shalom (shalom)",
        "toda (toda)",
        "bevakasha (bevakasha)",
        "mishpacha (mishpacha)",
        "ahava (ahava)",
    ]

    if not proficiency or not proficiency.vocabulary_learning:
        return choice(common_words)

    learning_words = proficiency.vocabulary_learning
    if not learning_words:
        return choice(common_words)

    candidates = [
        w for w in learning_words if w.mastery < 0.8
    ]
    if not candidates:
        candidates = learning_words

    if not candidates:
        return choice(common_words)

    candidates.sort(key=lambda w: w.mastery)
    selected = candidates[0]

    transliteration = (
        f" ({selected.transliteration})"
        if selected.transliteration else ""
    )
    return f"{selected.word}{transliteration}"


def build_greeting_text(
    child_name: str,
    vocab_word: str,
) -> tuple:
    """Build bilingual greeting text incorporating vocabulary."""
    from datetime import datetime

    current_hour = datetime.now().hour

    if current_hour < 12:
        greeting_prefix_he = "\u05d1\u05d5\u05e7\u05e8 \u05d8\u05d5\u05d1"
        greeting_prefix_en = "Good morning"
    elif current_hour < 18:
        greeting_prefix_he = "\u05e6\u05d4\u05e8\u05d9\u05d9\u05dd \u05d8\u05d5\u05d1\u05d9\u05dd"
        greeting_prefix_en = "Good afternoon"
    else:
        greeting_prefix_he = "\u05e2\u05e8\u05d1 \u05d8\u05d5\u05d1"
        greeting_prefix_en = "Good evening"

    greeting_he = f"{greeting_prefix_he}, {child_name}!"
    greeting_en = f"{greeting_prefix_en}, {child_name}!"

    if vocab_word:
        clean_word = vocab_word.split(" (")[0]
        vocab_segment_he = f" \u05d4\u05de\u05d9\u05dc\u05d4 \u05e9\u05dc \u05d4\u05d9\u05d5\u05dd: {vocab_word}"
        vocab_segment_en = f" Your word of the day is: {vocab_word}."
        greeting_he += vocab_segment_he
        greeting_en += vocab_segment_en

    return greeting_he, greeting_en


async def generate_greeting_audio(
    avatar: ChildAvatar,
    greeting_text_he: str,
) -> Optional[str]:
    """Generate TTS audio using child's cloned voice if available."""
    from app.services.interactive_mission.child_voice_service import (
        child_voice_service,
    )

    return await child_voice_service.generate_corrected_hebrew(
        avatar=avatar,
        hebrew_text=greeting_text_he,
    )


async def generate_greeting_lipsync(
    avatar: ChildAvatar,
    audio_path: Optional[str],
) -> Optional[str]:
    """Generate Creatify lip-sync video from avatar image and audio."""
    if not audio_path:
        return None

    if not avatar.creatify_persona_id:
        logger.warning(
            "Avatar missing creatify_persona_id, skipping lipsync",
            extra={"avatar_id": str(avatar.id)},
        )
        return None

    from app.core.creatify_client import creatify_client
    from app.services.olorin.storage_service import storage_service

    audio_signed_url = await storage_service.generate_signed_url(
        audio_path,
        expiry_seconds=settings.CREATIFY_SIGNED_URL_EXPIRY_SECONDS,
    )

    gcs_url = await creatify_client.create_lipsync(
        audio_url=audio_signed_url,
        creator_id=avatar.creatify_persona_id,
    )

    return gcs_url
