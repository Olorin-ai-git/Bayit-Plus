"""
COPPA Consent Service.

Records verifiable parental consent for Star in Story feature.
Validates family PIN through FamilyControls before granting consent.
"""

import logging
from datetime import datetime, timezone

from app.models.child_avatar import AvatarStatus, ChildAvatar, ConsentRecord
from app.models.family_controls import FamilyControls

logger = logging.getLogger(__name__)


class ConsentService:
    """COPPA verifiable parental consent management."""

    async def verify_and_record_consent(
        self,
        user_id: str,
        profile_id: str,
        child_first_name: str,
        pin_hash: str,
        ip_address: str = "",
    ) -> ChildAvatar:
        """
        Verify family PIN and record parental consent.

        Returns existing or new ChildAvatar with consent recorded.
        """
        family_controls = await FamilyControls.find_one(
            FamilyControls.user_id == user_id
        )
        if not family_controls:
            raise ValueError("Family controls not configured for this account")

        if family_controls.pin_hash != pin_hash:
            logger.warning(
                "Consent PIN verification failed",
                extra={"user_id": user_id, "profile_id": profile_id},
            )
            raise ValueError("Invalid family PIN")

        avatar = await ChildAvatar.find_one(
            ChildAvatar.user_id == user_id,
            ChildAvatar.profile_id == profile_id,
        )

        consent = ConsentRecord(
            granted_at=datetime.now(timezone.utc),
            granted_by_user_id=user_id,
            family_pin_verified=True,
            ip_address=ip_address if ip_address else None,
        )

        if avatar:
            avatar.consent = consent
            avatar.child_first_name = child_first_name
            avatar.status = AvatarStatus.CONSENT_GRANTED
            avatar.updated_at = datetime.now(timezone.utc)
            await avatar.save()
        else:
            avatar = ChildAvatar(
                user_id=user_id,
                profile_id=profile_id,
                child_first_name=child_first_name,
                consent=consent,
                status=AvatarStatus.CONSENT_GRANTED,
            )
            await avatar.insert()

        logger.info(
            "COPPA consent recorded",
            extra={
                "user_id": user_id,
                "profile_id": profile_id,
                "avatar_id": str(avatar.id),
            },
        )
        return avatar

    async def has_consent(self, user_id: str, profile_id: str) -> bool:
        """Check if valid consent exists for a child profile."""
        avatar = await ChildAvatar.find_one(
            ChildAvatar.user_id == user_id,
            ChildAvatar.profile_id == profile_id,
        )
        return avatar is not None and avatar.has_consent

    async def revoke_consent(self, user_id: str, profile_id: str) -> bool:
        """Revoke consent and mark avatar for deletion."""
        avatar = await ChildAvatar.find_one(
            ChildAvatar.user_id == user_id,
            ChildAvatar.profile_id == profile_id,
        )
        if not avatar:
            return False

        avatar.consent = None
        avatar.status = AvatarStatus.DELETED
        avatar.updated_at = datetime.now(timezone.utc)
        await avatar.save()

        logger.info(
            "COPPA consent revoked",
            extra={
                "user_id": user_id,
                "profile_id": profile_id,
                "avatar_id": str(avatar.id),
            },
        )
        return True


consent_service = ConsentService()
