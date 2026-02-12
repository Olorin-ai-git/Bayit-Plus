"""
Biometric Consent Service.

Manages COPPA-compliant biometric consent for Zeh Ani features.
Requires family PIN verification for all consent operations,
reusing the PIN pattern from star_story/consent_service.py.
"""

from datetime import datetime, timezone
from typing import Optional

from app.core.logging_config import get_logger
from app.models.biometric_consent import BiometricConsent, BiometricConsentType
from app.models.family_controls import FamilyControls

logger = get_logger(__name__)


class BiometricConsentService:
    """COPPA biometric consent management with PIN verification."""

    async def grant_biometric_consent(
        self,
        user_id: str,
        profile_id: str,
        consent_type: BiometricConsentType,
        pin: str,
        on_device_only: bool = True,
        latent_features_cloud: bool = False,
    ) -> BiometricConsent:
        """Grant biometric consent after PIN verification."""
        await self.verify_pin(user_id, pin)

        existing = await BiometricConsent.find_one(
            BiometricConsent.user_id == user_id,
            BiometricConsent.profile_id == profile_id,
            BiometricConsent.consent_type == consent_type,
            BiometricConsent.revoked_at == None,  # noqa: E711
        )
        if existing and existing.is_active:
            logger.info(
                "Biometric consent already active",
                extra={
                    "user_id": user_id,
                    "profile_id": profile_id,
                    "consent_type": consent_type.value,
                },
            )
            return existing

        consent = BiometricConsent(
            user_id=user_id,
            profile_id=profile_id,
            consent_type=consent_type,
            granted_by_user_id=user_id,
            family_pin_verified=True,
            on_device_only=on_device_only,
            latent_features_cloud=latent_features_cloud,
        )
        await consent.insert()

        logger.info(
            "Biometric consent granted",
            extra={
                "user_id": user_id,
                "profile_id": profile_id,
                "consent_type": consent_type.value,
                "consent_id": str(consent.id),
            },
        )
        return consent

    async def has_biometric_consent(
        self,
        user_id: str,
        profile_id: str,
        consent_type: BiometricConsentType,
    ) -> bool:
        """Check if active biometric consent exists."""
        consent = await BiometricConsent.find_one(
            BiometricConsent.user_id == user_id,
            BiometricConsent.profile_id == profile_id,
            BiometricConsent.consent_type == consent_type,
            BiometricConsent.revoked_at == None,  # noqa: E711
            BiometricConsent.family_pin_verified == True,  # noqa: E712
        )
        return consent is not None

    async def revoke_biometric_consent(
        self,
        user_id: str,
        profile_id: str,
        consent_type: BiometricConsentType,
    ) -> bool:
        """Revoke biometric consent and cascade-delete biometric data."""
        consent = await BiometricConsent.find_one(
            BiometricConsent.user_id == user_id,
            BiometricConsent.profile_id == profile_id,
            BiometricConsent.consent_type == consent_type,
            BiometricConsent.revoked_at == None,  # noqa: E711
        )
        if not consent:
            return False

        consent.revoked_at = datetime.now(timezone.utc)
        await consent.save()

        await self._delete_biometric_data(user_id, profile_id, consent_type)

        logger.info(
            "Biometric consent revoked",
            extra={
                "user_id": user_id,
                "profile_id": profile_id,
                "consent_type": consent_type.value,
                "consent_id": str(consent.id),
            },
        )
        return True

    async def _delete_biometric_data(
        self,
        user_id: str,
        profile_id: str,
        consent_type: BiometricConsentType,
    ) -> None:
        """Cascade-delete biometric data from GCS after consent revocation."""
        from app.models.child_avatar import ChildAvatar
        from app.services.olorin.storage_service import storage_service

        avatar = await ChildAvatar.find_one(
            ChildAvatar.user_id == user_id,
            ChildAvatar.profile_id == profile_id,
        )
        if not avatar:
            return

        paths_to_delete = []
        if consent_type == BiometricConsentType.VOICE_V2V:
            paths_to_delete.append(f"zeh-ani/v2v/{avatar.id}/")
        elif consent_type == BiometricConsentType.MESH_GENERATION:
            paths_to_delete.append(f"zeh-ani/meshes/{avatar.id}/")
        elif consent_type == BiometricConsentType.LATENT_FEATURES:
            paths_to_delete.append(f"zeh-ani/controlnet/{avatar.id}/")

        for prefix in paths_to_delete:
            await storage_service.delete_prefix(prefix)
            logger.info(
                "Biometric data deleted from GCS",
                extra={
                    "user_id": user_id,
                    "prefix": prefix,
                    "consent_type": consent_type.value,
                },
            )

    async def get_consent_status(
        self, user_id: str, profile_id: str,
    ) -> dict:
        """Get all consent statuses for a profile."""
        result = {}
        for ctype in BiometricConsentType:
            has = await self.has_biometric_consent(
                user_id, profile_id, ctype,
            )
            result[ctype.value] = has
        return result

    async def verify_pin(self, user_id: str, pin: str) -> None:
        """Verify family PIN before consent operations."""
        family_controls = await FamilyControls.find_one(
            FamilyControls.user_id == user_id
        )
        if not family_controls:
            raise ValueError(
                "Family controls not configured for this account"
            )

        from app.services.family_controls_service import (
            family_controls_service,
        )

        pin_valid = await family_controls_service.verify_pin(
            user_id=user_id, pin=pin,
        )
        if not pin_valid:
            logger.warning(
                "Biometric consent PIN verification failed",
                extra={"user_id": user_id},
            )
            raise ValueError("Invalid family PIN")


biometric_consent_service = BiometricConsentService()
