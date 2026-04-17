"""AskCandidate: every /ask call writes one; powers admin queue + user history."""

from datetime import datetime, timezone
from typing import Literal, Optional

from beanie import Document
from pydantic import BaseModel, Field
from pymongo import ASCENDING, DESCENDING, IndexModel

AskMode = Literal["canonical_verbatim", "blended", "video_only", "no_match"]
AskScope = Literal["partner", "global"]


class CandidateSource(BaseModel):
    content_id: str
    content_title: str
    matched_text: str
    timestamp_seconds: float | None = None
    relevance_score: float


class CandidateCanonicalHit(BaseModel):
    canonical_id: str
    question: str
    answer: str
    boosted_score: float
    status: str


class CandidateDocumentHit(BaseModel):
    document_id: str
    title: str
    chunk_index: int
    matched_text: str
    page_number: int | None = None


class AskCandidate(Document):
    partner_id: str
    asker_user_id: str
    scope: AskScope = "partner"
    question: str
    answer: str
    mode: AskMode
    sources: list[CandidateSource] = Field(default_factory=list)
    canonical_hits: list[CandidateCanonicalHit] = Field(default_factory=list)
    document_hits: list[CandidateDocumentHit] = Field(default_factory=list)
    credits_charged: int = 0
    promoted_to: Optional[str] = None
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    dismissed: bool = False
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    class Settings:
        name = "ask_candidates"
        indexes = [
            "partner_id",
            "asker_user_id",
            IndexModel([("partner_id", ASCENDING), ("created_at", DESCENDING)]),
            IndexModel([("asker_user_id", ASCENDING), ("created_at", DESCENDING)]),
            IndexModel([("partner_id", ASCENDING), ("dismissed", ASCENDING), ("promoted_to", ASCENDING)]),
        ]
