"""
Pydantic Model: ComposioActionAudit (MongoDB)
Feature: MongoDB Atlas Migration

MongoDB model for Composio action execution history.

SYSTEM MANDATE Compliance:
- No hardcoded values: All configuration from fields
- Complete implementation: No placeholders or TODOs
- Audit trail: Complete execution tracking
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, Optional

from bson import ObjectId as BsonObjectId
from pydantic import BaseModel, Field

from app.models.investigation_mongodb import PyObjectId


class ActionStatus(str, Enum):
    """Action execution status values."""

    SUCCESS = "success"
    FAILED = "failed"
    RETRYING = "retrying"


class ComposioActionAudit(BaseModel):
    """MongoDB document model for Composio action audit trail.

    This model represents the composio_action_audits collection for
    tracking all action executions.
    """

    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    audit_id: str = Field(..., min_length=1, max_length=255)
    action_id: str = Field(..., min_length=1, max_length=255)

    # References
    execution_id: Optional[str] = Field(None, max_length=255)  # Links to SOAR execution
    toolkit_name: str = Field(..., min_length=1, max_length=255)
    action_name: str = Field(..., min_length=1, max_length=255)
    tenant_id: str = Field(..., min_length=1, max_length=255)
    connection_id: str = Field(..., min_length=1, max_length=255)

    # Execution data
    parameters: Dict[str, Any] = Field(default_factory=dict)
    result: Dict[str, Any] = Field(default_factory=dict)

    # Status tracking
    status: ActionStatus
    executed_at: datetime
    retry_count: int = Field(default=0, ge=0)
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
            "audit_id": self.audit_id,
            "action_id": self.action_id,
            "execution_id": self.execution_id,
            "toolkit_name": self.toolkit_name,
            "action_name": self.action_name,
            "tenant_id": self.tenant_id,
            "connection_id": self.connection_id,
            "parameters": self.parameters,
            "result": self.result,
            "status": self.status.value,
            "executed_at": self.executed_at.isoformat() if self.executed_at else None,
            "retry_count": self.retry_count,
            "error_message": self.error_message,
        }

    def to_mongodb_dict(self) -> dict:
        """Convert to MongoDB document format."""
        doc = self.dict(by_alias=True, exclude_unset=True)
        if "status" in doc:
            doc["status"] = self.status.value
        return doc

    @classmethod
    def from_mongodb_dict(cls, doc: dict) -> "ComposioActionAudit":
        """Create ComposioActionAudit from MongoDB document."""
        if "_id" in doc and doc["_id"]:
            doc["_id"] = PyObjectId(doc["_id"])
        if "status" in doc:
            doc["status"] = ActionStatus(doc["status"])
        return cls(**doc)

    def is_successful(self) -> bool:
        """Check if action executed successfully."""
        return self.status == ActionStatus.SUCCESS

    def increment_retry(self) -> None:
        """Increment retry count."""
        self.retry_count += 1
        self.status = ActionStatus.RETRYING
