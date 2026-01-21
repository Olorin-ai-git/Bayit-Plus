"""
Configuration validation module for fail-fast startup behavior.

This module validates all required configuration fields at application startup,
ensuring the server fails immediately with clear error messages if configuration
is incomplete or insecure.
"""

import logging
from typing import NamedTuple

from app.core.config import settings

logger = logging.getLogger(__name__)


class ConfigValidationError(Exception):
    """Raised when configuration validation fails."""

    def __init__(self, errors: list[str]) -> None:
        self.errors = errors
        message = "\n".join([f"  - {e}" for e in errors])
        super().__init__(f"Configuration validation failed:\n{message}")


class FieldRequirement(NamedTuple):
    """Defines a configuration field requirement."""

    field_name: str
    description: str
    is_required: bool
    category: str


# Define all configuration field requirements
REQUIRED_FIELDS: list[FieldRequirement] = [
    # Security (CRITICAL)
    FieldRequirement("SECRET_KEY", "JWT signing key (min 32 chars)", True, "security"),
    FieldRequirement("MONGODB_URL", "MongoDB connection string", True, "database"),
    # Google Cloud (Required for production)
    FieldRequirement("GCP_PROJECT_ID", "Google Cloud Project ID", True, "gcp"),
    # Frontend URLs (Required for email/verification)
    FieldRequirement("FRONTEND_URL", "Frontend URL for email links", True, "frontend"),
    FieldRequirement(
        "FRONTEND_WEB_URL", "Web frontend URL for verification", True, "frontend"
    ),
    # CORS (Required for production)
    FieldRequirement("BACKEND_CORS_ORIGINS", "Allowed CORS origins", True, "security"),
]

OPTIONAL_FIELDS: list[FieldRequirement] = [
    # Stripe (Optional - for payments)
    FieldRequirement("STRIPE_API_KEY", "Stripe public API key", False, "stripe"),
    FieldRequirement("STRIPE_SECRET_KEY", "Stripe secret API key", False, "stripe"),
    FieldRequirement("STRIPE_WEBHOOK_SECRET", "Stripe webhook secret", False, "stripe"),
    # AI Services (Optional but recommended)
    FieldRequirement("ANTHROPIC_API_KEY", "Anthropic Claude API key", False, "ai"),
    FieldRequirement("OPENAI_API_KEY", "OpenAI API key", False, "ai"),
    FieldRequirement("ELEVENLABS_API_KEY", "ElevenLabs API key", False, "ai"),
    # Google OAuth (Optional)
    FieldRequirement("GOOGLE_CLIENT_ID", "Google OAuth client ID", False, "oauth"),
    FieldRequirement(
        "GOOGLE_CLIENT_SECRET", "Google OAuth client secret", False, "oauth"
    ),
    FieldRequirement(
        "GOOGLE_REDIRECT_URI", "Google OAuth redirect URI", False, "oauth"
    ),
    # Storage (Optional - defaults to local)
    FieldRequirement("GCS_BUCKET_NAME", "GCS bucket name for media", False, "storage"),
    FieldRequirement(
        "CDN_BASE_URL", "CDN base URL for serving media", False, "storage"
    ),
    # TMDB (Optional but recommended)
    FieldRequirement("TMDB_API_KEY", "TMDB API key for metadata", False, "content"),
    # Email (Optional)
    FieldRequirement("SENDGRID_API_KEY", "SendGrid API key for emails", False, "email"),
    # Twilio (Optional)
    FieldRequirement("TWILIO_ACCOUNT_SID", "Twilio account SID for SMS", False, "sms"),
    FieldRequirement("TWILIO_AUTH_TOKEN", "Twilio auth token", False, "sms"),
    FieldRequirement("TWILIO_PHONE_NUMBER", "Twilio phone number", False, "sms"),
    # Voice (Optional)
    FieldRequirement("PICOVOICE_ACCESS_KEY", "Picovoice wake word key", False, "voice"),
    # Apple (Optional)
    FieldRequirement("APPLE_KEY_ID", "Apple key ID for APNs", False, "apple"),
    FieldRequirement("APPLE_TEAM_ID", "Apple team ID", False, "apple"),
]

# Librarian Agent fields (all required if librarian is used)
LIBRARIAN_FIELDS: list[FieldRequirement] = [
    # Daily Audit
    FieldRequirement(
        "LIBRARIAN_DAILY_AUDIT_CRON", "Daily audit cron schedule", True, "librarian"
    ),
    FieldRequirement(
        "LIBRARIAN_DAILY_AUDIT_TIME", "Daily audit time description", True, "librarian"
    ),
    FieldRequirement(
        "LIBRARIAN_DAILY_AUDIT_MODE", "Daily audit mode", True, "librarian"
    ),
    FieldRequirement(
        "LIBRARIAN_DAILY_AUDIT_COST", "Daily audit cost estimate", True, "librarian"
    ),
    FieldRequirement(
        "LIBRARIAN_DAILY_AUDIT_STATUS", "Daily audit status", True, "librarian"
    ),
    FieldRequirement(
        "LIBRARIAN_DAILY_AUDIT_DESCRIPTION",
        "Daily audit description",
        True,
        "librarian",
    ),
    # Weekly Audit
    FieldRequirement(
        "LIBRARIAN_WEEKLY_AUDIT_CRON", "Weekly audit cron schedule", True, "librarian"
    ),
    FieldRequirement(
        "LIBRARIAN_WEEKLY_AUDIT_TIME",
        "Weekly audit time description",
        True,
        "librarian",
    ),
    FieldRequirement(
        "LIBRARIAN_WEEKLY_AUDIT_MODE", "Weekly audit mode", True, "librarian"
    ),
    FieldRequirement(
        "LIBRARIAN_WEEKLY_AUDIT_COST", "Weekly audit cost estimate", True, "librarian"
    ),
    FieldRequirement(
        "LIBRARIAN_WEEKLY_AUDIT_STATUS", "Weekly audit status", True, "librarian"
    ),
    FieldRequirement(
        "LIBRARIAN_WEEKLY_AUDIT_DESCRIPTION",
        "Weekly audit description",
        True,
        "librarian",
    ),
    # Limits
    FieldRequirement(
        "LIBRARIAN_MAX_ITERATIONS", "Max audit iterations", True, "librarian"
    ),
    FieldRequirement(
        "LIBRARIAN_DEFAULT_BUDGET_USD", "Default budget in USD", True, "librarian"
    ),
    FieldRequirement(
        "LIBRARIAN_MIN_BUDGET_USD", "Minimum budget in USD", True, "librarian"
    ),
    FieldRequirement(
        "LIBRARIAN_MAX_BUDGET_USD", "Maximum budget in USD", True, "librarian"
    ),
    FieldRequirement(
        "LIBRARIAN_BUDGET_STEP_USD", "Budget step in USD", True, "librarian"
    ),
    # Pagination
    FieldRequirement(
        "LIBRARIAN_REPORTS_LIMIT", "Reports pagination limit", True, "librarian"
    ),
    FieldRequirement(
        "LIBRARIAN_ACTIONS_LIMIT", "Actions pagination limit", True, "librarian"
    ),
    FieldRequirement(
        "LIBRARIAN_ACTIVITY_PAGE_SIZE", "Activity page size", True, "librarian"
    ),
    # UI
    FieldRequirement(
        "LIBRARIAN_ID_TRUNCATE_LENGTH", "ID truncation length", True, "librarian"
    ),
    FieldRequirement(
        "LIBRARIAN_MODAL_MAX_HEIGHT", "Modal max height in px", True, "librarian"
    ),
]


def _check_field_value(field_name: str) -> tuple[bool, str | None]:
    """Check if a field has a valid non-empty value."""
    try:
        value = getattr(settings, field_name, None)
    except Exception as e:
        return False, str(e)

    if value is None:
        return False, "not set"

    if isinstance(value, str) and not value.strip():
        return False, "empty string"

    return True, None


def validate_required_config() -> None:
    """
    Validate that all required configuration fields are set.

    Raises:
        ConfigValidationError: If any required fields are missing or invalid.
    """
    errors: list[str] = []

    for field in REQUIRED_FIELDS:
        is_valid, error_msg = _check_field_value(field.field_name)
        if not is_valid:
            errors.append(
                f"{field.field_name} ({field.category}): {field.description} - {error_msg}"
            )

    # Check librarian fields (only if librarian feature is being used)
    # We check if any librarian field is set to determine if the feature is active
    librarian_in_use = any(
        hasattr(settings, field.field_name)
        and getattr(settings, field.field_name, None)
        for field in LIBRARIAN_FIELDS
    )

    if librarian_in_use:
        for field in LIBRARIAN_FIELDS:
            is_valid, error_msg = _check_field_value(field.field_name)
            if not is_valid:
                errors.append(
                    f"{field.field_name} ({field.category}): {field.description} - {error_msg}"
                )

    if errors:
        raise ConfigValidationError(errors)


def validate_security_config() -> None:
    """
    Validate security-sensitive configuration.

    Raises:
        ConfigValidationError: If any security configuration is insecure.
    """
    errors: list[str] = []

    # SECRET_KEY validation is now handled by Pydantic validator in config.py
    # This function can check additional security settings

    # Check for insecure OAuth redirect URIs in production
    if not settings.DEBUG:
        if settings.GOOGLE_REDIRECT_URI and "localhost" in settings.GOOGLE_REDIRECT_URI:
            errors.append(
                "GOOGLE_REDIRECT_URI contains 'localhost' in production mode. "
                "Set DEBUG=true for development or use a production URL."
            )

    # Check for empty CORS in production
    if not settings.DEBUG and not settings.BACKEND_CORS_ORIGINS:
        errors.append(
            "BACKEND_CORS_ORIGINS is empty in production mode. "
            "Configure allowed origins for your frontend domains."
        )

    if errors:
        raise ConfigValidationError(errors)


def validate_olorin_config() -> None:
    """
    Validate Olorin.ai platform configuration.

    Checks that enabled Olorin features have required dependencies configured.

    Raises:
        ConfigValidationError: If any Olorin configuration is invalid.
    """
    errors: list[str] = []

    # Use the built-in validation method from OlorinSettings
    olorin_errors = settings.olorin.validate_enabled_features()
    errors.extend(olorin_errors)

    # Additional cross-cutting validation
    if any(
        [
            settings.olorin.dubbing_enabled,
            settings.olorin.semantic_search_enabled,
            settings.olorin.cultural_context_enabled,
            settings.olorin.recap_enabled,
        ]
    ):
        # At least one Olorin feature is enabled - validate partner API configuration
        if not settings.olorin.partner.api_key_salt:
            errors.append(
                "PARTNER_API_KEY_SALT is required when any Olorin feature is enabled. "
                'Generate with: python -c "import secrets; print(secrets.token_urlsafe(32))"'
            )
        elif len(settings.olorin.partner.api_key_salt) < 32:
            errors.append(
                f"PARTNER_API_KEY_SALT must be at least 32 characters (got {len(settings.olorin.partner.api_key_salt)}). "
                'Generate with: python -c "import secrets; print(secrets.token_urlsafe(32))"'
            )

    # Validate semantic search dependencies
    if settings.olorin.semantic_search_enabled:
        if not settings.OPENAI_API_KEY:
            errors.append(
                "OPENAI_API_KEY is required for Olorin semantic search (embedding generation). "
                "Set OLORIN_SEMANTIC_SEARCH_ENABLED=false or configure OPENAI_API_KEY."
            )

    # Validate recap agent dependencies
    if settings.olorin.recap_enabled:
        if not settings.ANTHROPIC_API_KEY:
            errors.append(
                "ANTHROPIC_API_KEY is required for Olorin recap agent (Claude). "
                "Set OLORIN_RECAP_ENABLED=false or configure ANTHROPIC_API_KEY."
            )

    # Validate cultural context dependencies
    if settings.olorin.cultural_context_enabled:
        if not settings.ANTHROPIC_API_KEY:
            errors.append(
                "ANTHROPIC_API_KEY is required for Olorin cultural context (Claude). "
                "Set OLORIN_CULTURAL_CONTEXT_ENABLED=false or configure ANTHROPIC_API_KEY."
            )

    # Validate dubbing dependencies
    if settings.olorin.dubbing_enabled:
        if not settings.ELEVENLABS_API_KEY:
            errors.append(
                "ELEVENLABS_API_KEY is required for Olorin dubbing (TTS/STT). "
                "Set OLORIN_DUBBING_ENABLED=false or configure ELEVENLABS_API_KEY."
            )
        if not settings.ANTHROPIC_API_KEY:
            errors.append(
                "ANTHROPIC_API_KEY is required for Olorin dubbing (translation). "
                "Set OLORIN_DUBBING_ENABLED=false or configure ANTHROPIC_API_KEY."
            )

    if errors:
        raise ConfigValidationError(errors)


def validate_all_config() -> None:
    """
    Run all configuration validations.

    This should be called at application startup.

    Raises:
        ConfigValidationError: If any validation fails.
    """
    logger.info("Validating configuration...")

    try:
        validate_required_config()
        validate_security_config()
        validate_olorin_config()
        logger.info("Configuration validation passed")
    except ConfigValidationError:
        logger.error("Configuration validation FAILED")
        raise


def get_missing_optional_fields() -> list[FieldRequirement]:
    """Get a list of optional fields that are not configured."""
    missing: list[FieldRequirement] = []

    for field in OPTIONAL_FIELDS:
        is_valid, _ = _check_field_value(field.field_name)
        if not is_valid:
            missing.append(field)

    return missing


def log_configuration_warnings() -> None:
    """Log warnings for missing optional but recommended configuration."""
    missing = get_missing_optional_fields()

    if not missing:
        logger.info("All optional configuration fields are set")
        return

    logger.warning("=" * 60)
    logger.warning("CONFIGURATION WARNINGS (optional but recommended):")

    # Group by category
    by_category: dict[str, list[FieldRequirement]] = {}
    for field in missing:
        by_category.setdefault(field.category, []).append(field)

    for category, fields in by_category.items():
        logger.warning(f"  [{category.upper()}]")
        for field in fields:
            logger.warning(f"    - {field.field_name}: {field.description}")

    logger.warning("=" * 60)
