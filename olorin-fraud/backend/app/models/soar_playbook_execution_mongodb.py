"""
Pydantic Model: SOARPlaybookExecution (MongoDB)
Feature: MongoDB Atlas Migration

MongoDB model for SOAR playbook execution tracking.

SYSTEM MANDATE Compliance:
- No hardcoded values: All configuration from fields
- Complete implementation: No placeholders or TODOs
- Execution tracking: Complete playbook orchestration history
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from bson import ObjectId as BsonObjectId
from pydantic import BaseModel, Field

from app.models.investigation_mongodb import PyObjectId


class PlaybookExecutionStatus(str, Enum):
    """Playbook execution status values."""

    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class PlaybookAction(BaseModel):
    """Individual action within playbook execution."""

    action_id: str
    action_type: str
    status: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    result: Dict[str, Any] = Field(default_factory=dict)
    error: Optional[str] = None


class SOARPlaybookExecution(BaseModel):
    """MongoDB document model for SOAR playbook executions.

    This model represents the soar_playbook_executions collection for
    tracking automated response playbooks.
    """

    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    execution_id: str = Field(..., min_length=1, max_length=255)
    playbook_id: str = Field(..., min_length=1, max_length=255)

    # References
    investigation_id: Optional[str] = Field(None, max_length=255)
    anomaly_id: Optional[str] = Field(None, max_length=255)
    tenant_id: str = Field(..., min_length=1, max_length=255)

    # Trigger information
    trigger_reason: Optional[str] = None
    triggered_by: Optional[str] = None

    # Execution status
    status: PlaybookExecutionStatus

    # Timestamps
    started_at: datetime
    completed_at: Optional[datetime] = None
    duration_ms: Optional[int] = Field(None, ge=0)

    # Actions executed (embedded array)
    actions_executed: List[PlaybookAction] = Field(default_factory=list)

    error_message: Optional[str] = None

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {
            PyObjectId: str,
            BsonObjectId: str,
            datetime: lambda v: v.isoformat(),
        }

    def to_dict(self) -> dict:
        """Convert model to dictionary for API responses."""
        return {
            "execution_id": self.execution_id,
            "playbook_id": self.playbook_id,
            "investigation_id": self.investigation_id,
            "anomaly_id": self.anomaly_id,
            "tenant_id": self.tenant_id,
            "trigger_reason": self.trigger_reason,
            "triggered_by": self.triggered_by,
            "status": self.status.value,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "duration_ms": self.duration_ms,
            "actions_executed": [action.dict() for action in self.actions_executed],
            "error_message": self.error_message,
        }

    def to_mongodb_dict(self) -> dict:
        """Convert to MongoDB document format."""
        doc = self.dict(by_alias=True, exclude_unset=True)
        if "status" in doc:
            doc["status"] = self.status.value
        return doc

    @classmethod
    def from_mongodb_dict(cls, doc: dict) -> "SOARPlaybookExecution":
        """Create SOARPlaybookExecution from MongoDB document."""
        if "_id" in doc and doc["_id"]:
            doc["_id"] = PyObjectId(doc["_id"])
        if "status" in doc:
            doc["status"] = PlaybookExecutionStatus(doc["status"])
        return cls(**doc)

    def is_complete(self) -> bool:
        """Check if execution is complete (success or failure)."""
        return self.status in [
            PlaybookExecutionStatus.COMPLETED,
            PlaybookExecutionStatus.FAILED,
            PlaybookExecutionStatus.CANCELLED,
        ]

    def get_action_count(self) -> int:
        """Get total number of actions executed."""
        return len(self.actions_executed)

    def get_successful_action_count(self) -> int:
        """Get number of successfully executed actions."""
        return sum(1 for action in self.actions_executed if action.status == "success")

    def add_action(self, action: PlaybookAction) -> None:
        """Add action to execution history."""
        self.actions_executed.append(action)

    def mark_completed(self) -> None:
        """Mark execution as completed."""
        self.status = PlaybookExecutionStatus.COMPLETED
        self.completed_at = datetime.utcnow()
        if self.completed_at and self.started_at:
            self.duration_ms = int(
                (self.completed_at - self.started_at).total_seconds() * 1000
            )

    def mark_failed(self, error_message: str) -> None:
        """Mark execution as failed."""
        self.status = PlaybookExecutionStatus.FAILED
        self.completed_at = datetime.utcnow()
        self.error_message = error_message
        if self.completed_at and self.started_at:
            self.duration_ms = int(
                (self.completed_at - self.started_at).total_seconds() * 1000
            )
