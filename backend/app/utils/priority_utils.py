"""
Priority Queue Utilities

Maps user tiers to processing priority levels and determines
whether a submission should bypass the queue.
"""

_TIER_PRIORITY = {
    "b2b": 0,
    "enterprise": 0,
    "superfan": 3,
    "fan": 5,
    "free": 10,
}

_IMMEDIATE_TIERS = {"b2b", "enterprise", "superfan", "fan"}


def tier_to_priority(tier: str) -> int:
    """Map a tier string to a numeric priority (0=highest, 10=lowest)."""
    return _TIER_PRIORITY.get(tier.lower().strip(), 10)


def should_process_immediately(tier: str) -> bool:
    """Return True if this tier bypasses the queue for instant processing."""
    return tier.lower().strip() in _IMMEDIATE_TIERS
