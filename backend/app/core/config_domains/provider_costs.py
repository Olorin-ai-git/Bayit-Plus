"""Domain config: AI provider cost rates for pipeline cost tracking."""
from pydantic import Field


class ProviderCostsConfigMixin:
    """Per-provider cost rates used to compute PipelineCost documents.

    Rates are configurable so they can be updated as provider pricing changes
    without a code deployment.
    """

    ELEVENLABS_STT_COST_PER_SECOND: float = Field(
        default=0.0004,
        ge=0.0,
        description=(
            "ElevenLabs Scribe v2 cost per audio second in USD. "
            "Used to compute ElevenLabs spend in PipelineCost."
        ),
    )
    CLAUDE_INPUT_COST_PER_TOKEN: float = Field(
        default=0.000003,
        ge=0.0,
        description=(
            "Anthropic Claude cost per input token in USD (claude-3-haiku baseline). "
            "Update when model or pricing changes."
        ),
    )
    CLAUDE_OUTPUT_COST_PER_TOKEN: float = Field(
        default=0.000015,
        ge=0.0,
        description=(
            "Anthropic Claude cost per output token in USD (claude-3-haiku baseline). "
            "Update when model or pricing changes."
        ),
    )
    OPENAI_EMBEDDING_COST_PER_TOKEN: float = Field(
        default=0.00000002,
        ge=0.0,
        description=(
            "OpenAI text-embedding-3-small cost per token in USD. "
            "Update when model or pricing changes."
        ),
    )
