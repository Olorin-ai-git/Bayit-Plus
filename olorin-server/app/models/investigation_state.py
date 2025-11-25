"""
SQLAlchemy Model: InvestigationState
Feature: 006-hybrid-graph-integration (Enhanced from 005-polling-and-persistence)

Maps to investigation_states table in schema-locked database.
Implements investigation lifecycle tracking with optimistic locking and polling state management.

Investigation Lifecycle: CREATED → SETTINGS → IN_PROGRESS → COMPLETED/ERROR/CANCELLED

SYSTEM MANDATE Compliance:
- Schema-locked: Maps to existing table, no DDL
- No hardcoded values: All enums match database constraints
- Complete implementation: No placeholders or TODOs
- Polling state tracked in progress_json field (current_phase, progress_percentage)
"""

import json
from datetime import datetime
from typing import Any, Dict, Optional

from sqlalchemy import CheckConstraint, Column, DateTime, Index, Integer, String, Text
from sqlalchemy.sql import func

from app.persistence.database import Base


class InvestigationState(Base):
    """
    Investigation state model with lifecycle tracking and polling support.
    Schema: 001_add_wizard_state_tables.sql | Table: investigation_states
    """

    __tablename__ = "investigation_states"

    investigation_id = Column(String(255), primary_key=True, nullable=False)
    user_id = Column(String(255), nullable=False, index=True)
    lifecycle_stage = Column(String(50), nullable=False, index=True)
    settings_json = Column(Text, nullable=True)
    progress_json = Column(Text, nullable=True)
    status = Column(String(50), nullable=False, index=True)
    version = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(
        DateTime,
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
        index=True,
    )
    last_accessed = Column(DateTime, nullable=True)

    __table_args__ = (
        CheckConstraint(
            "lifecycle_stage IN ('CREATED', 'SETTINGS', 'IN_PROGRESS', 'COMPLETED')",
            name="chk_lifecycle_stage",
        ),
        CheckConstraint(
            "status IN ('CREATED', 'SETTINGS', 'IN_PROGRESS', 'COMPLETED', 'ERROR', 'CANCELLED')",
            name="chk_status",
        ),
        CheckConstraint("version >= 1", name="chk_version"),
        Index("idx_investigation_states_user", "user_id"),
        Index("idx_investigation_states_status", "status"),
        Index("idx_investigation_states_updated", "updated_at"),
        Index("idx_investigation_states_lifecycle", "lifecycle_stage"),
    )

    def __repr__(self) -> str:
        return f"<InvestigationState(id={self.investigation_id!r}, user={self.user_id!r}, status={self.status!r})>"

    def to_dict(self) -> dict:
        """Convert model to dictionary representation."""
        return {
            "investigation_id": self.investigation_id,
            "user_id": self.user_id,
            "lifecycle_stage": self.lifecycle_stage,
            "settings_json": self.settings_json,
            "progress_json": self.progress_json,
            "status": self.status,
            "version": self.version,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "last_accessed": (
                self.last_accessed.isoformat() if self.last_accessed else None
            ),
        }

    @property
    def progress(self) -> Optional[Dict[str, Any]]:
        """Property to expose progress data for Pydantic deserialization."""
        return self.get_progress_data() or None

    @property
    def settings(self) -> Optional[Dict[str, Any]]:
        """Property to expose settings data for Pydantic deserialization."""
        if not self.settings_json:
            return None
        try:
            return json.loads(self.settings_json)
        except (json.JSONDecodeError, TypeError):
            return None

    def get_progress_data(self) -> Dict[str, Any]:
        """Safely parse progress_json field, returns empty dict if parsing fails."""
        if not self.progress_json:
            return {}
        try:
            return json.loads(self.progress_json)
        except (json.JSONDecodeError, TypeError):
            return {}

    def get_current_phase(self) -> str:
        """Get current execution phase from progress data."""
        return self.get_progress_data().get("current_phase", "")

    def get_progress_percentage(self) -> float:
        """Get progress percentage from progress data (0.0-100.0)."""
        return float(self.get_progress_data().get("progress_percentage", 0.0))

    def update_progress(
        self,
        current_phase: Optional[str] = None,
        progress_percentage: Optional[float] = None,
        additional_data: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Update progress_json with new phase/percentage."""
        progress_data = self.get_progress_data()
        if current_phase is not None:
            progress_data["current_phase"] = current_phase
        if progress_percentage is not None:
            progress_data["progress_percentage"] = max(
                0.0, min(100.0, progress_percentage)
            )
        if additional_data:
            progress_data.update(additional_data)
        self.progress_json = json.dumps(progress_data)
