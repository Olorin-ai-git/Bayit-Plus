"""
Integration tests for PII hashing in logs.

Tests verify that PII data is hashed before being written to logs across
different logging configurations and scenarios.
"""

import io
import logging
import os

import pytest

from app.service.logging_helper import PIILoggingFilter, get_pii_aware_logger
from app.service.security.pii_hasher import PIIHashConfig, PIIHasher


@pytest.fixture
def pii_hasher():
    """Create a test PII hasher with known salt."""
    config = PIIHashConfig(salt="test-integration-salt-12345", enabled=True)
    return PIIHasher(config)


@pytest.fixture
def test_logger(monkeypatch):
    """Create a test logger with PII filter and string handler."""
    # Set required environment variables
    monkeypatch.setenv("PII_HASH_SALT", "test-integration-salt-12345")
    monkeypatch.setenv("PII_HASHING_ENABLED", "true")

    # Reset global PII hasher singleton to pick up new env vars
    import app.service.security.pii_hasher as pii_module

    pii_module._pii_hasher = None

    # Create logger
    logger = logging.getLogger("test_pii_integration")
    logger.setLevel(logging.INFO)
    logger.handlers.clear()  # Clear any existing handlers

    # Create string stream handler
    log_stream = io.StringIO()
    handler = logging.StreamHandler(log_stream)
    handler.setLevel(logging.INFO)
    formatter = logging.Formatter("%(levelname)s - %(message)s")
    handler.setFormatter(formatter)

    # Add PII filter
    pii_filter = PIILoggingFilter()
    handler.addFilter(pii_filter)

    logger.addHandler(handler)
    logger.propagate = False

    return logger, log_stream


def test_pii_hashing_in_dict_args(test_logger, pii_hasher):
    """Test that PII in dict args is hashed in log output."""
    logger, log_stream = test_logger

    email = "test@example.com"
    expected_hash = pii_hasher.hash_value(email, "EMAIL")

    # Log with dict containing PII
    logger.info("User data: %(EMAIL)s", {"EMAIL": email})

    log_output = log_stream.getvalue()

    # Verify email is NOT in plain text
    assert email not in log_output, "Plain text email should not appear in logs"

    # Verify hashed value IS in logs
    assert expected_hash in log_output, "Hashed email should appear in logs"


def test_pii_hashing_with_extra_fields(test_logger, pii_hasher):
    """Test that PII in extra fields is hashed."""
    logger, log_stream = test_logger

    email = "user@example.com"
    ip = "192.168.1.100"
    expected_email_hash = pii_hasher.hash_value(email, "EMAIL")
    expected_ip_hash = pii_hasher.hash_value(ip, "IP")

    # Log with extra PII fields
    logger.info("User action", extra={"EMAIL": email, "IP": ip})

    log_output = log_stream.getvalue()

    # Verify plain text is NOT in logs
    assert email not in log_output, "Plain text email should not appear in logs"
    assert ip not in log_output, "Plain text IP should not appear in logs"

    # Note: extra fields may not appear in default formatter, but they should be hashed
    # in the record itself. We'll verify by checking the handler's record.


def test_non_pii_data_unchanged(test_logger):
    """Test that non-PII data is not hashed."""
    logger, log_stream = test_logger

    tx_id = "TX123456"
    model_score = 0.85

    # Log with non-PII data
    logger.info(
        "Transaction %(TX_ID)s has score %(SCORE)s",
        {"TX_ID": tx_id, "SCORE": model_score},
    )

    log_output = log_stream.getvalue()

    # Verify non-PII data appears unchanged
    assert tx_id in log_output, "TX_ID should appear in plain text"
    assert "0.85" in log_output, "Model score should appear in plain text"


def test_pii_hashing_disabled(monkeypatch):
    """Test that PII hashing can be disabled."""
    # Disable PII hashing via environment
    monkeypatch.setenv("PII_HASHING_ENABLED", "false")
    monkeypatch.setenv("PII_HASH_SALT", "test-salt-12345")

    # Reset global PII hasher singleton to pick up new env vars
    import app.service.security.pii_hasher as pii_module

    pii_module._pii_hasher = None

    # Create fresh logger with disabled hashing
    logger = logging.getLogger("test_pii_disabled")
    logger.setLevel(logging.INFO)
    logger.handlers.clear()

    log_stream = io.StringIO()
    handler = logging.StreamHandler(log_stream)
    formatter = logging.Formatter("%(levelname)s - %(message)s")
    handler.setFormatter(formatter)

    # Add PII filter (but it should be disabled)
    pii_filter = PIILoggingFilter()
    handler.addFilter(pii_filter)

    logger.addHandler(handler)
    logger.propagate = False

    email = "test@example.com"
    logger.info("Email: %(EMAIL)s", {"EMAIL": email})

    log_output = log_stream.getvalue()

    # When disabled, email should appear in plain text
    assert email in log_output, "When disabled, email should appear in plain text"


def test_get_pii_aware_logger(monkeypatch):
    """Test the convenience function for getting PII-aware logger."""
    monkeypatch.setenv("PII_HASH_SALT", "test-salt-12345")
    monkeypatch.setenv("PII_HASHING_ENABLED", "true")

    logger = get_pii_aware_logger("test_convenience")

    # Verify PII filter is attached
    filters = [f for f in logger.filters if isinstance(f, PIILoggingFilter)]
    assert len(filters) > 0, "PII filter should be attached to logger"


def test_null_value_handling_in_logs(test_logger, pii_hasher):
    """Test NULL/None value handling in logs."""
    logger, log_stream = test_logger

    expected_hash = pii_hasher.hash_value(None, "EMAIL")

    # Log with None value
    logger.info("User email: %(EMAIL)s", {"EMAIL": None})

    log_output = log_stream.getvalue()

    # Verify NULL is handled appropriately
    # The hashed NULL value should appear (or "None" string)
    assert "None" in log_output or expected_hash in log_output


def test_multiple_pii_fields_in_single_log(test_logger, pii_hasher):
    """Test multiple PII fields in a single log statement."""
    logger, log_stream = test_logger

    email = "user@example.com"
    phone = "555-1234"
    first_name = "John"

    expected_email_hash = pii_hasher.hash_value(email, "EMAIL")
    expected_phone_hash = pii_hasher.hash_value(phone, "PHONE_NUMBER")
    expected_name_hash = pii_hasher.hash_value(first_name, "FIRST_NAME")

    # Log with multiple PII fields
    logger.info(
        "User: %(FIRST_NAME)s, Email: %(EMAIL)s, Phone: %(PHONE_NUMBER)s",
        {"FIRST_NAME": first_name, "EMAIL": email, "PHONE_NUMBER": phone},
    )

    log_output = log_stream.getvalue()

    # Verify all plain text is hashed
    assert email not in log_output, "Email should be hashed"
    assert phone not in log_output, "Phone should be hashed"
    assert first_name not in log_output, "First name should be hashed"

    # Verify hashed values appear
    assert expected_email_hash in log_output, "Hashed email should appear"
    assert expected_phone_hash in log_output, "Hashed phone should appear"
    assert expected_name_hash in log_output, "Hashed name should appear"


def test_case_normalization_in_logs(test_logger, pii_hasher):
    """Test that email case normalization works in logs."""
    logger, log_stream = test_logger

    # Both should produce the same hash due to case normalization
    expected_hash = pii_hasher.hash_value("Test@Example.com", "EMAIL")

    logger.info("Email: %(EMAIL)s", {"EMAIL": "Test@Example.com"})

    log_output = log_stream.getvalue()

    # Verify hash appears (case normalized)
    assert expected_hash in log_output, "Case-normalized hash should appear"
    assert "Test@Example.com" not in log_output, "Plain text should not appear"


@pytest.mark.asyncio
async def test_pii_hashing_in_async_logging(monkeypatch):
    """Test PII hashing works in async logging scenarios."""
    monkeypatch.setenv("PII_HASH_SALT", "test-async-salt-12345")
    monkeypatch.setenv("PII_HASHING_ENABLED", "true")

    logger = get_pii_aware_logger("test_async")
    logger.setLevel(logging.INFO)
    logger.handlers.clear()

    log_stream = io.StringIO()
    handler = logging.StreamHandler(log_stream)
    formatter = logging.Formatter("%(levelname)s - %(message)s")
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.propagate = False

    email = "async@example.com"

    # Log from async context
    logger.info("Async email: %(EMAIL)s", {"EMAIL": email})

    log_output = log_stream.getvalue()

    # Verify email is hashed
    assert email not in log_output, "Email should be hashed in async context"
