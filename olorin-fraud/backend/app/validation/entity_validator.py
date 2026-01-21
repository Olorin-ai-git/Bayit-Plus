"""
Entity ID Validator
Feature: 006-hybrid-graph-integration

Validates entity IDs based on entity type with format-specific rules.
Supports: user (email), device (UUID), IP (IP address), transaction (alphanumeric).

SYSTEM MANDATE Compliance:
- Configuration-driven: No hardcoded validation rules where possible
- Complete implementation: No placeholders or TODOs
- Type-safe: Comprehensive validation with clear error messages
"""

import ipaddress
import re
from typing import Literal

from fastapi import HTTPException, status


class EntityValidator:
    """
    Validator for entity IDs based on entity type.
    Ensures format compliance before investigation creation.
    """

    def validate(
        self,
        entity_type: Literal["user", "device", "ip", "transaction"],
        entity_id: str,
    ) -> None:
        """
        Validate entity ID format based on entity type.

        Args:
            entity_type: Type of entity (user, device, ip, transaction)
            entity_id: Entity identifier to validate

        Raises:
            HTTPException: 400 if validation fails with specific error message
        """
        if not entity_id or not entity_id.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Entity ID cannot be empty for entity_type '{entity_type}'",
            )

        validator_map = {
            "user": self._validate_user_id,
            "device": self._validate_device_id,
            "ip": self._validate_ip_address,
            "transaction": self._validate_transaction_id,
        }

        validator = validator_map.get(entity_type)
        if not validator:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported entity_type: '{entity_type}'",
            )

        validator(entity_id)

    def _validate_user_id(self, entity_id: str) -> None:
        """Validate user entity ID (email format)."""
        if "@" not in entity_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"User entity_id must be a valid email address (got: '{entity_id}')",
            )

        local_part, domain_part = entity_id.rsplit("@", 1)

        if not local_part or not domain_part:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid email format: '{entity_id}'",
            )

        if "." not in domain_part:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Email domain must contain at least one dot (got: '{entity_id}')",
            )

        if len(entity_id) > 255:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Email address too long (max 255 characters)",
            )

    def _validate_device_id(self, entity_id: str) -> None:
        """Validate device entity ID (UUID format)."""
        uuid_pattern = r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"

        if not re.match(uuid_pattern, entity_id.lower()):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Device entity_id must be a valid UUID format "
                    f"(e.g., '550e8400-e29b-41d4-a716-446655440000', got: '{entity_id}')"
                ),
            )

    def _validate_ip_address(self, entity_id: str) -> None:
        """Validate IP entity ID (IPv4 or IPv6 address)."""
        try:
            ipaddress.ip_address(entity_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"IP entity_id must be a valid IPv4 or IPv6 address "
                    f"(got: '{entity_id}')"
                ),
            )

    def _validate_transaction_id(self, entity_id: str) -> None:
        """Validate transaction entity ID (alphanumeric only)."""
        if not entity_id.isalnum():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Transaction entity_id must contain only alphanumeric characters "
                    f"(got: '{entity_id}')"
                ),
            )

        if len(entity_id) > 255:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Transaction ID too long (max 255 characters)",
            )
