"""
Olorin API Error Messages

Localized error messages for Olorin.ai platform APIs.
Uses i18n translation keys for multilingual support.
"""

from typing import Optional

from app.utils.i18n import get_translation


def get_error_message(key: str, language: str = "en", **kwargs) -> str:
    """
    Get a localized error message for Olorin APIs.

    Args:
        key: Error key (e.g., "session_not_found")
        language: Language code (he, en, es)
        **kwargs: Format variables for the message

    Returns:
        Localized error message
    """
    full_key = f"olorin.errors.{key}"
    message = get_translation(full_key, language)

    # Format with provided variables
    if kwargs:
        try:
            message = message.format(**kwargs)
        except KeyError:
            pass

    return message


# Error keys for type safety and IDE support
class OlorinErrors:
    """Error key constants for Olorin.ai platform."""

    # Session errors
    SESSION_NOT_FOUND = "session_not_found"
    SESSION_DIFFERENT_PARTNER = "session_different_partner"
    SESSION_INVALID_STATUS = "session_invalid_status"
    MAX_SESSIONS_REACHED = "max_sessions_reached"

    # Authentication errors
    INVALID_API_KEY = "invalid_api_key"
    MISSING_API_KEY = "missing_api_key"

    # Capability errors
    CAPABILITY_DISABLED = "capability_disabled"
    CAPABILITY_NOT_ENABLED = "capability_not_enabled"

    # Language errors
    SOURCE_LANGUAGE_NOT_SUPPORTED = "source_language_not_supported"
    TARGET_LANGUAGE_NOT_SUPPORTED = "target_language_not_supported"

    # Partner errors
    PARTNER_NOT_FOUND = "partner_not_found"
    PARTNER_REGISTRATION_FAILED = "partner_registration_failed"
    NO_UPDATES_PROVIDED = "no_updates_provided"

    # Webhook errors
    WEBHOOK_CONFIG_FAILED = "webhook_config_failed"
    WEBHOOK_URL_NOT_CONFIGURED = "webhook_url_not_configured"
    WEBHOOK_SECRET_NOT_CONFIGURED = "webhook_secret_not_configured"

    # Search errors
    SEARCH_FAILED = "search_failed"
    INDEXING_FAILED = "indexing_failed"

    # Context errors
    DETECTION_FAILED = "detection_failed"
    EXPLANATION_FAILED = "explanation_failed"
    REFERENCE_NOT_FOUND = "reference_not_found"
    ENRICHMENT_FAILED = "enrichment_failed"
    GET_REFERENCES_FAILED = "get_references_failed"

    # Recap errors
    CREATE_SESSION_FAILED = "create_session_failed"
    ADD_TRANSCRIPT_FAILED = "add_transcript_failed"
    GENERATE_RECAP_FAILED = "generate_recap_failed"
