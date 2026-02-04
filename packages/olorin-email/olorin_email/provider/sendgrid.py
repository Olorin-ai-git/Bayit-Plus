"""SendGrid email provider implementation."""

import logging
from typing import List, Optional

import httpx

from olorin_email.config import EmailSettings
from olorin_email.models import SendResult
from olorin_email.provider.base import EmailProvider

logger = logging.getLogger(__name__)


class SendGridProvider(EmailProvider):
    """
    SendGrid email provider.

    Uses SendGrid v3 API for email delivery.
    Docs: https://docs.sendgrid.com/api-reference/mail-send/mail-send
    """

    def __init__(self, settings: EmailSettings):
        """
        Initialize SendGrid provider.

        Args:
            settings: Email service settings with SendGrid API key
        """
        self.settings = settings
        self._api_url = "https://api.sendgrid.com/v3/mail/send"

        if not self.settings.sendgrid_api_key:
            logger.warning("SendGrid API key not configured")

    @property
    def name(self) -> str:
        """Provider name."""
        return "sendgrid"

    async def send(
        self,
        to: List[str],
        subject: str,
        html_content: str,
        from_email: Optional[str] = None,
        text_content: Optional[str] = None,
    ) -> SendResult:
        """
        Send email via SendGrid API.

        Args:
            to: List of recipient email addresses
            subject: Email subject
            html_content: HTML email body
            from_email: Sender email (optional, uses default from settings)
            text_content: Plain text email body (optional)

        Returns:
            SendResult with success status and message ID
        """
        if not self.settings.sendgrid_api_key:
            logger.warning("SendGrid API key not configured - email not sent")
            return SendResult(
                success=False,
                message="SendGrid API key not configured",
                provider=self.name
            )

        from_email = from_email or self.settings.from_email

        try:
            # Build SendGrid payload
            personalizations = []
            for recipient in to:
                personalizations.append({"to": [{"email": recipient}]})

            content = [{"type": "text/html", "value": html_content}]
            if text_content:
                content.insert(0, {"type": "text/plain", "value": text_content})

            payload = {
                "personalizations": personalizations,
                "from": {"email": from_email},
                "subject": subject,
                "content": content,
            }

            headers = {
                "Authorization": f"Bearer {self.settings.sendgrid_api_key}",
                "Content-Type": "application/json",
            }

            # Send via SendGrid API
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    self._api_url,
                    json=payload,
                    headers=headers
                )

                if response.status_code == 202:
                    message_id = response.headers.get("X-Message-Id")
                    logger.info(
                        "SendGrid email sent successfully",
                        extra={
                            "recipients": len(to),
                            "message_id": message_id,
                        }
                    )
                    return SendResult(
                        success=True,
                        message=f"Email sent successfully to {len(to)} recipients",
                        provider=self.name,
                        message_id=message_id
                    )
                else:
                    logger.error(
                        "SendGrid API error",
                        extra={
                            "status_code": response.status_code,
                            "error_type": response.headers.get("X-Message-Id", "unknown"),
                        }
                    )
                    return SendResult(
                        success=False,
                        message=f"SendGrid API error: {response.status_code}",
                        provider=self.name
                    )

        except Exception as e:
            logger.error(
                "SendGrid send error",
                extra={"error": str(e)}
            )
            return SendResult(
                success=False,
                message=f"SendGrid send error: {str(e)}",
                provider=self.name
            )
