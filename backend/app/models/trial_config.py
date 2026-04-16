"""TrialConfig sub-doc for IntegrationPartner.training_config.trial_config.

Replaces the old loose trial fields (trial_ends_at, org_tier="trial",
credit_limit_monthly=50). See spec 2026-04-15-trial-access-design.md.
"""
from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field


TrialState = Literal[
    "active", "grace", "locked", "converted", "cancelled", "purged"
]
SelectedTier = Literal["team", "organization", "enterprise"]


class TrialConfig(BaseModel):
    state: TrialState
    started_at: datetime
    expires_at: datetime
    locked_at: datetime | None = None
    purge_at: datetime | None = None
    selected_tier: SelectedTier
    stripe_customer_id: str
    stripe_subscription_id: str
    eval_credits_remaining: int
    byoc_uploads_remaining: int
    xapi_exports_remaining: int
    assignments_remaining: int
    branding_uploads_remaining: int
    sent_emails: dict[str, datetime] = Field(default_factory=dict)
    extension_days_total: int = 0
