"""Domain config: External auth providers (Google, Apple, Audible)."""
from pydantic import Field


class AuthExternalConfigMixin:
    """Google OAuth, Apple OAuth, and Audible integration configuration fields."""

    # Google OAuth (optional - only required if using Google sign-in)
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = (
        ""  # Required if using Google OAuth, no localhost defaults
    )
    GOOGLE_IOS_CLIENT_ID: str = ""  # iOS Google Sign-In SDK client ID

    # Apple OAuth (optional - only required if using Apple Sign-In)
    APPLE_CLIENT_ID: str = ""  # Service ID (e.g., com.bayit.bayit-plus)
    APPLE_TEAM_ID: str = ""  # Apple Developer Team ID
    APPLE_KEY_ID: str = ""  # Private Key ID
    APPLE_PRIVATE_KEY: str = ""  # Private Key content (PEM format)
    APPLE_JWKS_URL: str = "https://appleid.apple.com/auth/keys"  # Apple JWKS endpoint

    # Audible OAuth Integration (optional - enables audiobook syncing for premium users)
    # Obtain credentials from https://developer.amazon.com/
    # Leave empty to disable the feature gracefully
    AUDIBLE_CLIENT_ID: str = Field(
        default="",
        description="Audible OAuth Client ID (from Amazon Developer Console)"
    )
    AUDIBLE_CLIENT_SECRET: str = Field(
        default="",
        description="Audible OAuth Client Secret (from Amazon Developer Console)"
    )
    AUDIBLE_REDIRECT_URI: str = Field(
        default="",
        description="Audible OAuth Redirect URI (e.g., https://yourdomain.com/api/v1/user/audible/oauth/callback)"
    )
    AUDIBLE_INTEGRATION_ENABLED: bool = Field(
        default=False,
        description="Enable Audible integration (requires all three OAuth credentials to be set)"
    )

    @property
    def is_audible_configured(self) -> bool:
        """Check if all Audible OAuth credentials are present."""
        return bool(
            self.AUDIBLE_CLIENT_ID
            and self.AUDIBLE_CLIENT_SECRET
            and self.AUDIBLE_REDIRECT_URI
        )

    # Audible API Configuration (advanced - hardcoded URLs are safe, no env override needed)
    AUDIBLE_API_BASE_URL: str = Field(
        default="https://api.audible.com",
        description="Base URL for Audible API (stable, rarely changes)"
    )
    AUDIBLE_AUTH_URL: str = Field(
        default="https://www.audible.com/auth/oauth2",
        description="Base URL for Audible OAuth (stable, rarely changes)"
    )

    # Audible HTTP Client Configuration
    AUDIBLE_HTTP_TIMEOUT_SECONDS: int = Field(
        default=30,
        description="HTTP request timeout in seconds"
    )
    AUDIBLE_HTTP_CONNECT_TIMEOUT_SECONDS: int = Field(
        default=10,
        description="HTTP connection timeout in seconds"
    )
    AUDIBLE_HTTP_MAX_CONNECTIONS: int = Field(
        default=5,
        description="Maximum concurrent connections to Audible API"
    )
    AUDIBLE_HTTP_KEEPALIVE_CONNECTIONS: int = Field(
        default=2,
        description="Maximum keepalive connections to Audible API"
    )

    # Token Encryption Configuration
    AUDIBLE_TOKEN_ENCRYPTION_KEY: str = Field(
        default="",
        description="Fernet encryption key for Audible tokens (base64-encoded, generated via cryptography.fernet.Fernet.generate_key())"
    )

    # Rate Limiting Configuration for Audible OAuth
    AUDIBLE_RATE_LIMIT_PER_MINUTE: int = Field(
        default=10,
        description="Maximum OAuth callback attempts per minute per IP"
    )
    AUDIBLE_RATE_LIMIT_STORAGE: str = Field(
        default="memory",
        description="Rate limit storage backend: 'memory' or 'redis'"
    )
