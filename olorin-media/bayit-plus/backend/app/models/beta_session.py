"""
Beta Session Model

Tracks active dubbing sessions for credit checkpointing.
"""

from datetime import datetime
from typing import Optional, Dict, Any
from beanie import Document, Indexed
from pydantic import Field


class BetaSession(Document):
    """
    Active dubbing session with periodic credit checkpoints.

    Attributes:
        session_id: Unique session identifier (indexed)
        user_id: Reference to BetaUser ID
        feature: Feature being used (live_dubbing, ai_search, etc.)
        status: Session status (active, paused, ended)
        start_time: Session start timestamp
        end_time: Session end timestamp (when ended)
        last_checkpoint: Last checkpoint timestamp
        credits_consumed: Total credits consumed in this session
        metadata: Additional session metadata
    """

    session_id: Indexed(str, unique=True)  # type: ignore
    user_id: str
    feature: str = Field(
        pattern="^(live_dubbing|ai_search|ai_recommendations)$"
    )
    status: str = Field(
        default="active",
        pattern="^(active|paused|ended)$"
    )
    start_time: datetime = Field(default_factory=datetime.utcnow)
    end_time: Optional[datetime] = None
    last_checkpoint: datetime = Field(default_factory=datetime.utcnow)
    credits_consumed: int = Field(default=0, ge=0)
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)

    class Settings:
        name = "beta_sessions"
        indexes = [
            "session_id",  # Unique index
            [("user_id", 1), ("status", 1)],  # User's active sessions
            [("status", 1), ("last_checkpoint", 1)],  # Checkpoint worker query
            [("start_time", -1)],  # Recent sessions
        ]

    class Config:
        json_schema_extra = {
            "example": {
                "session_id": "sess_abc123def456",
                "user_id": "507f1f77bcf86cd799439011",
                "feature": "live_dubbing",
                "status": "active",
                "start_time": "2026-01-29T14:00:00Z",
                "end_time": None,
                "last_checkpoint": "2026-01-29T14:05:00Z",
                "credits_consumed": 300,
                "metadata": {
                    "content_id": "content_123",
                    "language": "en"
                }
            }
        }

    def duration_seconds(self) -> float:
        """Calculate session duration in seconds."""
        end = self.end_time or datetime.utcnow()
        delta = end - self.start_time
        return delta.total_seconds()

    def checkpoint_lag_seconds(self) -> float:
        """Calculate time since last checkpoint in seconds."""
        delta = datetime.utcnow() - self.last_checkpoint
        return delta.total_seconds()

    def is_active(self) -> bool:
        """Check if session is currently active."""
        return self.status == "active"

    def is_timed_out(self, timeout_seconds: int) -> bool:
        """Check if session has exceeded timeout."""
        return self.checkpoint_lag_seconds() > timeout_seconds
