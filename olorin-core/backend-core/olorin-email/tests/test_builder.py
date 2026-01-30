"""Tests for EmailBuilder fluent API."""

import pytest
from olorin_email.builder import EmailBuilder
from olorin_email.provider.base import EmailMessage


def test_build_with_html_content_succeeds(email_settings):
    """Test building email with direct HTML content."""
    message = (
        EmailBuilder(email_settings)
        .to("recipient@example.com")
        .subject("Test Subject")
        .html("<html><body>Test content</body></html>")
        .build()
    )

    assert isinstance(message, EmailMessage)
    assert message.to_email == "recipient@example.com"
    assert message.subject == "Test Subject"
    assert message.html_content == "<html><body>Test content</body></html>"
    assert message.email_id != ""
    assert message.template_name == ""


def test_build_with_template_succeeds(email_settings):
    """Test building email with template name."""
    message = (
        EmailBuilder(email_settings)
        .to("recipient@example.com")
        .subject("Test Subject")
        .template("welcome.html.j2", {"name": "John"})
        .build()
    )

    assert message.template_name == "welcome.html.j2"
    assert message.html_content == ""


def test_build_validation_errors(email_settings):
    """Test that build() raises ValueError for missing required fields."""
    builder = EmailBuilder(email_settings)

    with pytest.raises(ValueError, match="Recipient email"):
        builder.subject("Test").html("Content").build()

    with pytest.raises(ValueError, match="subject is required"):
        EmailBuilder(email_settings).to("test@example.com").html("Content").build()

    with pytest.raises(ValueError, match="HTML content or template"):
        EmailBuilder(email_settings).to("test@example.com").subject("Test").build()


def test_fluent_chaining_returns_self(email_settings):
    """Test that all fluent methods return self for chaining."""
    builder = EmailBuilder(email_settings)

    assert builder.to("test@example.com") is builder
    assert builder.subject("Subject") is builder
    assert builder.html("Content") is builder
    assert builder.from_address("sender@example.com") is builder
    assert builder.reply_to("reply@example.com") is builder
    assert builder.category("test") is builder
    assert builder.custom_arg("key", "value") is builder
    assert builder.header("X-Custom", "value") is builder


def test_categories_and_tags_deduplicated(email_settings):
    """Test that duplicate categories/tags are not added twice."""
    message = (
        EmailBuilder(email_settings)
        .to("test@example.com")
        .subject("Test")
        .html("Content")
        .category("newsletter")
        .category("newsletter")
        .tag("marketing")
        .tag("marketing")
        .build()
    )

    assert len(message.categories) == 2
    assert "newsletter" in message.categories
    assert "marketing" in message.categories


def test_custom_args_and_headers_are_set(email_settings):
    """Test that custom arguments and headers are properly set."""
    message = (
        EmailBuilder(email_settings)
        .to("test@example.com")
        .subject("Test")
        .html("Content")
        .custom_arg("user_id", "123")
        .custom_arg("campaign_id", "abc")
        .header("X-Custom-1", "value1")
        .header("X-Custom-2", "value2")
        .build()
    )

    assert message.custom_args == {"user_id": "123", "campaign_id": "abc"}
    assert message.headers == {"X-Custom-1": "value1", "X-Custom-2": "value2"}


def test_from_address_and_reply_to(email_settings):
    """Test that from address and reply-to are properly set."""
    message = (
        EmailBuilder(email_settings)
        .to("test@example.com")
        .subject("Test")
        .html("Content")
        .from_address("custom@example.com", "Custom Sender")
        .reply_to("custom-reply@example.com")
        .build()
    )

    assert message.from_email == "custom@example.com"
    assert message.from_name == "Custom Sender"
    assert message.reply_to == "custom-reply@example.com"


def test_settings_defaults_used(email_settings):
    """Test that settings defaults are used when not overridden."""
    message = EmailBuilder(email_settings).to("test@example.com").subject("Test").html("Content").build()

    assert message.from_email == email_settings.SENDGRID_FROM_EMAIL
    assert message.from_name == email_settings.SENDGRID_FROM_NAME
    assert message.reply_to == email_settings.EMAIL_DEFAULT_REPLY_TO


def test_template_and_html_mutual_exclusion(email_settings):
    """Test that setting template clears HTML and vice versa."""
    # HTML clears template
    message = (
        EmailBuilder(email_settings)
        .to("test@example.com")
        .subject("Test")
        .template("template.j2", {})
        .html("<p>HTML</p>")
        .build()
    )
    assert message.html_content == "<p>HTML</p>"
    assert message.template_name == ""

    # Template clears HTML
    message = (
        EmailBuilder(email_settings)
        .to("test@example.com")
        .subject("Test")
        .html("<p>HTML</p>")
        .template("template.j2", {})
        .build()
    )
    assert message.template_name == "template.j2"
    assert message.html_content == ""
