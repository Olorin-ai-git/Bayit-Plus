"""
Pydantic Model: AuditLog (MongoDB Time Series)
Feature: MongoDB Atlas Migration

MongoDB time series model for investigation lifecycle audit trail.

SYSTEM MANDATE Compliance:
- No hardcoded values: All configuration from fields
- Complete implementation: No placeholders or TODOs
- Time series optimized: Uses timestamp and metadata fields
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, Optional

from bson import ObjectId as BsonObjectId
from pydantic import BaseModel, Field

from app.models.investigation_mongodb import PyObjectId


class AuditActionType(str, Enum):
    """Audit log action types."""

    CREATE = "CREATE"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
    EXECUTE = "EXECUTE"
    STATE_CHANGE = "STATE_CHANGE"
    SETTINGS_CHANGE = "SETTINGS_CHANGE"


class AuditSource(str, Enum):
    """Audit log source systems."""

    POLLING = "POLLING"
    USER = "USER"
    SYSTEM = "SYSTEM"
    API = "API"
    WEBHOOK = "WEBHOOK"


class AuditLogMetadata(BaseModel):
    """Metadata for time series audit log (metaField)."""

    investigation_id: str
    user_id: str
    tenant_id: str
    action_type: AuditActionType
    source: AuditSource


class AuditChanges(BaseModel):
    """Change tracking for audit entry."""

    fields_modified: list = Field(default_factory=list)
    before: Dict[str, Any] = Field(default_factory=dict)
    after: Dict[str, Any] = Field(default_factory=dict)


class AuditLog(BaseModel):
    """MongoDB time series document for audit logs.

    This model represents the audit_log time series collection.
    Uses timestamp as timeField and metadata as metaField.
    """

    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    entry_id: str = Field(..., min_length=1, max_length=255)

    # Time series fields
    metadata: AuditLogMetadata  # metaField
    timestamp: datetime  # timeField

    # Change tracking
    changes: AuditChanges = Field(default_factory=AuditChanges)
    state_snapshot: Dict[str, Any] = Field(default_factory=dict)

    # Version tracking
    from_version: Optional[int] = Field(None, ge=0)
    to_version: Optional[int] = Field(None, ge=0)

    # Context
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None

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
            "entry_id": self.entry_id,
            "investigation_id": self.metadata.investigation_id,
            "user_id": self.metadata.user_id,
            "tenant_id": self.metadata.tenant_id,
            "action_type": self.metadata.action_type.value,
            "source": self.metadata.source.value,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "changes": self.changes.dict(),
            "state_snapshot": self.state_snapshot,
            "from_version": self.from_version,
            "to_version": self.to_version,
            "ip_address": self.ip_address,
            "user_agent": self.user_agent,
        }

    def to_mongodb_dict(self) -> dict:
        """Convert to MongoDB document format."""
        doc = self.dict(by_alias=True, exclude_unset=True)
        if "metadata" in doc:
            if "action_type" in doc["metadata"]:
                doc["metadata"]["action_type"] = self.metadata.action_type.value
            if "source" in doc["metadata"]:
                doc["metadata"]["source"] = self.metadata.source.value
        return doc

    @classmethod
    def from_mongodb_dict(cls, doc: dict) -> "AuditLog":
        """Create AuditLog from MongoDB document."""
        if "_id" in doc and doc["_id"]:
            doc["_id"] = PyObjectId(doc["_id"])
        if "metadata" in doc:
            if "action_type" in doc["metadata"]:
                doc["metadata"]["action_type"] = AuditActionType(
                    doc["metadata"]["action_type"]
                )
            if "source" in doc["metadata"]:
                doc["metadata"]["source"] = AuditSource(doc["metadata"]["source"])
        return cls(**doc)
