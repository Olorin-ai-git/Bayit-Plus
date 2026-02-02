"""
Quiz Models - Interactive quizzes for kids content.

Quiz questions are AI-generated for kids content (is_kids_content=true) and
displayed after content ends. Follows ContentTrivia pattern for consistency.
"""

from datetime import datetime
from typing import List, Optional
from uuid import uuid4

from beanie import Document
from pydantic import BaseModel, Field, field_validator, model_validator
from pymongo import IndexModel, ReturnDocument


class QuizQuestionModel(BaseModel):
    """Individual quiz question with multilingual support."""

    question_id: str = Field(default_factory=lambda: str(uuid4()))
    question_text: str = Field(
        ..., min_length=10, max_length=500, description="Question in primary language"
    )
    question_text_en: Optional[str] = Field(
        None, max_length=500, description="English translation"
    )
    options: List[str] = Field(
        ..., min_length=4, max_length=4, description="Exactly 4 answer options"
    )
    options_en: Optional[List[str]] = Field(
        None, description="English translations for options"
    )
    correct_index: int = Field(..., ge=0, le=3, description="Index of correct answer")
    difficulty: str = Field("medium", pattern="^(easy|medium|hard)$")
    points: int = Field(default=10, ge=1, le=100)
    explanation: Optional[str] = Field(
        None, max_length=300, description="Explanation shown after answer"
    )
    explanation_en: Optional[str] = Field(None, max_length=300)

    @field_validator("question_text")
    @classmethod
    def validate_question_text(cls, v: str) -> str:
        """Validate question text is not empty."""
        if not v or not v.strip():
            raise ValueError("Question text cannot be empty")
        return v.strip()

    @field_validator("options")
    @classmethod
    def validate_options(cls, v: List[str]) -> List[str]:
        """Validate exactly 4 non-empty options."""
        if len(v) != 4:
            raise ValueError("Must have exactly 4 options")
        stripped = [opt.strip() for opt in v]
        if any(not opt for opt in stripped):
            raise ValueError("Options cannot be empty")
        return stripped

    @field_validator("options_en", mode="before")
    @classmethod
    def validate_options_en(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        """Validate English options if provided."""
        if v is not None and len(v) != 4:
            raise ValueError("English options must have exactly 4 items")
        return v


class ContentQuiz(Document):
    """Quiz for a piece of content (kids only)."""

    content_id: str = Field(..., description="Reference to Content document")
    content_type: str = Field("vod", pattern="^(vod|series_episode)$")
    questions: List[QuizQuestionModel] = Field(
        default_factory=list, max_length=25, description="Max 25 questions per quiz"
    )
    age_group: str = Field(
        ...,
        pattern="^(toddlers|preschool|elementary|preteen)$",
        description="Target age group: toddlers (0-3), preschool (3-5), elementary (6-9), preteen (9-12)",
    )
    language: str = Field("he", description="Primary language of quiz")
    generated_at: datetime = Field(default_factory=datetime.utcnow)
    generation_method: str = Field("ai", pattern="^(ai|manual)$")
    content_hash: Optional[str] = Field(
        None, description="Hash for cache invalidation"
    )
    tmdb_id: Optional[int] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    @model_validator(mode="after")
    def validate_questions_count(self) -> "ContentQuiz":
        """Validate questions count within limits."""
        if len(self.questions) > 25:
            raise ValueError("Maximum 25 questions per quiz")
        return self

    class Settings:
        name = "content_quizzes"
        indexes = [
            "content_id",
            "age_group",
            "tmdb_id",
            IndexModel([("content_id", 1), ("language", 1)], unique=True),
            IndexModel([("age_group", 1), ("language", 1)]),
        ]

    @classmethod
    async def get_for_content(
        cls, content_id: str, language: str = "he"
    ) -> Optional["ContentQuiz"]:
        """Get quiz for specific content and language."""
        return await cls.find_one(
            {"content_id": content_id, "language": language}
        )

    @classmethod
    async def create_or_update(
        cls,
        content_id: str,
        content_type: str,
        questions: List[QuizQuestionModel],
        age_group: str,
        language: str = "he",
        generation_method: str = "ai",
        tmdb_id: Optional[int] = None,
        content_hash: Optional[str] = None,
    ) -> "ContentQuiz":
        """Create new quiz or update existing using atomic find_one_and_update."""
        now = datetime.utcnow()
        questions_dicts = [q.model_dump() for q in questions]

        update_data = {
            "$set": {
                "questions": questions_dicts,
                "age_group": age_group,
                "generation_method": generation_method,
                "tmdb_id": tmdb_id,
                "content_hash": content_hash,
                "generated_at": now,
                "updated_at": now,
            },
            "$setOnInsert": {
                "content_id": content_id,
                "content_type": content_type,
                "language": language,
                "created_at": now,
            },
        }

        collection = cls.get_pymongo_collection()
        result = await collection.find_one_and_update(
            {"content_id": content_id, "language": language},
            update_data,
            upsert=True,
            return_document=ReturnDocument.AFTER,
        )

        return cls.model_validate(result)


class QuizQuestionPublic(BaseModel):
    """Public quiz question without correct_index (for API responses)."""

    question_id: str
    question_text: str
    question_text_en: Optional[str] = None
    options: List[str]
    options_en: Optional[List[str]] = None
    difficulty: str
    points: int

    @classmethod
    def from_question(cls, question: QuizQuestionModel) -> "QuizQuestionPublic":
        """Create public question from internal model, excluding correct_index."""
        return cls(
            question_id=question.question_id,
            question_text=question.question_text,
            question_text_en=question.question_text_en,
            options=question.options,
            options_en=question.options_en,
            difficulty=question.difficulty,
            points=question.points,
        )


class QuizResponse(BaseModel):
    """API response for quiz (excludes correct answers for security)."""

    quiz_id: str
    content_id: str
    content_type: str
    questions: List[QuizQuestionPublic]
    age_group: str
    language: str
    total_questions: int
    max_points: int

    class Config:
        from_attributes = True


class QuizSubmitRequest(BaseModel):
    """Request to submit quiz answers."""

    answers: List[int] = Field(
        ..., description="List of selected option indices (0-3)"
    )
    time_taken_per_question_ms: Optional[List[int]] = Field(
        None, description="Time taken for each question in milliseconds"
    )

    @field_validator("answers")
    @classmethod
    def validate_answers(cls, v: List[int]) -> List[int]:
        """Validate answer indices are valid."""
        for answer in v:
            if not 0 <= answer <= 3:
                raise ValueError("Answer indices must be between 0 and 3")
        return v
