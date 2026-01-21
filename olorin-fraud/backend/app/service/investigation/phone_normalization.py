"""
Phone Normalization Service

Normalizes phone numbers to E164 format.

Constitutional Compliance:
- Uses phonenumbers library if available
- Falls back to regex validation
- No hardcoded formats
"""

import re
from typing import Optional

try:
    import phonenumbers

    PHONENUMBERS_AVAILABLE = True
except ImportError:
    PHONENUMBERS_AVAILABLE = False

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)

# E164 regex pattern: ^\+[1-9]\d{1,14}$
E164_PATTERN = re.compile(r"^\+[1-9]\d{1,14}$")


def normalize_phone_to_e164(phone: str) -> Optional[str]:
    """
    Normalize phone number to E164 format.

    Uses phonenumbers library if available, otherwise regex validation.

    Args:
        phone: Phone number string

    Returns:
        E164 formatted phone number or None if invalid
    """
    phone = phone.strip()

    # Already in E164 format?
    if E164_PATTERN.match(phone):
        return phone

    if PHONENUMBERS_AVAILABLE:
        try:
            parsed = phonenumbers.parse(phone, None)
            if phonenumbers.is_valid_number(parsed):
                return phonenumbers.format_number(
                    parsed, phonenumbers.PhoneNumberFormat.E164
                )
        except Exception as e:
            logger.warning(f"phonenumbers library failed to parse {phone}: {e}")

    # Fallback: try to add + if missing
    if not phone.startswith("+"):
        phone_with_plus = f"+{phone}"
        if E164_PATTERN.match(phone_with_plus):
            return phone_with_plus

    return None
