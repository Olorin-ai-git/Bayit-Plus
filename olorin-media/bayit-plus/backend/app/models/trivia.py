"""
Trivia Models.
Stores trivia facts and fun facts for content during video playback.
"""

from datetime import datetime
from typing import List, Optional
from uuid import uuid4

from beanie import Document
from pydantic import BaseModel, Field, field_validator, model_validator
from pymongo import ReturnDocument


class TriviaFactModel(BaseModel):
    """Individual trivia fact with multilingual support."""

    fact_id: str = Field(default_factory=lambda: str(uuid4()))
    text: str = Field(..., min_length=1, description="Hebrew text (required)")
    text_en: str = Field(..., min_length=1, description="English text (required)")
    text_es: str = Field(..., min_length=1, description="Spanish text (required)")
    trigger_time: Optional[float] = Field(
        None, ge=0, description="Seconds into content"
    )
    trigger_type: str = Field("random", pattern="^(time|scene|actor|random|topic)$")
    category: str = Field(
        ..., pattern="^(cast|production|location|cultural|historical)$"
    )
    source: str = Field("manual", pattern="^(tmdb|ai|manual|cultural_reference|wikipedia|web_search|live_ai)$")

    # NEW: Live trivia fields
    detected_topic: Optional[str] = Field(
        None,
        description="Original topic text detected from transcript"
    )
    topic_type: Optional[str] = Field(
        None,
        pattern="^(person|place|event|organization)$",
        description="Entity type of detected topic"
    )
    search_query: Optional[str] = Field(
        None,
        description="Wikipedia/web search query used"
    )
    relevance_score: Optional[float] = Field(
        None,
        ge=0.0,
        le=1.0,
        description="AI relevance score (0.0-1.0)"
    )
    display_duration: int = Field(default=10, ge=5, le=30)
    priority: int = Field(default=5, ge=1, le=10)
    related_person: Optional[str] = None

    @field_validator("text", "text_en", "text_es")
    @classmethod
    def validate_text_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Text field cannot be empty or whitespace")
        return v.strip()


class ContentTrivia(Document):
    """Trivia facts for a piece of content."""

    content_id: str = Field(..., description="Reference to Content document")
    content_type: str = Field("vod", pattern="^(vod|series_episode)$")
    facts: List[TriviaFactModel] = Field(default_factory=list, max_length=50)
    sources_used: List[str] = Field(default_factory=list)
    tmdb_id: Optional[int] = None
    is_enriched: bool = False
    enriched_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    @model_validator(mode="after")
    def validate_facts_count(self) -> "ContentTrivia":
        if len(self.facts) > 50:
            raise ValueError("Maximum 50 facts per content item")
        return self

    class Settings:
        name = "content_trivia"
        indexes = [
            "content_id",
            "tmdb_id",
            "is_enriched",
        ]
        # Unique compound index defined separately via IndexModel
        unique_indexes = [
            {"keys": [("content_id", 1), ("content_type", 1)], "unique": True}
        ]

    @classmethod
    async def get_for_content(cls, content_id: str) -> Optional["ContentTrivia"]:
        """Get trivia for a specific content."""
        return await cls.find_one(cls.content_id == content_id)

    @classmethod
    async def create_or_update(
        cls,
        content_id: str,
        content_type: str,
        facts: List[TriviaFactModel],
        sources_used: List[str],
        tmdb_id: Optional[int] = None,
        is_enriched: bool = False,
    ) -> "ContentTrivia":
        """Create new trivia or update existing using atomic find_one_and_update."""
        now = datetime.utcnow()
        facts_dicts = [f.model_dump() for f in facts]

        update_data = {
            "$set": {
                "facts": facts_dicts,
                "sources_used": sources_used,
                "tmdb_id": tmdb_id,
                "is_enriched": is_enriched,
                "updated_at": now,
            },
            "$setOnInsert": {
                "content_id": content_id,
                "content_type": content_type,
                "created_at": now,
            },
        }

        if is_enriched:
            update_data["$set"]["enriched_at"] = now

        collection = cls.get_pymongo_collection()
        result = await collection.find_one_and_update(
            {"content_id": content_id, "content_type": content_type},
            update_data,
            upsert=True,
            return_document=ReturnDocument.AFTER,
        )

        return cls.model_validate(result)


# API Response Models
class TriviaFactResponse(BaseModel):
    """API response for a single trivia fact."""

    fact_id: str
    text: str  # Kept for backward compatibility (Hebrew)

    # NEW: Optional multilingual fields
    text_he: Optional[str] = None
    text_en: Optional[str] = None
    text_es: Optional[str] = None

    trigger_time: Optional[float] = None
    category: str
    display_duration: int
    priority: int

    class Config:
        from_attributes = True


class TriviaResponse(BaseModel):
    """API response for content trivia."""

    content_id: str
    facts: List[TriviaFactResponse]
    is_enriched: bool

    class Config:
        from_attributes = True


class TriviaPreferencesRequest(BaseModel):
    """User trivia preferences update request."""

    enabled: bool = True
    frequency: str = Field("normal", pattern="^(off|low|normal|high)$")
    categories: List[str] = Field(
        default_factory=lambda: ["cast", "production", "cultural"], max_length=5
    )
    display_duration: int = Field(10, ge=5, le=30)

    # NEW: Language display preferences
    display_languages: List[str] = Field(
        default_factory=lambda: ["he", "en"],
        min_length=1,
        max_length=3,
        description="Languages to display (1-3 languages)",
    )

    @field_validator("categories")
    @classmethod
    def validate_categories(cls, v: List[str]) -> List[str]:
        """Validate categories are from allowed list."""
        allowed = {"cast", "production", "location", "cultural", "historical"}
        invalid = set(v) - allowed
        if invalid:
            raise ValueError(f"Invalid categories: {invalid}")
        return list(set(v))

    @field_validator("display_languages")
    @classmethod
    def validate_display_languages(cls, v: List[str]) -> List[str]:
        """Validate display languages are from allowed list and remove duplicates."""
        allowed = {"he", "en", "es"}
        invalid = set(v) - allowed
        if invalid:
            raise ValueError(f"Invalid language codes: {invalid}")
        # Remove duplicates while preserving order
        return list(dict.fromkeys(v))
