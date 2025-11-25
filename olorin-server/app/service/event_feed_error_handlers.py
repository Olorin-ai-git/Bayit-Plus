"""
Event Feed Error Handlers
Feature: 001-investigation-state-management

Centralized error handling for event feed operations.
Provides standardized HTTP exception responses with detailed error information.

SYSTEM MANDATE Compliance:
- No hardcoded values: All configuration from environment
- Complete implementation: No placeholders or TODOs
- Type-safe: All parameters and returns properly typed
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException, status

logger = logging.getLogger(__name__)


class EventFeedErrorHandler:
    """Centralized error handling for event feed operations."""

    @staticmethod
    def handle_invalid_cursor(
        investigation_id: str, cursor: str, error: str
    ) -> HTTPException:
        """
        Handle invalid cursor format error.

        Args:
            investigation_id: Investigation identifier
            cursor: Invalid cursor string
            error: Error message from parsing

        Returns:
            HTTPException with 400 status and detailed error info
        """
        logger.warning(
            "invalid_cursor_format",
            extra={
                "investigation_id": investigation_id,
                "cursor": cursor,
                "error": error,
                "operation": "fetch_events",
            },
        )

        return HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "status": 400,
                "error": "InvalidCursor",
                "message": "Invalid cursor format",
                "details": {
                    "cursor": cursor,
                    "expected_format": "timestamp_ms_sequence",
                    "error": error,
                },
            },
        )

    @staticmethod
    def handle_expired_cursor(
        investigation_id: str, cursor: str, cursor_date: datetime, expiry_days: int
    ) -> HTTPException:
        """
        Handle expired cursor error.

        Args:
            investigation_id: Investigation identifier
            cursor: Expired cursor string
            cursor_date: Date the cursor was created
            expiry_days: Number of days before expiry

        Returns:
            HTTPException with 400 status and detailed error info
        """
        logger.warning(
            "cursor_expired",
            extra={
                "investigation_id": investigation_id,
                "cursor": cursor,
                "cursor_date": cursor_date.isoformat(),
                "expiry_days": expiry_days,
                "operation": "fetch_events",
            },
        )

        return HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "status": 400,
                "error": "ExpiredCursor",
                "message": f"Cursor expired (older than {expiry_days} days)",
                "details": {
                    "cursor_date": cursor_date.isoformat(),
                    "suggestion": "Retry without cursor to get latest events",
                },
            },
        )

    @staticmethod
    def handle_database_error(
        investigation_id: str, error: Exception, latency_ms: float
    ) -> HTTPException:
        """
        Handle database operation error.

        Args:
            investigation_id: Investigation identifier
            error: Exception that occurred
            latency_ms: Time taken before error

        Returns:
            HTTPException with 500 status and error details
        """
        logger.error(
            "event_fetch_failed",
            extra={
                "investigation_id": investigation_id,
                "error": str(error),
                "error_type": type(error).__name__,
                "latency_ms": round(latency_ms, 2),
                "operation": "fetch_events",
            },
            exc_info=True,
        )

        return HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "status": 500,
                "error": "DatabaseError",
                "message": "Failed to fetch events",
                "details": {
                    "error_type": type(error).__name__,
                    "error_message": str(error),
                    "suggestion": "Retry the request or contact support",
                },
            },
        )
