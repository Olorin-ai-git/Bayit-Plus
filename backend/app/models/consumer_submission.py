"""
Consumer URL Submission Model

Tracks consumer-submitted video URLs through the extraction pipeline.
Persists job state in MongoDB (replaces in-memory tracking).
"""

from datetime import datetime
from typing import Optional
from uuid import uuid4

from beanie import Document
from pydantic import Field


class ConsumerSubmission(Document):
    """Tracks a consumer-submitted video URL through character extraction."""

    job_id: str = Field(default_factory=lambda: uuid4().hex[:12])
    url: str
    fingerprint: str = Field(default="", description="Client fingerprint (demo submissions)")
    user_id: Optional[str] = Field(default=None, description="Authenticated user ID")
    email: Optional[str] = None
    priority: int = Field(default=10, description="Queue priority (0=highest, 10=lowest)")
    source_tier: str = Field(default="free", description="Submitter tier: free|fan|superfan|b2b")
    status: str = Field(default="pending")  # pending | extracting | ready | failed
    content_id: Optional[str] = None
    video_title: Optional[str] = None
    tmdb_id: Optional[int] = None
    character_count: int = 0
    error: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "consumer_submissions"
        indexes = ["job_id", "fingerprint", "priority", "user_id"]
