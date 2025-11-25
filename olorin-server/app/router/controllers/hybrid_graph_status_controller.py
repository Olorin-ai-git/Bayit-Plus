"""
Hybrid Graph Status Controller
Feature: 006-hybrid-graph-integration

Controller for retrieving hybrid graph investigation status with polling support.
Fetches investigation state and transforms to polling response format.

SYSTEM MANDATE Compliance:
- Configuration-driven: All settings from config
- Complete implementation: No placeholders or TODOs
- Type-safe: Comprehensive error handling with clear messages
"""

from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.investigation_state import InvestigationState
from app.schemas.investigation_status import InvestigationStatusSchema
from app.service.investigation_polling_adapter import InvestigationPollingAdapter
from config.hybrid_graph_config import get_hybrid_graph_config


class HybridGraphStatusController:
    """
    Controller for hybrid graph investigation status operations.
    Manages status retrieval with polling adapter integration.
    """

    def __init__(self):
        """Initialize controller with configuration and adapter."""
        self.config = get_hybrid_graph_config()
        self.polling_adapter = InvestigationPollingAdapter()

    async def get_status(
        self, investigation_id: str, user_id: str, db: Session
    ) -> InvestigationStatusSchema:
        """
        Get investigation status for polling.

        Args:
            investigation_id: Investigation identifier
            user_id: Current user ID for authorization
            db: Database session

        Returns:
            InvestigationStatusSchema with current status, progress, and logs

        Raises:
            HTTPException: 404 if not found, 403 if unauthorized
        """
        investigation = self._get_investigation_or_404(investigation_id, db)

        self._verify_authorization(investigation, user_id)

        status_response = self.polling_adapter.transform_to_status(investigation)

        return status_response

    def _get_investigation_or_404(
        self, investigation_id: str, db: Session
    ) -> InvestigationState:
        """
        Fetch investigation from database or raise 404.

        Args:
            investigation_id: Investigation identifier
            db: Database session

        Returns:
            InvestigationState instance

        Raises:
            HTTPException: 404 if investigation not found
        """
        investigation = (
            db.query(InvestigationState)
            .filter(InvestigationState.investigation_id == investigation_id)
            .first()
        )

        if not investigation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Investigation '{investigation_id}' not found",
            )

        return investigation

    def _verify_authorization(
        self, investigation: InvestigationState, user_id: str
    ) -> None:
        """
        Verify user is authorized to view investigation status.

        Args:
            investigation: Investigation instance
            user_id: Current user ID

        Raises:
            HTTPException: 403 if user not authorized
        """
        if investigation.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"User '{user_id}' not authorized to view "
                    f"investigation '{investigation.investigation_id}'"
                ),
            )


class CachedHybridGraphStatusController(HybridGraphStatusController):
    """
    Hybrid graph status controller with caching support.
    Implements 2-second TTL cache to reduce database load during polling.
    """

    def __init__(self):
        """Initialize controller with cache storage."""
        super().__init__()
        self._cache: dict[str, tuple[InvestigationStatusSchema, float]] = {}

    async def get_status(
        self, investigation_id: str, user_id: str, db: Session
    ) -> InvestigationStatusSchema:
        """
        Get investigation status with caching.

        Checks cache first, returns cached response if within TTL,
        otherwise fetches from database and updates cache.

        Args:
            investigation_id: Investigation identifier
            user_id: Current user ID for authorization
            db: Database session

        Returns:
            InvestigationStatusSchema with current status, progress, and logs
        """
        import time

        cache_key = f"{investigation_id}:{user_id}"
        current_time = time.time()

        if cache_key in self._cache:
            cached_response, cached_at = self._cache[cache_key]
            age = current_time - cached_at

            if age < self.config.status_cache_ttl_seconds:
                return cached_response

        response = await super().get_status(investigation_id, user_id, db)

        self._cache[cache_key] = (response, current_time)

        self._evict_expired_entries(current_time)

        return response

    def _evict_expired_entries(self, current_time: float) -> None:
        """
        Remove expired cache entries.

        Args:
            current_time: Current timestamp for comparison
        """
        expired_keys = [
            key
            for key, (_, cached_at) in self._cache.items()
            if (current_time - cached_at) >= self.config.status_cache_ttl_seconds
        ]

        for key in expired_keys:
            del self._cache[key]
