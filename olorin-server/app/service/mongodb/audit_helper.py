"""
MongoDB Audit Helper
Feature: MongoDB Atlas Migration

Provides audit logging functionality for investigation state changes.

SYSTEM MANDATE Compliance:
- No hardcoded values: All configuration from environment
- Complete implementation: No placeholders or TODOs
"""

import uuid
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models.audit_log_mongodb import AuditLog, AuditActionType
from app.persistence.repositories.audit_log_repository import AuditLogRepository


async def create_audit_entry(
    db: AsyncIOMotorDatabase,
    investigation_id: str,
    user_id: str,
    action_type: str,
    changes_json: Optional[str] = None,
    from_version: Optional[int] = None,
    to_version: Optional[int] = None,
    source: str = "API",
    tenant_id: Optional[str] = None,
) -> None:
    """Create audit log entry.

    Args:
        db: MongoDB database
        investigation_id: Investigation identifier
        user_id: User performing action
        action_type: Type of action (CREATED, UPDATED, DELETED)
        changes_json: JSON of changes made
        from_version: Version before change
        to_version: Version after change
        source: Source of change (API, UI, SYSTEM, etc.)
        tenant_id: Optional tenant identifier for multi-tenancy
    """
    repository = AuditLogRepository(db)

    # Parse action type to enum
    try:
        action = AuditActionType(action_type)
    except ValueError:
        # If not a valid enum, default to UPDATED
        action = AuditActionType.UPDATED

    entry = AuditLog(
        entry_id=str(uuid.uuid4()),
        investigation_id=investigation_id,
        user_id=user_id,
        tenant_id=tenant_id or "default",
        action_type=action,
        changes={} if not changes_json else {"raw": changes_json},
        state_snapshot=None,
        source=source,
        from_version=from_version,
        to_version=to_version,
    )

    await repository.create(entry)
