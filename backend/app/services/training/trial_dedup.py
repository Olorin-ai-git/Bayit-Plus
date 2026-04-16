"""Re-trial dedup logic. See spec section 'Re-Trial Block'.

Block on: exact email match, card fingerprint match, or corporate
domain match (with carveouts for public domains and converted domains).
"""
import logging

from app.models.platform_config import PlatformConfig
from app.models.trial_history import TrialHistory

logger = logging.getLogger(__name__)


async def check_duplicate(
    *, email: str, domain: str, fp: str | None,
) -> bool:
    """Return True if this signup should be blocked.

    Rules (evaluated in order):
    1. Exact email match -- always block.
    2. Card fingerprint match -- always block (bypasses email change).
    3. Corporate domain match -- block UNLESS the domain is a public
       email provider or a prior trial on that domain converted
       (paying customer's other teams may sign up).
    """
    # 1. Exact email
    if await TrialHistory.find_one({"email": email}):
        logger.info("trial_dedup: blocked duplicate email=%s", email)
        return True

    # 2. Card fingerprint (only when present -- querying None would
    #    match every record that also has card_fingerprint=None)
    if fp and await TrialHistory.find_one({"card_fingerprint": fp}):
        logger.info("trial_dedup: blocked duplicate card fp=%s", fp[:8])
        return True

    # 3. Corporate domain check
    pc = await PlatformConfig.get_singleton()
    if domain in pc.public_email_domains:
        return False

    # Allow if a prior trial on this corporate domain converted
    converted = await TrialHistory.find_one(
        {"email_domain": domain, "outcome": "converted"},
    )
    if converted:
        return False

    # Any existing trial on this corporate domain blocks
    existing = await TrialHistory.find_one({"email_domain": domain})
    if existing is not None:
        logger.info("trial_dedup: blocked corporate domain=%s", domain)
        return True

    return False
