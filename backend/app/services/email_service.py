"""
Email Service (DEPRECATED)

[WARN] DEPRECATED: This module is deprecated and will be removed in a future version.

Use the Olorin shared email package instead:
- Core email infrastructure: olorin-email package
- Bayit+ templates: app.services.bayit_email_service

Migration guide: /docs/OLORIN_EMAIL_ARCHITECTURE.md
"""

import logging
import warnings
from typing import List, Optional

logger = logging.getLogger(__name__)

# Deprecation warning
warnings.warn(
    "app.services.email_service is deprecated. "
    "Use app.services.bayit_email_service.get_bayit_email_service() instead. "
    "See /docs/OLORIN_EMAIL_ARCHITECTURE.md for migration guide.",
    DeprecationWarning,
    stacklevel=2
)


async def send_email(
    to_emails: List[str],
    subject: str,
    html_content: str,
    from_email: Optional[str] = None,
) -> bool:
    """
    DEPRECATED: Send email using configured email service.

    Use get_bayit_email_service().send_generic_email() instead.

    Args:
        to_emails: List of recipient email addresses
        subject: Email subject
        html_content: HTML email body
        from_email: Sender email (optional)

    Returns:
        True if email sent successfully, False otherwise
    """
    logger.warning(
        "send_email() is deprecated. Use bayit_email_service.send_generic_email() instead."
    )

    # Compatibility layer: redirect to new service
    from app.services.bayit_email_service import get_bayit_email_service

    try:
        bayit_email = get_bayit_email_service()
        result = await bayit_email.send_generic_email(
            to_emails=to_emails,
            subject=subject,
            html_content=html_content,
            from_email=from_email,
        )
        return result.success
    except Exception as e:
        logger.error(f"Email send failed: {e}")
        return False


async def send_platform_invitation(
    to_email: str,
    inviter_name: Optional[str] = None,
    personal_message: Optional[str] = None,
) -> bool:
    """
    DEPRECATED: Send platform invitation email.

    Use bayit_email_service.send_platform_invitation() instead.

    Args:
        to_email: Recipient email address
        inviter_name: Name of person inviting (optional)
        personal_message: Personal message from inviter (optional)

    Returns:
        True if email sent successfully, False otherwise
    """
    logger.warning(
        "send_platform_invitation() is deprecated. "
        "Use bayit_email_service.send_platform_invitation() instead."
    )

    # Redirect to new service
    from app.services.bayit_email_service import get_bayit_email_service

    try:
        bayit_email = get_bayit_email_service()
        result = await bayit_email.send_platform_invitation(
            to_email=to_email,
            inviter_name=inviter_name,
            personal_message=personal_message,
        )
        return result.success
    except Exception as e:
        logger.error(f"Platform invitation failed: {e}")
        return False

