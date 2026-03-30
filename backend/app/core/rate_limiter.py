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

    # Tier-based voice rate limits (requests per minute)
    VOICE_TIER_LIMITS = {
        "free": _dev_limit("10/minute"),
        "basic": _dev_limit("10/minute"),
        "premium": _dev_limit("60/minute"),
        "family": _dev_limit("60/minute"),
        "admin": _dev_limit("120/minute"),
        "super_admin": _dev_limit("120/minute"),
    }

    def get_voice_rate_limit(subscription_tier: str | None, role: str | None = None) -> str:
        """
        Get the voice rate limit string based on user subscription tier and role.

        Args:
            subscription_tier: User subscription tier (basic, premium, family)
            role: User role (admin, super_admin, etc.)

        Returns:
            Rate limit string (e.g., "60/minute")
        """
        # Admin roles get highest tier
        admin_roles = {"admin", "super_admin", "content_manager", "billing_admin", "support"}
        if role and role in admin_roles:
            return VOICE_TIER_LIMITS.get("admin", _dev_limit("120/minute"))

        tier = subscription_tier or "free"
        return VOICE_TIER_LIMITS.get(tier, VOICE_TIER_LIMITS["free"])

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
        # Device Code Auth (RFC 8628 - TV Login)
        "device_code_initiate": _dev_limit("10/minute"),  # Device code requests
        "device_code_poll": _dev_limit("60/minute"),  # Polling at 5s interval
        "device_code_verify": _dev_limit("30/minute"),  # Code verification
        # Trivia - Protection for AI-generated content and playback endpoints
        "trivia_get": _dev_limit("60/minute"),  # Standard trivia fetch during playback
        "trivia_enriched": _dev_limit("3/hour"),  # AI-enriched bundle (expensive operation)
        "trivia_preferences": _dev_limit("10/minute"),  # Preference updates
        "trivia_generate": _dev_limit("5/hour"),  # Admin force regenerate
        # Quiz - Protection for kids quiz feature (AI-generated questions)
        "quiz_get": _dev_limit("30/minute"),  # Quiz retrieval/generation
        "quiz_submit": _dev_limit("10/minute"),  # Quiz answer submission
        "quiz_history": _dev_limit("30/minute"),  # Quiz history queries
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
        "voice_proactive": _dev_limit("30/minute"),  # Proactive voice suggestion polling
        # Email Templates - Protection for email sending operations
        "email_send_test": _dev_limit("10/hour"),  # Test email sends (prevent spam)
        "email_send_invitation": _dev_limit("20/hour"),  # Platform invitations per user
        # Synced Streams - Live stream synchronization
        "synced_streams_create": _dev_limit("30/minute"),  # Synced stream creation
        "synced_streams_latency": _dev_limit("60/minute"),  # Latency updates during streaming
        # Family Controls - PIN verification protection
        "family_pin_verify": _dev_limit("5/minute"),  # PIN verification (brute force protection)
        "family_pin_setup": _dev_limit("3/hour"),  # PIN setup/update
        "family_controls_update": _dev_limit("30/minute"),  # Settings updates
        # Comprehension Quiz - AI-generated comprehension questions during playback
        "comprehension_question": _dev_limit("20/minute"),  # AI question retrieval/generation
        "comprehension_submit": _dev_limit("10/minute"),  # Answer submission (write + credit deduction)
        "comprehension_scenes": _dev_limit("60/minute"),  # Scene marker listing (lightweight read)
        # Grandparent Bridge - COPPA-sensitive sharing and voice note endpoints
        "grandparent_pin_verify": _dev_limit("5/minute"),  # PIN brute-force protection
        "grandparent_share": _dev_limit("10/hour"),  # Clip sharing rate limit
        "grandparent_voice_note": _dev_limit("20/hour"),  # Voice note upload rate limit
        # BYOC Enrichment - External API quota protection
        "byoc_enrich": _dev_limit("5/minute"),
        "byoc_enrich_batch": _dev_limit("3/hour"),
        # BYOC Normalization - Heavy AI pipeline (channel index + TMDB + LLM)
        "byoc_normalize": _dev_limit("5/hour"),
        # VOD Interaction - Character dialogue (AI inference + animation)
        "vod_interaction_characters": _dev_limit("30/minute"),  # Character list fetch
        "vod_interaction_session_start": _dev_limit("10/minute"),  # Session creation
        "vod_interaction_message": _dev_limit("10/minute"),  # AI dialogue exchange (expensive)
        "vod_interaction_complete": _dev_limit("20/minute"),  # Session completion
        # VOD Voice Interaction - WebSocket voice pipeline (expensive: ASR + AI + animation)
        "vod_interaction_voice_ws_connect": _dev_limit("5/minute"),
        "vod_interaction_voice_utterance": _dev_limit("10/minute"),
        # VOD Multi-Character Interaction
        "vod_interaction_multi_message": _dev_limit("10/minute"),
        # VOD Shared Interaction
        "vod_interaction_shared_message": _dev_limit("10/minute"),
        # VOD Pause & Ask (expensive: 2x animation + AI + polish)
        "vod_interaction_pause_ask": _dev_limit("10/minute"),
        # Guest Demo Pause & Ask (unauthenticated pricing-page free tier)
        "guest_demo_pause_ask": _dev_limit("5/minute"),
        # Consumer URL submission
        "consumer_demo_submit": _dev_limit("3/minute"),
        "consumer_demo_status": _dev_limit("30/minute"),
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
    VOICE_TIER_LIMITS = {}

    def get_voice_rate_limit(subscription_tier=None, role=None):
        return "120/minute"
