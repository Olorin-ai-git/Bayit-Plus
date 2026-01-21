"""
Optimistic Locking Service
Feature: Phase 6 (T047-T048) - Optimistic Concurrency Control

Implements optimistic locking for investigation state updates with If-Match header support.
Prevents lost updates when multiple clients modify the same investigation concurrently.

SYSTEM MANDATE Compliance:
- No hardcoded values: All configuration from environment
- Complete implementation: No placeholders or TODOs
- Type-safe: All parameters and returns properly typed
"""

import json
import os
from typing import Any, Dict, Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.investigation_audit_log import InvestigationAuditLog
from app.models.investigation_state import InvestigationState
from app.schemas.investigation_state import InvestigationStateUpdate
from app.service.audit_helper import create_audit_entry
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class OptimisticLockingService:
    """Service for handling optimistic locking on investigation state updates."""

    # Configuration from environment
    ENABLE_OPTIMISTIC_LOCKING = (
        os.getenv("ENABLE_OPTIMISTIC_LOCKING", "true").lower() == "true"
    )
    VERSION_HEADER_NAME = os.getenv("VERSION_HEADER_NAME", "If-Match")

    def __init__(self, db: Session):
        """Initialize service with database session."""
        self.db = db

    def update_with_optimistic_lock(
        self,
        investigation_id: str,
        user_id: str,
        update_data: InvestigationStateUpdate,
        if_match_version: Optional[str] = None,
    ) -> InvestigationState:
        """
        Update investigation state with optimistic locking.

        T047: Checks If-Match header matches current version before applying update.
        If versions match, applies update and increments version.
        If versions don't match, returns 409 Conflict.

        Args:
            investigation_id: Investigation to update
            user_id: User performing the update
            update_data: Update data to apply
            if_match_version: Expected version from If-Match header

        Returns:
            Updated InvestigationState with incremented version

        Raises:
            404: Investigation not found
            409: Version conflict - current version doesn't match If-Match
        """
        # Get current state
        state = (
            self.db.query(InvestigationState)
            .filter(InvestigationState.investigation_id == investigation_id)
            .first()
        )

        if not state:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Investigation {investigation_id} not found",
            )

        # Check authorization
        if state.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update this investigation",
            )

        current_version = state.version
        from_version = current_version

        # T047: Check optimistic lock if enabled
        if self.ENABLE_OPTIMISTIC_LOCKING and if_match_version is not None:
            # Parse version from If-Match header (could be string or int)
            try:
                expected_version = int(if_match_version)
            except (ValueError, TypeError):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid If-Match version format: {if_match_version}",
                )

            # T047: Check if current version matches expected
            if current_version != expected_version:
                # T048: Return 409 with version details
                logger.warning(
                    f"Version conflict for investigation {investigation_id}: "
                    f"current={current_version}, expected={expected_version}"
                )
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail={
                        "error": "version_conflict",
                        "message": "The resource has been modified by another client",
                        "current_version": current_version,
                        "submitted_version": expected_version,
                    },
                )

        # Apply updates
        changes = {}

        if update_data.lifecycle_stage is not None:
            changes["lifecycle_stage"] = {
                "old": state.lifecycle_stage,
                "new": update_data.lifecycle_stage,
            }
            state.lifecycle_stage = update_data.lifecycle_stage

        if update_data.status is not None:
            changes["status"] = {"old": state.status, "new": update_data.status}
            state.status = update_data.status

        if update_data.settings is not None:
            changes["settings"] = "updated"
            state.settings_json = json.dumps(
                update_data.settings.model_dump(mode="json")
            )

        if update_data.progress is not None:
            changes["progress"] = "updated"
            state.progress_json = json.dumps(
                update_data.progress.model_dump(mode="json")
            )

        # Results are now stored in progress_json, not a separate results_json field
        # No need to handle results separately

        # T047: Increment version after successful update
        state.version = current_version + 1
        to_version = state.version

        # Commit the transaction
        self.db.commit()
        self.db.refresh(state)

        # T047: Create audit log entry with version transition
        self._create_version_audit_entry(
            investigation_id=investigation_id,
            user_id=user_id,
            from_version=from_version,
            to_version=to_version,
            changes=changes,
        )

        logger.info(
            f"Successfully updated investigation {investigation_id} "
            f"from version {from_version} to {to_version}"
        )

        return state

    def check_version_conflict(
        self, investigation_id: str, expected_version: int
    ) -> Optional[Dict[str, Any]]:
        """
        Check if there's a version conflict for an investigation.

        Args:
            investigation_id: Investigation to check
            expected_version: Expected version number

        Returns:
            None if no conflict, or conflict details dict if conflict exists
        """
        state = (
            self.db.query(InvestigationState)
            .filter(InvestigationState.investigation_id == investigation_id)
            .first()
        )

        if not state:
            return {
                "error": "not_found",
                "message": f"Investigation {investigation_id} not found",
            }

        if state.version != expected_version:
            return {
                "error": "version_conflict",
                "current_version": state.version,
                "expected_version": expected_version,
                "message": "Version mismatch detected",
            }

        return None

    def _create_version_audit_entry(
        self,
        investigation_id: str,
        user_id: str,
        from_version: int,
        to_version: int,
        changes: Dict[str, Any],
    ) -> None:
        """
        Create audit log entry for version transition.

        T047: Records version changes in audit_log for traceability.

        Args:
            investigation_id: Investigation that was updated
            user_id: User who performed the update
            from_version: Version before update
            to_version: Version after update
            changes: Dictionary of changes made
        """
        import uuid
        from datetime import datetime

        audit_entry = InvestigationAuditLog(
            entry_id=str(uuid.uuid4()),
            investigation_id=investigation_id,
            user_id=user_id,
            action_type="UPDATED",
            changes_json=json.dumps(changes),
            source="API",
            from_version=from_version,
            to_version=to_version,
            timestamp=datetime.utcnow(),
        )

        self.db.add(audit_entry)
        self.db.commit()

        logger.debug(
            f"Created audit entry for version transition: "
            f"{investigation_id} v{from_version} -> v{to_version}"
        )

    def get_version_history(
        self, investigation_id: str, limit: int = 20
    ) -> list[Dict[str, Any]]:
        """
        Get version history for an investigation.

        Args:
            investigation_id: Investigation to get history for
            limit: Maximum number of entries to return

        Returns:
            List of version transition records
        """
        entries = (
            self.db.query(InvestigationAuditLog)
            .filter(
                InvestigationAuditLog.investigation_id == investigation_id,
                InvestigationAuditLog.from_version.isnot(None),
                InvestigationAuditLog.to_version.isnot(None),
            )
            .order_by(InvestigationAuditLog.timestamp.desc())
            .limit(limit)
            .all()
        )

        return [
            {
                "timestamp": entry.timestamp.isoformat(),
                "user_id": entry.user_id,
                "from_version": entry.from_version,
                "to_version": entry.to_version,
                "changes": json.loads(entry.changes_json) if entry.changes_json else {},
                "action_type": entry.action_type,
            }
            for entry in entries
        ]
