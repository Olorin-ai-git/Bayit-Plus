"""
Pydantic Model: DetectionRun (MongoDB Time Series)
Feature: MongoDB Atlas Migration

MongoDB time series model for detection run execution tracking.

SYSTEM MANDATE Compliance:
- No hardcoded values: All configuration from fields
- Complete implementation: No placeholders or TODOs
- Time series optimized: Uses timeField and metaField
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, Optional

from bson import ObjectId as BsonObjectId
from pydantic import BaseModel, Field

from app.models.investigation_mongodb import PyObjectId


class DetectionRunStatus(str, Enum):
    """Detection run execution statuses."""

    QUEUED = "queued"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"


class DetectionRunMetadata(BaseModel):
    """Metadata for time series detection run (metaField)."""

    detector_id: str
    detector_type: Optional[str] = None
    tenant_id: str
    status: DetectionRunStatus


class DetectionWindow(BaseModel):
    """Time window for detection run."""

    from_time: datetime = Field(alias="from")
    to_time: datetime = Field(alias="to")
    duration_hours: Optional[float] = None

    class Config:
        populate_by_name = True


class DetectionRunInfo(BaseModel):
    """Execution information for detection run."""

    records_processed: Optional[int] = Field(None, ge=0)
    cohorts_analyzed: Optional[int] = Field(None, ge=0)
    anomalies_detected: Optional[int] = Field(None, ge=0)
    error_message: Optional[str] = None
    additional_info: Dict[str, Any] = Field(default_factory=dict)


class DetectionRun(BaseModel):
    """MongoDB time series document for detection runs.

    This model represents the detection_runs time series collection.
    Uses started_at as timeField and metadata as metaField.
    """

    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    run_id: str = Field(..., min_length=1, max_length=255)

    # Time series fields
    metadata: DetectionRunMetadata  # metaField
    started_at: datetime  # timeField

    finished_at: Optional[datetime] = None
    duration_ms: Optional[int] = Field(None, ge=0)

    window: DetectionWindow
    info: DetectionRunInfo = Field(default_factory=DetectionRunInfo)

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
            "run_id": self.run_id,
            "detector_id": self.metadata.detector_id,
            "detector_type": self.metadata.detector_type,
            "tenant_id": self.metadata.tenant_id,
            "status": self.metadata.status.value,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "finished_at": self.finished_at.isoformat() if self.finished_at else None,
            "duration_ms": self.duration_ms,
            "window": self.window.dict(by_alias=True),
            "info": self.info.dict(),
        }

    def to_mongodb_dict(self) -> dict:
        """Convert to MongoDB document format."""
        doc = self.dict(by_alias=True, exclude_unset=True)
        if "metadata" in doc and "status" in doc["metadata"]:
            doc["metadata"]["status"] = self.metadata.status.value
        return doc

    @classmethod
    def from_mongodb_dict(cls, doc: dict) -> "DetectionRun":
        """Create DetectionRun from MongoDB document."""
        if "_id" in doc and doc["_id"]:
            doc["_id"] = PyObjectId(doc["_id"])
        if "metadata" in doc and "status" in doc["metadata"]:
            doc["metadata"]["status"] = DetectionRunStatus(doc["metadata"]["status"])
        return cls(**doc)
