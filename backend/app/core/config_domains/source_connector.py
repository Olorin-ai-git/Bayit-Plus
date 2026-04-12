"""Domain config: Authenticated source connector settings."""
from pydantic import Field


class SourceConnectorConfigMixin:
    """OAuth and source connector configuration."""

    # Google Workspace OAuth
    SOURCE_GOOGLE_CLIENT_ID: str = Field(
        default="",
        env="SOURCE_GOOGLE_CLIENT_ID",
        description="Google OAuth2 client ID for source connector",
    )
    SOURCE_GOOGLE_CLIENT_SECRET: str = Field(
        default="",
        env="SOURCE_GOOGLE_CLIENT_SECRET",
        description="Google OAuth2 client secret for source connector",
    )
    SOURCE_GOOGLE_REDIRECT_URI: str = Field(
        default="",
        env="SOURCE_GOOGLE_REDIRECT_URI",
        description="OAuth callback URL for Google source connector",
    )

    # Panopto OAuth
    SOURCE_PANOPTO_CLIENT_ID: str = Field(
        default="",
        env="SOURCE_PANOPTO_CLIENT_ID",
        description="Panopto OAuth2 client ID",
    )
    SOURCE_PANOPTO_CLIENT_SECRET: str = Field(
        default="",
        env="SOURCE_PANOPTO_CLIENT_SECRET",
        description="Panopto OAuth2 client secret",
    )

    # Token encryption
    SOURCE_TOKEN_ENCRYPTION_KEY: str = Field(
        default="",
        env="SOURCE_TOKEN_ENCRYPTION_KEY",
        description="Fernet encryption key for OAuth tokens at rest",
    )

    # Temp storage
    SOURCE_TEMP_GCS_PREFIX: str = Field(
        default="source-connector-temp",
        env="SOURCE_TEMP_GCS_PREFIX",
        description="GCS prefix for temp video downloads during pipeline processing",
    )
    SOURCE_TEMP_MAX_AGE_HOURS: int = Field(
        default=24, ge=1, le=168,
        env="SOURCE_TEMP_MAX_AGE_HOURS",
        description="Max hours before orphaned temp files are cleaned up",
    )
    SOURCE_SIGNED_URL_EXPIRY_SECONDS: int = Field(
        default=86400, ge=300, le=604800,
        env="SOURCE_SIGNED_URL_EXPIRY_SECONDS",
        description="Signed URL lifetime in seconds for temp import video access",
    )

    # Sync defaults
    SOURCE_SYNC_DEFAULT_POLL_HOURS: int = Field(
        default=24, ge=6, le=168,
        env="SOURCE_SYNC_DEFAULT_POLL_HOURS",
        description="Default poll interval for container sync",
    )
    SOURCE_BROWSE_PAGE_SIZE: int = Field(
        default=50, ge=10, le=200,
        env="SOURCE_BROWSE_PAGE_SIZE",
        description="Items per page when browsing source folders",
    )
    SOURCE_BROWSE_CACHE_TTL_SECONDS: int = Field(
        default=300, ge=60, le=3600,
        env="SOURCE_BROWSE_CACHE_TTL_SECONDS",
        description="TTL for cached folder listings",
    )
