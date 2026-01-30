"""Email service configuration using Pydantic v2 settings."""

from typing import List
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class EmailSettings(BaseSettings):
    """Configuration for email service with SendGrid provider."""

    model_config = SettingsConfigDict(
        env_prefix="",
        case_sensitive=True,
        extra="ignore"
    )

    EMAIL_PROVIDER: str = "sendgrid"
    SENDGRID_API_KEY: str = ""
    SENDGRID_FROM_EMAIL: str = ""
    SENDGRID_FROM_NAME: str = ""
    SENDGRID_API_URL: str = "https://api.sendgrid.com/v3/mail/send"
    SENDGRID_WEBHOOK_VERIFICATION_KEY: str = ""

    EMAIL_TEMPLATE_DIRS: List[str] = Field(default_factory=list)
    EMAIL_MAX_RETRIES: int = 3
    EMAIL_RETRY_BASE_DELAY_SECONDS: float = 1.0
    EMAIL_RATE_LIMIT_PER_RECIPIENT_PER_HOUR: int = 5
    EMAIL_TRACKING_ENABLED: bool = True
    EMAIL_DEFAULT_REPLY_TO: str = ""
    EMAIL_UNSUBSCRIBE_URL: str = ""

    @field_validator("SENDGRID_API_KEY", "SENDGRID_FROM_EMAIL")
    @classmethod
    def validate_required_production_fields(cls, v: str, info) -> str:
        """Validate that critical fields are set in production environments."""
        import os
        env = os.getenv("APP_ENV", "development").lower()

        if env in ("production", "prod") and not v:
            field_name = info.field_name
            raise ValueError(
                f"{field_name} is required in production environment. "
                f"Set the {field_name} environment variable."
            )

        return v
