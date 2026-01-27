from datetime import datetime, timezone
from pymongo import IndexModel, ASCENDING, DESCENDING
from beanie import Document
from pydantic import Field, field_validator


class UserAudibleAccount(Document):
    """
    Stores Audible OAuth credentials for a user.

    Enables syncing user's Audible library and playback redirection.
    Tokens are encrypted at rest (application-level encryption via cryptography.fernet).

    Each user can have at most one Audible account linked (enforced via unique index).
    """

    user_id: str = Field(..., description="Reference to User (unique per account)")
    audible_user_id: str  # Audible account ID
    access_token: str  # OAuth access token (encrypted)
    refresh_token: str  # OAuth refresh token (encrypted)
    expires_at: datetime  # Token expiration timestamp
    state_token: str | None = None  # CSRF state token (for server-side validation)
    connected_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    synced_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_sync_error: str | None = None  # Last sync error (if any)
    sync_status: str = Field(default="pending", description="pending | synced | failed")
    is_active: bool = Field(default=True, description="Soft-delete flag")

    @field_validator("access_token", "refresh_token", mode="after")
    @classmethod
    def validate_token_format(cls, v: str) -> str:
        """Validate token format (must be non-empty and reasonable length)."""
        if not v or len(v) < 20:
            raise ValueError("Invalid token format (must be at least 20 characters)")
        return v

    @property
    def is_token_expired(self) -> bool:
        """Check if access token is expired."""
        return datetime.now(timezone.utc) > self.expires_at

    class Settings:
        name = "user_audible_accounts"
        indexes = [
            IndexModel([("user_id", ASCENDING)], unique=True),
            "audible_user_id",
            "synced_at",
            "sync_status",
            IndexModel([("expires_at", ASCENDING), ("is_active", ASCENDING)]),
            IndexModel([("user_id", ASCENDING), ("is_active", ASCENDING)]),
            IndexModel([("synced_at", ASCENDING), ("last_sync_error", ASCENDING)]),
        ]
