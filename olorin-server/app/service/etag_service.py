"""
ETag Service
Feature: 001-investigation-state-management

Provides ETag generation and validation for investigation state caching.
Implements consistent hashing for cache validation and bandwidth reduction.

SYSTEM MANDATE Compliance:
- No hardcoded values: All configuration from environment
- Complete implementation: No placeholders or TODOs
- Type-safe: All parameters and returns properly typed
"""

import hashlib
import logging
import time

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.investigation_state import InvestigationState
from app.service.adaptive_polling_calculator import AdaptivePollingCalculator

logger = logging.getLogger(__name__)


class ETagService:
    """Service for ETag generation and validation."""

    def __init__(self, db: Session):
        """Initialize service with database session."""
        self.db = db
        self.polling_calculator = AdaptivePollingCalculator()

    def get_investigation_etag(self, investigation_id: str, user_id: str) -> str:
        """Get current ETag for investigation without fetching events."""
        start_time = time.perf_counter()
        logger.debug(
            "get_investigation_etag_started",
            extra={"investigation_id": investigation_id, "user_id": user_id},
        )

        try:
            state = self._verify_authorization(investigation_id, user_id)
            etag = self.generate_etag_for_investigation(investigation_id, state.version)

            elapsed_ms = (time.perf_counter() - start_time) * 1000
            logger.info(
                "etag_retrieved",
                extra={
                    "investigation_id": investigation_id,
                    "version": state.version,
                    "latency_ms": round(elapsed_ms, 2),
                },
            )
            return etag

        except HTTPException as e:
            elapsed_ms = (time.perf_counter() - start_time) * 1000
            logger.warning(
                "etag_retrieval_failed",
                extra={
                    "investigation_id": investigation_id,
                    "status_code": e.status_code,
                    "latency_ms": round(elapsed_ms, 2),
                },
            )
            raise

    def generate_etag_for_investigation(
        self, investigation_id: str, version: int
    ) -> str:
        """
        Generate ETag for investigation based on ID and version.

        Implements consistent hashing for cache validation.
        Uses stable MD5 hash - same inputs always produce same ETag.

        Args:
            investigation_id: Investigation identifier
            version: Current version number

        Returns:
            ETag string in format: W/"version-hash"
            Example: W/"42-a3b5c7d9"
        """
        etag_input = f"{investigation_id}:{version}"
        etag_hash = hashlib.md5(etag_input.encode()).hexdigest()[:8]
        return f'W/"{version}-{etag_hash}"'

    def calculate_poll_interval(self, investigation_id: str) -> int:
        """
        Calculate recommended polling interval for investigation.

        Returns adaptive interval based on investigation state
        without requiring authorization check (for 304 responses).

        Args:
            investigation_id: Investigation to calculate interval for

        Returns:
            Recommended poll interval in seconds
        """
        state = (
            self.db.query(InvestigationState)
            .filter(InvestigationState.investigation_id == investigation_id)
            .first()
        )

        if not state:
            return self.polling_calculator.get_default_interval()

        return self.polling_calculator.calculate_interval(state)

    def get_investigation_state(
        self, investigation_id: str, user_id: str
    ) -> InvestigationState:
        """Get investigation state with authorization check."""
        return self._verify_authorization(investigation_id, user_id)

    def _verify_authorization(
        self, investigation_id: str, user_id: str
    ) -> InvestigationState:
        """
        Verify user has access to investigation and return state.

        Args:
            investigation_id: Investigation to verify access for
            user_id: User ID to check authorization

        Returns:
            InvestigationState object if authorized

        Raises:
            404: Investigation not found
            403: User not authorized
        """
        state = (
            self.db.query(InvestigationState)
            .filter(InvestigationState.investigation_id == investigation_id)
            .first()
        )

        if not state:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Investigation not found: {investigation_id}",
            )

        if state.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"User not authorized to access investigation {investigation_id}",
            )

        return state
