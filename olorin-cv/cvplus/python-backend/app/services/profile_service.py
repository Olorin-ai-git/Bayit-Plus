"""
Profile Service
Business logic for public CV profiles
"""

import logging
from typing import Optional
from datetime import datetime

from app.models import Profile, CV, ContactRequest
from app.services.storage_service import StorageService
from app.services.profile_utils import generate_unique_slug, generate_qr_code
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class ProfileService:
    """Service for public profile operations"""

    def __init__(self):
        self.storage = StorageService()

    async def create_profile(
        self,
        cv_id: str,
        user_id: str,
        slug: Optional[str] = None,
        visibility: str = "public"
    ) -> Profile:
        """
        Create public profile for CV

        Args:
            cv_id: CV document ID
            user_id: User ID
            slug: Custom slug (auto-generated if not provided)
            visibility: public, private, or unlisted

        Returns:
            Created profile
        """
        logger.info(f"Creating profile for CV {cv_id}", extra={
            "user_id": user_id,
            "visibility": visibility,
        })

        cv = await CV.get(cv_id)
        if not cv or cv.user_id != user_id:
            raise PermissionError("CV not found or access denied")

        if not slug:
            slug = await generate_unique_slug(user_id)

        existing = await Profile.find_one(Profile.slug == slug)
        if existing:
            raise ValueError(f"Slug '{slug}' is already taken")

        public_url = f"{settings.app_base_url}/cv/{slug}"

        profile = Profile(
            user_id=user_id,
            cv_id=cv_id,
            slug=slug,
            visibility=visibility,
            public_url=public_url,
        )

        await profile.save()

        logger.info(f"Profile created", extra={
            "profile_id": str(profile.id),
            "slug": slug,
        })

        try:
            qr_url = await generate_qr_code(profile, self.storage)
            profile.qr_code_url = qr_url
            await profile.save()
        except Exception as e:
            logger.error(f"QR code generation failed: {e}", exc_info=True)

        return profile

    async def get_profile_by_slug(self, slug: str) -> Optional[Profile]:
        """Get profile by slug (public access)"""

        profile = await Profile.find_one(Profile.slug == slug)

        if not profile:
            return None

        if profile.visibility == "private":
            return None

        profile.view_count += 1
        profile.last_viewed_at = datetime.utcnow()
        await profile.save()

        return profile

    async def update_profile(
        self,
        profile_id: str,
        user_id: str,
        **updates
    ) -> Profile:
        """Update profile settings"""

        profile = await Profile.get(profile_id)

        if not profile or profile.user_id != user_id:
            raise PermissionError("Profile not found or access denied")

        for key, value in updates.items():
            if hasattr(profile, key) and value is not None:
                setattr(profile, key, value)

        profile.updated_at = datetime.utcnow()
        await profile.save()

        logger.info(f"Profile updated", extra={
            "profile_id": str(profile.id),
            "updates": list(updates.keys()),
        })

        return profile

    async def submit_contact_request(
        self,
        slug: str,
        sender_name: str,
        sender_email: str,
        message: str,
        sender_phone: Optional[str] = None,
        company: Optional[str] = None,
        metadata: Optional[dict] = None
    ) -> ContactRequest:
        """Submit contact form for profile"""

        profile = await self.get_profile_by_slug(slug)

        if not profile:
            raise ValueError("Profile not found")

        if not profile.show_contact_form:
            raise ValueError("Contact form is disabled for this profile")

        contact = ContactRequest(
            profile_id=str(profile.id),
            profile_owner_id=profile.user_id,
            sender_name=sender_name,
            sender_email=sender_email,
            sender_phone=sender_phone,
            company=company,
            message=message,
            ip_address=metadata.get("ip_address") if metadata else None,
            user_agent=metadata.get("user_agent") if metadata else None,
            referrer=metadata.get("referrer") if metadata else None,
        )

        await contact.save()

        profile.contact_request_count += 1
        await profile.save()

        logger.info(f"Contact request submitted", extra={
            "profile_id": str(profile.id),
            "contact_id": str(contact.id),
            "sender_email": sender_email,
            "notification_required": True,
        })

        return contact

    async def delete_profile(self, profile_id: str, user_id: str):
        """Delete profile"""

        profile = await Profile.get(profile_id)

        if not profile or profile.user_id != user_id:
            raise PermissionError("Profile not found or access denied")

        if profile.qr_code_url:
            qr_filename = f"qr_codes/{profile.user_id}/{profile.slug}.png"
            try:
                await self.storage.delete_file(qr_filename)
            except Exception as e:
                logger.warning(f"Failed to delete QR code: {e}")

        await profile.delete()

        logger.info(f"Profile deleted", extra={"profile_id": str(profile.id)})
