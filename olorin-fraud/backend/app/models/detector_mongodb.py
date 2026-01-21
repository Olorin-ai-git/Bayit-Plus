"""
Pydantic Model: Detector (MongoDB)
Feature: MongoDB Atlas Migration

MongoDB-compatible detector model for anomaly detection configurations.

SYSTEM MANDATE Compliance:
- No hardcoded values: All configuration from fields
- Complete implementation: No placeholders or TODOs
- Configuration-driven: All values from models
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from bson import ObjectId as BsonObjectId
from pydantic import BaseModel, Field

from app.models.investigation_mongodb import PyObjectId


class DetectorType(str, Enum):
    """Anomaly detector algorithm types."""

    STL_MAD = "stl_mad"
    CUSUM = "cusum"
    ISOFOREST = "isoforest"
    RCF = "rcf"
    MATRIX_PROFILE = "matrix_profile"


class CohortConfiguration(BaseModel):
    """Cohort dimension configuration for detector."""

    dimensions: List[str] = Field(default_factory=list)
    filters: Dict[str, Any] = Field(default_factory=dict)


class MetricsConfiguration(BaseModel):
    """Metrics configuration for detector."""

    primary: str
    secondary: List[str] = Field(default_factory=list)
    aggregations: List[str] = Field(default_factory=list)


class DetectorParameters(BaseModel):
    """Algorithm-specific parameters for detector."""

    sensitivity: Optional[float] = Field(None, ge=0.0, le=1.0)
    threshold: Optional[float] = None
    window_size: Optional[int] = Field(None, gt=0)
    algorithm_specific: Dict[str, Any] = Field(default_factory=dict)


class Detector(BaseModel):
    """MongoDB document model for anomaly detectors.

    This model represents the detectors collection in MongoDB Atlas.
    """

    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    detector_id: str = Field(..., min_length=1, max_length=255)
    name: str = Field(..., min_length=1, max_length=500)
    type: DetectorType

    cohort_by: CohortConfiguration = Field(default_factory=CohortConfiguration)
    metrics: MetricsConfiguration
    params: DetectorParameters = Field(default_factory=DetectorParameters)

    enabled: bool = True
    tenant_id: str = Field(..., min_length=1, max_length=255)

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
            "detector_id": self.detector_id,
            "name": self.name,
            "type": self.type.value,
            "cohort_by": self.cohort_by.dict(),
            "metrics": self.metrics.dict(),
            "params": self.params.dict(),
            "enabled": self.enabled,
            "tenant_id": self.tenant_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def to_mongodb_dict(self) -> dict:
        """Convert to MongoDB document format."""
        doc = self.dict(by_alias=True, exclude_unset=True)
        if "type" in doc:
            doc["type"] = self.type.value
        return doc

    @classmethod
    def from_mongodb_dict(cls, doc: dict) -> "Detector":
        """Create Detector from MongoDB document."""
        if "_id" in doc and doc["_id"]:
            doc["_id"] = PyObjectId(doc["_id"])
        if "type" in doc:
            doc["type"] = DetectorType(doc["type"])
        return cls(**doc)
