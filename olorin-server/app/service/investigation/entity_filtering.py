"""
Entity Filtering Service

Normalizes entity values and builds WHERE clauses for database queries.
Supports email, phone, device_id, ip, account_id, card_fingerprint, merchant_id.

Constitutional Compliance:
- All normalization logic explicit, no hardcoded business rules
- Supports both Snowflake and PostgreSQL column naming
- PII handling: case-insensitive email, E164 phone format
"""

import os
import re
from typing import Dict, List, Optional, Tuple

from app.service.logging import get_bridge_logger

from .phone_normalization import normalize_phone_to_e164

logger = get_bridge_logger(__name__)


def normalize_entity_value(entity_type: str, entity_value: str) -> str:
    """
    Normalize entity value based on entity type.

    Args:
        entity_type: Type of entity (email, phone, etc.)
        entity_value: Raw entity value

    Returns:
        Normalized entity value

    Raises:
        ValueError: If normalization fails or value is invalid
    """
    entity_type_lower = entity_type.lower()

    if entity_type_lower == "email":
        return entity_value.lower().strip()

    elif entity_type_lower == "phone":
        normalized = normalize_phone_to_e164(entity_value)
        if not normalized:
            raise ValueError(f"Invalid phone number format: {entity_value}")
        return normalized

    elif entity_type_lower == "card_fingerprint":
        # Validate format: BIN|last4 or BIN-last4
        if "|" in entity_value:
            parts = entity_value.split("|")
        elif "-" in entity_value:
            parts = entity_value.split("-")
        else:
            raise ValueError(
                f"card_fingerprint must be in format 'BIN|last4' or 'BIN-last4', got: {entity_value}"
            )
        if len(parts) != 2:
            raise ValueError(
                f"card_fingerprint must contain exactly 2 parts (BIN and last4), got: {entity_value}"
            )
        return entity_value  # Return as-is, parsing happens in WHERE clause builder

    else:
        # device_id, ip, account_id, merchant_id: return as-is
        return entity_value.strip()


def build_entity_where_clause(
    entity_type: Optional[str], entity_value: Optional[str], is_snowflake: bool = True
) -> Tuple[str, Optional[Dict[str, str]]]:
    """
    Build WHERE clause for entity filtering.

    Args:
        entity_type: Entity type (email, phone, etc.)
        entity_value: Normalized entity value
        is_snowflake: True for Snowflake (uppercase columns), False for PostgreSQL

    Returns:
        Tuple of (WHERE clause string, params dict for parameterized queries)
    """
    if not entity_type or not entity_value:
        return "", None

    entity_type_lower = entity_type.lower()
    normalized_value = normalize_entity_value(entity_type_lower, entity_value)

    # Column name mapping
    if is_snowflake:
        columns = {
            "email": "EMAIL",  # Use EMAIL instead of EMAIL_NORMALIZED to match investigation queries
            "phone": "PHONE_NUMBER",
            "device_id": "DEVICE_ID",
            "ip": "IP",
            "account_id": "ACCOUNT_ID",
            "card_fingerprint": None,  # Special handling
            "merchant_id": "STORE_ID",
        }
    else:
        columns = {
            "email": "email_normalized",
            "phone": "phone_number",
            "device_id": "device_id",
            "ip": "ip",
            "account_id": "account_id",
            "card_fingerprint": None,  # Special handling
            "merchant_id": "store_id",
        }

    column = columns.get(entity_type_lower)
    if not column:
        raise ValueError(f"Unsupported entity type: {entity_type}")

    # Special handling for card_fingerprint
    if entity_type_lower == "card_fingerprint":
        if "|" in normalized_value:
            bin_part, last4_part = normalized_value.split("|", 1)
        elif "-" in normalized_value:
            bin_part, last4_part = normalized_value.split("-", 1)
        else:
            raise ValueError(f"Invalid card_fingerprint format: {normalized_value}")

        if is_snowflake:
            clause = f"CARD_BIN = '{bin_part}' AND LAST_FOUR = '{last4_part}'"
        else:
            clause = "card_bin = $1 AND last_four = $2"
            params = {"bin": bin_part, "last_four": last4_part}
            return clause, params

        return clause, None

    # Standard entity matching
    if is_snowflake:
        # Snowflake: direct string interpolation (no parameterized queries)
        # For email, use case-insensitive matching with LOWER() to match normalized value
        if entity_type_lower == "email":
            clause = f"LOWER({column}) = '{normalized_value}'"
        else:
            clause = f"{column} = '{normalized_value}'"
        return clause, None
    else:
        # PostgreSQL: parameterized query
        clause = f"{column} = $1"
        params = {entity_type_lower: normalized_value}
        return clause, params


def build_merchant_where_clause(
    merchant_ids: Optional[List[str]], is_snowflake: bool = True
) -> Tuple[str, Optional[Dict[str, List[str]]]]:
    """
    Build WHERE clause for merchant filtering.

    Args:
        merchant_ids: List of merchant IDs to filter
        is_snowflake: True for Snowflake, False for PostgreSQL

    Returns:
        Tuple of (WHERE clause string, params dict)
    """
    if not merchant_ids:
        return "", None

    column = "STORE_ID" if is_snowflake else "store_id"
    merchant_list = "', '".join(merchant_ids)

    if is_snowflake:
        clause = f"{column} IN ('{merchant_list}')"
        return clause, None
    else:
        clause = f"{column} = ANY($1)"
        params = {"merchant_ids": merchant_ids}
        return clause, params
