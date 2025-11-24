"""
Audit Helper
Feature: 005-polling-and-persistence

Provides audit logging functionality for investigation state changes.

SYSTEM MANDATE Compliance:
- No hardcoded values: All configuration from environment
- Complete implementation: No placeholders or TODOs
"""

from sqlalchemy.orm import Session
from typing import Optional
import uuid

from app.models.investigation_audit_log import InvestigationAuditLog


def create_audit_entry(
    db: Session,
    investigation_id: str,
    user_id: str,
    action_type: str,
    changes_json: Optional[str] = None,
    from_version: Optional[int] = None,
    to_version: Optional[int] = None,
    source: str = "API"
) -> None:
    """Create audit log entry.

    Args:
        db: Database session
        investigation_id: Investigation identifier
        user_id: User performing action
        action_type: Type of action (CREATED, UPDATED, DELETED)
        changes_json: JSON of changes made
        from_version: Version before change
        to_version: Version after change
        source: Source of change (API, UI, SYSTEM, etc.)
    """
    entry = InvestigationAuditLog(
        entry_id=str(uuid.uuid4()),
        investigation_id=investigation_id,
        user_id=user_id,
        action_type=action_type,
        changes_json=changes_json,
        state_snapshot_json=None,
        source=source,
        from_version=from_version,
        to_version=to_version
    )

    db.add(entry)
    db.commit()
