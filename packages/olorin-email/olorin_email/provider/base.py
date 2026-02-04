"""Base email provider interface."""

from abc import ABC, abstractmethod
from typing import List, Optional

from olorin_email.models import SendResult


class EmailProvider(ABC):
    """
    Abstract base class for email providers.

    All email providers (SendGrid, SMTP, SES, etc.) must implement this interface.
    """

    @property
    @abstractmethod
    def name(self) -> str:
        """Provider name for logging and identification."""
        pass

    @abstractmethod
    async def send(
        self,
        to: List[str],
        subject: str,
        html_content: str,
        from_email: Optional[str] = None,
        text_content: Optional[str] = None,
    ) -> SendResult:
        """
        Send email via this provider.

        Args:
            to: List of recipient email addresses
            subject: Email subject
            html_content: HTML email body
            from_email: Sender email (optional)
            text_content: Plain text email body (optional)

        Returns:
            SendResult with success status and details
        """
        pass
