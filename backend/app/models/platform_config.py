"""Singleton platform configuration document for the superadmin control panel.

Stores tier limits, format credit costs, feature credit costs, and
subscription plan pricing (including Stripe Price IDs).  There is exactly
one document per environment — use ``PlatformConfig.get_singleton()`` to
read or upsert it.
"""

from datetime import datetime, timezone
from typing import Dict, List, Optional

from beanie import Document
from pydantic import BaseModel, Field
from pymongo import ASCENDING, IndexModel

# ---------------------------------------------------------------------------
# Module-level defaults — all magic values are defined exactly once here.
# Nothing outside this module should use literals for these values.
# ---------------------------------------------------------------------------

_CONFIG_TYPE_KEY = "platform"

_DEFAULT_TIER_LIMITS: dict = {
    "free": 50,
    "team": 500,
    "organization": 2000,
    "enterprise": 10000,
}

_DEFAULT_SEAT_LIMITS: dict = {
    "free": 5,
    "team": 25,
    "organization": 100,
}

_DEFAULT_VIDEO_LIMITS: dict = {
    "free": 3,
    "team": 20,
}

_DEFAULT_FEATURE_GATES: dict = {
    "team": [
        "pause_ask", "lip_sync", "companion", "chapters",
        "quizzes", "csv_export", "progress",
    ],
    "organization": [
        "watch_party", "bulk_import", "branding",
        "assignments", "department_analytics", "scorm_export",
    ],
    "enterprise": ["custom_integrations"],
}


# ---------------------------------------------------------------------------
# Embedded sub-documents
# ---------------------------------------------------------------------------


class FormatCost(BaseModel):
    """Credit cost spec for a single training format."""

    id: str = Field(..., description="Format slug (e.g. 'knowledge-check')")
    estimated_credit_cost: int = Field(..., ge=0, description="Base credits consumed per run")
    per_employee_credit_cost: int = Field(
        ..., ge=0, description="Additional credits per enrolled employee (live formats)"
    )


class FeatureCost(BaseModel):
    """Credit cost for an optional interactive feature added to a module."""

    id: str = Field(..., description="Feature slug (e.g. 'pause-ask')")
    name: str = Field(..., description="Human-readable label for UI display")
    credits: int = Field(..., ge=0, description="Credits consumed each time this feature is used")


class TrialDefaults(BaseModel):
    """Default quotas and timing for new trial signups."""

    duration_days: int = 14
    grace_days: int = 3
    lock_days: int = 30
    extension_max_days: int = 30
    eval_credits: int = 50
    byoc_uploads: int = 5
    xapi_exports: int = 1
    assignments: int = 3
    branding_uploads: int = 1


_DEFAULT_PUBLIC_EMAIL_DOMAINS: List[str] = [
    "gmail.com", "outlook.com", "hotmail.com", "yahoo.com",
    "icloud.com", "protonmail.com", "aol.com", "live.com",
    "msn.com", "yandex.com", "mail.ru",
]


class SubscriptionPlan(BaseModel):
    """Pricing configuration for a billable subscription tier."""

    id: str = Field(..., description="Plan slug matching the tier name (e.g. 'team')")
    name: str = Field(..., description="Display name shown in pricing UI")
    price_monthly: float = Field(..., ge=0.0, description="Monthly price in USD")
    price_annual: float = Field(..., ge=0.0, description="Annual-billing price in USD (per month)")
    stripe_price_id_monthly: str = Field(
        ..., description="Stripe Price ID for monthly billing cycle"
    )
    stripe_price_id_annual: str = Field(
        ..., description="Stripe Price ID for annual billing cycle"
    )


# ---------------------------------------------------------------------------
# Default data sets — referenced both at field level and in get_singleton()
# ---------------------------------------------------------------------------

_DEFAULT_FORMAT_COSTS: List[FormatCost] = [
    FormatCost(id="knowledge-check", estimated_credit_cost=8, per_employee_credit_cost=0),
    FormatCost(id="self-paced", estimated_credit_cost=6, per_employee_credit_cost=0),
    FormatCost(id="guided-walkthrough", estimated_credit_cost=14, per_employee_credit_cost=0),
    FormatCost(id="expert-qa", estimated_credit_cost=16, per_employee_credit_cost=2),
    FormatCost(id="role-play", estimated_credit_cost=18, per_employee_credit_cost=10),
    FormatCost(id="team-workshop", estimated_credit_cost=10, per_employee_credit_cost=0),
]

_DEFAULT_FEATURE_COSTS: List[FeatureCost] = [
    FeatureCost(id="pause-ask", name="Pause & Ask (voice)", credits=1),
    FeatureCost(id="lip-sync", name="Lip-sync", credits=3),
    FeatureCost(id="ai-companion", name="AI Companion", credits=1),
    FeatureCost(id="comprehension-question", name="Comprehension question", credits=1),
    FeatureCost(id="semantic-search", name="Semantic Search", credits=2),
    FeatureCost(id="talk-back", name="Talk Back", credits=3),
    FeatureCost(id="cultural-context", name="Cultural Context", credits=2),
    FeatureCost(id="recap", name="Recap", credits=2),
]

# Stripe Price IDs are intentionally empty — they must be populated via the
# superadmin config panel before going live.  The seeder (Task 2) inserts
# this document only if none exists; a superadmin then fills in the IDs.
_DEFAULT_PLANS: List[SubscriptionPlan] = [
    SubscriptionPlan(
        id="team",
        name="Team",
        price_monthly=349.0,
        price_annual=279.0,
        stripe_price_id_monthly="",
        stripe_price_id_annual="",
    ),
    SubscriptionPlan(
        id="organization",
        name="Organization",
        price_monthly=599.0,
        price_annual=479.0,
        stripe_price_id_monthly="",
        stripe_price_id_annual="",
    ),
]


# ---------------------------------------------------------------------------
# Document
# ---------------------------------------------------------------------------


class PlatformConfig(Document):
    """Singleton document holding platform-wide credit and pricing configuration.

    Only one instance exists per environment.  Access via ``get_singleton()``.
    Written by the superadmin config panel; read by checkout, format selector,
    and credits sidebar.
    """

    config_type: str = Field(
        default=_CONFIG_TYPE_KEY,
        description="Discriminator key — always 'platform'; used as unique index key",
    )
    tier_limits: Dict[str, int] = Field(
        default_factory=lambda: dict(_DEFAULT_TIER_LIMITS),
        description="Monthly credit quota per subscription tier",
    )
    format_costs: List[FormatCost] = Field(
        default_factory=lambda: list(_DEFAULT_FORMAT_COSTS),
        description="Credit costs indexed by format slug",
    )
    feature_costs: List[FeatureCost] = Field(
        default_factory=lambda: list(_DEFAULT_FEATURE_COSTS),
        description="Per-use credit costs for optional interactive features",
    )
    seat_limits: Dict[str, int] = Field(
        default_factory=lambda: dict(_DEFAULT_SEAT_LIMITS),
        description="Maximum employees per subscription tier (absent = unlimited)",
    )
    video_limits: Dict[str, int] = Field(
        default_factory=lambda: dict(_DEFAULT_VIDEO_LIMITS),
        description="Maximum training videos per subscription tier (absent = unlimited)",
    )
    feature_gates: Dict[str, List[str]] = Field(
        default_factory=lambda: dict(_DEFAULT_FEATURE_GATES),
        description="Features unlocked at each tier level (cumulative upward)",
    )
    subscription_plans: List[SubscriptionPlan] = Field(
        default_factory=lambda: list(_DEFAULT_PLANS),
        description="Pricing configuration for each billable plan",
    )
    trial_defaults: TrialDefaults = Field(
        default_factory=TrialDefaults,
        description="Default quotas and timing applied to new trial signups",
    )
    public_email_domains: List[str] = Field(
        default_factory=lambda: list(_DEFAULT_PUBLIC_EMAIL_DOMAINS),
        description="Free email providers — signups from these domains get individual trials",
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Timestamp of last superadmin update (UTC)",
    )

    class Settings:
        name = "platform_config"
        indexes = [
            IndexModel([("config_type", ASCENDING)], unique=True, name="config_type_unique"),
        ]

    @classmethod
    async def get_singleton(cls) -> "PlatformConfig":
        """Return the one platform config document, creating it with defaults if absent."""
        doc = await cls.find_one({"config_type": _CONFIG_TYPE_KEY})
        if doc is None:
            doc = cls()
            await doc.insert()
        return doc
