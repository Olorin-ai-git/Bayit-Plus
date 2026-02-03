"""Trivia Models - facts and fun facts for content during video playback."""

from datetime import datetime
from typing import Dict, List, Literal, Optional
from uuid import uuid4

from beanie import Document
from pydantic import BaseModel, Field, field_validator, model_validator
from pymongo import ReturnDocument


class TriviaFactModel(BaseModel):
    """Individual trivia fact with multilingual translations.

    NEW SCHEMA (Post-Migration):
    - text: English source text (always populated)
    - source_language: Honest source tracking ("en" or "he")
    - translations: Dict[str, str] for Hebrew/Spanish translations

    DEPRECATED FIELDS (For migration compatibility):
    - text_en, text_es: Legacy multilingual fields
    """
    fact_id: str = Field(default_factory=lambda: str(uuid4()))

    # NEW SCHEMA: Multilingual content with translation dictionary
    text: str = Field(..., min_length=1, description="English source text (always populated)")
    source_language: Literal["en", "he"] = Field(
        default="en",
        description="Source language - 'en' for English-generated, 'he' for Hebrew-generated"
    )
    translations: Dict[str, str] = Field(
        default_factory=dict,
        description="Translations: {'he': 'Hebrew text', 'es': 'Spanish text'}"
    )

    # DEPRECATED: Legacy multilingual fields (keep for migration compatibility)
    text_en: Optional[str] = Field(
        None,
        deprecated=True,
        description="DEPRECATED: Use 'text' and 'translations' instead"
    )
    text_es: Optional[str] = Field(
        None,
        deprecated=True,
        description="DEPRECATED: Use 'translations[\"es\"]' instead"
    )

    trigger_time: Optional[float] = Field(
        None, ge=0, description="Seconds into content"
    )
    trigger_type: str = Field("random", pattern="^(time|scene|actor|random)$")
    category: str = Field(
        ..., pattern="^(cast|production|location|cultural|historical)$"
    )
    source: str = Field("manual", pattern="^(tmdb|ai|manual|cultural_reference)$")
    display_duration: int = Field(default=15, ge=5, le=30)
    priority: int = Field(default=5, ge=1, le=10)
    related_person: Optional[str] = None

    # Chain fields for follow-up fact linking
    chain_id: Optional[str] = Field(
        None, description="Groups related facts (UUID, null = standalone)"
    )
    chain_order: Optional[int] = Field(
        None, ge=0, description="0-indexed position in chain (0 = hook/root)"
    )
    has_follow_up: bool = Field(
        default=False, description="True if next fact in chain exists"
    )

    @field_validator("text")
    @classmethod
    def validate_text_not_empty(cls, v: str) -> str:
        """Ensure English source text is not empty."""
        if not v or not v.strip():
            raise ValueError("Text field (English source) cannot be empty or whitespace")
        return v.strip()

    @field_validator("translations")
    @classmethod
    def validate_translations(cls, v: Dict[str, str]) -> Dict[str, str]:
        """Validate translation dictionary - strip whitespace and remove empty values."""
        if not isinstance(v, dict):
            return {}

        # Strip whitespace and filter out empty translations
        cleaned = {}
        for lang_code, translation_text in v.items():
            if isinstance(translation_text, str):
                stripped = translation_text.strip()
                if stripped:
                    cleaned[lang_code] = stripped

        return cleaned

    @field_validator("text_en", "text_es", mode="before")
    @classmethod
    def strip_optional_text(cls, v: Optional[str]) -> Optional[str]:
        """DEPRECATED: Strip optional legacy text fields."""
        if v is not None and isinstance(v, str):
            return v.strip() or None
        return v

    @model_validator(mode="after")
    def validate_chain_consistency(self) -> "TriviaFactModel":
        """Ensure chain_id and chain_order are both set or both null."""
        has_id = self.chain_id is not None
        has_order = self.chain_order is not None
        if has_id != has_order:
            raise ValueError(
                "chain_id and chain_order must both be set or both be null"
            )
        return self

    @model_validator(mode="after")
    def validate_source_language_consistency(self) -> "TriviaFactModel":
        """Ensure source_language matches the content structure.

        Rules:
        - If source_language="en", text should be English (always true by definition)
        - If source_language="he", text contains Hebrew (we trust the generator)
        - translations dict should NOT include the source language
        """
        # Validate translations don't include source language
        if self.source_language in self.translations:
            # Remove source language from translations (shouldn't translate to itself)
            del self.translations[self.source_language]

        return self

    def get_text_for_language(self, lang_code: str) -> str:
        """Get trivia text for a specific language.

        Args:
            lang_code: Language code (e.g., "en", "he", "es")

        Returns:
            Text in requested language, falling back to English if not available

        Fallback order:
        1. translations[lang_code] if available
        2. text (English source) as fallback
        """
        # If requesting source language, return source text
        if lang_code == self.source_language:
            return self.text

        # Check translations dictionary
        if lang_code in self.translations:
            return self.translations[lang_code]

        # Fallback to English source
        return self.text


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
            # NEW: Index for querying by source language
            "facts.source_language",
            # NEW: Compound index for content + enrichment status
            [("content_id", 1), ("is_enriched", 1)],
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
    """API response for a single trivia fact.

    Supports both new schema (translations dict) and legacy fields for backward compatibility.
    """

    fact_id: str
    text: str  # English source text (NEW SCHEMA)

    # NEW SCHEMA: Source language and translations
    source_language: Literal["en", "he"] = "en"
    translations: Dict[str, str] = Field(default_factory=dict)

    # DEPRECATED: Legacy multilingual fields (kept for backward compatibility)
    text_he: Optional[str] = Field(
        None,
        deprecated=True,
        description="DEPRECATED: Use translations['he'] instead"
    )
    text_en: Optional[str] = Field(
        None,
        deprecated=True,
        description="DEPRECATED: Use 'text' instead (always English)"
    )
    text_es: Optional[str] = Field(
        None,
        deprecated=True,
        description="DEPRECATED: Use translations['es'] instead"
    )

    trigger_time: Optional[float] = None
    category: str
    display_duration: int
    priority: int

    # Chain fields for follow-up linking
    chain_id: Optional[str] = None
    chain_order: Optional[int] = None
    has_follow_up: bool = False

    class Config:
        from_attributes = True

    @model_validator(mode="after")
    def populate_legacy_fields(self) -> "TriviaFactResponse":
        """Populate legacy text_* fields from new schema for backward compatibility.

        This ensures old clients still receive data in the expected format.
        """
        # Populate text_en from source text (always English)
        if not self.text_en:
            self.text_en = self.text

        # Populate text_he from translations if available
        if not self.text_he and "he" in self.translations:
            self.text_he = self.translations["he"]

        # Populate text_es from translations if available
        if not self.text_es and "es" in self.translations:
            self.text_es = self.translations["es"]

        return self


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
    display_duration: int = Field(15, ge=5, le=30)

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
