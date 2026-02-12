"""Phonetic Mirror attempt model for pronunciation practice sessions."""

from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional

from beanie import Document, Indexed
from pydantic import BaseModel, Field
from pymongo import IndexModel


class PronunciationQuality(str, Enum):
    EXCELLENT = "excellent"
    GOOD = "good"
    FAIR = "fair"
    NEEDS_PRACTICE = "needs_practice"
    NO_MATCH = "no_match"


class PhonemeIssueType(str, Enum):
    STRESS_WRONG = "stress_wrong"
    VOWEL_SWAP = "vowel_swap"
    CONSONANT_SWAP = "consonant_swap"
    MISSING_SOUND = "missing_sound"
    EXTRA_SOUND = "extra_sound"


class MirrorSource(str, Enum):
    STANDALONE = "standalone"
    MISSION_SCENE = "mission_scene"
    TALK_BACK = "talk_back"


class PhonemeFeedback(BaseModel):
    """Per-word pronunciation feedback."""

    word_he: str
    expected_transliteration: str
    heard_transliteration: str
    score: float = Field(default=0.0, ge=0.0, le=1.0)
    issue_type: Optional[PhonemeIssueType] = None


class PhoneticMirrorAttempt(Document):
    """Records a child's phonetic mirror pronunciation session."""

    user_id: Indexed(str)
    profile_id: Indexed(str)
    avatar_id: str
    target_phrase_he: str
    target_transliteration: str
    input_transcript: str = ""
    pronunciation_score: float = Field(default=0.0, ge=0.0, le=1.0)
    quality: PronunciationQuality = PronunciationQuality.NO_MATCH
    phoneme_feedback: List[PhonemeFeedback] = Field(default_factory=list)
    corrected_audio_gcs_path: Optional[str] = None
    source: MirrorSource = MirrorSource.STANDALONE
    shekels_earned: int = 0
    credits_charged: float = 0.0
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    class Settings:
        name = "phonetic_mirror_attempts"
        indexes = [
            IndexModel([("user_id", 1), ("profile_id", 1)]),
            IndexModel([("user_id", 1), ("created_at", -1)]),
            IndexModel([("avatar_id", 1)]),
        ]


class PracticePhrase(BaseModel):
    """A phrase suggested for pronunciation practice."""

    phrase_he: str
    transliteration: str
    translation: str
    difficulty: str = "medium"
    category: str = ""
    source_word: Optional[str] = None


class MirrorAttemptResponse(BaseModel):
    """API response for a phonetic mirror attempt."""

    id: str
    pronunciation_score: float
    quality: str
    phoneme_feedback: List[PhonemeFeedback]
    corrected_audio_url: Optional[str]
    shekels_earned: int
    input_transcript: str
    target_phrase_he: str
    created_at: str

    class Config:
        from_attributes = True
