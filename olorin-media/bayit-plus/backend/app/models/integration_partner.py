"""
Olorin.ai Integration Partner Models
MongoDB models for third-party platform integration, usage tracking, and billing.
"""

from datetime import datetime, timezone
from typing import List, Literal, Optional

from beanie import Document, PydanticObjectId
from pydantic import BaseModel, EmailStr, Field
from pymongo import ASCENDING, DESCENDING, IndexModel

# Type definitions
BillingTier = Literal["free", "standard", "enterprise"]
CapabilityType = Literal[
    "realtime_dubbing", "semantic_search", "recap_agent", "cultural_context"
]
UsageGranularity = Literal["hourly", "daily", "monthly"]
WebhookEventType = Literal[
    "session.started",
    "session.ended",
    "usage.threshold_reached",
    "error.occurred",
    "partner.updated",
]


class RateLimitConfig(BaseModel):
    """Rate limit configuration for a capability."""

    requests_per_minute: int = Field(default=60, ge=1)
    requests_per_hour: int = Field(default=1000, ge=1)
    requests_per_day: int = Field(default=10000, ge=1)
    concurrent_sessions: int = Field(default=10, ge=1)
    max_audio_seconds_per_request: int = Field(default=300, ge=1)  # 5 minutes


class CapabilityConfig(BaseModel):
    """Configuration for a specific capability."""

    enabled: bool = True
    rate_limits: RateLimitConfig = Field(default_factory=RateLimitConfig)
    custom_settings: dict = Field(default_factory=dict)


class IntegrationPartner(Document):
    """Third-party platform integration configuration."""

    # Identification
    partner_id: str = Field(
        ..., description="Unique slug identifier (e.g., 'netflix-israel')"
    )
    name: str = Field(..., description="Display name in Hebrew")
    name_en: Optional[str] = Field(default=None, description="Display name in English")

    # Authentication
    api_key_hash: str = Field(..., description="Hashed API key (bcrypt)")
    api_key_prefix: str = Field(
        ..., description="First 8 characters of API key for identification"
    )
    webhook_secret: Optional[str] = Field(
        default=None, description="Secret for webhook signature verification"
    )

    # Contact information
    contact_email: EmailStr = Field(..., description="Primary contact email")
    contact_name: Optional[str] = Field(
        default=None, description="Primary contact name"
    )
    technical_contact_email: Optional[EmailStr] = Field(
        default=None, description="Technical contact email"
    )

    # Capabilities (feature flags per partner)
    capabilities: dict[str, CapabilityConfig] = Field(
        default_factory=dict,
        description="Capability configurations keyed by capability type",
    )

    # Billing
    billing_tier: BillingTier = Field(default="standard")
    monthly_usage_limit_usd: Optional[float] = Field(
        default=None,
        description="Monthly spending limit in USD (None = unlimited)",
    )
    billing_email: Optional[EmailStr] = Field(default=None)

    # Webhooks
    webhook_url: Optional[str] = Field(
        default=None, description="URL to receive webhook events"
    )
    webhook_events: List[WebhookEventType] = Field(
        default_factory=list,
        description="List of event types to send to webhook",
    )
    webhook_retry_count: int = Field(default=3, ge=0, le=10)

    # Metadata
    description: Optional[str] = Field(default=None)
    logo_url: Optional[str] = Field(default=None)
    website_url: Optional[str] = Field(default=None)

    # Status
    is_active: bool = Field(default=True)
    is_verified: bool = Field(default=False, description="Admin-verified partner")
    suspended_at: Optional[datetime] = Field(default=None)
    suspension_reason: Optional[str] = Field(default=None)

    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_active_at: Optional[datetime] = Field(
        default=None, description="Last API request timestamp"
    )

    class Settings:
        name = "integration_partners"
        indexes = [
            IndexModel(
                [("partner_id", ASCENDING)],
                unique=True,
                name="partner_id_unique",
            ),
            "api_key_prefix",
            "is_active",
            "billing_tier",
            "created_at",
            [("is_active", 1), ("billing_tier", 1)],
            [("api_key_prefix", 1), ("is_active", 1)],
        ]

    def has_capability(self, capability: str) -> bool:
        """Check if partner has a specific capability enabled."""
        config = self.capabilities.get(capability)
        return config is not None and config.enabled

    def get_capability_config(self, capability: str) -> Optional[CapabilityConfig]:
        """Get configuration for a specific capability."""
        return self.capabilities.get(capability)


class UsageRecord(Document):
    """Track usage for billing and analytics."""

    # Identification
    partner_id: str = Field(..., description="Partner identifier")
    capability: str = Field(
        ..., description="Capability type (e.g., 'realtime_dubbing')"
    )

    # Usage metrics
    request_count: int = Field(default=0, ge=0)
    audio_seconds_processed: float = Field(default=0.0, ge=0.0)
    tokens_consumed: int = Field(default=0, ge=0)
    characters_processed: int = Field(default=0, ge=0)
    sessions_created: int = Field(default=0, ge=0)

    # Cost tracking
    estimated_cost_usd: float = Field(default=0.0, ge=0.0)

    # Time period
    period_start: datetime = Field(...)
    period_end: datetime = Field(...)
    granularity: UsageGranularity = Field(default="hourly")

    # Metadata
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "usage_records"
        indexes = [
            "partner_id",
            "capability",
            "period_start",
            "granularity",
            [("partner_id", 1), ("capability", 1), ("period_start", -1)],
            [("partner_id", 1), ("period_start", -1)],
            [
                ("partner_id", 1),
                ("granularity", 1),
                ("period_start", -1),
            ],  # Billing period optimization
        ]


class DubbingSession(Document):
    """Track individual dubbing sessions for detailed analytics."""

    # Identification
    session_id: str = Field(..., description="Unique session identifier")
    partner_id: str = Field(..., description="Partner identifier")

    # Configuration
    source_language: str = Field(default="he", description="Source language code")
    target_language: str = Field(default="en", description="Target language code")
    voice_id: Optional[str] = Field(
        default=None, description="ElevenLabs voice ID used"
    )

    # Metrics
    audio_seconds_processed: float = Field(default=0.0, ge=0.0)
    segments_processed: int = Field(default=0, ge=0)
    characters_translated: int = Field(default=0, ge=0)
    characters_synthesized: int = Field(default=0, ge=0)

    # Latency tracking (milliseconds)
    avg_stt_latency_ms: Optional[float] = Field(default=None)
    avg_translation_latency_ms: Optional[float] = Field(default=None)
    avg_tts_latency_ms: Optional[float] = Field(default=None)
    avg_total_latency_ms: Optional[float] = Field(default=None)

    # Quality metrics
    error_count: int = Field(default=0, ge=0)
    reconnection_count: int = Field(default=0, ge=0)

    # Cost
    estimated_cost_usd: float = Field(default=0.0, ge=0.0)

    # Status
    status: Literal["active", "paused", "ended", "error"] = Field(default="active")
    error_message: Optional[str] = Field(default=None)

    # Timestamps
    started_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    ended_at: Optional[datetime] = Field(default=None)
    last_activity_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    # Client metadata
    client_ip: Optional[str] = Field(default=None)
    client_user_agent: Optional[str] = Field(default=None)

    class Settings:
        name = "dubbing_sessions"
        indexes = [
            IndexModel(
                [("session_id", ASCENDING)], unique=True, name="session_id_unique"
            ),
            "partner_id",
            "status",
            "started_at",
            [("partner_id", 1), ("status", 1), ("started_at", -1)],
            [("partner_id", 1), ("started_at", -1)],
        ]


class WebhookDelivery(Document):
    """Track webhook delivery attempts."""

    # Identification
    partner_id: str = Field(...)
    event_type: WebhookEventType = Field(...)

    # Payload
    payload: dict = Field(default_factory=dict)

    # Delivery status
    delivered: bool = Field(default=False)
    attempts: int = Field(default=0)
    last_attempt_at: Optional[datetime] = Field(default=None)
    next_retry_at: Optional[datetime] = Field(default=None)

    # Response tracking
    response_status_code: Optional[int] = Field(default=None)
    response_body: Optional[str] = Field(default=None)
    error_message: Optional[str] = Field(default=None)

    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "webhook_deliveries"
        indexes = [
            "partner_id",
            "event_type",
            "delivered",
            "created_at",
            [("delivered", 1), ("next_retry_at", 1)],
        ]
