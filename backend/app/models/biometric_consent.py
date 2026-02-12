"""
Biometric Consent Model.

COPPA-compliant biometric data consent tracking for Zeh Ani features.
Tracks granular consent for mesh generation, voice-to-voice, and
latent feature extraction separately per child profile.
"""

from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from beanie import Document, Indexed
from pydantic import Field


class BiometricConsentType(str, Enum):
    """Types of biometric data processing requiring separate consent."""

    MESH_GENERATION = "mesh_generation"
    VOICE_V2V = "voice_v2v"
    LATENT_FEATURES = "latent_features"


class BiometricConsent(Document):
    """
    Granular biometric consent record per child profile.

    Each consent type (mesh, voice, latent) is tracked independently
    to allow parents fine-grained control over biometric data usage.
    Family PIN verification is required for all consent operations.
    """

    user_id: Indexed(str)
    profile_id: str
    consent_type: BiometricConsentType

    # Consent metadata
    granted_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    granted_by_user_id: str
    family_pin_verified: bool = False

    # Data residency preferences
    on_device_only: bool = Field(
        default=True,
        description="If True, biometric data stays on-device only",
    )
    latent_features_cloud: bool = Field(
        default=False,
        description="If True, latent features may be stored in cloud",
    )

    # Revocation
    revoked_at: Optional[datetime] = None

    class Settings:
        name = "biometric_consents"
        indexes = [
            [("user_id", 1), ("profile_id", 1), ("consent_type", 1)],
        ]

    @property
    def is_active(self) -> bool:
        return (
            self.family_pin_verified
            and self.revoked_at is None
        )
