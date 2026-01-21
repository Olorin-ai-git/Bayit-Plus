"""
Pydantic Model: Template (MongoDB)
Feature: MongoDB Atlas Migration

MongoDB model for user-created investigation templates.

SYSTEM MANDATE Compliance:
- No hardcoded values: All configuration from fields
- Complete implementation: No placeholders or TODOs
- User-scoped: Templates belong to users and tenants
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from bson import ObjectId as BsonObjectId
from pydantic import BaseModel, Field

from app.models.investigation_mongodb import PyObjectId


class TemplateConfiguration(BaseModel):
    """Template configuration structure."""

    entity_type: Optional[str] = None
    settings: Dict[str, Any] = Field(default_factory=dict)
    agents: List[str] = Field(default_factory=list)
    data_sources: List[str] = Field(default_factory=list)
    default_params: Dict[str, Any] = Field(default_factory=dict)


class Template(BaseModel):
    """MongoDB document model for investigation templates.

    This model represents the templates collection for saving
    and reusing investigation configurations.
    """

    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    template_id: str = Field(..., min_length=1, max_length=255)
    user_id: str = Field(..., min_length=1, max_length=255)
    tenant_id: str = Field(..., min_length=1, max_length=255)

    # Template metadata
    name: str = Field(..., min_length=1, max_length=500)
    description: Optional[str] = Field(None, max_length=2000)
    tags: List[str] = Field(default_factory=list)

    # Template configuration
    template: TemplateConfiguration = Field(default_factory=TemplateConfiguration)

    # Usage tracking
    usage_count: int = Field(default=0, ge=0)
    last_used: Optional[datetime] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

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
            "template_id": self.template_id,
            "user_id": self.user_id,
            "tenant_id": self.tenant_id,
            "name": self.name,
            "description": self.description,
            "tags": self.tags,
            "template": self.template.dict(),
            "usage_count": self.usage_count,
            "last_used": self.last_used.isoformat() if self.last_used else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def to_mongodb_dict(self) -> dict:
        """Convert to MongoDB document format."""
        return self.dict(by_alias=True, exclude_unset=True)

    @classmethod
    def from_mongodb_dict(cls, doc: dict) -> "Template":
        """Create Template from MongoDB document."""
        if "_id" in doc and doc["_id"]:
            doc["_id"] = PyObjectId(doc["_id"])
        return cls(**doc)

    def increment_usage(self) -> None:
        """Increment usage count and update last used timestamp."""
        self.usage_count += 1
        self.last_used = datetime.utcnow()
        self.updated_at = datetime.utcnow()
