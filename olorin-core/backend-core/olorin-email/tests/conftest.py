"""Shared pytest fixtures for olorin-email tests."""

import pytest
from pathlib import Path
from olorin_email.config import EmailSettings


@pytest.fixture
def email_settings():
    """Create test email settings with safe defaults."""
    return EmailSettings(
        EMAIL_PROVIDER="sendgrid",
        SENDGRID_API_KEY="test-api-key-12345",
        SENDGRID_FROM_EMAIL="test@example.com",
        SENDGRID_FROM_NAME="Test Sender",
        SENDGRID_API_URL="https://api.sendgrid.com/v3/mail/send",
        SENDGRID_WEBHOOK_VERIFICATION_KEY="test-webhook-key",
        EMAIL_TEMPLATE_DIRS=[],
        EMAIL_MAX_RETRIES=3,
        EMAIL_RETRY_BASE_DELAY_SECONDS=1.0,
        EMAIL_RATE_LIMIT_PER_RECIPIENT_PER_HOUR=5,
        EMAIL_TRACKING_ENABLED=True,
        EMAIL_DEFAULT_REPLY_TO="reply@example.com",
        EMAIL_UNSUBSCRIBE_URL="https://example.com/unsubscribe"
    )


@pytest.fixture
def template_dir(tmp_path):
    """Create temporary template directory with test templates."""
    templates = tmp_path / "templates"
    templates.mkdir()

    # Create a simple test template
    simple_template = templates / "simple.html.j2"
    simple_template.write_text(
        "<html><body><h1>Hello {{ name }}</h1><p>{{ message }}</p></body></html>"
    )

    # Create a template with translation
    i18n_template = templates / "i18n.html.j2"
    i18n_template.write_text(
        "<html dir='{{ get_dir(lang) }}'><body>{{ t('welcome') }}</body></html>"
    )

    return str(templates)
