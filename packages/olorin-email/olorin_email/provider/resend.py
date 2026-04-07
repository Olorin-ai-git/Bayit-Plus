"""Resend email provider implementation."""

import logging
from typing import List, Optional

import httpx

from olorin_email.config import EmailSettings
from olorin_email.models import SendResult
from olorin_email.provider.base import EmailProvider

logger = logging.getLogger(__name__)


class ResendProvider(EmailProvider):
    """
    Resend email provider.

    Uses Resend API for email delivery.
    Docs: https://resend.com/docs/api-reference/emails/send-email
    """

    def __init__(self, settings: EmailSettings):
        self.settings = settings
        self._api_url = "https://api.resend.com/emails"
        self._api_key = settings.resend_api_key

        if not self._api_key:
            logger.warning("Resend API key not configured")

    @property
    def name(self) -> str:
        return "resend"

    async def send(
        self,
        to: List[str],
        subject: str,
        html_content: str,
        from_email: Optional[str] = None,
        text_content: Optional[str] = None,
    ) -> SendResult:
        if not self._api_key:
            logger.warning("Resend API key not configured - email not sent")
            return SendResult(
                success=False,
                message="Resend API key not configured",
                provider=self.name,
            )

        from_email = from_email or self.settings.from_email

        try:
            payload = {
                "from": from_email,
                "to": to,
                "subject": subject,
                "html": html_content,
            }
            if text_content:
                payload["text"] = text_content

            headers = {
                "Authorization": f"Bearer {self._api_key}",
                "Content-Type": "application/json",
            }

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    self._api_url, json=payload, headers=headers
                )

                if response.status_code == 200:
                    data = response.json()
                    message_id = data.get("id")
                    logger.info(
                        "Resend email sent successfully",
                        extra={
                            "recipients": len(to),
                            "message_id": message_id,
                        },
                    )
                    return SendResult(
                        success=True,
                        message=f"Email sent to {len(to)} recipients",
                        provider=self.name,
                        message_id=message_id,
                    )
                else:
                    error_data = response.json() if response.text else {}
                    error_msg = error_data.get(
                        "message", f"HTTP {response.status_code}"
                    )
                    logger.error(
                        "Resend API error",
                        extra={
                            "status_code": response.status_code,
                            "error": error_msg,
                        },
                    )
                    return SendResult(
                        success=False,
                        message=f"Resend API error: {error_msg}",
                        provider=self.name,
                        error_code=str(response.status_code),
                    )

        except Exception as e:
            logger.error("Resend send error", extra={"error": str(e)})
            return SendResult(
                success=False,
                message=f"Resend send error: {str(e)}",
                provider=self.name,
            )
