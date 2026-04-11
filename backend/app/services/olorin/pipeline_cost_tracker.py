"""Pipeline cost accumulator and PipelineCost document writer.

Tracks per-provider AI spend for a single ingest pipeline run.
Written to MongoDB at pipeline completion for the superadmin cost dashboard.

Provider coverage:
  - ElevenLabs Scribe: billed per audio second (duration available from
    TranscriptionResult.duration_seconds).
  - Claude (Anthropic): character extraction and trivia generation.
    Token counts are not surfaced through the sub-service boundary in the
    current architecture; cost is tracked at $0 until the sub-services
    are updated to return usage metadata.
  - OpenAI embeddings: search indexing. Same caveat as Claude above.

The write is always wrapped in a try/except — cost recording must never
block or fail the pipeline.
"""

from dataclasses import dataclass, field as dc_field
from datetime import datetime, timezone
from decimal import Decimal

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.pipeline_cost import PipelineCost, StepCosts

logger = get_logger(__name__)


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
