"""Core email service implementation."""

import logging
from typing import List, Optional

from olorin_email.models import SendResult
from olorin_email.provider.base import EmailProvider

logger = logging.getLogger(__name__)


class EmailService:
    """
    Core email service.

    Provides unified email sending across different providers (SendGrid, SMTP, etc.).
    """

    def __init__(self, provider: EmailProvider):
        """
        Initialize email service with a provider.

        Args:
            provider: Email provider implementation (SendGrid, SMTP, etc.)
        """
        self.provider = provider

    async def send(
        self,
        to: List[str],
        subject: str,
        html_content: str,
        from_email: Optional[str] = None,
        text_content: Optional[str] = None,
    ) -> SendResult:
        """
        Send email via configured provider.

        Args:
            to: List of recipient email addresses
            subject: Email subject
            html_content: HTML email body
            from_email: Sender email (optional, uses provider default)
            text_content: Plain text email body (optional)

        Returns:
            SendResult with success status and details
        """
        if not to:
            logger.warning("No recipient emails provided")
            return SendResult(
                success=False,
                message="No recipients provided",
                provider=self.provider.name
            )

        try:
            result = await self.provider.send(
                to=to,
                subject=subject,
                html_content=html_content,
                from_email=from_email,
                text_content=text_content,
            )

            if result.success:
                logger.info(
                    "Email sent successfully",
                    extra={
                        "provider": self.provider.name,
                        "recipients": len(to),
                        "message_id": result.message_id,
                    }
                )
            else:
                logger.error(
                    "Email send failed",
                    extra={
                        "provider": self.provider.name,
                        "error": result.message,
                    }
                )

            return result

        except Exception as e:
            logger.error(
                "Email service error",
                extra={
                    "provider": self.provider.name,
                    "error": str(e),
                }
            )
            return SendResult(
                success=False,
                message=f"Email service error: {str(e)}",
                provider=self.provider.name
            )
