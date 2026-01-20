"""
Passkey (WebAuthn) credential and session models.

Stores WebAuthn credentials for passkey authentication and manages
authenticated sessions for accessing passkey-protected content.
"""

from datetime import datetime, timedelta
from typing import Optional, List

from beanie import Document
from pydantic import Field


class PasskeyCredential(Document):
    """
    Stores a registered WebAuthn passkey credential.

    Each user can have multiple passkeys (e.g., phone, laptop, security key).
    The private key never leaves the user's device; we only store the public key.
    """

    # Owner of this credential
    user_id: str

    # WebAuthn credential fields
    credential_id: str  # Base64-encoded credential ID from authenticator
    public_key: str  # Base64-encoded COSE public key
    sign_count: int = 0  # Counter for replay attack prevention

    # Credential metadata
    device_name: Optional[str] = None  # Friendly name (e.g., "iPhone 15 Pro")
    transports: List[str] = Field(default_factory=list)  # ["usb", "nfc", "ble", "internal", "hybrid"]
    aaguid: Optional[str] = None  # Authenticator Attestation GUID
    credential_type: str = "public-key"  # WebAuthn credential type

    # Attestation data (optional, for enterprise use)
    attestation_format: Optional[str] = None  # "packed", "tpm", "android-key", etc.
    attestation_object: Optional[str] = None  # Base64-encoded attestation object

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_used_at: Optional[datetime] = None

    # Status
    is_active: bool = True  # Can be deactivated without deletion

    class Settings:
        name = "passkey_credentials"
        indexes = [
            "user_id",
            "credential_id",
            ("user_id", "is_active"),
            ("credential_id", "is_active"),
        ]


class PasskeySession(Document):
    """
    Tracks an active passkey-authenticated session.

    After successful passkey verification, a session is created that
    allows access to passkey-protected content for a configurable duration.
    """

    # Session owner
    user_id: str

    # Session token (sent in X-Passkey-Session header)
    session_token: str  # Cryptographically secure random token

    # Session metadata
    credential_id: Optional[str] = None  # Which passkey was used
    device_info: Optional[str] = None  # User agent or device description
    ip_address: Optional[str] = None  # IP address at authentication time

    # Session validity
    expires_at: datetime
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Status
    is_revoked: bool = False
    revoked_at: Optional[datetime] = None
    revoked_reason: Optional[str] = None

    class Settings:
        name = "passkey_sessions"
        indexes = [
            "user_id",
            "session_token",
            "expires_at",
            ("user_id", "is_revoked"),
            ("session_token", "is_revoked", "expires_at"),
        ]

    def is_valid(self) -> bool:
        """Check if session is valid (not expired and not revoked)."""
        return not self.is_revoked and self.expires_at > datetime.utcnow()


class PasskeyChallenge(Document):
    """
    Stores temporary WebAuthn challenges for registration and authentication.

    Challenges expire after 5 minutes to prevent replay attacks.
    For QR code cross-device flow, includes additional polling fields.
    """

    # Challenge data
    challenge: str  # Base64-encoded challenge bytes
    challenge_type: str  # "registration" or "authentication"

    # User context
    user_id: Optional[str] = None  # Required for registration, optional for auth

    # For cross-device QR code flow
    is_qr_flow: bool = False
    qr_session_id: Optional[str] = None  # Unique ID for QR polling
    authenticated_by_user_id: Optional[str] = None  # Set when QR flow completes
    authenticated_session_token: Optional[str] = None  # Session token for QR device

    # Expiration
    expires_at: datetime
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Status
    is_used: bool = False
    used_at: Optional[datetime] = None

    class Settings:
        name = "passkey_challenges"
        indexes = [
            "challenge",
            "qr_session_id",
            "expires_at",
            ("challenge", "is_used"),
            ("qr_session_id", "is_used"),
        ]

    def is_valid(self) -> bool:
        """Check if challenge is valid (not expired and not used)."""
        return not self.is_used and self.expires_at > datetime.utcnow()
