"""Fluent builder for constructing email messages."""

import logging
from typing import Optional
from uuid import uuid4

from .config import EmailSettings
from .provider.base import EmailMessage


logger = logging.getLogger(__name__)


class EmailBuilder:
    """Fluent builder for constructing email messages."""

    def __init__(self, settings: EmailSettings):
        """Initialize email builder.

        Args:
            settings: Email configuration for defaults
        """
        self.settings = settings
        self._to_email: Optional[str] = None
        self._subject: Optional[str] = None
        self._html_content: Optional[str] = None
        self._template_name: Optional[str] = None
        self._template_context: Optional[dict] = None
        self._from_email: str = settings.SENDGRID_FROM_EMAIL
        self._from_name: str = settings.SENDGRID_FROM_NAME
        self._reply_to: str = settings.EMAIL_DEFAULT_REPLY_TO
        self._categories: list[str] = []
        self._custom_args: dict[str, str] = {}
        self._headers: dict[str, str] = {}

    def to(self, email: str) -> "EmailBuilder":
        """Set recipient email address."""
        self._to_email = email
        return self

    def subject(self, subject: str) -> "EmailBuilder":
        """Set email subject."""
        self._subject = subject
        return self

    def template(self, template_name: str, context: dict) -> "EmailBuilder":
        """Set template and context for rendering."""
        self._template_name = template_name
        self._template_context = context
        self._html_content = None
        return self

    def html(self, html_content: str) -> "EmailBuilder":
        """Set direct HTML content (alternative to template)."""
        self._html_content = html_content
        self._template_name = None
        self._template_context = None
        return self

    def from_address(self, email: str, name: str = "") -> "EmailBuilder":
        """Set sender address."""
        self._from_email = email
        if name:
            self._from_name = name
        return self

    def reply_to(self, email: str) -> "EmailBuilder":
        """Set reply-to address."""
        self._reply_to = email
        return self

    def category(self, category: str) -> "EmailBuilder":
        """Add category for tracking."""
        if category not in self._categories:
            self._categories.append(category)
        return self

    def tag(self, tag: str) -> "EmailBuilder":
        """Add tag (alias for category)."""
        return self.category(tag)

    def custom_arg(self, key: str, value: str) -> "EmailBuilder":
        """Add custom argument for webhook correlation."""
        self._custom_args[key] = value
        return self

    def header(self, key: str, value: str) -> "EmailBuilder":
        """Add custom email header."""
        self._headers[key] = value
        return self

    def build(self) -> EmailMessage:
        """Build the email message."""
        if not self._to_email:
            raise ValueError("Recipient email (to) is required")
        if not self._subject:
            raise ValueError("Email subject is required")
        if not self._html_content and not self._template_name:
            raise ValueError("Either HTML content or template must be specified")

        email_id = str(uuid4())

        message = EmailMessage(
            to_email=self._to_email,
            subject=self._subject,
            html_content=self._html_content or "",
            from_email=self._from_email,
            from_name=self._from_name,
            reply_to=self._reply_to,
            categories=self._categories.copy(),
            custom_args=self._custom_args.copy(),
            headers=self._headers.copy(),
            email_id=email_id,
            template_name=self._template_name or ""
        )

        logger.debug(
            "Email message built",
            extra={
                "email_id": email_id,
                "recipient": self._to_email,
                "template": self._template_name,
                "has_html": bool(self._html_content)
            }
        )

        return message
