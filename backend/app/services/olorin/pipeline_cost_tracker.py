"""Pipeline cost accumulator and PipelineCost document writer.

Tracks per-provider AI spend for a single ingest pipeline run.
Written to MongoDB at pipeline completion for the superadmin cost dashboard.

Provider coverage:
  - ElevenLabs Scribe: billed per audio second (duration available from
    TranscriptionResult.duration_seconds).
  - Claude (Anthropic): character extraction, trivia generation, and
    trivia translation.  Token counts captured via contextvars-based
    ``track_claude_usage`` called in each sub-service after the API
    response is received.
  - OpenAI embeddings: search indexing.  Token counts captured via
    ``track_openai_embedding_usage`` in the embedding module.

The write is always wrapped in a try/except — cost recording must never
block or fail the pipeline.
"""

from contextvars import ContextVar
from dataclasses import dataclass, field as dc_field
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.pipeline_cost import PipelineCost, StepCosts

logger = get_logger(__name__)

# ---------------------------------------------------------------------------
# Context-var based cost tracking
# ---------------------------------------------------------------------------
# The orchestrator sets this at pipeline start; sub-services call the
# track_* helpers after each AI API call.  Because all stages run in the
# same async task, the context var is visible throughout the pipeline
# without changing any function signatures or return types.

_current_accumulator: ContextVar[Optional["_CostAccumulator"]] = ContextVar(
    "_current_accumulator", default=None,
)


def set_current_accumulator(acc: "_CostAccumulator") -> None:
    """Bind *acc* as the active accumulator for the current async context."""
    _current_accumulator.set(acc)


def clear_current_accumulator() -> None:
    """Remove the active accumulator (end-of-pipeline cleanup)."""
    _current_accumulator.set(None)


def track_claude_usage(input_tokens: int, output_tokens: int) -> None:
    """Accumulate Claude cost if a pipeline accumulator is active."""
    acc = _current_accumulator.get()
    if acc is not None:
        acc.add_claude(input_tokens, output_tokens)


def track_openai_embedding_usage(total_tokens: int) -> None:
    """Accumulate OpenAI embedding cost if a pipeline accumulator is active."""
    acc = _current_accumulator.get()
    if acc is not None:
        acc.add_openai_embedding(total_tokens)


@dataclass
class _CostAccumulator:
    """Mutable accumulator for per-provider spend during a pipeline run."""

    elevenlabs: Decimal = dc_field(default_factory=lambda: Decimal("0.0"))
    claude: Decimal = dc_field(default_factory=lambda: Decimal("0.0"))
    openai: Decimal = dc_field(default_factory=lambda: Decimal("0.0"))

    def total(self) -> Decimal:
        """Sum of all provider costs."""
        return self.elevenlabs + self.claude + self.openai

    def add_elevenlabs_stt(self, duration_seconds: float) -> None:
        """Accumulate ElevenLabs Scribe v2 cost for the given audio duration."""
        self.elevenlabs += (
            Decimal(str(duration_seconds))
            * Decimal(str(settings.ELEVENLABS_STT_COST_PER_SECOND))
        )

    def add_claude(self, input_tokens: int, output_tokens: int) -> None:
        """Accumulate Anthropic Claude cost from a message response usage block."""
        self.claude += (
            Decimal(str(input_tokens))
            * Decimal(str(settings.CLAUDE_INPUT_COST_PER_TOKEN))
            + Decimal(str(output_tokens))
            * Decimal(str(settings.CLAUDE_OUTPUT_COST_PER_TOKEN))
        )

    def add_openai_embedding(self, total_tokens: int) -> None:
        """Accumulate OpenAI embedding cost from a create response usage block."""
        self.openai += (
            Decimal(str(total_tokens))
            * Decimal(str(settings.OPENAI_EMBEDDING_COST_PER_TOKEN))
        )


async def write_pipeline_cost(
    acc: _CostAccumulator,
    *,
    org_id: str,
    partner_id: str,
    content_id: str,
    video_title: str,
    started_at: datetime,
) -> None:
    """Persist a PipelineCost document for one completed pipeline run.

    Always wrapped in try/except — cost recording must never block the pipeline.
    """
    try:
        await PipelineCost(
            org_id=org_id,
            partner_id=partner_id,
            content_id=content_id,
            video_title=video_title,
            started_at=started_at,
            completed_at=datetime.now(timezone.utc),
            steps=StepCosts(
                elevenlabs=acc.elevenlabs,
                claude=acc.claude,
                openai=acc.openai,
            ),
            total=acc.total(),
        ).insert()
        logger.info(
            "Pipeline cost recorded",
            extra={
                "partner_id": partner_id,
                "content_id": content_id,
                "total_usd": str(acc.total()),
            },
        )
    except Exception:
        logger.warning(
            "Failed to write pipeline cost record",
            exc_info=True,
            extra={"partner_id": partner_id, "content_id": content_id},
        )
