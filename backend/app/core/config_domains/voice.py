"""Domain config: Voice commands, VAD, intent classification, and semantic search."""
from pydantic import Field


class VoiceConfigMixin:
    """Voice commands, adaptive VAD, intent classification, and semantic search fields."""

    # Voice Commands (opt-in)
    VOICE_COMMANDS_ENABLED: bool = Field(default=False)
    VOICE_RESPONSE_ENABLED: bool = Field(default=True)
    TTS_VOICE_ID: str = Field(
        default="21m00Tcm4TlvDq8ikWAM"
    )  # Default ElevenLabs voice for CLI responses

    # Voice Agent - Adaptive VAD
    VAD_SHORT_UTTERANCE_SILENCE: float = Field(
        default=1.0,
        description="Silence threshold (seconds) for short utterances (<3 words)",
    )
    VAD_MEDIUM_UTTERANCE_SILENCE: float = Field(
        default=2.0,
        description="Silence threshold (seconds) for medium utterances (3-8 words)",
    )
    VAD_LONG_UTTERANCE_SILENCE: float = Field(
        default=3.5,
        description="Silence threshold (seconds) for long utterances (>8 words)",
    )
    VAD_SHORT_WORD_THRESHOLD: int = Field(
        default=3,
        description="Word count below which short silence threshold applies",
    )
    VAD_MEDIUM_WORD_THRESHOLD: int = Field(
        default=8,
        description="Word count below which medium silence threshold applies",
    )

    # Voice Agent - Embedding Intent Classifier
    INTENT_EMBEDDING_MODEL: str = Field(
        default="text-embedding-3-small",
        description="OpenAI model for intent embedding classification",
    )
    INTENT_EMBEDDING_DIMENSIONS: int = Field(
        default=256,
        description="Embedding vector dimensions for intent classifier",
    )
    INTENT_EMBEDDING_THRESHOLD: float = Field(
        default=0.78,
        description="Cosine similarity threshold for embedding intent match",
    )

    # Voice Agent - Barge-In
    BARGE_IN_DEBOUNCE_MS: int = Field(
        default=300,
        description="Debounce duration (ms) before barge-in triggers",
    )

    # Semantic Search (opt-in)
    SEMANTIC_SEARCH_ENABLED: bool = Field(default=False)
    SEMANTIC_SEARCH_RERANK: bool = Field(default=True)
