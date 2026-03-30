"""Domain config: Trivia features and interactive kids quizzes."""
from pydantic import Field, field_validator


class KidsTriviaConfigMixin:
    """Trivia feature and kids quiz configuration fields."""

    # Trivia Feature Configuration
    TRIVIA_ENABLED: bool = Field(
        default=True, description="Enable trivia feature globally"
    )
    TRIVIA_DEFAULT_DISPLAY_DURATION_SECONDS: int = Field(
        default=15,
        ge=5,
        le=30,
        description="Default trivia display duration in seconds",
    )
    TRIVIA_MIN_INTERVAL_SECONDS: int = Field(
        default=300, ge=60, le=1800, description="Minimum interval between trivia facts"
    )
    TRIVIA_MAX_FACTS_PER_CONTENT: int = Field(
        default=50, ge=10, le=100, description="Maximum trivia facts per content item"
    )
    TRIVIA_ROLLOUT_PERCENTAGE: int = Field(
        default=100, ge=0, le=100, description="Percentage of users to show trivia"
    )
    TRIVIA_AI_MAX_TOKENS: int = Field(
        default=4096, ge=256, le=8192, description="Max tokens for AI trivia generation"
    )
    TRIVIA_SANITIZE_TITLE_MAX_LEN: int = Field(
        default=200, ge=50, le=500, description="Max length for title sanitization"
    )
    TRIVIA_SANITIZE_DESCRIPTION_MAX_LEN: int = Field(
        default=500,
        ge=100,
        le=2000,
        description="Max length for description sanitization",
    )
    TRIVIA_SANITIZE_FIELD_MAX_LEN: int = Field(
        default=100,
        ge=50,
        le=500,
        description="Max length for other field sanitization",
    )
    TRIVIA_AI_MAX_CHAIN_DEPTH: int = Field(
        default=3,
        ge=1,
        le=5,
        description="Maximum follow-up depth per trivia chain",
    )
    TRIVIA_AI_MAX_CHAINS_PER_CONTENT: int = Field(
        default=3,
        ge=1,
        le=10,
        description="Maximum number of fact chains per content item",
    )
    TRIVIA_AI_CONTEXT_MAX_CAST: int = Field(
        default=10,
        ge=3,
        le=20,
        description="Maximum cast members to include in TMDB context for AI prompt",
    )

    @field_validator("TRIVIA_MIN_INTERVAL_SECONDS")
    @classmethod
    def validate_trivia_interval(cls, v: int) -> int:
        """Validate trivia interval is reasonable."""
        if v < 60:
            raise ValueError("TRIVIA_MIN_INTERVAL_SECONDS must be at least 60 seconds")
        if v > 1800:
            raise ValueError("TRIVIA_MIN_INTERVAL_SECONDS must not exceed 1800 seconds")
        return v

    @field_validator("TRIVIA_ROLLOUT_PERCENTAGE")
    @classmethod
    def validate_trivia_rollout(cls, v: int) -> int:
        """Validate rollout percentage is valid."""
        if v < 0 or v > 100:
            raise ValueError("TRIVIA_ROLLOUT_PERCENTAGE must be between 0 and 100")
        return v

    # Interactive quizzes for kids content (ages 0-12)
    QUIZ_ENABLED: bool = Field(
        default=True,
        env="QUIZ_ENABLED",
        description="Enable kids quiz feature globally"
    )
    QUIZ_MIN_QUESTIONS: int = Field(
        default=5, ge=3, le=10,
        env="QUIZ_MIN_QUESTIONS",
        description="Minimum questions per quiz"
    )
    QUIZ_MAX_QUESTIONS: int = Field(
        default=10, ge=5, le=25,
        env="QUIZ_MAX_QUESTIONS",
        description="Maximum questions per quiz"
    )
    QUIZ_POINTS_EASY: int = Field(
        default=10, ge=1, le=50,
        env="QUIZ_POINTS_EASY",
        description="Points awarded for easy questions"
    )
    QUIZ_POINTS_MEDIUM: int = Field(
        default=20, ge=1, le=100,
        env="QUIZ_POINTS_MEDIUM",
        description="Points awarded for medium questions"
    )
    QUIZ_POINTS_HARD: int = Field(
        default=30, ge=1, le=150,
        env="QUIZ_POINTS_HARD",
        description="Points awarded for hard questions"
    )
    QUIZ_PERFECT_BONUS: int = Field(
        default=50, ge=0, le=500,
        env="QUIZ_PERFECT_BONUS",
        description="Bonus points for perfect score"
    )
    QUIZ_GENERATION_MODEL: str = Field(
        default="claude-sonnet-4-20250514",
        env="QUIZ_GENERATION_MODEL",
        description="Claude model for quiz generation"
    )
    QUIZ_AI_MAX_TOKENS: int = Field(
        default=2000, ge=500, le=4096,
        env="QUIZ_AI_MAX_TOKENS",
        description="Max tokens for AI quiz generation"
    )
    QUIZ_ROLLOUT_PERCENTAGE: int = Field(
        default=100, ge=0, le=100,
        env="QUIZ_ROLLOUT_PERCENTAGE",
        description="Percentage of kids profiles to show quiz"
    )
    QUIZ_CACHE_TTL_HOURS: int = Field(
        default=168, ge=1, le=720,
        env="QUIZ_CACHE_TTL_HOURS",
        description="Cache TTL for generated quizzes (168h = 1 week)"
    )

    @field_validator("QUIZ_ROLLOUT_PERCENTAGE")
    @classmethod
    def validate_quiz_rollout(cls, v: int) -> int:
        """Validate quiz rollout percentage is valid."""
        if v < 0 or v > 100:
            raise ValueError("QUIZ_ROLLOUT_PERCENTAGE must be between 0 and 100")
        return v

    # Kids Educational Sites Configuration (JSON mapping subcategory -> URLs)
    KIDS_EDUCATIONAL_SITES_CONFIG: str = ""
