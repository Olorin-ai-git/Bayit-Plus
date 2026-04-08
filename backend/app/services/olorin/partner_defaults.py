"""
Partner Defaults — tier-based rate limits and capability presets.

Pure data helpers: no database access, no I/O.
"""

from app.models.integration_partner import CapabilityConfig, RateLimitConfig

# Multipliers applied to base limits per billing tier.
_TIER_MULTIPLIERS: dict[str, int] = {
    "free": 1,
    "standard": 5,
    "growth": 10,
    "training": 8,
    "enterprise": 20,
}

# Capabilities enabled by default for training-tier partners.
TRAINING_CAPABILITIES: list[str] = [
    "pause_ask",
    "video_ingest",
    "subtitles",
    "trivia",
    "semantic_search",
    "cultural_context",
    "recap_agent",
]


def get_default_rate_limits(billing_tier: str, capability: str) -> RateLimitConfig:
    """Return default rate limits for a given billing tier and capability.

    Args:
        billing_tier: One of free / standard / growth / training / enterprise.
        capability: Capability slug (e.g. "realtime_dubbing").

    Returns:
        Populated RateLimitConfig; falls back to an empty config for unknown
        capability slugs so callers never receive None.
    """
    multiplier = _TIER_MULTIPLIERS.get(billing_tier, 1)

    base_limits: dict[str, RateLimitConfig] = {
        "realtime_dubbing": RateLimitConfig(
            requests_per_minute=10 * multiplier,
            requests_per_hour=100 * multiplier,
            requests_per_day=500 * multiplier,
            concurrent_sessions=2 * multiplier,
            max_audio_seconds_per_request=300,
        ),
        "semantic_search": RateLimitConfig(
            requests_per_minute=30 * multiplier,
            requests_per_hour=500 * multiplier,
            requests_per_day=5000 * multiplier,
            concurrent_sessions=10 * multiplier,
        ),
        "cultural_context": RateLimitConfig(
            requests_per_minute=60 * multiplier,
            requests_per_hour=1000 * multiplier,
            requests_per_day=10000 * multiplier,
            concurrent_sessions=20 * multiplier,
        ),
        "recap_agent": RateLimitConfig(
            requests_per_minute=10 * multiplier,
            requests_per_hour=100 * multiplier,
            requests_per_day=500 * multiplier,
            concurrent_sessions=5 * multiplier,
        ),
        "pause_ask": RateLimitConfig(
            requests_per_minute=20 * multiplier,
            requests_per_hour=200 * multiplier,
            requests_per_day=1000 * multiplier,
            concurrent_sessions=5 * multiplier,
        ),
        "video_ingest": RateLimitConfig(
            requests_per_minute=5 * multiplier,
            requests_per_hour=50 * multiplier,
            requests_per_day=200 * multiplier,
            concurrent_sessions=3 * multiplier,
        ),
        "subtitles": RateLimitConfig(
            requests_per_minute=10 * multiplier,
            requests_per_hour=100 * multiplier,
            requests_per_day=500 * multiplier,
            concurrent_sessions=5 * multiplier,
        ),
        "trivia": RateLimitConfig(
            requests_per_minute=15 * multiplier,
            requests_per_hour=150 * multiplier,
            requests_per_day=750 * multiplier,
            concurrent_sessions=5 * multiplier,
        ),
    }

    return base_limits.get(capability, RateLimitConfig())


def get_training_tier_defaults() -> dict[str, CapabilityConfig]:
    """Return default CapabilityConfig map for a training-tier partner.

    Training partners get interactive AI features (pause_ask, video_ingest,
    subtitles, trivia, semantic_search, cultural_context, recap_agent).
    realtime_dubbing is excluded — it is a consumer-only live TV feature.
    """
    return {
        cap: CapabilityConfig(
            enabled=True,
            rate_limits=get_default_rate_limits("training", cap),
        )
        for cap in TRAINING_CAPABILITIES
    }
