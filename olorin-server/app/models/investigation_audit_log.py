"""
SQLAlchemy Model: InvestigationAuditLog
Feature: 005-polling-and-persistence

Maps to investigation_audit_log table in schema-locked database.
Implements comprehensive audit trail for all investigation state changes.

SYSTEM MANDATE Compliance:
- Schema-locked: Maps to existing table, no DDL
- No hardcoded values: All enums match database constraints
- Complete implementation: No placeholders or TODOs
"""

from sqlalchemy import Column, String, Text, Integer, DateTime, CheckConstraint, Index
from sqlalchemy.sql import func
from sqlalchemy.ext.declarative import declarative_base
from typing import Optional
from datetime import datetime

Base = declarative_base()


class InvestigationAuditLog(Base):
    """
    Audit log for investigation state changes.

    Schema Reference: 001_add_wizard_state_tables.sql
    Table: investigation_audit_log
    Columns: 9 (entry_id, investigation_id, user_id, action_type, changes_json,
             state_snapshot_json, source, from_version, to_version, timestamp)
    Indexes: 4 (investigation, user, timestamp, action)
    """

    __tablename__ = "investigation_audit_log"

    # Primary Key
    entry_id = Column(
        String(255),
        primary_key=True,
        nullable=False,
        comment="Unique audit entry identifier"
    )

    # Investigation Reference
    investigation_id = Column(
        String(255),
        nullable=False,
        index=True,
        comment="Investigation this audit entry belongs to"
    )

    # User Reference
    user_id = Column(
        String(255),
        nullable=False,
        index=True,
        comment="User who performed the action"
    )

    # Action Details
    action_type = Column(
        String(50),
        nullable=False,
        index=True,
        comment="Action type: CREATED, UPDATED, DELETED, STATE_CHANGE, SETTINGS_CHANGE"
    )

    changes_json = Column(
        Text,
        nullable=True,
        comment="JSON describing what changed (field-level changes)"
    )

    state_snapshot_json = Column(
        Text,
        nullable=True,
        comment="Complete state snapshot after change"
    )

    source = Column(
        String(50),
        nullable=False,
        comment="Source of change: UI, API, SYSTEM, WEBHOOK, POLLING"
    )

    # Version Tracking
    from_version = Column(
        Integer,
        nullable=True,
        comment="Version number before change"
    )

    to_version = Column(
        Integer,
        nullable=True,
        comment="Version number after change"
    )

    # Timestamp
    timestamp = Column(
        DateTime,
        nullable=False,
        server_default=func.now(),
        index=True,
        comment="When the action occurred"
    )

    # Table Arguments: Constraints and Indexes
    __table_args__ = (
        CheckConstraint(
            "action_type IN ('CREATED', 'UPDATED', 'DELETED', 'STATE_CHANGE', 'SETTINGS_CHANGE')",
            name="chk_action_type"
        ),
        CheckConstraint(
            "source IN ('UI', 'API', 'SYSTEM', 'WEBHOOK', 'POLLING')",
            name="chk_source"
        ),
        Index("idx_investigation_audit_log_investigation", "investigation_id"),
        Index("idx_investigation_audit_log_user", "user_id"),
        Index("idx_investigation_audit_log_timestamp", "timestamp"),
        Index("idx_investigation_audit_log_action", "action_type"),
    )

    def __repr__(self) -> str:
        """String representation for debugging."""
        return (
            f"<InvestigationAuditLog("
            f"entry_id={self.entry_id!r}, "
            f"investigation_id={self.investigation_id!r}, "
            f"action_type={self.action_type!r}, "
            f"source={self.source!r}, "
            f"from_version={self.from_version}, "
            f"to_version={self.to_version}"
            f")>"
        )

    def to_dict(self) -> dict:
        """
        Convert model to dictionary representation.

        Returns:
            Dictionary with all model fields
        """
        return {
            "entry_id": self.entry_id,
            "investigation_id": self.investigation_id,
            "user_id": self.user_id,
            "action_type": self.action_type,
            "changes_json": self.changes_json,
            "state_snapshot_json": self.state_snapshot_json,
            "source": self.source,
            "from_version": self.from_version,
            "to_version": self.to_version,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
        }
