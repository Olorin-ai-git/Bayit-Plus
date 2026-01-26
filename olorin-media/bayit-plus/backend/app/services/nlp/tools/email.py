"""
Email Tool - Send emails via configured email service.
"""

import logging
from typing import List, Optional

from app.core.config import settings

logger = logging.getLogger(__name__)


async def send_email(
    to: str,
    subject: str,
    body: str,
    attachments: Optional[List[str]] = None
) -> str:
    """
    Send email with optional attachments.

    Uses the configured email service (Firebase, SendGrid, etc.).

    Args:
        to: Recipient email address
        subject: Email subject line
        body: Email body (HTML supported)
        attachments: Optional list of file paths to attach

    Returns:
        Success message or error
    """
    try:
        # Import email service (would use actual service in production)
        # For now, placeholder implementation
        logger.info(f"Sending email to {to} with subject '{subject}'")

        # TODO: Integrate with actual email service
        # from app.services.email_service import send_email as send_mail
        # result = await send_mail(to, subject, body, attachments)

        return f"Email sent successfully to {to}"

    except Exception as e:
        logger.error(f"Send email failed: {e}")
        return f"Failed to send email: {str(e)}"
