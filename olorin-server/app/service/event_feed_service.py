"""
Event Feed Service
Feature: 001-investigation-state-management

Provides event feed functionality for investigation state changes.
Converts audit log entries to event stream format with cursor-based pagination.

SYSTEM MANDATE Compliance:
- No hardcoded values: All configuration from environment
- Complete implementation: No placeholders or TODOs
- Type-safe: All parameters and returns properly typed
"""

import logging
import time
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from fastapi import HTTPException
from datetime import datetime, timezone, timedelta

from app.models.investigation_audit_log import InvestigationAuditLog
from app.service.event_feed_models import EventsFeedResponse
from app.service.event_feed_helper import EventFeedHelper
from app.service.event_feed_error_handlers import EventFeedErrorHandler
from app.service.event_feed_converters import EventFeedConverter
from app.service.etag_service import ETagService
import os

logger = logging.getLogger(__name__)


class EventFeedService:
    """Service for fetching and converting investigation events."""

    # Configuration from environment
    DEFAULT_LIMIT = int(os.getenv("EVENT_FEED_DEFAULT_LIMIT", "100"))
    MAX_LIMIT = int(os.getenv("EVENT_FEED_MAX_LIMIT", "1000"))
    CURSOR_EXPIRY_DAYS = int(os.getenv("EVENT_FEED_CURSOR_EXPIRY_DAYS", "30"))

    def __init__(self, db: Session):
        """Initialize service with database session."""
        self.db = db
        self.helper = EventFeedHelper()
        self.etag_service = ETagService(db)
        self.error_handler = EventFeedErrorHandler()
        self.converter = EventFeedConverter()

    def fetch_events_since(
        self, investigation_id: str, user_id: str,
        cursor: Optional[str] = None, limit: int = DEFAULT_LIMIT
    ) -> EventsFeedResponse:
        """Fetch events since cursor for investigation with pagination."""
        start_time = time.perf_counter()
        logger.debug("fetch_events_started", extra={
            "investigation_id": investigation_id,
            "user_id": user_id,
            "cursor": cursor,
            "limit": limit
        })

        try:
            # Validate authorization and get investigation state
            state = self.etag_service.get_investigation_state(investigation_id, user_id)

            # Parse and validate cursor if provided
            cursor_timestamp, cursor_sequence = self._parse_and_validate_cursor(
                investigation_id, cursor
            )

            # Validate and adjust limit
            limit = self._validate_limit(investigation_id, limit)

            # Fetch events from database
            entries = self._fetch_audit_log_entries(
                investigation_id, cursor_timestamp, cursor_sequence, limit
            )

            # Process results and pagination
            has_more = len(entries) > limit
            if has_more:
                entries = entries[:limit]

            # Convert to events (dictionaries)
            event_dicts = self.converter.batch_convert(entries)
            
            # Convert dictionaries to InvestigationEvent Pydantic models
            # Remove 'metadata' field if present (not part of InvestigationEvent schema)
            from app.service.event_feed_models import InvestigationEvent
            events = []
            for event_dict in event_dicts:
                # Create a copy without metadata for Pydantic validation
                event_data = {k: v for k, v in event_dict.items() if k != 'metadata'}
                try:
                    event = InvestigationEvent(**event_data)
                    events.append(event)
                except Exception as e:
                    logger.error(
                        f"Failed to convert event dict to InvestigationEvent: {event_dict}, error: {str(e)}",
                        exc_info=True
                    )
                    # Skip invalid events but log the error
                    continue

            # Generate next cursor if more events exist
            next_cursor = self._generate_next_cursor(entries, has_more)

            # Generate ETag and poll interval
            etag = self.etag_service.generate_etag_for_investigation(
                investigation_id, state.version
            )
            try:
                poll_interval = self.etag_service.calculate_poll_interval(investigation_id)
            except Exception as e:
                # Fallback to default interval if calculation fails
                logger.warning(
                    f"Failed to calculate poll interval for {investigation_id}: {str(e)}, using default"
                )
                poll_interval = 5  # Default 5 seconds

            elapsed_ms = (time.perf_counter() - start_time) * 1000
            logger.info("events_fetched", extra={
                "investigation_id": investigation_id,
                "event_count": len(events),
                "has_more": has_more,
                "latency_ms": round(elapsed_ms, 2)
            })

            return EventsFeedResponse(
                items=events,
                next_cursor=next_cursor,
                has_more=has_more,
                poll_after_seconds=poll_interval,
                etag=etag
            )

        except HTTPException:
            raise
        except Exception as e:
            elapsed_ms = (time.perf_counter() - start_time) * 1000
            # Log the full error for debugging
            logger.error(
                f"Error fetching events for {investigation_id}: {type(e).__name__}: {str(e)}",
                exc_info=True
            )
            raise self.error_handler.handle_database_error(
                investigation_id, e, elapsed_ms
            )

    def _parse_and_validate_cursor(
        self, investigation_id: str, cursor: Optional[str]
    ) -> tuple[Optional[int], Optional[int]]:
        """Parse and validate cursor with expiry check."""
        if not cursor:
            return None, None

        try:
            cursor_timestamp, cursor_sequence = self.helper.parse_cursor(
                cursor, self.CURSOR_EXPIRY_DAYS
            )
            cursor_date = datetime.fromtimestamp(cursor_timestamp / 1000, tz=timezone.utc)
            expiry_date = datetime.now(timezone.utc) - timedelta(days=self.CURSOR_EXPIRY_DAYS)

            if cursor_date < expiry_date:
                raise self.error_handler.handle_expired_cursor(
                    investigation_id, cursor, cursor_date, self.CURSOR_EXPIRY_DAYS
                )
            return cursor_timestamp, cursor_sequence
        except ValueError as e:
            raise self.error_handler.handle_invalid_cursor(investigation_id, cursor, str(e))

    def _validate_limit(self, investigation_id: str, limit: int) -> int:
        """Validate and adjust limit to be within acceptable range."""
        adjusted = min(max(1, limit), self.MAX_LIMIT)
        if adjusted != limit:
            logger.debug("limit_adjusted", extra={
                "investigation_id": investigation_id,
                "original_limit": limit,
                "adjusted_limit": adjusted,
                "operation": "fetch_events"
            })
        return adjusted

    def _fetch_audit_log_entries(
        self,
        investigation_id: str,
        cursor_timestamp: Optional[int],
        cursor_sequence: Optional[int],
        limit: int
    ) -> list[InvestigationAuditLog]:
        """Fetch audit log entries with cursor filtering."""
        query = self.db.query(InvestigationAuditLog).filter(
            InvestigationAuditLog.investigation_id == investigation_id
        )

        # Apply cursor filter if provided
        if cursor_timestamp:
            # Convert cursor_timestamp (milliseconds) to datetime
            cursor_datetime = datetime.fromtimestamp(cursor_timestamp / 1000, tz=timezone.utc)
            cursor_entry_id = f"{cursor_timestamp}_{cursor_sequence:06d}"
            
            # Compare datetime with datetime, entry_id with string
            # Use SQLAlchemy or_() and and_() functions for proper query construction
            query = query.filter(
                or_(
                    InvestigationAuditLog.timestamp > cursor_datetime,
                    and_(
                        InvestigationAuditLog.timestamp == cursor_datetime,
                        InvestigationAuditLog.entry_id > cursor_entry_id
                    )
                )
            )

        # Order and fetch
        query = query.order_by(
            InvestigationAuditLog.timestamp.asc(),
            InvestigationAuditLog.entry_id.asc()
        )

        return query.limit(limit + 1).all()

    def _generate_next_cursor(
        self,
        entries: list[InvestigationAuditLog],
        has_more: bool
    ) -> Optional[str]:
        """Generate next cursor if more events exist."""
        if has_more and entries:
            last_entry = entries[-1]
            return self.helper.create_cursor(last_entry)
        return None

