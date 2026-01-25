"""
Rate Limiting Configuration
Protects authentication endpoints from brute force attacks
"""

try:
    from slowapi import Limiter
    from slowapi.util import get_remote_address

    # Initialize rate limiter
    limiter = Limiter(key_func=get_remote_address)

    # Rate limit configurations
    RATE_LIMITS = {
        "login": "5/minute",  # 5 login attempts per minute
        "register": "3/hour",  # 3 registrations per hour
        "oauth_callback": "10/minute",  # 10 OAuth attempts per minute
        "password_reset": "3/hour",  # 3 password reset requests per hour
        "partner_register": "3/hour",  # 3 partner registrations per hour per IP
        # Subtitles - Protection for expensive AI operations and external APIs
        "subtitle_cues": "50/minute",  # High-frequency mobile requests during video playback
        "subtitle_tracks": "100/minute",  # Lightweight listing endpoint
        "subtitle_nikud": "5/hour",  # Expensive AI operations (Claude API batch processing)
        "subtitle_translate_word": "20/minute",  # AI translation with database caching
        "subtitle_translate_phrase": "10/minute",  # AI translation for phrases (no caching)
        "subtitle_fetch_external": "3/hour",  # External API quota protection (OpenSubtitles)
        "subtitle_import": "10/hour",  # Database writes for subtitle import
        "subtitle_delete": "20/hour",  # Destructive operations
        "subtitle_general": "30/minute",  # Other endpoints (languages, cache stats)
        # Trivia - Protection for AI-generated content and playback endpoints
        "trivia_get": "60/minute",  # Standard trivia fetch during playback
        "trivia_enriched": "3/hour",  # AI-enriched bundle (expensive operation)
        "trivia_preferences": "10/minute",  # Preference updates
        "trivia_generate": "5/hour",  # Admin force regenerate
        # Live Dubbing - Protection for admin configuration endpoints
        "dubbing_config_update": "10/hour",  # Channel dubbing configuration updates
        "dubbing_stats": "30/minute",  # Dubbing statistics queries
        # Podcast Translation - Protection for expensive translation operations
        "translation_single": "10/minute",  # Single episode translation trigger
        "translation_bulk": "5/hour",  # Bulk translation (expensive, queues many jobs)
        "translation_status": "30/minute",  # Translation status queries
    }

    RATE_LIMITING_ENABLED = True

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
