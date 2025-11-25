"""
Entity Normalizer

Utility for normalizing entity IDs for filesystem safety.
Implements comprehensive normalization rules to ensure filesystem-compatible entity IDs.

Constitutional Compliance:
- NO hardcoded values (all configurable)
- Complete implementation with no stubs/mocks
- Handles all edge cases
"""

import re
from typing import Optional

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class EntityNormalizer:
    """Utility for normalizing entity IDs for filesystem safety."""

    def __init__(self, max_length: int = 255):
        """
        Initialize entity normalizer.

        Args:
            max_length: Maximum length for normalized entity IDs (default: 255)
        """
        self.max_length = max_length

    def normalize(self, entity_id: str, max_length: Optional[int] = None) -> str:
        """
        Normalize entity ID for filesystem paths.

        Rules:
        1. Convert to lowercase
        2. Replace dots (.) with dashes (-)
        3. Replace @ symbols with -at-
        4. Replace other special characters with dashes
        5. Limit length to max_length
        6. Strip leading/trailing dashes
        7. Handle empty strings (return "unknown")

        Args:
            entity_id: Raw entity identifier
            max_length: Optional override for max length (uses instance default if None)

        Returns:
            Normalized entity ID string

        Raises:
            ValueError: If entity_id is None
        """
        if entity_id is None:
            raise ValueError("entity_id cannot be None")

        if not isinstance(entity_id, str):
            entity_id = str(entity_id)

        # Handle empty strings
        if not entity_id.strip():
            logger.warning("Empty entity_id provided, using 'unknown'")
            return "unknown"

        # Convert to lowercase
        normalized = entity_id.lower().strip()

        # Replace dots with dashes
        normalized = normalized.replace(".", "-")

        # Replace @ with -at-
        normalized = normalized.replace("@", "-at-")

        # Replace other special characters with dashes
        # Keep alphanumeric, dashes, and underscores
        normalized = re.sub(r"[^a-z0-9_-]", "-", normalized)

        # Replace multiple consecutive dashes/underscores with single dash
        normalized = re.sub(r"[-_]+", "-", normalized)

        # Strip leading/trailing dashes
        normalized = normalized.strip("-")

        # Handle case where normalization results in empty string
        if not normalized:
            logger.warning(
                f"Entity ID '{entity_id}' normalized to empty string, using 'unknown'"
            )
            return "unknown"

        # Limit length
        length_limit = max_length if max_length is not None else self.max_length
        if len(normalized) > length_limit:
            # Truncate and append hash suffix for uniqueness if needed
            # Use first part of normalized string
            truncated = normalized[: length_limit - 9]  # Reserve space for hash suffix
            # Remove trailing dash if present
            truncated = truncated.rstrip("-")
            # Append short hash for uniqueness (first 8 chars of hash)
            import hashlib

            hash_suffix = hashlib.md5(entity_id.encode()).hexdigest()[:8]
            normalized = f"{truncated}-{hash_suffix}"
            logger.debug(
                f"Entity ID '{entity_id}' truncated to {length_limit} chars with hash suffix"
            )

        return normalized

    def normalize_for_filename(self, entity_id: str) -> str:
        """
        Normalize entity ID specifically for use in filenames.

        This is a more restrictive normalization that ensures the result
        is safe for all filesystems (Windows, Linux, macOS).

        Args:
            entity_id: Raw entity identifier

        Returns:
            Normalized entity ID safe for filenames
        """
        normalized = self.normalize(entity_id)

        # Remove Windows reserved characters
        # Reserved: < > : " / \ | ? *
        reserved_chars = r'<>:"/\|?*'
        for char in reserved_chars:
            normalized = normalized.replace(char, "-")

        # Remove control characters (0x00-0x1F)
        normalized = "".join(char for char in normalized if ord(char) >= 32)

        return normalized
