"""Domain config: VOD interaction, Pause & Ask, shared sessions."""
from pydantic import Field


class InteractiveConfigMixin:
    """VOD avatar interaction, Pause & Ask, and shared sessions configuration."""

    # VOD Avatar Interaction (Character Conversations)
    CREDIT_RATE_VOD_INTERACTION_MESSAGE: int = Field(
        default=1, ge=0,
        env="CREDIT_RATE_VOD_INTERACTION_MESSAGE",
        description="Beta credits per character dialogue exchange",
    )
    CREDIT_RATE_VOD_INTERACTION_REEL: int = Field(
        default=25, ge=0,
        env="CREDIT_RATE_VOD_INTERACTION_REEL",
        description="Beta credits per interaction reel generation",
    )
    VOD_INTERACTION_MAX_DURATION: int = Field(
        default=30, ge=10, le=120,
        env="VOD_INTERACTION_MAX_DURATION",
        description="Maximum reel duration in seconds",
    )
    VOD_INTERACTION_MAX_EXCHANGES: int = Field(
        default=5, ge=1, le=20,
        env="VOD_INTERACTION_MAX_EXCHANGES",
        description="Maximum dialogue exchanges per session",
    )
    VOD_INTERACTION_AI_MODEL: str = Field(
        default="claude-sonnet-4-20250514",
        env="VOD_INTERACTION_AI_MODEL",
        description="Claude model for character dialogue generation",
    )
    VOD_INTERACTION_AI_MAX_TOKENS: int = Field(
        default=200, ge=50, le=1000,
        env="VOD_INTERACTION_AI_MAX_TOKENS",
        description="Max tokens for character dialogue response",
    )

    # Phase 3: Voice Interaction (WS1)
    VOD_INTERACTION_VOICE_ENABLED: bool = Field(
        default=True,
        env="VOD_INTERACTION_VOICE_ENABLED",
        description="Enable voice interaction via WebSocket",
    )
    VOD_INTERACTION_MAX_AUDIO_CHUNK_BYTES: int = Field(
        default=512000, ge=10000, le=2000000,
        env="VOD_INTERACTION_MAX_AUDIO_CHUNK_BYTES",
        description="Max audio data size per utterance in bytes",
    )
    VOD_INTERACTION_VOICE_TIMEOUT_SECONDS: int = Field(
        default=30, ge=5, le=120,
        env="VOD_INTERACTION_VOICE_TIMEOUT_SECONDS",
        description="Inactivity timeout for voice interaction WebSocket",
    )
    VOD_INTERACTION_VOICE_MAX_EXCHANGES: int = Field(
        default=10, ge=1, le=30,
        env="VOD_INTERACTION_VOICE_MAX_EXCHANGES",
        description="Max voice exchanges per session",
    )

    # Phase 3: Smart Avatar Positioning (WS2)
    VOD_INTERACTION_SMART_POSITIONING: bool = Field(
        default=True,
        env="VOD_INTERACTION_SMART_POSITIONING",
        description="Enable smart avatar placement based on scene analysis",
    )
    VOD_INTERACTION_DEFAULT_AVATAR_POSITION: str = Field(
        default="bottom_left",
        env="VOD_INTERACTION_DEFAULT_AVATAR_POSITION",
        description="Default avatar position quadrant",
    )
    VOD_INTERACTION_AVATAR_SIZE_RATIO: float = Field(
        default=0.15, ge=0.05, le=0.4,
        env="VOD_INTERACTION_AVATAR_SIZE_RATIO",
        description="Avatar size as ratio of frame dimensions",
    )

    # Phase 3: Multi-Character Interaction (WS3)
    VOD_INTERACTION_MULTI_CHARACTER_ENABLED: bool = Field(
        default=True,
        env="VOD_INTERACTION_MULTI_CHARACTER_ENABLED",
        description="Enable multi-character interactions",
    )
    VOD_INTERACTION_MAX_CHARACTERS_PER_MOMENT: int = Field(
        default=5, ge=1, le=10,
        env="VOD_INTERACTION_MAX_CHARACTERS_PER_MOMENT",
        description="Max characters in a single interactive moment (tier-dependent)",
    )
    VOD_INTERACTION_REACTIONS_ENABLED: bool = Field(
        default=True,
        env="VOD_INTERACTION_REACTIONS_ENABLED",
        description="Enable text reactions from non-addressed characters",
    )
    VOD_INTERACTION_REACTION_PROBABILITY: float = Field(
        default=0.4, ge=0.0, le=1.0,
        env="VOD_INTERACTION_REACTION_PROBABILITY",
        description="Probability of non-addressed character reacting",
    )

    # Phase 3: Shared Interactive Sessions (WS4)
    VOD_INTERACTION_SHARED_ENABLED: bool = Field(
        default=True,
        env="VOD_INTERACTION_SHARED_ENABLED",
        description="Enable shared interactive sessions in watch parties",
    )
    VOD_INTERACTION_MAX_SHARED_PARTICIPANTS: int = Field(
        default=4, ge=2, le=8,
        env="VOD_INTERACTION_MAX_SHARED_PARTICIPANTS",
        description="Max participants in shared interaction session",
    )
    VOD_INTERACTION_TURN_TIMEOUT_SECONDS: int = Field(
        default=30, ge=10, le=120,
        env="VOD_INTERACTION_TURN_TIMEOUT_SECONDS",
        description="Auto-advance after this many seconds of inactivity",
    )
    VOD_INTERACTION_TURN_WARNING_SECONDS: int = Field(
        default=10, ge=3, le=30,
        env="VOD_INTERACTION_TURN_WARNING_SECONDS",
        description="Seconds before timeout to send countdown warning",
    )
    VOD_INTERACTION_MAX_TURNS_PER_PARTICIPANT: int = Field(
        default=3, ge=1, le=10,
        env="VOD_INTERACTION_MAX_TURNS_PER_PARTICIPANT",
        description="Max turns each participant gets in shared session",
    )
    CREDIT_RATE_VOD_INTERACTION_SHARED_REEL: int = Field(
        default=15, ge=0,
        env="CREDIT_RATE_VOD_INTERACTION_SHARED_REEL",
        description="Credits per shared interaction reel (split among participants)",
    )

    # Pause & Ask (Dynamic character dialogue with user avatar animation)
    VOD_INTERACTION_PAUSE_ASK_ENABLED: bool = Field(
        default=True,
        env="VOD_INTERACTION_PAUSE_ASK_ENABLED",
        description="Enable Pause & Ask feature (user avatar + character lip-sync)",
    )
    VOD_INTERACTION_TEXT_POLISH_MAX_TOKENS: int = Field(
        default=150, ge=50, le=500,
        env="VOD_INTERACTION_TEXT_POLISH_MAX_TOKENS",
        description="Max tokens for grammar/pronunciation polish via Claude",
    )
    VOD_INTERACTION_TEXT_POLISH_MODEL: str = Field(
        default="claude-haiku-4-5-20251001",
        env="VOD_INTERACTION_TEXT_POLISH_MODEL",
        description="Claude model for text polishing (fast, cheap)",
    )
    CREDIT_RATE_VOD_PAUSE_ASK: int = Field(
        default=3, ge=0,
        env="CREDIT_RATE_VOD_PAUSE_ASK",
        description="Credits per Pause & Ask exchange with lip-sync animation",
    )
    CREDIT_RATE_VOD_PAUSE_ASK_VOICE_ONLY: int = Field(
        default=1, ge=0,
        env="CREDIT_RATE_VOD_PAUSE_ASK_VOICE_ONLY",
        description="Credits per Pause & Ask exchange in voice-only mode (no animation)",
    )
    CREDIT_RATE_VOD_FEATURE_UNLOCK: int = Field(
        default=1, ge=0,
        env="CREDIT_RATE_VOD_FEATURE_UNLOCK",
        description="Credits per VOD AI feature unlock (per user per content)",
    )
