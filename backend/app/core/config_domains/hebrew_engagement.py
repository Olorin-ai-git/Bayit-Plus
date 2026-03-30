"""Domain config: Hebrew engagement features (Phases 1-3)."""
from pydantic import Field


class HebrewEngagementConfigMixin:
    """Hebrew language engagement features configuration (Phases 1-3)."""

    # ============================================
    # HEBREW ENGAGEMENT FEATURES CONFIGURATION
    # ============================================

    # Phase 1 - Phrase Breakdown / Cultural Context
    PHRASE_BREAKDOWN_AI_MODEL: str = Field(
        default="claude-sonnet-4-20250514",
        env="PHRASE_BREAKDOWN_AI_MODEL",
        description="Claude model for phrase breakdown generation",
    )
    PHRASE_BREAKDOWN_CACHE_TTL_DAYS: int = Field(
        default=90,
        env="PHRASE_BREAKDOWN_CACHE_TTL_DAYS",
        description="Cache TTL for phrase breakdowns (days)",
    )

    # Phase 2 - Daily Missions / Gamification
    MISSIONS_DAILY_COUNT: int = Field(
        default=3, ge=1, le=10,
        env="MISSIONS_DAILY_COUNT",
        description="Number of daily missions generated per user",
    )
    SHEKEL_MISSION_EASY_MIN: int = Field(
        default=5, ge=1,
        env="SHEKEL_MISSION_EASY_MIN",
        description="Min shekels for easy missions",
    )
    SHEKEL_MISSION_EASY_MAX: int = Field(
        default=15, ge=1,
        env="SHEKEL_MISSION_EASY_MAX",
        description="Max shekels for easy missions",
    )
    SHEKEL_MISSION_MEDIUM_MIN: int = Field(
        default=15, ge=1,
        env="SHEKEL_MISSION_MEDIUM_MIN",
        description="Min shekels for medium missions",
    )
    SHEKEL_MISSION_MEDIUM_MAX: int = Field(
        default=30, ge=1,
        env="SHEKEL_MISSION_MEDIUM_MAX",
        description="Max shekels for medium missions",
    )
    SHEKEL_MISSION_HARD_MIN: int = Field(
        default=30, ge=1,
        env="SHEKEL_MISSION_HARD_MIN",
        description="Min shekels for hard missions",
    )
    SHEKEL_MISSION_HARD_MAX: int = Field(
        default=60, ge=1,
        env="SHEKEL_MISSION_HARD_MAX",
        description="Max shekels for hard missions",
    )
    SHEKEL_STREAK_BONUS_MULTIPLIER: float = Field(
        default=1.5,
        env="SHEKEL_STREAK_BONUS_MULTIPLIER",
        description="Multiplier for streak bonus shekels",
    )
    SHEKEL_PERFECT_QUIZ_BONUS: int = Field(
        default=50, ge=0,
        env="SHEKEL_PERFECT_QUIZ_BONUS",
        description="Bonus shekels for perfect quiz score",
    )
    SHEKEL_PHRASE_LEARN_REWARD: int = Field(
        default=5, ge=0,
        env="SHEKEL_PHRASE_LEARN_REWARD",
        description="Shekels earned per phrase learned",
    )
    SHEKEL_REWARD_EXCELLENT: int = Field(
        default=10, ge=0,
        env="SHEKEL_REWARD_EXCELLENT",
        description="Shekels earned for excellent pronunciation quality",
    )
    SHEKEL_REWARD_GOOD: int = Field(
        default=5, ge=0,
        env="SHEKEL_REWARD_GOOD",
        description="Shekels earned for good pronunciation quality",
    )
    SHEKEL_REWARD_FAIR: int = Field(
        default=2, ge=0,
        env="SHEKEL_REWARD_FAIR",
        description="Shekels earned for fair pronunciation quality",
    )
    SHEKEL_REWARD_NEEDS_PRACTICE: int = Field(
        default=1, ge=0,
        env="SHEKEL_REWARD_NEEDS_PRACTICE",
        description="Shekels earned for needs-practice pronunciation quality",
    )
    LEADERBOARD_DISPLAY_NAME_MAX_LENGTH: int = Field(
        default=50, ge=1, le=100,
        env="LEADERBOARD_DISPLAY_NAME_MAX_LENGTH",
        description="Max length for leaderboard display names",
    )
    LEADERBOARD_PAGE_SIZE: int = Field(
        default=25, ge=5, le=100,
        env="LEADERBOARD_PAGE_SIZE",
        description="Default page size for leaderboard queries",
    )
    LEADERBOARD_RECALCULATION_INTERVAL_HOURS: int = Field(
        default=1, ge=1,
        env="LEADERBOARD_RECALCULATION_INTERVAL_HOURS",
        description="Hours between leaderboard rank recalculations",
    )
    ZINE_GENERATION_DAY: int = Field(
        default=0, ge=0, le=6,
        env="ZINE_GENERATION_DAY",
        description="Day of week for zine generation (0=Monday)",
    )
    ZINE_MAX_PAGES: int = Field(
        default=8, ge=4, le=16,
        env="ZINE_MAX_PAGES",
        description="Maximum pages per weekly zine",
    )
    ZINE_AI_MODEL: str = Field(
        default="claude-sonnet-4-20250514",
        env="ZINE_AI_MODEL",
        description="Claude model for zine content generation",
    )
    ZINE_MAX_TOKENS: int = Field(
        default=4096, ge=1024, le=8192,
        env="ZINE_MAX_TOKENS",
        description="Max tokens for zine generation response",
    )

    # Phase 3 - Talk Back
    TALK_BACK_RESPONSE_TIMEOUT_SECONDS: int = Field(
        default=15, ge=5, le=60,
        env="TALK_BACK_RESPONSE_TIMEOUT_SECONDS",
        description="Seconds to wait for child's voice response",
    )
    TALK_BACK_HINT_DELAY_SECONDS: int = Field(
        default=5, ge=2, le=30,
        env="TALK_BACK_HINT_DELAY_SECONDS",
        description="Seconds before showing hint after question",
    )
    TALK_BACK_GENERATE_MAX_CUES: int = Field(
        default=200, ge=10, le=1000,
        env="TALK_BACK_GENERATE_MAX_CUES",
        description="Max subtitle cues to send to AI for point generation",
    )
    TALK_BACK_GENERATE_MAX_TOKENS: int = Field(
        default=4096, ge=512, le=8192,
        env="TALK_BACK_GENERATE_MAX_TOKENS",
        description="Max tokens for AI Talk Back point generation",
    )
