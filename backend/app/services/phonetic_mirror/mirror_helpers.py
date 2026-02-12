"""Helper functions for Phonetic Mirror service."""

from typing import List, Optional

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.phonetic_mirror_attempt import (
    MirrorAttemptResponse,
    PhoneticMirrorAttempt,
    PracticePhrase,
    PronunciationQuality,
)

logger = get_logger(__name__)


def calculate_shekels(quality: PronunciationQuality) -> int:
    """Calculate shekel reward based on pronunciation quality tier."""
    reward_map = {
        PronunciationQuality.EXCELLENT: settings.SHEKEL_REWARD_EXCELLENT,
        PronunciationQuality.GOOD: settings.SHEKEL_REWARD_GOOD,
        PronunciationQuality.FAIR: settings.SHEKEL_REWARD_FAIR,
        PronunciationQuality.NEEDS_PRACTICE: settings.SHEKEL_REWARD_NEEDS_PRACTICE,
        PronunciationQuality.NO_MATCH: 0,
    }
    return reward_map.get(quality, 0)


def attempt_to_response(
    attempt: PhoneticMirrorAttempt,
    corrected_url: Optional[str],
) -> MirrorAttemptResponse:
    """Convert attempt document to API response."""
    return MirrorAttemptResponse(
        id=str(attempt.id) if attempt.id else "",
        pronunciation_score=attempt.pronunciation_score,
        quality=attempt.quality.value,
        phoneme_feedback=attempt.phoneme_feedback,
        corrected_audio_url=corrected_url,
        shekels_earned=attempt.shekels_earned,
        input_transcript=attempt.input_transcript,
        target_phrase_he=attempt.target_phrase_he,
        created_at=attempt.created_at.isoformat(),
    )


def get_default_phrases(
    difficulty: str, count: int
) -> List[PracticePhrase]:
    """Return default practice phrases by difficulty level."""
    beginner = [
        PracticePhrase(
            phrase_he="\u05E9\u05DC\u05D5\u05DD",
            transliteration="shalom",
            translation="hello/peace",
            difficulty="easy",
            category="greetings",
        ),
        PracticePhrase(
            phrase_he="\u05EA\u05D5\u05D3\u05D4",
            transliteration="toda",
            translation="thank you",
            difficulty="easy",
            category="greetings",
        ),
        PracticePhrase(
            phrase_he="\u05D1\u05D5\u05E7\u05E8 \u05D8\u05D5\u05D1",
            transliteration="boker tov",
            translation="good morning",
            difficulty="easy",
            category="greetings",
        ),
    ]
    medium = [
        PracticePhrase(
            phrase_he="\u05DE\u05D4 \u05E0\u05E9\u05DE\u05E2",
            transliteration="ma nishma",
            translation="how are you",
            difficulty="medium",
            category="conversation",
        ),
        PracticePhrase(
            phrase_he="\u05D0\u05E0\u05D9 \u05DC\u05D5\u05DE\u05D3 \u05E2\u05D1\u05E8\u05D9\u05EA",
            transliteration="ani lomed ivrit",
            translation="I am learning Hebrew",
            difficulty="medium",
            category="conversation",
        ),
    ]
    phrase_map = {"easy": beginner, "medium": medium, "hard": medium}
    return phrase_map.get(difficulty, medium)[:count]


async def generate_corrected_audio(
    avatar_id: str, hebrew_text: str
) -> Optional[str]:
    """Generate corrected pronunciation audio using child voice clone."""
    from app.models.child_avatar import ChildAvatar

    avatar = await ChildAvatar.get(avatar_id)
    if not avatar or not avatar.has_voice_clone:
        return None

    from app.services.interactive_mission.child_voice_service import (
        child_voice_service,
    )

    return await child_voice_service.generate_corrected_hebrew(
        avatar, hebrew_text
    )


async def record_proficiency(
    user_id: str,
    profile_id: str,
    score: float,
    phrase: str,
) -> None:
    """Record assessment and update vocabulary proficiency."""
    from app.services.proficiency.assessment_service import (
        assessment_service,
    )

    await assessment_service.record_assessment(
        user_id=user_id,
        profile_id=profile_id,
        source="phonetic_mirror",
        score=score,
        words_tested=1,
        words_correct=1 if score >= settings.PERFECTED_VOICE_PRONUNCIATION_THRESHOLD else 0,
    )


async def award_shekels(
    user_id: str,
    profile_id: str,
    amount: int,
    phrase: str,
) -> None:
    """Award shekels for pronunciation practice."""
    from app.services.mission.shekel_service import shekel_service
    from app.models.shekel_currency import TransactionType

    await shekel_service.earn_shekels(
        user_id=user_id,
        profile_id=profile_id,
        amount=amount,
        transaction_type=TransactionType.MISSION_REWARD,
        description=f"Phonetic mirror practice: {phrase[:30]}",
        description_he=f"\u05EA\u05E8\u05D2\u05D5\u05DC \u05D4\u05D2\u05D9\u05D9\u05D4: {phrase[:30]}",
    )
