"""
Time Range Validator
Feature: 006-hybrid-graph-integration

Validates investigation time ranges with business rules.
Ensures: start < end, not in future, max 90 days duration.

SYSTEM MANDATE Compliance:
- Configuration-driven: Max duration from config
- Complete implementation: No placeholders or TODOs
- Type-safe: Comprehensive validation with clear error messages
"""

from datetime import datetime, timedelta

from fastapi import HTTPException, status


class TimeRangeValidator:
    """
    Validator for investigation time ranges.
    Enforces temporal business rules and limits.
    """

    def __init__(self, max_duration_days: int = 90):
        """
        Initialize validator with configuration.

        Args:
            max_duration_days: Maximum allowed time range duration in days
        """
        self.max_duration_days = max_duration_days

    def validate(self, start: datetime, end: datetime) -> None:
        """
        Validate investigation time range.

        Args:
            start: Investigation start time
            end: Investigation end time

        Raises:
            HTTPException: 400 if validation fails with specific error message
        """
        self._validate_not_none(start, end)
        self._validate_start_before_end(start, end)
        self._validate_not_future(start, end)
        self._validate_duration(start, end)

    def _validate_not_none(self, start: datetime, end: datetime) -> None:
        """Ensure both timestamps are provided."""
        if start is None or end is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Both start and end times are required",
            )

    def _validate_start_before_end(self, start: datetime, end: datetime) -> None:
        """Ensure start time is before end time."""
        if start >= end:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Investigation start time must be before end time "
                    f"(start: {start.isoformat()}, end: {end.isoformat()})"
                ),
            )

    def _validate_not_future(self, start: datetime, end: datetime) -> None:
        """Ensure timestamps are not in the future."""
        now = datetime.now(start.tzinfo) if start.tzinfo else datetime.utcnow()

        if start > now:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Investigation start time cannot be in the future "
                    f"(start: {start.isoformat()}, now: {now.isoformat()})"
                ),
            )

        if end > now:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Investigation end time cannot be in the future "
                    f"(end: {end.isoformat()}, now: {now.isoformat()})"
                ),
            )

    def _validate_duration(self, start: datetime, end: datetime) -> None:
        """Ensure time range duration does not exceed maximum."""
        duration = end - start
        max_duration = timedelta(days=self.max_duration_days)

        if duration > max_duration:
            duration_days = duration.days

            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Investigation time range exceeds maximum duration "
                    f"(requested: {duration_days} days, maximum: {self.max_duration_days} days)"
                ),
            )
