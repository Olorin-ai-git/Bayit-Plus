"""
PII Redaction Patterns
Feature: 021-live-merged-logstream

Regex patterns for detecting and redacting personally identifiable information (PII)
in log messages. Patterns are configuration-driven and environment-aware.

Author: Gil Klainert
Date: 2025-11-12
Spec: /specs/021-live-merged-logstream/research.md
"""

import re
from typing import Dict, Pattern
from pydantic import BaseSettings, Field


class PIIRedactionConfig(BaseSettings):
    """
    Configuration for PII redaction patterns.

    All patterns can be enabled/disabled via environment variables.
    Replacement tokens are configurable for audit trail purposes.
    """

    enable_email_redaction: bool = Field(
        default=True,
        env="PII_REDACT_EMAILS"
    )
    enable_ssn_redaction: bool = Field(
        default=True,
        env="PII_REDACT_SSN"
    )
    enable_credit_card_redaction: bool = Field(
        default=True,
        env="PII_REDACT_CREDIT_CARDS"
    )
    enable_phone_redaction: bool = Field(
        default=True,
        env="PII_REDACT_PHONES"
    )
    enable_ip_redaction: bool = Field(
        default=False,
        env="PII_REDACT_IPS"
    )
    enable_api_key_redaction: bool = Field(
        default=True,
        env="PII_REDACT_API_KEYS"
    )

    email_replacement: str = Field(
        default="[EMAIL_REDACTED]",
        env="PII_EMAIL_REPLACEMENT"
    )
    ssn_replacement: str = Field(
        default="[SSN_REDACTED]",
        env="PII_SSN_REPLACEMENT"
    )
    credit_card_replacement: str = Field(
        default="[CC_REDACTED]",
        env="PII_CC_REPLACEMENT"
    )
    phone_replacement: str = Field(
        default="[PHONE_REDACTED]",
        env="PII_PHONE_REPLACEMENT"
    )
    ip_replacement: str = Field(
        default="[IP_REDACTED]",
        env="PII_IP_REPLACEMENT"
    )
    api_key_replacement: str = Field(
        default="[API_KEY_REDACTED]",
        env="PII_API_KEY_REPLACEMENT"
    )

    class Config:
        env_file = ".env"


EMAIL_PATTERN = re.compile(
    r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
)

SSN_PATTERN = re.compile(
    r'\b\d{3}-\d{2}-\d{4}\b|\b\d{9}\b'
)

CREDIT_CARD_PATTERN = re.compile(
    r'\b(?:\d{4}[-\s]?){3}\d{4}\b'
)

PHONE_PATTERN = re.compile(
    r'\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b'
)

IP_ADDRESS_PATTERN = re.compile(
    r'\b(?:\d{1,3}\.){3}\d{1,3}\b'
)

API_KEY_PATTERN = re.compile(
    r'\b(?:api[_-]?key|token|secret|password|passwd|auth)["\']?\s*[:=]\s*["\']?([A-Za-z0-9_\-]{20,})["\']?\b',
    re.IGNORECASE
)


def get_redaction_patterns(config: PIIRedactionConfig) -> Dict[str, tuple[Pattern, str]]:
    """
    Build active redaction patterns based on configuration.

    Returns dictionary mapping pattern names to (compiled_regex, replacement) tuples.
    Only includes patterns that are enabled in configuration.

    Args:
        config: PII redaction configuration

    Returns:
        Dictionary of active patterns
    """
    patterns: Dict[str, tuple[Pattern, str]] = {}

    if config.enable_email_redaction:
        patterns['email'] = (EMAIL_PATTERN, config.email_replacement)

    if config.enable_ssn_redaction:
        patterns['ssn'] = (SSN_PATTERN, config.ssn_replacement)

    if config.enable_credit_card_redaction:
        patterns['credit_card'] = (CREDIT_CARD_PATTERN, config.credit_card_replacement)

    if config.enable_phone_redaction:
        patterns['phone'] = (PHONE_PATTERN, config.phone_replacement)

    if config.enable_ip_redaction:
        patterns['ip_address'] = (IP_ADDRESS_PATTERN, config.ip_replacement)

    if config.enable_api_key_redaction:
        patterns['api_key'] = (API_KEY_PATTERN, config.api_key_replacement)

    return patterns
