"""
Pydantic Model: TransactionScore (MongoDB)
Feature: MongoDB Atlas Migration

MongoDB model for per-transaction risk scores (high volume).

SYSTEM MANDATE Compliance:
- No hardcoded values: All configuration from fields
- Complete implementation: No placeholders or TODOs
- Sharding optimized: Composite key for horizontal scaling
"""

from datetime import datetime
from typing import Optional

from bson import ObjectId as BsonObjectId
from pydantic import BaseModel, Field

from app.models.investigation_mongodb import PyObjectId


class ScoreComponents(BaseModel):
    """Risk score component breakdown."""

    device_risk: Optional[float] = Field(None, ge=0.0, le=1.0)
    location_risk: Optional[float] = Field(None, ge=0.0, le=1.0)
    velocity_risk: Optional[float] = Field(None, ge=0.0, le=1.0)
    network_risk: Optional[float] = Field(None, ge=0.0, le=1.0)


class TransactionScore(BaseModel):
    """MongoDB document model for transaction risk scores.

    This model represents the transaction_scores collection.
    Optimized for high-volume storage (100K+ transactions).
    Uses composite index (investigation_id, transaction_id) for sharding.
    """

    id: Optional[PyObjectId] = Field(default=None, alias="_id")

    # Composite key for sharding
    investigation_id: str = Field(..., min_length=1, max_length=255)
    transaction_id: str = Field(..., min_length=1, max_length=255)
    tenant_id: str = Field(..., min_length=1, max_length=255)

    # Risk scoring
    risk_score: float = Field(..., ge=0.0, le=1.0)
    score_components: Optional[ScoreComponents] = None

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
            "investigation_id": self.investigation_id,
            "transaction_id": self.transaction_id,
            "tenant_id": self.tenant_id,
            "risk_score": self.risk_score,
            "score_components": (
                self.score_components.dict() if self.score_components else None
            ),
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def to_mongodb_dict(self) -> dict:
        """Convert to MongoDB document format."""
        return self.dict(by_alias=True, exclude_unset=True)

    @classmethod
    def from_mongodb_dict(cls, doc: dict) -> "TransactionScore":
        """Create TransactionScore from MongoDB document."""
        if "_id" in doc and doc["_id"]:
            doc["_id"] = PyObjectId(doc["_id"])
        return cls(**doc)

    def get_composite_key(self) -> tuple:
        """Get composite key for uniqueness checking."""
        return (self.investigation_id, self.transaction_id)
