"""Domain config: Monitoring, logging, and WebAuthn (passkey) configuration."""

from pydantic import Field


CORRELATION_ID_HEADER_MAX_LENGTH = 1024


class MonitoringConfigMixin:
    """Sentry error tracking, structured logging, and WebAuthn passkey settings."""

    # Sentry Configuration (Error Tracking & Monitoring)
    SENTRY_DSN: str = ""  # Optional, empty = disabled
    SENTRY_ENVIRONMENT: str = "development"
    SENTRY_RELEASE: str = ""
    SENTRY_TRACES_SAMPLE_RATE: float = 0.2

    # Logging Configuration (LOG_LEVEL in main Settings - core field)
    CORRELATION_ID_HEADER: str = Field(
        default="X-Correlation-ID",
        min_length=1,
        max_length=CORRELATION_ID_HEADER_MAX_LENGTH,
    )
    REQUEST_TIMEOUT_WARNING_MS: int = 5000

    # WebAuthn (Passkey) Configuration
    # Relying Party ID - must match the domain where passkeys are created
    # For production, this should be the main domain (e.g., "bayit.tv")
    WEBAUTHN_RP_ID: str = ""
    # Relying Party Name - displayed to users during passkey creation
    WEBAUTHN_RP_NAME: str = ""
    # Expected origin(s) - comma-separated list of allowed origins
    # Example: "https://bayit.tv,https://www.bayit.tv"
    WEBAUTHN_ORIGIN: str = ""
    # Session duration for passkey-authenticated sessions (default 7 days)
    PASSKEY_SESSION_DURATION_DAYS: int = 7
    # Challenge expiration time in seconds (default 5 minutes)
    PASSKEY_CHALLENGE_EXPIRY_SECONDS: int = 300
    # Maximum number of passkeys per user
    PASSKEY_MAX_CREDENTIALS_PER_USER: int = 10
