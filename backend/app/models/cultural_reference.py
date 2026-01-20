"""
Cultural Reference Models for Olorin.ai Context Engine

Knowledge base for Israeli/Jewish cultural references.
"""

from datetime import datetime, timezone
from typing import Optional, List, Literal
from beanie import Document
from pydantic import BaseModel, Field


# Category types for cultural references
ReferenceCategory = Literal[
    "person",
    "place",
    "event",
    "term",
    "organization",
    "holiday",
    "food",
    "slang",
    "law",
    "military",
    "media",
    "sport",
    "religion",
]

SubcategoryType = Literal[
    # Person subcategories
    "politician",
    "celebrity",
    "historical_figure",
    "religious_leader",
    "athlete",
    "journalist",
    # Place subcategories
    "city",
    "neighborhood",
    "landmark",
    "region",
    "historical_site",
    # Event subcategories
    "war",
    "election",
    "protest",
    "tragedy",
    "celebration",
    # Term subcategories
    "legal_term",
    "military_term",
    "slang_term",
    "religious_term",
    "political_term",
    # Organization subcategories
    "political_party",
    "government_agency",
    "ngo",
    "company",
    "media_outlet",
    # Other
    "jewish_holiday",
    "israeli_food",
    "idf_unit",
    "religious_practice",
]


class CulturalReference(Document):
    """Israeli/Jewish cultural reference knowledge base entry."""

    # Identification
    reference_id: str = Field(..., description="Normalized unique identifier")
    canonical_name: str = Field(..., description="Primary name in Hebrew")
    canonical_name_en: Optional[str] = Field(default=None, description="Primary name in English")

    # Classification
    category: ReferenceCategory = Field(...)
    subcategory: Optional[str] = Field(default=None)

    # Alternative names/spellings
    aliases: List[str] = Field(default_factory=list, description="All Hebrew aliases")
    aliases_en: List[str] = Field(default_factory=list, description="All English aliases")
    aliases_es: List[str] = Field(default_factory=list, description="All Spanish aliases")

    # Explanations (multilingual)
    short_explanation: str = Field(..., description="1-2 sentence explanation in Hebrew")
    short_explanation_en: Optional[str] = Field(default=None)
    short_explanation_es: Optional[str] = Field(default=None)

    detailed_explanation: Optional[str] = Field(default=None, description="Full explanation in Hebrew")
    detailed_explanation_en: Optional[str] = Field(default=None)
    detailed_explanation_es: Optional[str] = Field(default=None)

    # Context and relationships
    relevance_keywords: List[str] = Field(
        default_factory=list,
        description="Keywords that indicate this reference may be relevant",
    )
    related_references: List[str] = Field(
        default_factory=list,
        description="reference_ids of related entries",
    )

    # Metadata
    source: str = Field(default="manual", description="manual, wikipedia, ai_generated")
    verified: bool = Field(default=False, description="Admin-verified entry")
    wikipedia_url: Optional[str] = Field(default=None)
    image_url: Optional[str] = Field(default=None)

    # Usage tracking
    lookup_count: int = Field(default=0)
    last_accessed_at: Optional[datetime] = Field(default=None)

    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "cultural_references"
        indexes = [
            "reference_id",
            "category",
            "subcategory",
            "verified",
            "aliases",
            "relevance_keywords",
            [("category", 1), ("subcategory", 1)],
            [("lookup_count", -1)],
        ]


class DetectedReference(BaseModel):
    """A cultural reference detected in text."""

    reference_id: str
    canonical_name: str
    canonical_name_en: Optional[str] = None
    category: str
    subcategory: Optional[str] = None

    # Match details
    matched_text: str = Field(..., description="The exact text that matched")
    start_position: int = Field(..., description="Start position in original text")
    end_position: int = Field(..., description="End position in original text")
    confidence: float = Field(..., ge=0.0, le=1.0)

    # Explanation
    short_explanation: str
    short_explanation_en: Optional[str] = None


class ContextDetectionRequest(BaseModel):
    """Request to detect cultural references in text."""

    text: str = Field(..., min_length=1, max_length=10000)
    language: str = Field(default="he", description="Input text language")
    target_language: str = Field(default="en", description="Language for explanations")
    min_confidence: float = Field(default=0.7, ge=0.0, le=1.0)
    include_detailed: bool = Field(default=False, description="Include detailed explanations")


class ContextDetectionResponse(BaseModel):
    """Response with detected cultural references."""

    original_text: str
    references: List[DetectedReference]
    total_found: int
    tokens_used: int


class EnrichedText(BaseModel):
    """Text with inline cultural annotations."""

    original_text: str
    enriched_text: str = Field(..., description="Text with embedded reference markers")
    annotations: List[dict] = Field(
        default_factory=list,
        description="List of {reference_id, position, explanation}",
    )


class ReferenceExplanation(BaseModel):
    """Full explanation for a cultural reference."""

    reference_id: str
    canonical_name: str
    canonical_name_en: Optional[str] = None
    category: str
    subcategory: Optional[str] = None

    # Explanations
    short_explanation: str
    detailed_explanation: Optional[str] = None

    # Metadata
    wikipedia_url: Optional[str] = None
    image_url: Optional[str] = None
    related_references: List[str] = []
