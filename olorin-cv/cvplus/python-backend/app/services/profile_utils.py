"""
Profile Service Utilities
Helper functions for profile operations
"""

import logging
import random
import string
import qrcode
import io
from typing import Optional

from app.models import Profile
from app.services.storage_service import StorageService

logger = logging.getLogger(__name__)


async def generate_unique_slug(user_id: str) -> str:
    """Generate unique slug for profile"""

    base_slug = f"profile_{user_id[:8]}"
    slug = base_slug

    attempt = 0
    while await Profile.find_one(Profile.slug == slug):
        attempt += 1
        suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=4))
        slug = f"{base_slug}_{suffix}"

        if attempt > 10:
            raise ValueError("Failed to generate unique slug")

    return slug


async def generate_qr_code(profile: Profile, storage: StorageService) -> str:
    """Generate QR code for profile URL"""

    logger.info(f"Generating QR code for profile {profile.id}")

    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(profile.public_url)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")

    img_bytes = io.BytesIO()
    img.save(img_bytes, format="PNG")
    img_bytes.seek(0)

    qr_filename = f"qr_codes/{profile.user_id}/{profile.slug}.png"
    qr_url = await storage.upload_file(
        img_bytes.read(),
        qr_filename,
        content_type="image/png"
    )

    logger.info(f"QR code generated successfully", extra={
        "profile_id": str(profile.id),
        "qr_url": qr_url,
    })

    return qr_url
