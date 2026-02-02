"""
Quiz Attempt Model - Tracks user quiz submissions and results.

Follows WatchHistory pattern for user activity tracking with profile support.
"""

from datetime import datetime
from typing import Dict, List, Optional

from beanie import Document
from pydantic import BaseModel, Field, field_validator


class QuizAnswerRecord(BaseModel):
    """Individual answer record for a quiz question."""

    question_index: int = Field(..., ge=0, description="Index of the question")
    selected_option: int = Field(..., ge=0, le=3, description="Selected answer index")
    is_correct: bool = Field(..., description="Whether answer was correct")
    time_taken_ms: int = Field(..., ge=0, description="Time taken in milliseconds")
    points_earned: int = Field(..., ge=0, description="Points earned for this question")


class QuizAttempt(Document):
    """Record of a user's quiz attempt."""

    user_id: str = Field(..., description="Reference to User document")
    profile_id: Optional[str] = Field(
        None, description="Reference to Profile document (for kids profiles)"
    )
    quiz_id: str = Field(..., description="Reference to ContentQuiz document")
    content_id: str = Field(..., description="Reference to Content document")
    content_type: str = Field("vod", pattern="^(vod|series_episode)$")

    # Answer details
    answers: List[QuizAnswerRecord] = Field(default_factory=list)

    # Results
    total_questions: int = Field(..., ge=1)
    correct_answers: int = Field(..., ge=0)
    score: float = Field(..., ge=0.0, le=100.0, description="Percentage score")
    points_earned: int = Field(..., ge=0, description="Total points earned")
    badges_earned: List[str] = Field(
        default_factory=list, description="Badge IDs earned from this attempt"
    )

    # Timing
    started_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: datetime = Field(default_factory=datetime.utcnow)
    total_time_ms: int = Field(..., ge=0, description="Total time in milliseconds")

    @field_validator("score")
    @classmethod
    def validate_score(cls, v: float) -> float:
        """Validate score is percentage."""
        if v < 0 or v > 100:
            raise ValueError("Score must be between 0 and 100")
        return round(v, 2)

    class Settings:
        name = "quiz_attempts"
        indexes = [
            [("user_id", 1), ("completed_at", -1)],
            [("user_id", 1), ("profile_id", 1), ("completed_at", -1)],
            [("content_id", 1), ("score", -1)],
            [("user_id", 1), ("quiz_id", 1)],
            [("user_id", 1), ("profile_id", 1), ("content_id", 1)],
        ]

    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "507f1f77bcf86cd799439011",
                "profile_id": "507f1f77bcf86cd799439012",
                "quiz_id": "507f1f77bcf86cd799439013",
                "content_id": "507f1f77bcf86cd799439014",
                "content_type": "vod",
                "total_questions": 5,
                "correct_answers": 4,
                "score": 80.0,
                "points_earned": 45,
                "badges_earned": ["first_quiz"],
                "total_time_ms": 45000,
            }
        }

    def is_perfect_score(self) -> bool:
        """Check if this attempt was a perfect score."""
        return self.correct_answers == self.total_questions


class QuizAttemptResponse(BaseModel):
    """API response for quiz attempt."""

    attempt_id: str
    quiz_id: str
    content_id: str
    content_type: str
    total_questions: int
    correct_answers: int
    score: float
    points_earned: int
    badges_earned: List[str]
    total_time_ms: int
    completed_at: datetime

    class Config:
        from_attributes = True


class QuizResultResponse(BaseModel):
    """API response for quiz submission result."""

    attempt_id: str
    score: float
    correct_answers: int
    total_questions: int
    points_earned: int
    new_badges: List[Dict] = Field(
        default_factory=list, description="Newly earned badges with details"
    )
    total_points: int = Field(description="User's total points after this quiz")
    streak_days: int = Field(description="Current streak in days")
    is_perfect: bool


class QuizHistoryResponse(BaseModel):
    """API response for quiz history."""

    attempts: List[QuizAttemptResponse]
    total_attempts: int
    total_points_earned: int
    perfect_scores: int
    average_score: float
