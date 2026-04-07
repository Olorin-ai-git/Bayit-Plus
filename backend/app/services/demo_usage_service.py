"""
Demo Feature Usage Service — enforces per-user, per-feature caps for the demo portal.

Each registered demo user gets DEMO_FEATURE_MAX_USES tries of each AI feature
(pause_ask, character_memory, comprehension). After that, usage is blocked.
"""

from datetime import datetime
from typing import Dict

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.demo_feature_usage import DemoFeatureUsage

logger = get_logger(__name__)

DEMO_FEATURES = ("pause_ask", "character_memory", "comprehension")


async def get_usage(user_id: str) -> Dict[str, Dict[str, int]]:
    """Return {feature: {used, remaining}} for all demo features."""
    max_uses = settings.DEMO_FEATURE_MAX_USES
    records = await DemoFeatureUsage.find(
        {"user_id": user_id, "feature": {"$in": list(DEMO_FEATURES)}},
    ).to_list()
    counts = {r.feature: r.usage_count for r in records}
    return {
        feat: {
            "used": counts.get(feat, 0),
            "remaining": max(0, max_uses - counts.get(feat, 0)),
            "max": max_uses,
        }
        for feat in DEMO_FEATURES
    }


async def check_limit(user_id: str, feature: str) -> bool:
    """Return True if the user still has uses remaining for *feature*."""
    max_uses = settings.DEMO_FEATURE_MAX_USES
    record = await DemoFeatureUsage.find_one(
        {"user_id": user_id, "feature": feature},
    )
    if record is None:
        return True
    return record.usage_count < max_uses


async def increment(user_id: str, feature: str) -> int:
    """Atomically increment usage count. Returns new count."""
    record = await DemoFeatureUsage.find_one(
        {"user_id": user_id, "feature": feature},
    )
    if record is None:
        record = DemoFeatureUsage(
            user_id=user_id,
            feature=feature,
            usage_count=1,
        )
        await record.insert()
        logger.info(
            "Demo feature usage started",
            extra={"user_id": user_id, "feature": feature, "count": 1},
        )
        return 1

    now = datetime.utcnow()
    await record.update(
        {"$inc": {"usage_count": 1}, "$set": {"updated_at": now}},
    )
    new_count = record.usage_count + 1
    logger.info(
        "Demo feature usage incremented",
        extra={"user_id": user_id, "feature": feature, "count": new_count},
    )
    return new_count
