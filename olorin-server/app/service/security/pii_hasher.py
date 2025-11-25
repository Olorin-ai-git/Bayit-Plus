"""
PII hashing utility for privacy protection.

This module provides functionality to hash Personally Identifiable Information (PII)
before logging or sending to LLMs, ensuring GDPR/CCPA compliance.
"""

import hashlib
import logging
import os
from dataclasses import dataclass
from typing import Any, Dict, Set

logger = logging.getLogger(__name__)


@dataclass
class PIIHashConfig:
    """PII hashing configuration."""

    enabled: bool = True
    algorithm: str = "SHA256"
    salt: str = ""
    encoding: str = "utf-8"
    normalize_case: bool = True
    hash_null_values: bool = True

    def validate(self) -> None:
        """Validate configuration."""
        if self.enabled and not self.salt:
            raise ValueError("PII_HASH_SALT must be configured when hashing is enabled")
        if self.enabled and len(self.salt) < 16:
            logger.warning(
                "PII_HASH_SALT should be at least 16 characters for security"
            )
        if self.algorithm not in ["SHA256", "SHA512"]:
            raise ValueError(f"Unsupported hash algorithm: {self.algorithm}")


class PIIHasher:
    """Hash PII fields for privacy protection."""

    # PII field definitions
    TIER1_PII_FIELDS = {
        "EMAIL",
        "PHONE_NUMBER",
        "FIRST_NAME",
        "LAST_NAME",
        "UNIQUE_USER_ID",
        "DATE_OF_BIRTH",
    }

    TIER2_PII_FIELDS = {"IP", "DEVICE_ID", "USER_AGENT", "VISITOR_ID"}

    TIER3_PII_FIELDS = {
        "CARD_BIN",
        "LAST_FOUR",
        "BILLING_ADDRESS_LINE_1",
        "SHIPPING_ADDRESS_LINE_1",
    }

    ALL_PII_FIELDS = TIER1_PII_FIELDS | TIER2_PII_FIELDS | TIER3_PII_FIELDS

    def __init__(self, config: PIIHashConfig = None):
        if config is None:
            # Load from environment
            config = PIIHashConfig(
                enabled=os.getenv("PII_HASHING_ENABLED", "true").lower() == "true",
                algorithm=os.getenv("PII_HASH_ALGORITHM", "SHA256"),
                salt=os.getenv("PII_HASH_SALT", ""),
            )

        self.config = config
        self.config.validate()

    def hash_value(self, value: Any, field_name: str = None) -> str:
        """
        Hash a single PII value.

        Args:
            value: The value to hash
            field_name: Optional field name for context

        Returns:
            Hashed value as hex string
        """
        if not self.config.enabled:
            return str(value)

        # Handle None/NULL
        if value is None:
            if self.config.hash_null_values:
                value = "NULL"
            else:
                return "NULL"

        # Convert to string
        str_value = str(value)

        # Normalize case for consistency (emails, etc.)
        if (
            self.config.normalize_case
            and field_name
            and field_name.upper() in {"EMAIL"}
        ):
            str_value = str_value.lower()

        # Hash with salt
        salted_value = f"{self.config.salt}{str_value}"
        hash_bytes = salted_value.encode(self.config.encoding)

        if self.config.algorithm == "SHA256":
            hash_obj = hashlib.sha256(hash_bytes)
        elif self.config.algorithm == "SHA512":
            hash_obj = hashlib.sha512(hash_bytes)
        else:
            raise ValueError(f"Unsupported algorithm: {self.config.algorithm}")

        return hash_obj.hexdigest()

    def hash_dict(self, data: Dict[str, Any], tier: int = 3) -> Dict[str, Any]:
        """
        Hash all PII fields in a dictionary.

        Args:
            data: Dictionary containing data
            tier: Maximum tier to hash (1=Tier1 only, 2=Tier1+2, 3=All)

        Returns:
            Dictionary with PII fields hashed
        """
        if not self.config.enabled:
            return data

        # Determine which fields to hash based on tier
        fields_to_hash = set()
        if tier >= 1:
            fields_to_hash |= self.TIER1_PII_FIELDS
        if tier >= 2:
            fields_to_hash |= self.TIER2_PII_FIELDS
        if tier >= 3:
            fields_to_hash |= self.TIER3_PII_FIELDS

        # Hash PII fields
        hashed_data = data.copy()
        for key, value in data.items():
            key_upper = key.upper()
            if key_upper in fields_to_hash:
                hashed_data[key] = self.hash_value(value, key_upper)

        return hashed_data

    def is_pii_field(self, field_name: str) -> bool:
        """Check if a field name is PII."""
        return field_name.upper() in self.ALL_PII_FIELDS


# Global instance
_pii_hasher = None


def get_pii_hasher() -> PIIHasher:
    """Get global PII hasher instance (singleton)."""
    global _pii_hasher
    if _pii_hasher is None:
        _pii_hasher = PIIHasher()
    return _pii_hasher
