"""Abstract base classes for email providers."""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class SendResult:
    """Result of an email send operation."""

    success: bool
    message_id: Optional[str] = None
    error: Optional[str] = None
    status_code: Optional[int] = None


@dataclass
class EmailMessage:
    """Complete email message with all metadata for sending."""

    to_email: str
    subject: str
    html_content: str
    plain_content: str = ""
    from_email: str = ""
    from_name: str = ""
    reply_to: str = ""
    categories: list[str] = field(default_factory=list)
    custom_args: dict[str, str] = field(default_factory=dict)
    headers: dict[str, str] = field(default_factory=dict)
    email_id: str = ""
    template_name: str = ""


class EmailProvider(ABC):
    """Abstract base class for email service providers."""

    @abstractmethod
    async def send(self, message: EmailMessage) -> SendResult:
        """Send a single email message.

        Args:
            message: The email message to send

        Returns:
            SendResult with success status and provider message ID
        """

    async def send_batch(self, messages: list[EmailMessage]) -> list[SendResult]:
        """Send multiple email messages.

        Default implementation sends sequentially. Providers may override
        for optimized batch sending.

        Args:
            messages: List of email messages to send

        Returns:
            List of SendResult objects, one per message
        """
        results = []
        for msg in messages:
            results.append(await self.send(msg))
        return results
