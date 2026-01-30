"""Email sender orchestrator with retry and rate limiting."""

import logging
from typing import Optional, Union

from .builder import EmailBuilder
from .config import EmailSettings
from .provider.base import EmailMessage, EmailProvider, SendResult
from .rate_limiter import EmailRateLimiter
from .retry import with_retry
from .template.engine import TemplateEngine


logger = logging.getLogger(__name__)


class EmailSender:
    """Orchestrates email sending with templates, retry, and rate limiting."""

    def __init__(
        self,
        settings: EmailSettings,
        provider: EmailProvider,
        template_engine: TemplateEngine,
        tracking_service: Optional[object] = None
    ):
        """Initialize email sender."""
        self.settings = settings
        self.provider = provider
        self.template_engine = template_engine
        self.tracking_service = tracking_service
        self.rate_limiter = EmailRateLimiter(settings)

    async def send(
        self,
        message_or_builder: Union[EmailMessage, EmailBuilder]
    ) -> SendResult:
        """Send a single email with retry and rate limiting."""
        message = self._resolve_message(message_or_builder)

        if message.template_name:
            message = await self._render_template(message)

        if not self.rate_limiter.check(message.to_email):
            error = (
                f"Rate limit exceeded for {message.to_email}. "
                f"Limit: {self.settings.EMAIL_RATE_LIMIT_PER_RECIPIENT_PER_HOUR}/hour"
            )
            logger.warning(
                "Email blocked by rate limiter",
                extra={
                    "email_id": message.email_id,
                    "recipient": message.to_email
                }
            )
            return SendResult(success=False, error=error, status_code=429)

        result = await with_retry(
            lambda: self.provider.send(message),
            self.settings
        )

        if result.success:
            self.rate_limiter.record(message.to_email)

            if self.settings.EMAIL_TRACKING_ENABLED and self.tracking_service:
                await self._track_sent_event(message, result)

        logger.info(
            "Email send completed",
            extra={
                "email_id": message.email_id,
                "success": result.success,
                "recipient": message.to_email,
                "message_id": result.message_id
            }
        )

        return result

    async def send_batch(
        self,
        messages: list[Union[EmailMessage, EmailBuilder]]
    ) -> list[SendResult]:
        """Send multiple emails."""
        results = []

        for message_or_builder in messages:
            result = await self.send(message_or_builder)
            results.append(result)

        successful = sum(1 for r in results if r.success)
        logger.info(
            "Batch send completed",
            extra={
                "total": len(results),
                "successful": successful,
                "failed": len(results) - successful
            }
        )

        return results

    def _resolve_message(
        self,
        message_or_builder: Union[EmailMessage, EmailBuilder]
    ) -> EmailMessage:
        """Resolve EmailBuilder to EmailMessage."""
        if isinstance(message_or_builder, EmailBuilder):
            return message_or_builder.build()
        return message_or_builder

    async def _render_template(self, message: EmailMessage) -> EmailMessage:
        """Render template for message."""
        try:
            context = message.custom_args.copy()
            rendered = self.template_engine.render(message.template_name, context)

            message.html_content = rendered.html
            message.plain_content = rendered.plain_text

            logger.debug(
                "Template rendered for email",
                extra={
                    "email_id": message.email_id,
                    "template": message.template_name
                }
            )

        except Exception as exc:
            logger.error(
                "Template rendering failed",
                extra={
                    "email_id": message.email_id,
                    "template": message.template_name,
                    "error": str(exc)
                },
                exc_info=True
            )
            raise

        return message

    async def _track_sent_event(
        self,
        message: EmailMessage,
        result: SendResult
    ) -> None:
        """Persist sent event for tracking."""
        if not self.tracking_service:
            return

        try:
            from .tracking.models import EmailEvent
            from datetime import datetime

            event = EmailEvent(
                email_id=message.email_id,
                event_type="sent",
                recipient=message.to_email,
                template_name=message.template_name,
                subject=message.subject,
                timestamp=datetime.utcnow(),
                sg_message_id=result.message_id or "",
                campaign_id=message.custom_args.get("campaign_id"),
                user_id=message.custom_args.get("user_id")
            )

            await event.insert()

            logger.debug(
                "Sent event tracked",
                extra={
                    "email_id": message.email_id,
                    "recipient": message.to_email
                }
            )

        except Exception as exc:
            logger.error(
                "Failed to track sent event",
                extra={
                    "email_id": message.email_id,
                    "error": str(exc)
                },
                exc_info=True
            )
