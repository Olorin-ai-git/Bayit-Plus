"""SendGrid email provider implementation."""

import logging
from typing import Optional

import httpx

from ..config import EmailSettings
from .base import EmailMessage, EmailProvider, SendResult


logger = logging.getLogger(__name__)


class SendGridProvider(EmailProvider):
    """SendGrid email service provider implementation."""

    def __init__(self, client: httpx.AsyncClient, settings: EmailSettings):
        """Initialize SendGrid provider.

        Args:
            client: AsyncClient for HTTP requests (injected dependency)
            settings: Email configuration settings
        """
        self.client = client
        self.settings = settings

    async def send(self, message: EmailMessage) -> SendResult:
        """Send email via SendGrid API.

        Args:
            message: Email message to send

        Returns:
            SendResult with SendGrid message ID and status
        """
        try:
            payload = self._build_sendgrid_payload(message)
            headers = self._build_headers()

            response = await self.client.post(
                self.settings.SENDGRID_API_URL,
                json=payload,
                headers=headers
            )

            if response.status_code >= 200 and response.status_code < 300:
                sg_message_id = response.headers.get("x-message-id", "")
                logger.info(
                    "Email sent successfully via SendGrid",
                    extra={
                        "email_id": message.email_id,
                        "sg_message_id": sg_message_id,
                        "recipient": message.to_email,
                        "template": message.template_name
                    }
                )
                return SendResult(
                    success=True,
                    message_id=sg_message_id,
                    status_code=response.status_code
                )
            else:
                error_body = response.text
                logger.error(
                    "SendGrid API error",
                    extra={
                        "email_id": message.email_id,
                        "status_code": response.status_code,
                        "error": error_body,
                        "recipient": message.to_email
                    }
                )
                return SendResult(
                    success=False,
                    error=error_body,
                    status_code=response.status_code
                )

        except httpx.HTTPError as exc:
            logger.error(
                "HTTP error sending email",
                extra={
                    "email_id": message.email_id,
                    "error": str(exc),
                    "recipient": message.to_email
                },
                exc_info=True
            )
            return SendResult(success=False, error=str(exc))

        except Exception as exc:
            logger.error(
                "Unexpected error sending email",
                extra={
                    "email_id": message.email_id,
                    "error": str(exc),
                    "recipient": message.to_email
                },
                exc_info=True
            )
            return SendResult(success=False, error=str(exc))

    def _build_headers(self) -> dict[str, str]:
        """Build HTTP headers for SendGrid API request."""
        return {
            "Authorization": f"Bearer {self.settings.SENDGRID_API_KEY}",
            "Content-Type": "application/json"
        }

    def _build_sendgrid_payload(self, message: EmailMessage) -> dict:
        """Build SendGrid API request payload."""
        from_email = message.from_email or self.settings.SENDGRID_FROM_EMAIL
        from_name = message.from_name or self.settings.SENDGRID_FROM_NAME

        payload = {
            "personalizations": [
                {
                    "to": [{"email": message.to_email}],
                    "subject": message.subject
                }
            ],
            "from": {"email": from_email, "name": from_name} if from_name else {"email": from_email},
            "content": [
                {"type": "text/html", "value": message.html_content}
            ]
        }

        if message.plain_content:
            payload["content"].insert(0, {"type": "text/plain", "value": message.plain_content})

        if message.reply_to:
            payload["reply_to"] = {"email": message.reply_to}

        if message.categories:
            payload["categories"] = message.categories

        if message.custom_args:
            payload["custom_args"] = message.custom_args

        custom_headers = {}
        if message.email_id:
            custom_headers["X-Olorin-Email-Id"] = message.email_id
        if message.template_name:
            custom_headers["X-Olorin-Template"] = message.template_name

        if message.headers:
            custom_headers.update(message.headers)

        if custom_headers:
            payload["headers"] = custom_headers

        return payload
