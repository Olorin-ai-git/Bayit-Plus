"""Typed Pydantic schema for documentary source metadata."""

import re
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

_HTML_TAG_PATTERN = re.compile(r"<[^>]+>")
_MAX_TEXT_LENGTH = 5000
_MAX_KEYWORD_LENGTH = 100
_MAX_KEYWORDS = 50


def _sanitize_html(value: Optional[str], max_length: int = _MAX_TEXT_LENGTH) -> Optional[str]:
    if value is None:
        return None
    cleaned = _HTML_TAG_PATTERN.sub("", value)
    return cleaned[:max_length]


class DocumentarySourceMetadata(BaseModel):
    model_config = ConfigDict(extra="forbid")

    original_title: Optional[str] = None
    original_description: Optional[str] = None
    keywords: List[str] = Field(default_factory=list)
    date_created: Optional[str] = None
    center: Optional[str] = None
    branch: Optional[str] = None
    record_group: Optional[str] = None
    credit: Optional[str] = None
    duration_seconds: Optional[int] = None
    has_captions: bool = False
    captions_url: Optional[str] = None

    @field_validator("original_title", mode="before")
    @classmethod
    def sanitize_title(cls, v: Optional[str]) -> Optional[str]:
        return _sanitize_html(v, max_length=500)

    @field_validator("original_description", mode="before")
    @classmethod
    def sanitize_description(cls, v: Optional[str]) -> Optional[str]:
        return _sanitize_html(v, max_length=_MAX_TEXT_LENGTH)

    @field_validator("keywords", mode="before")
    @classmethod
    def validate_keywords(cls, v: List[str]) -> List[str]:
        if len(v) > _MAX_KEYWORDS:
            v = v[:_MAX_KEYWORDS]
        return [kw[:_MAX_KEYWORD_LENGTH] for kw in v if isinstance(kw, str)]

    @field_validator("center", "branch", "record_group", "credit", mode="before")
    @classmethod
    def sanitize_short_field(cls, v: Optional[str]) -> Optional[str]:
        return _sanitize_html(v, max_length=200)
