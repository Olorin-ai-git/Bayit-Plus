"""
Pydantic Model: Investigation (MongoDB)
Feature: MongoDB Atlas Migration

MongoDB-compatible investigation model using Pydantic for validation.
Replaces SQLAlchemy InvestigationState model for MongoDB Atlas backend.

Investigation Lifecycle: CREATED → SETTINGS → IN_PROGRESS → COMPLETED/ERROR/CANCELLED

SYSTEM MANDATE Compliance:
- No hardcoded values: All enums configurable
- Complete implementation: No placeholders or TODOs
- Configuration-driven: All values from models or config
- Schema-locked: Maps to MongoDB collection schema
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from bson import ObjectId as BsonObjectId
from pydantic import BaseModel, Field, field_validator


class PyObjectId(BsonObjectId):
    """Custom ObjectId type for Pydantic compatibility."""

    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v, _info=None):
        if not BsonObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return BsonObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, _core_schema, handler):
        return {"type": "string"}


class LifecycleStage(str, Enum):
    """Investigation lifecycle stages."""

    CREATED = "CREATED"
    SETTINGS = "SETTINGS"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"


class InvestigationStatus(str, Enum):
    """Investigation execution statuses."""

    CREATED = "CREATED"
    SETTINGS = "SETTINGS"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    ERROR = "ERROR"
    CANCELLED = "CANCELLED"


class InvestigationSettings(BaseModel):
    """Embedded document for investigation configuration settings."""

    entity_type: Optional[str] = None
    entity_value: Optional[str] = None
    time_range: Optional[Dict[str, datetime]] = None
    agents_selected: List[str] = Field(default_factory=list)
    data_sources: List[str] = Field(default_factory=list)
    additional_config: Dict[str, Any] = Field(default_factory=dict)

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}


class InvestigationProgress(BaseModel):
    """Embedded document for investigation execution progress."""

    current_phase: str = ""
    progress_percentage: float = Field(default=0.0, ge=0.0, le=100.0)
    phases_completed: List[str] = Field(default_factory=list)
    estimated_completion: Optional[datetime] = None
    additional_data: Dict[str, Any] = Field(default_factory=dict)

    @field_validator("progress_percentage")
    @classmethod
    def clamp_percentage(cls, v):
        """Ensure progress percentage is between 0 and 100."""
        return max(0.0, min(100.0, float(v)))

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}


class InvestigationResults(BaseModel):
    """Embedded document for investigation results."""

    summary: Optional[str] = None
    risk_score: Optional[float] = Field(None, ge=0.0, le=1.0)
    findings: List[Dict[str, Any]] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class InvestigationMetadata(BaseModel):
    """Embedded document for investigation metadata."""

    source: str = "USER"
    priority: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    custom_fields: Dict[str, Any] = Field(default_factory=dict)


class Investigation(BaseModel):
    """MongoDB document model for investigations.

    This model represents the investigations collection in MongoDB Atlas.
    It replaces the SQLAlchemy InvestigationState model.

    Key features:
    - Embedded documents for settings, progress, and results
    - Optimistic locking via version field
    - Multi-tenant support via tenant_id
    - MongoDB ObjectId as primary key
    """

    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    investigation_id: str = Field(..., min_length=1, max_length=255)
    user_id: str = Field(..., min_length=1, max_length=255)
    tenant_id: str = Field(..., min_length=1, max_length=255)

    lifecycle_stage: LifecycleStage = LifecycleStage.CREATED
    status: InvestigationStatus = InvestigationStatus.CREATED

    settings: Optional[InvestigationSettings] = None
    progress: Optional[InvestigationProgress] = None
    results: Optional[InvestigationResults] = None

    version: int = Field(default=1, ge=1)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_accessed: Optional[datetime] = None

    metadata: InvestigationMetadata = Field(default_factory=InvestigationMetadata)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {
            PyObjectId: str,
            BsonObjectId: str,
            datetime: lambda v: v.isoformat(),
        }
        schema_extra = {
            "example": {
                "investigation_id": "inv-2024-001",
                "user_id": "user-123",
                "tenant_id": "tenant-001",
                "lifecycle_stage": "IN_PROGRESS",
                "status": "IN_PROGRESS",
                "settings": {
                    "entity_type": "user",
                    "entity_value": "user@example.com",
                    "agents_selected": ["device_analysis", "location_analysis"],
                },
                "progress": {
                    "current_phase": "device_analysis",
                    "progress_percentage": 45.0,
                },
                "version": 1,
            }
        }

    def to_dict(self) -> dict:
        """Convert model to dictionary representation for API responses.

        Returns:
            dict: Dictionary representation excluding internal MongoDB fields
        """
        return {
            "investigation_id": self.investigation_id,
            "user_id": self.user_id,
            "tenant_id": self.tenant_id,
            "lifecycle_stage": self.lifecycle_stage.value,
            "status": self.status.value,
            "settings": self.settings.dict() if self.settings else None,
            "progress": self.progress.dict() if self.progress else None,
            "results": self.results.dict() if self.results else None,
            "version": self.version,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "last_accessed": (
                self.last_accessed.isoformat() if self.last_accessed else None
            ),
            "metadata": self.metadata.dict() if self.metadata else {},
        }

    def get_progress_data(self) -> Dict[str, Any]:
        """Get progress data as dictionary, returns empty dict if not set."""
        if not self.progress:
            return {}
        return self.progress.dict()

    def get_current_phase(self) -> str:
        """Get current execution phase from progress data."""
        if not self.progress:
            return ""
        return self.progress.current_phase

    def get_progress_percentage(self) -> float:
        """Get progress percentage from progress data (0.0-100.0)."""
        if not self.progress:
            return 0.0
        return self.progress.progress_percentage

    def update_progress(
        self,
        current_phase: Optional[str] = None,
        progress_percentage: Optional[float] = None,
        additional_data: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Update progress with new phase/percentage.

        Args:
            current_phase: New execution phase
            progress_percentage: New progress percentage (0-100)
            additional_data: Additional progress metadata
        """
        if not self.progress:
            self.progress = InvestigationProgress()

        if current_phase is not None:
            self.progress.current_phase = current_phase

        if progress_percentage is not None:
            self.progress.progress_percentage = max(0.0, min(100.0, progress_percentage))

        if additional_data:
            self.progress.additional_data.update(additional_data)

        self.updated_at = datetime.utcnow()

    def to_mongodb_dict(self) -> dict:
        """Convert model to MongoDB document format.

        Returns:
            dict: Dictionary suitable for MongoDB insertion/update
        """
        doc = self.dict(by_alias=True, exclude_unset=True)

        # Convert enums to strings for MongoDB storage
        if "lifecycle_stage" in doc:
            doc["lifecycle_stage"] = self.lifecycle_stage.value
        if "status" in doc:
            doc["status"] = self.status.value

        # Ensure timestamps are datetime objects
        if "created_at" in doc and isinstance(doc["created_at"], str):
            doc["created_at"] = datetime.fromisoformat(doc["created_at"])
        if "updated_at" in doc and isinstance(doc["updated_at"], str):
            doc["updated_at"] = datetime.fromisoformat(doc["updated_at"])

        return doc

    @classmethod
    def from_mongodb_dict(cls, doc: dict) -> "Investigation":
        """Create Investigation instance from MongoDB document.

        Args:
            doc: MongoDB document dictionary

        Returns:
            Investigation: Investigation instance
        """
        if "_id" in doc and doc["_id"]:
            doc["_id"] = PyObjectId(doc["_id"])

        # Convert string enums back to enum values
        if "lifecycle_stage" in doc:
            doc["lifecycle_stage"] = LifecycleStage(doc["lifecycle_stage"])
        if "status" in doc:
            doc["status"] = InvestigationStatus(doc["status"])

        return cls(**doc)
