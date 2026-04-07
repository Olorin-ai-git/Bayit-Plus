"""Email service configuration."""

from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings


class EmailSettings(BaseSettings):
    """Email service configuration settings."""

    # SendGrid
    sendgrid_api_key: str = Field(default="", description="SendGrid API key")
    from_email: str = Field(
        default="noreply@olorin.ai",
        description="Default sender email address"
    )

    # Resend
    resend_api_key: str = Field(default="", description="Resend API key")

    # SMTP (future)
    smtp_host: Optional[str] = Field(default=None, description="SMTP server host")
    smtp_port: int = Field(default=587, description="SMTP server port")
    smtp_username: Optional[str] = Field(default=None, description="SMTP username")
    smtp_password: Optional[str] = Field(default=None, description="SMTP password")
    smtp_use_tls: bool = Field(default=True, description="Use TLS for SMTP")

    # Provider selection
    email_provider: str = Field(
        default="sendgrid",
        description="Email provider (sendgrid, resend, smtp)"
    )

    class Config:
        env_prefix = ""
        case_sensitive = False
