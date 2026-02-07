"""Pydantic schemas for documentary import API endpoints."""

import re
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator

# Allowed source providers
VALID_SOURCES = {"nasa", "dvids", "nara"}
_SOURCE_PATTERN = r"^(nasa|dvids|nara)$"
_SOURCE_ID_PATTERN = re.compile(r"^[a-zA-Z0-9_\- ]{1,200}$")
_DANGEROUS_CHARS = re.compile(r"[<>;|$`\\&]")


class CuratedImportRequest(BaseModel):
    source: Optional[str] = Field(None, pattern=_SOURCE_PATTERN)
    dry_run: bool = False


class SpecificImportRequest(BaseModel):
    source: str = Field(..., pattern=_SOURCE_PATTERN)
    source_ids: List[str] = Field(..., min_length=1, max_length=100)

    @field_validator("source_ids", mode="before")
    @classmethod
    def validate_source_ids(cls, v: List[str]) -> List[str]:
        for sid in v:
            if not _SOURCE_ID_PATTERN.match(sid):
                raise ValueError(
                    f"Invalid source_id: must be alphanumeric/hyphens/underscores, max 200 chars"
                )
        return v


class SourceSearchRequest(BaseModel):
    source: str = Field(..., pattern=_SOURCE_PATTERN)
    query: str = Field(..., min_length=1, max_length=200)
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=50)

    @field_validator("query", mode="before")
    @classmethod
    def sanitize_query(cls, v: str) -> str:
        if _DANGEROUS_CHARS.search(v):
            raise ValueError("Query contains forbidden characters")
        return v.strip()


class IncrementalSyncRequest(BaseModel):
    source: str = Field(..., pattern=_SOURCE_PATTERN)
    since: Optional[datetime] = None
    max_items: int = Field(100, ge=1, le=1000)


class ImportResult(BaseModel):
    imported_count: int = 0
    skipped_count: int = 0
    error_count: int = 0
    errors: List[str] = Field(default_factory=list)
    dry_run: bool = False


class SourceSearchResult(BaseModel):
    source_id: str
    title: str
    description: Optional[str] = None
    year: Optional[int] = None
    thumbnail_url: Optional[str] = None
    video_url: Optional[str] = None
    duration_seconds: Optional[int] = None


class ImportStats(BaseModel):
    source: str
    total_imported: int = 0
    last_sync_at: Optional[datetime] = None
    last_item_date: Optional[datetime] = None
