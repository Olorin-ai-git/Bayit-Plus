"""Domain config: Hebrew Phase 4 - Bilingual Bridge."""
from pydantic import Field


class HebrewBilingualConfigMixin:
    """Hebrew Phase 4 - Bilingual Bridge dubbing configuration."""

    # Phase 4 - Bilingual Bridge
    BILINGUAL_DUBBING_BEGINNER_MIN_RATIO: float = Field(
        default=0.10,
        env="BILINGUAL_DUBBING_BEGINNER_MIN_RATIO",
        description="Minimum Hebrew ratio for beginner level",
    )
    BILINGUAL_DUBBING_BEGINNER_MAX_RATIO: float = Field(
        default=0.30,
        env="BILINGUAL_DUBBING_BEGINNER_MAX_RATIO",
        description="Maximum Hebrew ratio for beginner level",
    )
    BILINGUAL_DUBBING_ELEMENTARY_MIN_RATIO: float = Field(
        default=0.20,
        env="BILINGUAL_DUBBING_ELEMENTARY_MIN_RATIO",
        description="Minimum Hebrew ratio for elementary level",
    )
    BILINGUAL_DUBBING_ELEMENTARY_MAX_RATIO: float = Field(
        default=0.50,
        env="BILINGUAL_DUBBING_ELEMENTARY_MAX_RATIO",
        description="Maximum Hebrew ratio for elementary level",
    )
    BILINGUAL_DUBBING_INTERMEDIATE_MIN_RATIO: float = Field(
        default=0.40,
        env="BILINGUAL_DUBBING_INTERMEDIATE_MIN_RATIO",
        description="Minimum Hebrew ratio for intermediate level",
    )
    BILINGUAL_DUBBING_INTERMEDIATE_MAX_RATIO: float = Field(
        default=0.70,
        env="BILINGUAL_DUBBING_INTERMEDIATE_MAX_RATIO",
        description="Maximum Hebrew ratio for intermediate level",
    )
    BILINGUAL_DUBBING_ADVANCED_MIN_RATIO: float = Field(
        default=0.60,
        env="BILINGUAL_DUBBING_ADVANCED_MIN_RATIO",
        description="Minimum Hebrew ratio for advanced level",
    )
    BILINGUAL_DUBBING_ADVANCED_MAX_RATIO: float = Field(
        default=0.90,
        env="BILINGUAL_DUBBING_ADVANCED_MAX_RATIO",
        description="Maximum Hebrew ratio for advanced level",
    )
    RATIO_ADJUSTMENT_STEP: float = Field(
        default=0.05,
        env="RATIO_ADJUSTMENT_STEP",
        description="Step size for ratio adjustments per session",
    )
    BILINGUAL_DUBBING_HEBREW_VOICE_ID: str = Field(
        default="",
        env="BILINGUAL_DUBBING_HEBREW_VOICE_ID",
        description="ElevenLabs voice ID for Hebrew in bilingual dubbing",
    )
    BILINGUAL_DUBBING_ENGLISH_VOICE_ID: str = Field(
        default="",
        env="BILINGUAL_DUBBING_ENGLISH_VOICE_ID",
        description="ElevenLabs voice ID for English in bilingual dubbing",
    )
    BILINGUAL_DUBBING_AI_MODEL: str = Field(
        default="claude-sonnet-4-20250514",
        env="BILINGUAL_DUBBING_AI_MODEL",
        description="Claude model for code-switch translation",
    )
    BILINGUAL_DUBBING_MAX_TOKENS: int = Field(
        default=2048, ge=512, le=8192,
        env="BILINGUAL_DUBBING_MAX_TOKENS",
        description="Max tokens for code-switch translation",
    )
    BILINGUAL_DUBBING_VOCAB_TARGET: int = Field(
        default=20, ge=5, le=100,
        env="BILINGUAL_DUBBING_VOCAB_TARGET",
        description="Target vocabulary words per session",
    )
