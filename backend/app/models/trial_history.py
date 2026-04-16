"""Trial history for re-trial dedup. One row per trial signup (ever).

See spec section 'Re-Trial Block'.
"""
from datetime import datetime
from typing import Literal
from beanie import Document, Indexed


TrialOutcome = Literal["converted", "cancelled", "locked", "purged"]


class TrialHistory(Document):
    email: Indexed(str, unique=True)  # type: ignore[valid-type]
    email_domain: Indexed(str)  # type: ignore[valid-type]
    card_fingerprint: Indexed(str) | None = None  # type: ignore[valid-type]
    partner_id: str
    started_at: datetime
    outcome: TrialOutcome | None = None
    outcome_at: datetime | None = None

    class Settings:
        name = "trial_history"
        indexes = ["email_domain", "card_fingerprint"]
