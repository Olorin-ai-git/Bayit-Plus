"""CanonicalMemory: vetted Q&A promoted from candidates. Phase 1 ships QA only."""

from datetime import datetime, timezone
from typing import Literal, Optional

from beanie import Document
from pydantic import BaseModel, Field
from pymongo import ASCENDING, IndexModel

CanonicalStatus = Literal["active", "stale", "pending_review", "retracted"]
CanonicalScope = Literal["partner", "global"]
CitationType = Literal["video", "document"]


class Citation(BaseModel):
    type: CitationType
    content_id: str | None = None
    document_id: str | None = None
    timestamp_seconds: float | None = None
    page_number: int | None = None
    orphaned: bool = False


class CanonicalMemory(Document):
    partner_id: Optional[str] = None
    scope: CanonicalScope = "partner"
    question: str
    answer: str
    citations: list[Citation] = Field(default_factory=list)
    status: CanonicalStatus = "active"
    stale_after_months: Optional[int] = 6
    last_verified_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    created_by: str
    promoted_from_candidate: Optional[str] = None

    class Settings:
        name = "canonical_memories"
        indexes = [
            "partner_id",
            "scope",
            "status",
            IndexModel([("partner_id", ASCENDING), ("status", ASCENDING)]),
            IndexModel([("scope", ASCENDING), ("status", ASCENDING)]),
            IndexModel(
                [("partner_id", ASCENDING), ("last_verified_at", ASCENDING)],
                name="canonical_staleness_sweep_idx",
            ),
        ]
