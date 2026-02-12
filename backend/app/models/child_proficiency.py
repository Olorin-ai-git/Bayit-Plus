"""
Child Hebrew Proficiency Model.

Tracks each child profile's Hebrew comprehension level, known vocabulary,
and assessment history. Shared foundation for Talk Back + Bilingual Bridge.
"""

from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional

from beanie import Document
from pydantic import BaseModel, Field
from pymongo import IndexModel


class ProficiencyLevel(str, Enum):
    """Hebrew proficiency levels."""

    BEGINNER = "beginner"
    ELEMENTARY = "elementary"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class AssessmentResult(BaseModel):
    """Single proficiency assessment record."""

    assessed_at: datetime
    source: str = Field(
        ..., description="quiz, talk_back, subtitle_interaction"
    )
    score: float = Field(..., ge=0.0, le=1.0)
    words_tested: int = Field(default=0, ge=0)
    words_correct: int = Field(default=0, ge=0)
    hebrew_ratio: float = Field(
        default=0.0, ge=0.0, le=1.0,
        description="Ratio of Hebrew used in response",
    )


class VocabularyWord(BaseModel):
    """Tracked vocabulary word with mastery score."""

    word: str
    transliteration: str = ""
    translation: str = ""
    mastery: float = Field(
        default=0.0, ge=0.0, le=1.0,
        description="0=unknown, 1=mastered",
    )
    first_seen: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    last_tested: Optional[datetime] = None
    times_correct: int = Field(default=0, ge=0)
    times_tested: int = Field(default=0, ge=0)


class ChildProficiency(Document):
    """
    Per-profile Hebrew proficiency tracking.

    Used by Talk Back for question difficulty and
    Bilingual Bridge for language ratio targeting.
    """

    user_id: str = Field(...)
    profile_id: str = Field(...)

    level: ProficiencyLevel = Field(
        default=ProficiencyLevel.BEGINNER
    )
    overall_score: float = Field(
        default=0.0, ge=0.0, le=1.0,
        description="Weighted average of recent assessments",
    )
    hebrew_ratio: float = Field(
        default=0.1, ge=0.0, le=1.0,
        description="Current target Hebrew ratio for content",
    )

    vocabulary_known: List[VocabularyWord] = Field(
        default_factory=list,
        description="Words the child has mastered",
    )
    vocabulary_learning: List[VocabularyWord] = Field(
        default_factory=list,
        description="Words actively being learned",
    )

    assessment_history: List[AssessmentResult] = Field(
        default_factory=list,
        description="Recent assessment results (kept limited)",
    )

    total_assessments: int = Field(default=0, ge=0)
    total_words_learned: int = Field(default=0, ge=0)

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    class Settings:
        name = "child_proficiency"
        indexes = [
            IndexModel(
                [("user_id", 1), ("profile_id", 1)], unique=True
            ),
            IndexModel([("level", 1)]),
        ]


class ProficiencyResponse(BaseModel):
    """API response for proficiency status."""

    level: str
    overall_score: float
    hebrew_ratio: float
    total_words_learned: int
    vocabulary_known_count: int
    vocabulary_learning_count: int

    class Config:
        from_attributes = True
