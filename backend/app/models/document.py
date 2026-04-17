"""Document: uploaded/pasted/URL reference material for Ask Olorin corpus."""

from datetime import datetime, timezone
from typing import Literal, Optional

from beanie import Document as BeanieDocument
from pydantic import BaseModel, Field
from pymongo import ASCENDING, DESCENDING, IndexModel

DocumentStatus = Literal["pending", "ready", "failed", "stale"]
DocumentScope = Literal["partner", "global"]
DocumentFormat = Literal["pdf", "markdown", "url"]


class DocumentChunk(BaseModel):
    index: int
    text: str
    page_number: int | None = None
    heading_path: list[str] = Field(default_factory=list)
    char_offset: int | None = None


class Document(BeanieDocument):
    partner_id: Optional[str] = None
    scope: DocumentScope = "partner"
    source_format: DocumentFormat
    title: str
    source_url: Optional[str] = None
    gcs_path: Optional[str] = None
    status: DocumentStatus = "pending"
    word_count: int = 0
    chunk_count: int = 0
    chunks: list[DocumentChunk] = Field(default_factory=list)
    created_by: str
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    last_reindexed_at: Optional[datetime] = None
    error: Optional[str] = None

    class Settings:
        name = "documents"
        indexes = [
            "partner_id",
            "status",
            "scope",
            IndexModel([("partner_id", ASCENDING), ("status", ASCENDING)]),
            IndexModel([("partner_id", ASCENDING), ("created_at", DESCENDING)]),
        ]
