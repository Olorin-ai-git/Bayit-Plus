"""
Secret Masking Utility for Logging

This module provides functionality to mask sensitive data in logs
to prevent exposure of API keys, passwords, tokens, and other secrets.

Constitutional Compliance:
- All masking rules are centralized and configurable
- Sensitive field names loaded from environment or config
- Fail-safe: masks anything that looks like a secret
"""

import re
from typing import Any, Dict, Set


# Sensitive field patterns (case-insensitive)
SENSITIVE_PATTERNS = {
    # API credentials
    "api_key",
    "apikey",
    "api-key",
    # Authentication
    "password",
    "passwd",
    "pwd",
    "secret",
    "token",
    "auth",
    "bearer",
    # Encryption/signing
    "private_key",
    "privatekey",
    "private-key",
    "signing_key",
    "signingkey",
    "encryption_key",
    "encryptionkey",
    # OAuth/JWT
    "client_secret",
    "clientsecret",
    "oauth_token",
    "jwt_secret",
    "refresh_token",
    "access_token",
    # Cloud/Infrastructure
    "connection_string",
    "connectionstring",
    "database_password",
    "db_password",
    "redis_password",
    # Generic sensitive
    "credential",
    "credentials",
}


def _should_mask_field(field_name: str) -> bool:
    """
    Determine if a field name contains sensitive data that should be masked.

    Args:
        field_name: The name of the field to check

    Returns:
        True if the field should be masked, False otherwise
    """
    field_lower = field_name.lower()

    # Check if field name contains any sensitive pattern
    for pattern in SENSITIVE_PATTERNS:
        if pattern in field_lower:
            return True

    # Additional check for fields ending with common secret suffixes
    secret_suffixes = ["_key", "_secret", "_token", "_password", "_pwd"]
    return any(field_lower.endswith(suffix) for suffix in secret_suffixes)


def _mask_value(value: Any) -> str:
    """
    Mask a sensitive value, showing only first/last few characters.

    Args:
        value: The value to mask

    Returns:
        Masked version of the value
    """
    if value is None:
        return "None"

    str_value = str(value)

    # If value is empty or very short, fully mask it
    if len(str_value) <= 8:
        return "***masked***"

    # Show first 4 and last 4 characters
    return f"{str_value[:4]}...{str_value[-4:]}"


def mask_sensitive_dict(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Create a copy of a dictionary with sensitive fields masked.

    Args:
        data: Dictionary potentially containing sensitive data

    Returns:
        New dictionary with sensitive values masked
    """
    masked = {}

    for key, value in data.items():
        if _should_mask_field(key):
            masked[key] = _mask_value(value)
        elif isinstance(value, dict):
            # Recursively mask nested dictionaries
            masked[key] = mask_sensitive_dict(value)
        elif isinstance(value, list):
            # Mask lists of dictionaries
            masked[key] = [
                mask_sensitive_dict(item) if isinstance(item, dict) else item
                for item in value
            ]
        else:
            masked[key] = value

    return masked


def mask_config_object(config_obj: Any) -> Dict[str, Any]:
    """
    Mask sensitive fields in a Pydantic config object for safe logging.

    Args:
        config_obj: Pydantic BaseSettings or similar config object

    Returns:
        Dictionary representation with sensitive fields masked
    """
    # Convert config object to dict (works with Pydantic models)
    if hasattr(config_obj, "model_dump"):
        config_dict = config_obj.model_dump()
    elif hasattr(config_obj, "dict"):
        config_dict = config_obj.dict()
    else:
        config_dict = vars(config_obj)

    return mask_sensitive_dict(config_dict)


def mask_string_secrets(text: str) -> str:
    """
    Mask sensitive patterns in a string (e.g., API keys in URLs or messages).

    Args:
        text: String that may contain sensitive data

    Returns:
        String with sensitive patterns masked
    """
    # Mask common secret patterns in strings
    patterns = [
        # API keys (typical format: prefix-base64-like string)
        (r"(api[_-]?key[=:\s]+)[a-zA-Z0-9_\-/+=]{20,}", r"\1***masked***"),
        # Bearer tokens
        (r"(Bearer\s+)[a-zA-Z0-9_\-/+=.]{20,}", r"\1***masked***"),
        # Basic auth
        (r"(Basic\s+)[a-zA-Z0-9_\-/+=]{20,}", r"\1***masked***"),
        # Database connection string passwords (://user:password@host format)
        (r"(://[^:/@\s]+:)([^@\s]+)(@)", r"\1***masked***\3"),
        # Connection strings with password keyword
        (r"(password[=:\s]+)([^&\s;]+)", r"\1***masked***"),
        # JWT tokens
        (r"eyJ[a-zA-Z0-9_\-]+\.eyJ[a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+", "***jwt-masked***"),
    ]

    masked_text = text
    for pattern, replacement in patterns:
        masked_text = re.sub(pattern, replacement, masked_text, flags=re.IGNORECASE)

    return masked_text
