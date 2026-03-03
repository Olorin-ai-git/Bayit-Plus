"""Persistent provider toggle overrides for cost dashboard."""

from datetime import datetime
from typing import Optional

from beanie import Document
from pydantic import Field

from app.core.logging_config import get_logger

logger = get_logger(__name__)

VALID_PROVIDER_KEYS = frozenset(
    {
        "gcp",
        "mongodb_atlas",
        "openai",
        "elevenlabs",
        "stripe",
        "pinecone",
        "twilio",
        "redis_cloud",
        "fixed_costs",
        "config_fallback",
    }
)


class CostProviderSettings(Document):
    """Runtime override for a cost provider's enabled state."""

    provider_key: str = Field(
        ...,
        description="Canonical provider key (e.g. gcp, openai)",
    )
    enabled: bool = Field(
        ...,
        description="Whether provider is active for aggregation",
    )
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="When the override was last changed",
    )
    updated_by: str = Field(
        ...,
        description="Firebase UID of the admin who toggled",
    )

    class Settings:
        name = "cost_provider_settings"
        use_state_management = True
