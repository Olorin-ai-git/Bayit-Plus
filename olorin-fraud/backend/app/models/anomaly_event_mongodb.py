"""
Pydantic Model: AnomalyEvent (MongoDB)
Feature: MongoDB Atlas Migration

MongoDB model for detected anomalies with vector search support.

SYSTEM MANDATE Compliance:
- No hardcoded values: All configuration from fields
- Complete implementation: No placeholders or TODOs
- Vector search enabled: Includes embedding field
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from bson import ObjectId as BsonObjectId
from pydantic import BaseModel, Field

from app.models.investigation_mongodb import PyObjectId


class AnomalySeverity(str, Enum):
    """Anomaly severity levels."""

    INFO = "info"
    WARN = "warn"
    CRITICAL = "critical"


class AnomalyStatus(str, Enum):
    """Anomaly triage status."""

    NEW = "new"
    TRIAGED = "triaged"
    CLOSED = "closed"


class AnomalyWindow(BaseModel):
    """Time window for anomaly detection."""

    start: datetime
    end: datetime
    duration_minutes: Optional[float] = None


class AnomalyEvent(BaseModel):
    """MongoDB document model for detected anomalies.

    This model represents the anomaly_events collection with
    Atlas Vector Search support via the embedding field.
    """

    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    anomaly_id: str = Field(..., min_length=1, max_length=255)

    # References
    run_id: str = Field(..., min_length=1, max_length=255)
    detector_id: str = Field(..., min_length=1, max_length=255)
    investigation_id: Optional[str] = Field(None, max_length=255)
    tenant_id: str = Field(..., min_length=1, max_length=255)

    # Cohort information (flexible schema)
    cohort: Dict[str, Any] = Field(default_factory=dict)

    # Time window
    window: AnomalyWindow

    # Metrics and scoring
    metric: str = Field(..., min_length=1)
    observed: float
    expected: float
    score: float = Field(..., ge=0.0)
    severity: AnomalySeverity
    status: AnomalyStatus = AnomalyStatus.NEW

    # Persistence tracking
    persisted_n: int = Field(default=1, ge=1)
    first_seen: Optional[datetime] = None
    last_seen: Optional[datetime] = None

    # Evidence (flexible schema)
    evidence: Dict[str, Any] = Field(default_factory=dict)

    # Vector embedding for Atlas Vector Search (768-dim)
    embedding: List[float] = Field(default_factory=list)

    created_at: datetime = Field(default_factory=datetime.utcnow)

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
            "anomaly_id": self.anomaly_id,
            "run_id": self.run_id,
            "detector_id": self.detector_id,
            "investigation_id": self.investigation_id,
            "tenant_id": self.tenant_id,
            "cohort": self.cohort,
            "window": {
                "start": self.window.start.isoformat() if self.window.start else None,
                "end": self.window.end.isoformat() if self.window.end else None,
                "duration_minutes": self.window.duration_minutes,
            },
            "metric": self.metric,
            "observed": self.observed,
            "expected": self.expected,
            "score": self.score,
            "severity": self.severity.value,
            "status": self.status.value,
            "persisted_n": self.persisted_n,
            "first_seen": self.first_seen.isoformat() if self.first_seen else None,
            "last_seen": self.last_seen.isoformat() if self.last_seen else None,
            "evidence": self.evidence,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def to_mongodb_dict(self) -> dict:
        """Convert to MongoDB document format."""
        doc = self.dict(by_alias=True, exclude_unset=True)
        if "severity" in doc:
            doc["severity"] = self.severity.value
        if "status" in doc:
            doc["status"] = self.status.value
        return doc

    @classmethod
    def from_mongodb_dict(cls, doc: dict) -> "AnomalyEvent":
        """Create AnomalyEvent from MongoDB document."""
        if "_id" in doc and doc["_id"]:
            doc["_id"] = PyObjectId(doc["_id"])
        if "severity" in doc:
            doc["severity"] = AnomalySeverity(doc["severity"])
        if "status" in doc:
            doc["status"] = AnomalyStatus(doc["status"])
        return cls(**doc)

    def has_embedding(self) -> bool:
        """Check if anomaly has embedding vector."""
        return bool(self.embedding and len(self.embedding) > 0)

    def get_embedding_dimension(self) -> int:
        """Get embedding vector dimension."""
        return len(self.embedding) if self.embedding else 0
