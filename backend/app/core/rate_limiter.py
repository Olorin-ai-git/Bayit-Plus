"""
Rate Limiting Configuration
Protects authentication endpoints from brute force attacks

Set RATE_LIMIT_MULTIPLIER env var to relax limits for development.
Example: RATE_LIMIT_MULTIPLIER=10 relaxes all limits by 10x.
"""

import os

try:
    from slowapi import Limiter
    from slowapi.util import get_remote_address

    # Development multiplier - set via env var (default: 1 = no change)
    # Example: RATE_LIMIT_MULTIPLIER=10 gives 10x the normal limits
    DEV_MULTIPLIER = int(os.getenv("RATE_LIMIT_MULTIPLIER", "1"))

    # Initialize rate limiter
    limiter = Limiter(key_func=get_remote_address)

    def _dev_limit(limit: str) -> str:
        """Multiply rate limit by DEV_MULTIPLIER in development mode."""
        if DEV_MULTIPLIER == 1:
            return limit
        # Parse "N/period" format (e.g., "5/minute", "30/hour")
        parts = limit.split("/")
        if len(parts) == 2:
            count = int(parts[0]) * DEV_MULTIPLIER
            return f"{count}/{parts[1]}"
        return limit

    # Rate limit configurations (relaxed 10x when DEBUG=True)
    RATE_LIMITS = {
        "login": _dev_limit("5/minute"),  # 5 login attempts per minute
        "register": _dev_limit("3/hour"),  # 3 registrations per hour
        "oauth_callback": _dev_limit("10/minute"),  # 10 OAuth attempts per minute
        "password_reset": _dev_limit("3/hour"),  # 3 password reset requests per hour
        "partner_register": _dev_limit("3/hour"),  # 3 partner registrations per hour per IP
        # Subtitles - Protection for expensive AI operations and external APIs
        "subtitle_cues": _dev_limit("50/minute"),  # High-frequency mobile requests during video playback
        "subtitle_tracks": _dev_limit("100/minute"),  # Lightweight listing endpoint
        "subtitle_nikud": _dev_limit("5/hour"),  # Expensive AI operations (Claude API batch processing)
        "subtitle_shoresh": _dev_limit("5/hour"),  # Expensive AI operations (Claude API root word extraction)
        "subtitle_heblish": _dev_limit("5/hour"),  # Expensive AI operations (Claude API English-Hebrew synthesis)
        "subtitle_grammar_flip": _dev_limit("5/hour"),  # Expensive AI operations (Claude API Grammar-Flip transformation)
        "subtitle_slang_synthesis": _dev_limit("5/hour"),  # Expensive AI operations (Claude API Slang Synthesis)
        "subtitle_engrew": _dev_limit("5/hour"),  # Expensive AI operations (Claude API Engrew)
        "subtitle_translate_word": _dev_limit("20/minute"),  # AI translation with database caching
        "subtitle_translate_phrase": _dev_limit("10/minute"),  # AI translation for phrases (no caching)
        "subtitle_fetch_external": _dev_limit("3/hour"),  # External API quota protection (OpenSubtitles)
        "subtitle_import": _dev_limit("10/hour"),  # Database writes for subtitle import
        "subtitle_delete": _dev_limit("20/hour"),  # Destructive operations
        "subtitle_general": _dev_limit("30/minute"),  # Other endpoints (languages, cache stats)
        # Trivia - Protection for AI-generated content and playback endpoints
        "trivia_get": _dev_limit("60/minute"),  # Standard trivia fetch during playback
        "trivia_enriched": _dev_limit("3/hour"),  # AI-enriched bundle (expensive operation)
        "trivia_preferences": _dev_limit("10/minute"),  # Preference updates
        "trivia_generate": _dev_limit("5/hour"),  # Admin force regenerate
        # Live Dubbing - Protection for admin configuration endpoints
        "dubbing_config_update": _dev_limit("10/hour"),  # Channel dubbing configuration updates
        "dubbing_stats": _dev_limit("30/minute"),  # Dubbing statistics queries
        # Podcast Translation - Protection for expensive translation operations
        "translation_single": _dev_limit("10/minute"),  # Single episode translation trigger
        "translation_bulk": _dev_limit("5/hour"),  # Bulk translation (expensive, queues many jobs)
        "translation_status": _dev_limit("30/minute"),  # Translation status queries
        # Location Services - Protection for geolocation and content discovery
        "reverse_geocode": _dev_limit("30/minute"),  # GeoNames API quota protection
        "location_content": _dev_limit("60/minute"),  # Content discovery queries
        # Voice Interaction - Protection for AI inference and real-time processing
        "voice_unified": _dev_limit("60/minute"),  # Voice command processing (intent classification + execution)
        # Synced Streams - Live stream synchronization
        "synced_streams_create": _dev_limit("30/minute"),  # Synced stream creation
        "synced_streams_latency": _dev_limit("60/minute"),  # Latency updates during streaming
    }

    RATE_LIMITING_ENABLED = True

    # Log if rate limits are relaxed
    if DEV_MULTIPLIER > 1:
        import logging
        _logger = logging.getLogger(__name__)
        _logger.info(
            f"Rate limits relaxed {DEV_MULTIPLIER}x (RATE_LIMIT_MULTIPLIER={DEV_MULTIPLIER})"
        )

except ImportError:
    # Gracefully handle missing slowapi dependency
    import logging

    logger = logging.getLogger(__name__)
    logger.warning(
        "slowapi not installed - rate limiting disabled. Install with: pip install slowapi"
    )

    # Create dummy limiter that does nothing
    class DummyLimiter:
        def limit(self, *args, **kwargs):
            def decorator(func):
                return func

            return decorator

    limiter = DummyLimiter()
    RATE_LIMITING_ENABLED = False
    RATE_LIMITS = {}
