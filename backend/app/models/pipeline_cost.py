"""Per-pipeline API cost records for the superadmin cost dashboard.

Each document represents a single completed training pipeline run,
recording the raw dollar cost from each AI provider (ElevenLabs, Claude,
OpenAI) so the dashboard can aggregate spend by partner, org, or time.
"""

from datetime import datetime
from typing import Optional

from beanie import Document
from pydantic import BaseModel, Field
from pymongo import DESCENDING, IndexModel


class StepCosts(BaseModel):
    """Per-provider cost breakdown for a single pipeline run."""

    elevenlabs: float = Field(default=0.0, ge=0.0, description="ElevenLabs TTS/voice cost in USD")
    claude: float = Field(default=0.0, ge=0.0, description="Anthropic Claude cost in USD")
    openai: float = Field(default=0.0, ge=0.0, description="OpenAI cost in USD")


class PipelineCost(Document):
    """Immutable cost record for one completed training pipeline run.

    Written once by the ingest orchestrator at run completion.
    Never mutated — aggregated by the dashboard query layer.
    """

    org_id: str = Field(..., description="Organisation that owns the content")
    partner_id: str = Field(..., description="Training partner who initiated the run")
    content_id: str = Field(..., description="Content document ID the pipeline processed")
    video_title: str = Field(..., description="Human-readable title for dashboard display")
    started_at: datetime = Field(..., description="Pipeline run start timestamp (UTC)")
    completed_at: datetime = Field(..., description="Pipeline run completion timestamp (UTC)")
    steps: StepCosts = Field(default_factory=StepCosts, description="Per-provider cost breakdown")
    total: float = Field(default=0.0, ge=0.0, description="Sum of all step costs in USD")
    pipeline_run_id: Optional[str] = Field(
        default=None,
        description="Reference to the IngestJob or pipeline run that produced this record",
    )

    class Settings:
        name = "pipeline_costs"
        indexes = [
            IndexModel([("org_id", DESCENDING)]),
            IndexModel([("started_at", DESCENDING)]),
            IndexModel(
                [("partner_id", DESCENDING), ("started_at", DESCENDING)],
                name="partner_timeline",
            ),
            IndexModel(
                [("org_id", DESCENDING), ("started_at", DESCENDING)],
                name="org_timeline",
            ),
        ]
