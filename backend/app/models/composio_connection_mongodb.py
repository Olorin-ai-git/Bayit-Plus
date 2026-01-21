"""
Pydantic Model: ComposioConnection (MongoDB)
Feature: MongoDB Atlas Migration

MongoDB model for OAuth connections to external tools.

SYSTEM MANDATE Compliance:
- No hardcoded values: All configuration from fields
- Complete implementation: No placeholders or TODOs
- Security: Encrypted credentials stored
"""

from datetime import datetime
from enum import Enum
from typing import Optional

from bson import ObjectId as BsonObjectId
from pydantic import BaseModel, Field

from app.models.investigation_mongodb import PyObjectId


class ConnectionStatus(str, Enum):
    """Connection status values."""

    ACTIVE = "active"
    EXPIRED = "expired"
    REVOKED = "revoked"


class ComposioConnection(BaseModel):
    """MongoDB document model for Composio OAuth connections.

    This model represents the composio_connections collection for
    managing external tool integrations.
    """

    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    connection_id: str = Field(..., min_length=1, max_length=255)
    tenant_id: str = Field(..., min_length=1, max_length=255)
    toolkit_name: str = Field(..., min_length=1, max_length=255)

    # Connection metadata
    composio_connection_id: str = Field(..., min_length=1, max_length=255)
    status: ConnectionStatus = ConnectionStatus.ACTIVE

    # Encrypted credentials (use MongoDB Client-Side Field Level Encryption)
    encrypted_access_token: str = Field(..., min_length=1)
    refresh_token: Optional[str] = None

    # Timestamps
    expires_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_used_at: Optional[datetime] = None

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {
            PyObjectId: str,
            BsonObjectId: str,
            datetime: lambda v: v.isoformat(),
        }

    def to_dict(self) -> dict:
        """Convert model to dictionary for API responses (excludes tokens)."""
        return {
            "connection_id": self.connection_id,
            "tenant_id": self.tenant_id,
            "toolkit_name": self.toolkit_name,
            "composio_connection_id": self.composio_connection_id,
            "status": self.status.value,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "last_used_at": self.last_used_at.isoformat() if self.last_used_at else None,
        }

    def to_mongodb_dict(self) -> dict:
        """Convert to MongoDB document format."""
        doc = self.dict(by_alias=True, exclude_unset=True)
        if "status" in doc:
            doc["status"] = self.status.value
        return doc

    @classmethod
    def from_mongodb_dict(cls, doc: dict) -> "ComposioConnection":
        """Create ComposioConnection from MongoDB document."""
        if "_id" in doc and doc["_id"]:
            doc["_id"] = PyObjectId(doc["_id"])
        if "status" in doc:
            doc["status"] = ConnectionStatus(doc["status"])
        return cls(**doc)

    def is_expired(self) -> bool:
        """Check if connection token is expired."""
        if not self.expires_at:
            return False
        return datetime.utcnow() >= self.expires_at

    def is_active(self) -> bool:
        """Check if connection is active and not expired."""
        return self.status == ConnectionStatus.ACTIVE and not self.is_expired()

    def mark_used(self) -> None:
        """Update last used timestamp."""
        self.last_used_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()
