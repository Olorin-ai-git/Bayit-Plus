"""Trial history for re-trial dedup. One row per trial signup (ever).

See spec section 'Re-Trial Block'.
"""
from datetime import datetime
from typing import Literal
from beanie import Document, Indexed


TrialOutcome = Literal["converted", "cancelled", "locked", "purged"]


class TrialHistory(Document):
    # NOTE: email is intentionally NOT unique here. Application-layer dedup
    # in trial_dedup.check_duplicate is the authoritative gate and respects
    # the domain-conversion carveout (a previously-converted user is allowed
    # to start a new trial under specific conditions). A DB unique constraint
    # would short-circuit that carveout with DuplicateKeyError.
    email: Indexed(str)  # type: ignore[valid-type]
    email_domain: Indexed(str)  # type: ignore[valid-type]
    card_fingerprint: Indexed(str) | None = None  # type: ignore[valid-type]
    partner_id: str
    started_at: datetime
    outcome: TrialOutcome | None = None
    outcome_at: datetime | None = None

    class Settings:
        name = "trial_history"
        indexes = ["email_domain", "card_fingerprint"]
