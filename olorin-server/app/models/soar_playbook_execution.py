"""
SQLAlchemy Model: SOARPlaybookExecution
Feature: 001-composio-tools-integration

Maps to soar_playbook_executions table in schema-locked database.
Tracks SOAR playbook execution history and outcomes.
"""

import json
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import CheckConstraint, Column, DateTime, Index, String, Text
from sqlalchemy.sql import func

from app.persistence.database import Base


class SOARPlaybookExecution(Base):
    """
    SOAR playbook execution model for tracking automated fraud response workflows.

    Schema Reference: 008_create_composio_tables.sql
    Table: soar_playbook_executions
    """

    __tablename__ = "soar_playbook_executions"

    # Primary Key
    id = Column(
        String(36),
        primary_key=True,
        nullable=False,
        default=lambda: str(uuid.uuid4()),
        comment="Unique execution identifier",
    )

    # Playbook and Context
    playbook_id = Column(
        String(255), nullable=False, comment="SOAR playbook identifier"
    )

    investigation_id = Column(
        String(255), nullable=True, index=True, comment="Associated investigation ID"
    )

    anomaly_id = Column(String(255), nullable=True, comment="Associated anomaly ID")

    tenant_id = Column(
        String(255),
        nullable=False,
        index=True,
        comment="Tenant ID for multi-tenant isolation",
    )

    trigger_reason = Column(Text, nullable=True, comment="Reason for playbook trigger")

    # Execution Status
    status = Column(
        String(50),
        nullable=False,
        index=True,
        comment="Execution status: 'running', 'completed', 'failed', 'cancelled'",
    )

    # Timestamps
    started_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.current_timestamp(),
        index=True,
        comment="Execution start timestamp",
    )

    completed_at = Column(
        DateTime(timezone=True), nullable=True, comment="Execution completion timestamp"
    )

    # Execution Results
    actions_executed = Column(
        Text, nullable=True, comment="JSON array of action execution results"
    )

    error_message = Column(
        Text, nullable=True, comment="Error message if execution failed"
    )

    __table_args__ = (
        CheckConstraint(
            "status IN ('running', 'completed', 'failed', 'cancelled')",
            name="chk_soar_execution_status",
        ),
        Index("idx_soar_executions_tenant", "tenant_id"),
        Index("idx_soar_executions_investigation", "investigation_id"),
        Index("idx_soar_executions_status", "status"),
        Index("idx_soar_executions_started", "started_at"),
    )

    def __repr__(self) -> str:
        return f"<SOARPlaybookExecution(id={self.id!r}, playbook_id={self.playbook_id!r}, status={self.status!r})>"

    def to_dict(self) -> dict:
        """Convert model to dictionary representation."""
        return {
            "id": self.id,
            "playbook_id": self.playbook_id,
            "investigation_id": self.investigation_id,
            "anomaly_id": self.anomaly_id,
            "tenant_id": self.tenant_id,
            "trigger_reason": self.trigger_reason,
            "status": self.status,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": (
                self.completed_at.isoformat() if self.completed_at else None
            ),
            "actions_executed": (
                json.loads(self.actions_executed) if self.actions_executed else []
            ),
            "error_message": self.error_message,
        }

    def get_actions_executed(self) -> List[Dict[str, Any]]:
        """Get parsed actions_executed JSON."""
        if not self.actions_executed:
            return []
        try:
            return json.loads(self.actions_executed)
        except json.JSONDecodeError:
            return []

    def set_actions_executed(self, actions: List[Dict[str, Any]]) -> None:
        """Set actions_executed as JSON."""
        self.actions_executed = json.dumps(actions) if actions else None
