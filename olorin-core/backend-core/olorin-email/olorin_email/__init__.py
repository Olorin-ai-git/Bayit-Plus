"""Olorin Email Service - Shared email infrastructure for the Olorin ecosystem.

This package provides:
- SendGrid integration with retry and rate limiting
- Jinja2 template rendering with i18n support
- Email event tracking and analytics (MongoDB/Beanie)
- FastAPI webhook handlers for SendGrid events
- Fluent builder API for constructing emails

Example usage:

    from olorin_email import (
        EmailSettings,
        SendGridProvider,
        TemplateEngine,
        EmailSender,
        EmailBuilder
    )
    import httpx

    # Initialize components
    settings = EmailSettings()
    client = httpx.AsyncClient()
    provider = SendGridProvider(client, settings)
    engine = TemplateEngine(settings)
    sender = EmailSender(settings, provider, engine)

    # Send email with template
    await sender.send(
        EmailBuilder(settings)
        .to("user@example.com")
        .subject("Welcome!")
        .template("welcome.html.j2", {"name": "John"})
        .category("onboarding")
    )
"""

from .builder import EmailBuilder
from .config import EmailSettings
from .provider.base import EmailMessage, EmailProvider, SendResult
from .provider.sendgrid_provider import SendGridProvider
from .rate_limiter import EmailRateLimiter
from .sender import EmailSender
from .template.engine import RenderedEmail, TemplateEngine
from .template.registry import TemplateMetadata, TemplateRegistry
from .tracking.analytics import DeliveryStats, EmailAnalytics
from .tracking.models import EmailEvent
from .tracking.webhook_handler import create_webhook_router

__version__ = "1.0.0"

__all__ = [
    "EmailSettings",
    "EmailProvider",
    "SendGridProvider",
    "EmailMessage",
    "SendResult",
    "TemplateEngine",
    "RenderedEmail",
    "TemplateRegistry",
    "TemplateMetadata",
    "EmailBuilder",
    "EmailSender",
    "EmailRateLimiter",
    "EmailEvent",
    "EmailAnalytics",
    "DeliveryStats",
    "create_webhook_router",
]
