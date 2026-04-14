"""
Request/response schemas for the demo portal proxy routes.
"""

from typing import List, Optional

from pydantic import BaseModel, Field


class ValidateCodeRequest(BaseModel):
    code: str = Field(..., min_length=1, max_length=128)


class ValidateCodeResponse(BaseModel):
    valid: bool
    unlocked_content: List[str] = Field(default_factory=list)


class DemoSearchRequest(BaseModel):
    content_id: str = Field(..., min_length=1)
    query: str = Field(..., min_length=2, max_length=500)
    language: str = Field(default="he")
    limit: int = Field(default=20, ge=1, le=100)
    min_score: float = Field(default=0.6, ge=0.0, le=1.0)


class DemoSearchResultItem(BaseModel):
    content_id: str
    title: str
    matched_text: str
    match_type: str
    relevance_score: float
    timestamp_seconds: Optional[float] = None
    timestamp_formatted: Optional[str] = None
    deep_link: Optional[str] = None


class DemoSearchResponse(BaseModel):
    query: str
    results: List[DemoSearchResultItem]
    total_results: int


class DemoRecapRequest(BaseModel):
    content_id: str = Field(..., min_length=1)
    target_language: str = Field(default="en")


class DemoRecapResponse(BaseModel):
    content_id: str
    summary: str
    key_points: List[str]


class TrackUserRequest(BaseModel):
    email: str = Field(..., min_length=1, max_length=254)
    name: str = Field(..., min_length=1, max_length=256)
    provider: str = Field(..., min_length=1, max_length=64)
    utm_source: Optional[str] = Field(default=None, max_length=128)
    utm_medium: Optional[str] = Field(default=None, max_length=128)
    utm_campaign: Optional[str] = Field(default=None, max_length=256)


class TrackProgressRequest(BaseModel):
    stop_id: str = Field(..., min_length=1, max_length=128)
    time_spent_seconds: int = Field(..., ge=0)


class TrackStatusResponse(BaseModel):
    status: str


class CreateDemoCodeRequest(BaseModel):
    code: Optional[str] = Field(default=None, max_length=128)
    content_ids: List[str] = Field(..., min_length=1, max_length=50)
    expires_in_days: int = Field(default=90, ge=1, le=730)
    max_uses: Optional[int] = Field(default=None, ge=1, le=10000)


class DemoCodeItem(BaseModel):
    code: str
    content_ids: List[str]
    expires_at: str
    max_uses: Optional[int] = None
    use_count: int


class ListDemoCodesResponse(BaseModel):
    codes: List[DemoCodeItem]
    total: int
