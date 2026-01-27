from datetime import datetime

from beanie import Document
from pydantic import Field


class UserAudibleAccount(Document):
    """
    Stores Audible OAuth credentials for a user.

    Enables syncing user's Audible library and playback redirection.
    Tokens are encrypted at rest (MongoDB field-level encryption).
    """

    user_id: str  # Reference to User
    audible_user_id: str  # Audible account ID
    access_token: str  # OAuth access token (encrypted)
    refresh_token: str  # OAuth refresh token (encrypted)
    expires_at: datetime  # Token expiration timestamp
    connected_at: datetime = Field(default_factory=datetime.utcnow)
    synced_at: datetime = Field(default_factory=datetime.utcnow)
    last_sync_error: str | None = None  # Last sync error (if any)

    class Settings:
        name = "user_audible_accounts"
        indexes = [
            "user_id",
            "audible_user_id",
            ("user_id", "audible_user_id"),
        ]
