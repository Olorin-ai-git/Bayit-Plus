"""
Comprehension Question Models.

Scene-triggered comprehension questions for Hebrew learning.
Questions pause video at scene boundaries to test understanding.
"""

from datetime import datetime
from typing import List, Optional
from uuid import uuid4

from beanie import Document
from pydantic import BaseModel, Field


class ComprehensionQuestionModel(BaseModel):
    """Scene-triggered comprehension question."""

    question_id: str = Field(default_factory=lambda: str(uuid4()))

    # Question content (multilingual)
    question_text: str = Field(..., min_length=10, max_length=300)
    question_text_en: Optional[str] = None
    options: List[str] = Field(..., min_length=4, max_length=4)
    options_en: Optional[List[str]] = None
    correct_index: int = Field(..., ge=0, le=3)
    explanation: Optional[str] = Field(None, max_length=200)
    explanation_en: Optional[str] = None

    # Scene context
    scene_start_time: float = Field(..., ge=0)
    scene_end_time: float = Field(..., ge=0)
    scene_context: str = Field(
        ..., description="Subtitle text from scene (max 1000 chars)"
    )
    chapter_title: Optional[str] = None

    # Difficulty & scoring
    difficulty: str = Field("medium", pattern="^(easy|medium|hard)$")
    points: int = Field(default=10, ge=1, le=50)

    # Metadata
    generated_at: datetime = Field(default_factory=datetime.utcnow)
    generation_method: str = Field("ai", pattern="^(ai|manual)$")


class ContentComprehension(Document):
    """Collection of comprehension questions for content."""

    content_id: str
    content_type: str = "vod"
    questions: List[ComprehensionQuestionModel] = Field(default_factory=list)
    language: str = "he"
    content_hash: Optional[str] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "content_comprehension"
        indexes = [
            "content_id",
            [("content_id", 1), ("language", 1)],
        ]

    @classmethod
    async def get_for_content(
        cls, content_id: str, language: str = "he"
    ) -> Optional["ContentComprehension"]:
        """Get comprehension questions for content."""
        return await cls.find_one({"content_id": content_id, "language": language})


class ComprehensionQuestionPublic(BaseModel):
    """Public question without correct_index (for API responses)."""

    question_id: str
    question_text: str
    question_text_en: Optional[str] = None
    options: List[str]
    options_en: Optional[List[str]] = None
    scene_start_time: float
    scene_end_time: float
    difficulty: str
    points: int

    @classmethod
    def from_question(
        cls, question: ComprehensionQuestionModel
    ) -> "ComprehensionQuestionPublic":
        """Create public question from internal model."""
        return cls(
            question_id=question.question_id,
            question_text=question.question_text,
            question_text_en=question.question_text_en,
            options=question.options,
            options_en=question.options_en,
            scene_start_time=question.scene_start_time,
            scene_end_time=question.scene_end_time,
            difficulty=question.difficulty,
            points=question.points,
        )
