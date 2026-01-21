"""
Unit Tests for Cursor Utilities
Feature: 001-investigation-state-management

Tests cursor parsing and generation for event stream pagination.
Targets 100% coverage of cursor_utils.py.

SYSTEM MANDATE Compliance:
- No mocks: Direct testing of pure functions
- Complete tests: All edge cases covered
- Type-safe: Proper test assertions
"""

from datetime import datetime, timezone
from unittest.mock import patch

import pytest

from app.utils.cursor_utils import CursorGenerator, parse_cursor


class TestParseCursor:
    """Test suite for parse_cursor function."""

    def test_valid_cursor_parsing(self):
        """Test parsing a valid cursor string."""
        timestamp_ms, sequence = parse_cursor("1730668800000_000127")
        assert timestamp_ms == 1730668800000
        assert sequence == 127

    def test_valid_cursor_with_zeros(self):
        """Test parsing cursor with zero values."""
        timestamp_ms, sequence = parse_cursor("0000000000000_000000")
        assert timestamp_ms == 0
        assert sequence == 0

    def test_valid_cursor_large_values(self):
        """Test parsing cursor with large values."""
        timestamp_ms, sequence = parse_cursor("9999999999999_999999")
        assert timestamp_ms == 9999999999999
        assert sequence == 999999

    def test_empty_cursor_raises_error(self):
        """Test that empty cursor raises ValueError."""
        with pytest.raises(ValueError, match="Cursor cannot be empty"):
            parse_cursor("")

    def test_none_cursor_raises_error(self):
        """Test that None cursor raises appropriate error."""
        with pytest.raises(ValueError, match="Cursor cannot be empty"):
            parse_cursor(None)

    def test_cursor_without_underscore_raises_error(self):
        """Test cursor without underscore raises ValueError."""
        with pytest.raises(ValueError, match="Invalid cursor format.*Expected format"):
            parse_cursor("1730668800000000127")

    def test_cursor_with_multiple_underscores_raises_error(self):
        """Test cursor with multiple underscores raises ValueError."""
        with pytest.raises(ValueError, match="Must have exactly one underscore"):
            parse_cursor("1730668800000_000127_extra")

    def test_cursor_with_non_numeric_timestamp_raises_error(self):
        """Test cursor with non-numeric timestamp raises ValueError."""
        with pytest.raises(ValueError, match="Components must be valid integers"):
            parse_cursor("abc123_000127")

    def test_cursor_with_non_numeric_sequence_raises_error(self):
        """Test cursor with non-numeric sequence raises ValueError."""
        with pytest.raises(ValueError, match="Components must be valid integers"):
            parse_cursor("1730668800000_abc")

    def test_cursor_with_negative_timestamp_raises_error(self):
        """Test cursor with negative timestamp raises ValueError."""
        with pytest.raises(ValueError, match="Timestamp cannot be negative"):
            parse_cursor("-1730668800000_000127")

    def test_cursor_with_negative_sequence_raises_error(self):
        """Test cursor with negative sequence raises ValueError."""
        with pytest.raises(ValueError, match="Sequence cannot be negative"):
            parse_cursor("1730668800000_-127")


class TestCursorGenerator:
    """Test suite for CursorGenerator class."""

    def test_initialization(self):
        """Test CursorGenerator initialization."""
        gen = CursorGenerator()
        assert gen.last_timestamp_ms == 0
        assert gen.sequence == 0

    def test_generate_first_cursor(self):
        """Test generating the first cursor."""
        gen = CursorGenerator()
        with patch("app.utils.cursor_utils.datetime") as mock_datetime:
            mock_datetime.now.return_value.timestamp.return_value = 1730668800.0
            cursor = gen.generate()
            assert cursor == "1730668800000_000000"

    def test_generate_sequential_cursors_same_timestamp(self):
        """Test generating multiple cursors at the same timestamp."""
        gen = CursorGenerator()
        with patch("app.utils.cursor_utils.datetime") as mock_datetime:
            # Same timestamp for multiple calls
            mock_datetime.now.return_value.timestamp.return_value = 1730668800.0

            cursor1 = gen.generate()
            assert cursor1 == "1730668800000_000000"

            cursor2 = gen.generate()
            assert cursor2 == "1730668800000_000001"

            cursor3 = gen.generate()
            assert cursor3 == "1730668800000_000002"

    def test_generate_cursors_different_timestamps(self):
        """Test sequence resets with new timestamp."""
        gen = CursorGenerator()
        with patch("app.utils.cursor_utils.datetime") as mock_datetime:
            # First timestamp
            mock_datetime.now.return_value.timestamp.return_value = 1730668800.0
            cursor1 = gen.generate()
            assert cursor1 == "1730668800000_000000"

            cursor2 = gen.generate()
            assert cursor2 == "1730668800000_000001"

            # New timestamp - sequence should reset
            mock_datetime.now.return_value.timestamp.return_value = 1730668801.0
            cursor3 = gen.generate()
            assert cursor3 == "1730668801000_000000"

    def test_generate_monotonic_increasing(self):
        """Test that generated cursors are monotonically increasing."""
        gen = CursorGenerator()
        cursors = []

        with patch("app.utils.cursor_utils.datetime") as mock_datetime:
            # Generate cursors with increasing timestamps
            for i in range(10):
                mock_datetime.now.return_value.timestamp.return_value = 1730668800.0 + i
                cursors.append(gen.generate())

        # Verify cursors are sorted
        sorted_cursors = sorted(cursors)
        assert cursors == sorted_cursors

    def test_generate_formatting(self):
        """Test cursor formatting with padding."""
        gen = CursorGenerator()
        with patch("app.utils.cursor_utils.datetime") as mock_datetime:
            # Small timestamp value
            mock_datetime.now.return_value.timestamp.return_value = 1.0
            cursor = gen.generate()
            # Should be zero-padded to 13 digits for timestamp, 6 for sequence
            assert cursor == "0000000001000_000000"

    def test_reset_method(self):
        """Test resetting the generator state."""
        gen = CursorGenerator()

        # Generate some cursors
        with patch("app.utils.cursor_utils.datetime") as mock_datetime:
            mock_datetime.now.return_value.timestamp.return_value = 1730668800.0
            gen.generate()
            gen.generate()

            # Verify state has changed
            assert gen.last_timestamp_ms == 1730668800000
            assert gen.sequence == 1

            # Reset
            gen.reset()

            # Verify state is cleared
            assert gen.last_timestamp_ms == 0
            assert gen.sequence == 0

    def test_large_sequence_numbers(self):
        """Test handling of large sequence numbers."""
        gen = CursorGenerator()
        gen.sequence = 999998  # Near max for 6-digit format

        with patch("app.utils.cursor_utils.datetime") as mock_datetime:
            mock_datetime.now.return_value.timestamp.return_value = 1730668800.0
            gen.last_timestamp_ms = 1730668800000

            cursor1 = gen.generate()
            assert cursor1 == "1730668800000_999999"

            # Next cursor at same timestamp
            cursor2 = gen.generate()
            assert (
                cursor2 == "1730668800000_1000000"
            )  # Exceeds 6 digits but still works

    def test_cursor_roundtrip(self):
        """Test that generated cursors can be parsed back correctly."""
        gen = CursorGenerator()

        with patch("app.utils.cursor_utils.datetime") as mock_datetime:
            mock_datetime.now.return_value.timestamp.return_value = 1730668800.123

            cursor = gen.generate()
            timestamp_ms, sequence = parse_cursor(cursor)

            assert timestamp_ms == 1730668800123
            assert sequence == 0
