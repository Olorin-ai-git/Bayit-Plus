"""
Olorin.ai Database Models

MongoDB models using Beanie ODM for the Olorin.ai ecosystem.
Provides models for integration partners, usage tracking, content embeddings, and more.
"""

from olorin_models.partner import (
    BillingTier,
    CapabilityConfig,
    CapabilityType,
    DubbingSession,
    IntegrationPartner,
    RateLimitConfig,
    UsageGranularity,
    UsageRecord,
    WebhookDelivery,
    WebhookEventType,
)
from olorin_models.content import (
    ContentEmbedding,
    EmbeddingMetadata,
    EmbeddingType,
    RecapEntry,
    RecapSegment,
    RecapSession,
)

__all__ = [
    # Partner models
    "IntegrationPartner",
    "UsageRecord",
    "DubbingSession",
    "WebhookDelivery",
    # Partner types
    "BillingTier",
    "CapabilityType",
    "UsageGranularity",
    "WebhookEventType",
    "RateLimitConfig",
    "CapabilityConfig",
    # Content models
    "ContentEmbedding",
    "EmbeddingMetadata",
    "RecapSession",
    "RecapSegment",
    # Content types
    "EmbeddingType",
    "RecapEntry",
]

__version__ = "1.0.0"
