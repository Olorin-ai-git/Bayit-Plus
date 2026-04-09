"""Domain config: Training platform per-feature AI credit rates."""
from pydantic import Field


class TrainingCreditsConfigMixin:
    """Per-feature credit costs for the training platform."""

    TRAINING_CREDIT_PAUSE_ASK_VOICE: int = Field(
        default=1, ge=0, env="TRAINING_CREDIT_PAUSE_ASK_VOICE",
        description="Credits per voice-only Pause & Ask exchange")
    TRAINING_CREDIT_PAUSE_ASK_LIPSYNC: int = Field(
        default=3, ge=0, env="TRAINING_CREDIT_PAUSE_ASK_LIPSYNC",
        description="Credits per lip-sync Pause & Ask exchange")
    TRAINING_CREDIT_COMPANION: int = Field(
        default=1, ge=0, env="TRAINING_CREDIT_COMPANION",
        description="Credits per AI Companion query")
    TRAINING_CREDIT_COMPREHENSION: int = Field(
        default=1, ge=0, env="TRAINING_CREDIT_COMPREHENSION",
        description="Credits per comprehension question")
    TRAINING_CREDIT_SEARCH: int = Field(
        default=2, ge=0, env="TRAINING_CREDIT_SEARCH",
        description="Credits per semantic search query")
    TRAINING_CREDIT_TALK_BACK: int = Field(
        default=3, ge=0, env="TRAINING_CREDIT_TALK_BACK",
        description="Credits per Talk Back evaluation")
    TRAINING_CREDIT_CULTURAL: int = Field(
        default=2, ge=0, env="TRAINING_CREDIT_CULTURAL",
        description="Credits per cultural context detection")
    TRAINING_CREDIT_RECAP: int = Field(
        default=2, ge=0, env="TRAINING_CREDIT_RECAP",
        description="Credits per recap generation")
