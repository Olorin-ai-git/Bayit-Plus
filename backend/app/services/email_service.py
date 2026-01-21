"""
Email Service
Simple email service for sending notifications
Supports SendGrid and SMTP
"""

import logging
from typing import List, Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


async def send_email(
    to_emails: List[str],
    subject: str,
    html_content: str,
    from_email: Optional[str] = None,
) -> bool:
    """
    Send email using configured email service.

    Supports:
    - SendGrid API (if SENDGRID_API_KEY is set)
    - SMTP (if SMTP_HOST is set) - future implementation
    - Fallback: Log only

    Args:
        to_emails: List of recipient email addresses
        subject: Email subject
        html_content: HTML email body
        from_email: Sender email (optional, uses default from settings)

    Returns:
        True if email sent successfully, False otherwise
    """
    if not to_emails:
        logger.warning("No recipient emails provided")
        return False

    from_email = from_email or getattr(
        settings, "SENDGRID_FROM_EMAIL", "noreply@bayitplus.com"
    )

    # Try SendGrid first
    if hasattr(settings, "SENDGRID_API_KEY") and settings.SENDGRID_API_KEY:
        return await send_via_sendgrid(to_emails, subject, html_content, from_email)

    # Fallback: Just log the email
    logger.info(f"📧 [EMAIL NOT CONFIGURED] Would send email:")
    logger.info(f"   To: {', '.join(to_emails)}")
    logger.info(f"   Subject: {subject}")
    logger.info(f"   (Email service not configured - set SENDGRID_API_KEY in .env)")

    return False


async def send_via_sendgrid(
    to_emails: List[str], subject: str, html_content: str, from_email: str
) -> bool:
    """
    Send email via SendGrid API.

    Docs: https://docs.sendgrid.com/api-reference/mail-send/mail-send
    """
    try:
        url = "https://api.sendgrid.com/v3/mail/send"

        # Build personalizations for multiple recipients
        personalizations = []
        for to_email in to_emails:
            personalizations.append({"to": [{"email": to_email}]})

        payload = {
            "personalizations": personalizations,
            "from": {"email": from_email},
            "subject": subject,
            "content": [{"type": "text/html", "value": html_content}],
        }

        headers = {
            "Authorization": f"Bearer {settings.SENDGRID_API_KEY}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=payload, headers=headers)

            if response.status_code == 202:
                logger.info(
                    f"✅ Email sent successfully to {len(to_emails)} recipients"
                )
                return True
            else:
                logger.error(f"❌ SendGrid API error: {response.status_code}")
                logger.error(f"   Response: {response.text}")
                return False

    except Exception as e:
        logger.error(f"❌ Failed to send email via SendGrid: {e}")
        return False


# Future: SMTP support
async def send_via_smtp(
    to_emails: List[str], subject: str, html_content: str, from_email: str
) -> bool:
    """
    Send email via SMTP (future implementation).

    Would require settings:
    - SMTP_HOST
    - SMTP_PORT
    - SMTP_USERNAME
    - SMTP_PASSWORD
    - SMTP_USE_TLS
    """
    logger.warning("SMTP email sending not yet implemented")
    return False
