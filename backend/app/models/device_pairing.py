"""
Device Pairing Session Model

QR-based TV authentication sessions stored in MongoDB.
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, Any

from beanie import Document, Indexed
from pydantic import Field


class DevicePairingSession(Document):
    """
    Device pairing session for QR-based TV authentication.

    Attributes:
        session_id: Unique session identifier (indexed, used in QR code)
        session_token: Secret token for session verification
        qr_code_data: Base64-encoded PNG QR code image
        pairing_code: Deep link URL for mobile app (bayitplus://tv-login?...)
        created_at: Session creation timestamp
        expires_at: Session expiration timestamp (20 minutes)
        status: Session status (waiting, scanning, authenticating, success, failed, expired)
        companion_device_info: Info about connected companion device
        authenticated_user_id: User ID after successful authentication
        authenticated_token: Access token after successful authentication
    """

    session_id: Indexed(str, unique=True)  # type: ignore
    session_token: str
    qr_code_data: str
    pairing_code: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime
    status: str = Field(
        default="waiting",
        pattern="^(waiting|scanning|authenticating|success|failed|expired)$"
    )
    companion_device_info: Optional[Dict[str, Any]] = None
    authenticated_user_id: Optional[str] = None
    authenticated_token: Optional[str] = None
    authenticated_refresh_token: Optional[str] = None

    class Settings:
        name = "device_pairing_sessions"
        indexes = [
            "session_id",  # Unique index for lookups
            [("expires_at", 1)],  # TTL index for auto-cleanup
            [("status", 1), ("created_at", -1)],  # Status queries
        ]

    class Config:
        json_schema_extra = {
            "example": {
                "session_id": "xx4dSN082n2N9WPW970AMw",
                "session_token": "B2AJsfmN1KmqD6X1v4LXULQfW5H-_Q2WBnFIFtlPN0g",
                "qr_code_data": "iVBORw0KGgoAAAANSUhEUg...",
                "pairing_code": "bayitplus://tv-login?session=xx4dSN082n2N9WPW970AMw&token=...",
                "created_at": "2026-02-16T19:00:00Z",
                "expires_at": "2026-02-16T19:20:00Z",
                "status": "waiting",
                "companion_device_info": None,
                "authenticated_user_id": None,
                "authenticated_token": None,
            }
        }

    def is_expired(self) -> bool:
        """Check if session has expired."""
        return datetime.utcnow() > self.expires_at

    def is_waiting(self) -> bool:
        """Check if session is waiting for companion to scan."""
        return self.status == "waiting"

    def is_success(self) -> bool:
        """Check if authentication was successful."""
        return self.status == "success"

    @classmethod
    def create_new(
        cls,
        session_id: str,
        session_token: str,
        qr_code_data: str,
        pairing_code: str,
        ttl_minutes: int = 20,
    ) -> "DevicePairingSession":
        """Factory method to create a new session with auto expiry."""
        now = datetime.utcnow()
        return cls(
            session_id=session_id,
            session_token=session_token,
            qr_code_data=qr_code_data,
            pairing_code=pairing_code,
            created_at=now,
            expires_at=now + timedelta(minutes=ttl_minutes),
            status="waiting",
        )
