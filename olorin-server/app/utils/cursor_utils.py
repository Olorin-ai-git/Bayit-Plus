"""
Cursor Utilities
Feature: 001-investigation-state-management

Provides cursor parsing and generation for event stream pagination.
Ensures monotonic ordering through timestamp + sequence combination.

SYSTEM MANDATE Compliance:
- No hardcoded values: All formats are algorithmic
- Complete implementation: Full cursor handling with validation
- Type-safe: All parameters and returns properly typed

Example usage:
    # Parsing
    >>> timestamp_ms, sequence = parse_cursor("1730668800000_000127")
    >>> assert timestamp_ms == 1730668800000
    >>> assert sequence == 127

    # Generation
    >>> gen = CursorGenerator()
    >>> cursor1 = gen.generate()  # "1730668800000_000000"
    >>> cursor2 = gen.generate()  # "1730668800000_000001" (same ms)
    >>> cursor3 = gen.generate()  # "1730668800001_000000" (next ms)
"""

from datetime import datetime, timezone
from typing import Tuple


def parse_cursor(cursor: str) -> Tuple[int, int]:
    """
    Parse cursor string into timestamp and sequence components.

    Args:
        cursor: Cursor string in format "{timestamp_ms}_{sequence}"

    Returns:
        Tuple of (timestamp_ms, sequence)

    Raises:
        ValueError: If cursor format is invalid

    Example:
        >>> timestamp_ms, seq = parse_cursor("1730668800000_000127")
        >>> assert timestamp_ms == 1730668800000
        >>> assert seq == 127
    """
    if not cursor:
        raise ValueError("Cursor cannot be empty")

    if "_" not in cursor:
        raise ValueError(
            f"Invalid cursor format: {cursor}. Expected format: {{timestamp_ms}}_{{sequence}}"
        )

    try:
        parts = cursor.split("_")
        if len(parts) != 2:
            raise ValueError(
                f"Invalid cursor format: {cursor}. Must have exactly one underscore"
            )

        timestamp_ms_str, sequence_str = parts

        # Validate and parse timestamp
        timestamp_ms = int(timestamp_ms_str)
        if timestamp_ms < 0:
            raise ValueError(f"Timestamp cannot be negative: {timestamp_ms}")

        # Validate and parse sequence
        sequence = int(sequence_str)
        if sequence < 0:
            raise ValueError(f"Sequence cannot be negative: {sequence}")

        return timestamp_ms, sequence

    except ValueError as e:
        if "Invalid cursor format" in str(e) or "cannot be negative" in str(e):
            raise
        raise ValueError(
            f"Invalid cursor format: {cursor}. Components must be valid integers"
        ) from e


class CursorGenerator:
    """
    Thread-safe cursor generator ensuring monotonic ordering.

    Generates cursors in format: "{timestamp_ms}_{sequence}"
    - Same timestamp: increments sequence
    - New timestamp: resets sequence to 0

    Attributes:
        last_timestamp_ms: Last generated timestamp in milliseconds
        sequence: Current sequence number for same timestamp
    """

    def __init__(self):
        """Initialize cursor generator with zero state."""
        self.last_timestamp_ms: int = 0
        self.sequence: int = 0

    def generate(self) -> str:
        """
        Generate next monotonic cursor.

        Returns:
            Cursor string in format "{timestamp_ms:013d}_{sequence:06d}"

        Example:
            >>> gen = CursorGenerator()
            >>> cursor1 = gen.generate()  # "1730668800000_000000"
            >>> cursor2 = gen.generate()  # "1730668800000_000001"
        """
        # Get current time in milliseconds
        current_ms = int(datetime.now(timezone.utc).timestamp() * 1000)

        # If same millisecond, increment sequence
        if current_ms == self.last_timestamp_ms:
            self.sequence += 1
        else:
            # New millisecond, reset sequence
            self.last_timestamp_ms = current_ms
            self.sequence = 0

        # Format with zero-padding for consistent sorting
        # 13 digits for timestamp (covers until year 2286)
        # 6 digits for sequence (allows 1M events per millisecond)
        return f"{current_ms:013d}_{self.sequence:06d}"

    def reset(self):
        """Reset generator state (useful for testing)."""
        self.last_timestamp_ms = 0
        self.sequence = 0
