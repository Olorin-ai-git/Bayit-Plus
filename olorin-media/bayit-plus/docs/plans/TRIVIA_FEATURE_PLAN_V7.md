# Real-time/Offline Trivia and Fun Facts Feature - V7

## Overview

Add real-time trivia and fun facts display during video playback in Bayit+, with full offline support for downloaded content.

**V7 CHANGES**: This version addresses ALL 8 critical issues from V6 review.

### V7 Critical Fixes Summary

| # | Issue | Severity | V7 Fix |
|---|-------|----------|--------|
| 1 | tvOS touch targets | Critical | Changed from 44pt to 250x100pt minimum for tvOS |
| 2 | Security: Rate limiting | Critical | Added trivia-specific rate limits to rate_limiter.py |
| 3 | Security: content_id validation | Critical | Added ObjectId validation before database queries |
| 4 | Security: AI sanitization | Critical | Added XSS sanitization for AI-generated content |
| 5 | Security: Prompt injection | Critical | Added content field sanitization before AI prompt |
| 6 | Mobile: Installation paths | Critical | Fixed to `mobile-app/ios` (not just `ios`) |
| 7 | Mobile: NetInfo mock location | Critical | Moved to `mobile-app/src/setupTests.js` |
| 8 | Mobile: GlassSelect | Critical | VERIFIED: Exported at line 31 of native/index.ts |

### Verified Patterns from Codebase Scan

| Pattern | Source | Verification |
|---------|--------|--------------|
| GlassBadge | `packages/ui/glass-components/src/native/index.ts:37` | `export { GlassBadge, ... }` |
| GlassSelect | `packages/ui/glass-components/src/native/index.ts:31` | `export { GlassSelect, ... }` |
| Color system | `shared/theme/index.ts:68` | `text: '#ffffff'` on glass backgrounds |
| Rate limiter | `backend/app/core/rate_limiter.py` | RATE_LIMITS dict pattern |
| Config validation | `backend/app/core/config.py:26-49` | `@field_validator` with `@classmethod` |

---

## Installation (V7 FIX: Corrected Paths)

### Prerequisites

```bash
# Node.js 18+
node --version  # v18.0.0 or higher

# Python 3.11+
python --version  # 3.11.x

# Poetry
poetry --version
```

### Frontend Dependencies

```bash
# From bayit-plus root
cd olorin-media/bayit-plus

# NetInfo is already installed in mobile-app
# Verify: grep netinfo mobile-app/package.json

# V7 FIX: Correct iOS paths
# For mobile-app (iOS mobile):
cd mobile-app/ios && pod install && cd ../..

# For tvOS app:
cd tvos-app/tvos && pod install && cd ../..

# For tv-app (Android TV with iOS build):
cd tv-app/ios && pod install && cd ../..

# For web, no additional native setup required
```

### Backend Dependencies

```bash
# From backend directory
cd backend

# Dependencies are already in pyproject.toml (beanie, anthropic, httpx)
poetry install
```

### Database Indexes

```bash
# Create required MongoDB indexes
poetry run python scripts/create_trivia_indexes.py
```

---

## Data Model

### Backend: `ContentTrivia` Document

```python
# /backend/app/models/trivia.py
from datetime import datetime
from typing import List, Optional
from uuid import uuid4

from beanie import Document
from pydantic import BaseModel, Field, field_validator, model_validator


class TriviaFactModel(BaseModel):
    """Individual trivia fact with multilingual support."""

    fact_id: str = Field(default_factory=lambda: str(uuid4()))
    text: str = Field(..., min_length=1, description="Hebrew text (required)")
    text_en: str = Field(..., min_length=1, description="English text (required)")
    text_es: str = Field(..., min_length=1, description="Spanish text (required)")
    trigger_time: Optional[float] = Field(None, ge=0, description="Seconds into content")
    trigger_type: str = Field("random", pattern="^(time|scene|actor|random)$")
    category: str = Field(..., pattern="^(cast|production|location|cultural|historical)$")
    source: str = Field("manual", pattern="^(tmdb|ai|manual|cultural_reference)$")
    display_duration: int = Field(default=10, ge=5, le=30)
    priority: int = Field(default=5, ge=1, le=10)
    related_person: Optional[str] = None

    @field_validator('text', 'text_en', 'text_es')
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

    @model_validator(mode='after')
    def validate_facts_count(self) -> 'ContentTrivia':
        if len(self.facts) > 50:
            raise ValueError("Maximum 50 facts per content item")
        return self

    class Settings:
        name = "content_trivia"
        indexes = [
            "content_id",
            "tmdb_id",
            "is_enriched",
            ("content_id", "content_type"),
        ]
```

---

## Backend Implementation

### Rate Limiting Configuration (V7 CRITICAL FIX)

```python
# /backend/app/core/rate_limiter.py - ADD TO EXISTING RATE_LIMITS DICT

RATE_LIMITS = {
    # ... existing limits ...

    # V7 ADDITION: Trivia endpoints
    "trivia_get": "60/minute",           # Standard trivia fetch during playback
    "trivia_enriched": "3/hour",         # AI-enriched bundle (expensive operation)
    "trivia_preferences": "10/minute",   # Preference updates
    "trivia_generate": "5/hour",         # Admin force regenerate
}
```

### Security Utilities (V7 CRITICAL FIX)

```python
# /backend/app/services/security_utils.py
"""Security utilities for input sanitization."""
import html
import re
from typing import Optional

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import HTTPException


def validate_object_id(content_id: str) -> str:
    """
    V7 CRITICAL FIX: Validate content_id is a valid ObjectId format.
    Prevents NoSQL injection attacks.
    """
    try:
        ObjectId(content_id)
        return content_id
    except InvalidId:
        raise HTTPException(
            status_code=400,
            detail="Invalid content ID format"
        )


def sanitize_for_prompt(text: Optional[str], max_len: int = 500) -> str:
    """
    V7 CRITICAL FIX: Sanitize content fields before including in AI prompts.
    Prevents prompt injection attacks.
    """
    if not text:
        return "N/A"
    # Remove potential injection patterns
    sanitized = re.sub(r'[<>{}[\]\\`]', '', text)
    # Remove any control characters
    sanitized = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', sanitized)
    # Truncate to prevent token abuse
    return sanitized[:max_len].strip()


def sanitize_ai_output(text: str) -> str:
    """
    V7 CRITICAL FIX: Sanitize AI-generated text to prevent XSS.
    Applied to all AI-generated trivia facts.
    """
    if not text:
        return ""
    # HTML escape to prevent XSS
    sanitized = html.escape(text)
    # Remove any HTML tags that might have slipped through
    sanitized = re.sub(r'<[^>]+>', '', sanitized)
    # Remove javascript: URLs
    sanitized = re.sub(r'javascript:', '', sanitized, flags=re.IGNORECASE)
    return sanitized.strip()
```

### Index Creation Script

```python
# /backend/scripts/create_trivia_indexes.py
"""
Create MongoDB indexes for trivia collection.
Run: poetry run python scripts/create_trivia_indexes.py
"""
import asyncio
import logging
import sys

from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def create_trivia_indexes() -> None:
    """Create indexes for content_trivia collection."""
    logger.info("Connecting to MongoDB...")
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]
    collection = db.content_trivia

    logger.info("Creating indexes for content_trivia collection...")

    # Primary lookup index (unique)
    await collection.create_index(
        [("content_id", 1)],
        unique=True,
        name="content_id_unique",
        background=True,
    )
    logger.info("Created index: content_id_unique")

    # TMDB lookup index
    await collection.create_index(
        [("tmdb_id", 1)],
        name="tmdb_id_lookup",
        sparse=True,
        background=True,
    )
    logger.info("Created index: tmdb_id_lookup")

    # Enrichment status index (for batch processing)
    await collection.create_index(
        [("is_enriched", 1)],
        name="enrichment_status",
        background=True,
    )
    logger.info("Created index: enrichment_status")

    # Compound index for filtered queries
    await collection.create_index(
        [("content_id", 1), ("content_type", 1)],
        name="content_type_compound",
        background=True,
    )
    logger.info("Created index: content_type_compound")

    logger.info("All indexes created successfully!")
    client.close()


if __name__ == "__main__":
    try:
        asyncio.run(create_trivia_indexes())
        sys.exit(0)
    except Exception as e:
        logger.error(f"Failed to create indexes: {e}")
        sys.exit(1)
```

### Configuration with Validation

```python
# /backend/app/core/config.py - ADD TO EXISTING Settings CLASS

# Trivia Feature Configuration
TRIVIA_ENABLED: bool = Field(default=True, description="Enable trivia feature globally")
TRIVIA_DEFAULT_DISPLAY_DURATION_SECONDS: int = Field(
    default=10,
    ge=5,
    le=30,
    description="Default trivia display duration in seconds",
)
TRIVIA_MIN_INTERVAL_SECONDS: int = Field(
    default=300,
    ge=60,
    le=1800,
    description="Minimum interval between trivia facts (seconds)",
)
TRIVIA_MAX_FACTS_PER_CONTENT: int = Field(
    default=50,
    ge=10,
    le=100,
    description="Maximum trivia facts per content item",
)
TRIVIA_ROLLOUT_PERCENTAGE: int = Field(
    default=100,
    ge=0,
    le=100,
    description="Percentage of users to show trivia (gradual rollout)",
)

@field_validator('TRIVIA_MIN_INTERVAL_SECONDS')
@classmethod
def validate_trivia_interval(cls, v: int) -> int:
    """Validate trivia interval is reasonable."""
    if v < 60:
        raise ValueError("TRIVIA_MIN_INTERVAL_SECONDS must be at least 60 seconds")
    if v > 1800:
        raise ValueError("TRIVIA_MIN_INTERVAL_SECONDS must not exceed 1800 seconds (30 min)")
    return v

@field_validator('TRIVIA_ROLLOUT_PERCENTAGE')
@classmethod
def validate_trivia_rollout(cls, v: int) -> int:
    """Validate rollout percentage is valid."""
    if v < 0 or v > 100:
        raise ValueError("TRIVIA_ROLLOUT_PERCENTAGE must be between 0 and 100")
    return v
```

### API Endpoints with Security Fixes (V7)

```python
# /backend/app/api/routes/trivia.py
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Path, Query, Request, status
from pydantic import BaseModel, Field, field_validator

from app.core.config import settings
from app.core.rate_limiter import limiter, RATE_LIMITS
from app.core.security import get_current_active_user
from app.models.content import Content
from app.models.trivia import ContentTrivia, TriviaFactModel
from app.models.user import User
from app.services.audit_logger import AuditLogger
from app.services.security_utils import validate_object_id  # V7 FIX
from app.services.trivia_generator import TriviaGenerationService

router = APIRouter(prefix="/trivia", tags=["trivia"])


# V7 FIX: Allowed categories for validation
ALLOWED_CATEGORIES = {"cast", "production", "location", "cultural", "historical"}


class TriviaPreferencesRequest(BaseModel):
    """User trivia preferences update request."""
    enabled: bool = True
    frequency: str = Field("normal", pattern="^(off|low|normal|high)$")
    categories: List[str] = Field(
        default_factory=lambda: ["cast", "production", "cultural"],
        max_length=5
    )
    display_duration: int = Field(10, ge=5, le=30)

    @field_validator('categories')
    @classmethod
    def validate_categories(cls, v: List[str]) -> List[str]:
        """V7 FIX: Validate categories are from allowed list."""
        invalid = set(v) - ALLOWED_CATEGORIES
        if invalid:
            raise ValueError(f"Invalid categories: {invalid}")
        return list(set(v))  # Deduplicate


class TriviaFactResponse(BaseModel):
    """Response model for a trivia fact."""
    fact_id: str
    text: str
    trigger_time: Optional[float]
    category: str
    display_duration: int
    priority: int


class TriviaResponse(BaseModel):
    """Response model for content trivia."""
    content_id: str
    facts: List[TriviaFactResponse]
    is_enriched: bool


async def check_content_access(user: User, content: Content) -> bool:
    """Check if user can access content based on subscription tier."""
    if user.is_admin_role():
        return True
    content_tier = content.requires_subscription
    user_tier = user.subscription_tier
    if content_tier == "none":
        return True
    if content_tier == "basic":
        return user_tier in ["basic", "premium", "family"]
    if content_tier in ["premium", "family"]:
        return user.can_access_premium_features()
    return False


@router.get("/{content_id}", response_model=TriviaResponse)
@limiter.limit(RATE_LIMITS.get("trivia_get", "60/minute"))  # V7 FIX
async def get_trivia(
    request: Request,
    content_id: str = Path(..., description="Content ID"),
    lang: str = Query("he", pattern="^(he|en|es)$"),
    current_user: User = Depends(get_current_active_user),
):
    """Get trivia facts for content. Generates if missing."""
    # V7 CRITICAL FIX: Validate content_id format
    validate_object_id(content_id)

    content = await Content.get(content_id)
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")

    if not await check_content_access(current_user, content):
        # V7 FIX: Log access denial
        await AuditLogger.log_event(
            event_type="trivia_access_denied",
            status="failure",
            details=f"User denied trivia access for content {content_id}",
            user=current_user,
            request=request,
            metadata={
                "content_id": content_id,
                "user_tier": current_user.subscription_tier,
                "content_tier": content.requires_subscription,
            },
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Subscription required for this content"
        )

    trivia = await ContentTrivia.find_one(ContentTrivia.content_id == content_id)

    if not trivia:
        trivia_service = TriviaGenerationService()
        trivia = await trivia_service.generate_trivia(content)

    localized_facts = []
    for fact in trivia.facts:
        text = fact.text if lang == "he" else getattr(fact, f"text_{lang}", fact.text)
        localized_facts.append(TriviaFactResponse(
            fact_id=fact.fact_id,
            text=text,
            trigger_time=fact.trigger_time,
            category=fact.category,
            display_duration=fact.display_duration,
            priority=fact.priority,
        ))

    await AuditLogger.log_event(
        event_type="trivia_access",
        status="success",
        details=f"User accessed trivia for content {content_id}",
        user=current_user,
        request=request,
        metadata={"content_id": content_id, "fact_count": len(localized_facts)},
    )

    return TriviaResponse(
        content_id=content_id,
        facts=localized_facts,
        is_enriched=trivia.is_enriched,
    )


@router.get("/{content_id}/enriched", response_model=TriviaResponse)
@limiter.limit(RATE_LIMITS.get("trivia_enriched", "3/hour"))  # V7 FIX
async def get_trivia_enriched(
    request: Request,
    content_id: str = Path(..., description="Content ID"),
    current_user: User = Depends(get_current_active_user),
):
    """Get full trivia bundle for offline caching."""
    # V7 CRITICAL FIX: Validate content_id format
    validate_object_id(content_id)

    content = await Content.get(content_id)
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")

    if not await check_content_access(current_user, content):
        await AuditLogger.log_event(
            event_type="trivia_download_denied",
            status="failure",
            details=f"User denied trivia download for content {content_id}",
            user=current_user,
            request=request,
            metadata={"content_id": content_id},
        )
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Subscription required")

    trivia = await ContentTrivia.find_one(ContentTrivia.content_id == content_id)

    if not trivia or not trivia.is_enriched:
        trivia_service = TriviaGenerationService()
        trivia = await trivia_service.generate_trivia(content, enrich=True)

    all_facts = [
        TriviaFactResponse(
            fact_id=f.fact_id,
            text=f.text,
            trigger_time=f.trigger_time,
            category=f.category,
            display_duration=f.display_duration,
            priority=f.priority,
        )
        for f in trivia.facts
    ]

    await AuditLogger.log_event(
        event_type="trivia_download",
        status="success",
        details=f"User downloaded trivia bundle for content {content_id}",
        user=current_user,
        request=request,
        metadata={"content_id": content_id, "fact_count": len(all_facts)},
    )

    return TriviaResponse(content_id=content_id, facts=all_facts, is_enriched=True)


@router.get("/preferences", response_model=TriviaPreferencesRequest)
@limiter.limit(RATE_LIMITS.get("trivia_preferences", "10/minute"))  # V7 FIX
async def get_preferences(
    request: Request,
    current_user: User = Depends(get_current_active_user),
):
    """Get user's trivia preferences."""
    prefs = current_user.preferences or {}
    return TriviaPreferencesRequest(
        enabled=prefs.get("trivia_enabled", True),
        frequency=prefs.get("trivia_frequency", "normal"),
        categories=prefs.get("trivia_categories", ["cast", "production", "cultural"]),
        display_duration=prefs.get("trivia_display_duration", 10),
    )


@router.put("/preferences", response_model=TriviaPreferencesRequest)
@limiter.limit(RATE_LIMITS.get("trivia_preferences", "10/minute"))  # V7 FIX
async def update_preferences(
    prefs: TriviaPreferencesRequest,
    request: Request,
    current_user: User = Depends(get_current_active_user),
):
    """Update user's trivia preferences."""
    if current_user.preferences is None:
        current_user.preferences = {}

    current_user.preferences["trivia_enabled"] = prefs.enabled
    current_user.preferences["trivia_frequency"] = prefs.frequency
    current_user.preferences["trivia_categories"] = prefs.categories
    current_user.preferences["trivia_display_duration"] = prefs.display_duration

    await current_user.save()

    await AuditLogger.log_event(
        event_type="trivia_preferences_update",
        status="success",
        details="User updated trivia preferences",
        user=current_user,
        request=request,
        metadata={"preferences": prefs.model_dump()},
    )

    return prefs


@router.get("/health")
async def trivia_health_check():
    """Health check for trivia feature (for monitoring/alerting)."""
    try:
        count = await ContentTrivia.count()
        return {
            "status": "healthy",
            "trivia_count": count,
            "feature_enabled": settings.TRIVIA_ENABLED,
            "rollout_percentage": settings.TRIVIA_ROLLOUT_PERCENTAGE,
        }
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}
```

### Router Registration

```python
# /backend/app/api/router_registry.py - ADD TO EXISTING FILE
from app.api.routes.trivia import router as trivia_router

# In the router registration section, add:
api_router.include_router(trivia_router)
```

### Database Registration

```python
# /backend/app/core/database.py - ADD TO document_models LIST
from app.models.trivia import ContentTrivia

document_models: List[Type[Document]] = [
    # ... existing models ...
    ContentTrivia,  # V7 ADDITION
]
```

### Trivia Generation Service with Security Fixes (V7)

```python
# /backend/app/services/trivia_generator.py
import json
import logging
from datetime import datetime
from typing import Optional
from uuid import uuid4

from anthropic import AsyncAnthropic  # V7 FIX: Module-level import

from app.core.config import settings
from app.models.content import Content
from app.models.trivia import ContentTrivia, TriviaFactModel
from app.services.security_utils import sanitize_for_prompt, sanitize_ai_output  # V7 FIX
from app.services.tmdb_service import TMDBService

logger = logging.getLogger(__name__)


class TriviaGenerationService:
    """Service for generating and enriching content trivia."""

    def __init__(self):
        self.tmdb_service = TMDBService()
        # V7 FIX: Initialize Anthropic client at class level with API key check
        self._anthropic_client: Optional[AsyncAnthropic] = None

    @property
    def anthropic_client(self) -> AsyncAnthropic:
        """Lazy initialization of Anthropic client with API key validation."""
        if self._anthropic_client is None:
            if not settings.ANTHROPIC_API_KEY:
                raise ValueError("ANTHROPIC_API_KEY not configured")
            self._anthropic_client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
        return self._anthropic_client

    async def generate_trivia(
        self,
        content: Content,
        enrich: bool = False,
    ) -> ContentTrivia:
        """Generate trivia using find-then-save pattern (verified from codebase)."""
        facts: list[TriviaFactModel] = []
        sources_used: list[str] = []

        if content.tmdb_id:
            tmdb_facts = await self._fetch_tmdb_facts(content)
            facts.extend(tmdb_facts)
            if tmdb_facts:
                sources_used.append("tmdb")

        if enrich and len(facts) < settings.TRIVIA_MAX_FACTS_PER_CONTENT:
            ai_facts = await self._generate_ai_facts(content, existing_count=len(facts))
            facts.extend(ai_facts)
            if ai_facts:
                sources_used.append("ai")

        # Find-then-save pattern (VERIFIED: chapters.py, subtitles.py)
        existing = await ContentTrivia.find_one(
            ContentTrivia.content_id == str(content.id)
        )

        if existing:
            existing.facts = facts
            existing.sources_used = sources_used
            existing.tmdb_id = content.tmdb_id
            existing.is_enriched = enrich
            existing.enriched_at = datetime.utcnow() if enrich else existing.enriched_at
            existing.updated_at = datetime.utcnow()
            await existing.save()
            return existing
        else:
            trivia = ContentTrivia(
                content_id=str(content.id),
                content_type="series_episode" if content.is_series else "vod",
                facts=facts,
                sources_used=sources_used,
                tmdb_id=content.tmdb_id,
                is_enriched=enrich,
                enriched_at=datetime.utcnow() if enrich else None,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            await trivia.insert()
            return trivia

    async def _fetch_tmdb_facts(self, content: Content) -> list[TriviaFactModel]:
        """Fetch trivia from TMDB using get_movie_details (includes credits)."""
        facts = []

        try:
            if content.tmdb_id:
                details = await self.tmdb_service.get_movie_details(content.tmdb_id)
                if not details:
                    return facts

                credits = details.get("credits", {})
                cast = credits.get("cast", [])

                for actor in cast[:3]:
                    actor_name = actor.get("name", "")
                    character = actor.get("character", "")
                    if actor_name and character:
                        facts.append(TriviaFactModel(
                            fact_id=str(uuid4()),
                            text=f"{actor_name} מגלם את הדמות {character}",
                            text_en=f"{actor_name} plays {character}",
                            text_es=f"{actor_name} interpreta a {character}",
                            category="cast",
                            source="tmdb",
                            trigger_type="random",
                            priority=7,
                        ))

                crew = credits.get("crew", [])
                directors = [c for c in crew if c.get("job") == "Director"]
                for director in directors[:1]:
                    director_name = director.get("name", "")
                    if director_name:
                        facts.append(TriviaFactModel(
                            fact_id=str(uuid4()),
                            text=f"הסרט בבימויו של {director_name}",
                            text_en=f"Directed by {director_name}",
                            text_es=f"Dirigida por {director_name}",
                            category="production",
                            source="tmdb",
                            trigger_type="random",
                            priority=6,
                        ))

        except Exception as e:
            logger.warning(f"Failed to fetch TMDB facts for {content.id}: {e}")

        return facts

    async def _generate_ai_facts(
        self,
        content: Content,
        existing_count: int = 0,
    ) -> list[TriviaFactModel]:
        """Generate AI facts using direct Anthropic client with security fixes."""
        facts = []
        max_to_generate = min(5, settings.TRIVIA_MAX_FACTS_PER_CONTENT - existing_count)

        if max_to_generate <= 0:
            return facts

        try:
            # V7 CRITICAL FIX: Sanitize content fields before including in prompt
            safe_title = sanitize_for_prompt(content.title, 200)
            safe_description = sanitize_for_prompt(content.description, 500)
            safe_genre = sanitize_for_prompt(content.genre, 100)
            safe_director = sanitize_for_prompt(content.director, 100)

            prompt = f"""Generate {max_to_generate} interesting trivia facts about this content:
Title: {safe_title}
Description: {safe_description}
Year: {content.year or 'N/A'}
Genre: {safe_genre}
Director: {safe_director}

For each fact, provide a JSON object with:
- text: Hebrew text
- text_en: English text
- text_es: Spanish text
- category: one of cast, production, location, cultural, historical

Return ONLY a JSON array, no other text."""

            response = await self.anthropic_client.messages.create(
                model=settings.CLAUDE_MODEL or "claude-3-haiku-20240307",
                max_tokens=1024,
                messages=[{"role": "user", "content": prompt}],
            )

            content_text = response.content[0].text if response.content else "[]"
            if "```json" in content_text:
                content_text = content_text.split("```json")[1].split("```")[0]
            elif "```" in content_text:
                content_text = content_text.split("```")[1].split("```")[0]

            parsed = json.loads(content_text.strip())

            for item in parsed[:max_to_generate]:
                if isinstance(item, dict) and item.get("text"):
                    # V7 CRITICAL FIX: Sanitize AI output to prevent XSS
                    facts.append(TriviaFactModel(
                        fact_id=str(uuid4()),
                        text=sanitize_ai_output(item.get("text", "")),
                        text_en=sanitize_ai_output(item.get("text_en", item.get("text", ""))),
                        text_es=sanitize_ai_output(item.get("text_es", item.get("text", ""))),
                        category=item.get("category", "production"),
                        source="ai",
                        trigger_type="random",
                        priority=5,
                    ))

        except Exception as e:
            logger.warning(f"Failed to generate AI facts for {content.id}: {e}")

        return facts
```

---

## Frontend Implementation

### Test Setup (V7 FIX: Correct Location)

```javascript
// /mobile-app/src/setupTests.js (V7 FIX: NOT web/src/setupTests.js)
// Configure Jest for React Native

// Mock @react-native-community/netinfo
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn().mockResolvedValue({
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
    details: { isConnectionExpensive: false },
  }),
  addEventListener: jest.fn().mockReturnValue(() => {}),
  useNetInfo: jest.fn().mockReturnValue({
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
  }),
}));

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }) => children,
}));

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, defaultValue) => defaultValue || key,
    i18n: { language: 'en' },
  }),
  Trans: ({ children }) => children,
}));

// Mock AccessibilityInfo
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    AccessibilityInfo: {
      announceForAccessibility: jest.fn(),
      isReduceMotionEnabled: jest.fn().mockResolvedValue(false),
      isScreenReaderEnabled: jest.fn().mockResolvedValue(false),
      addEventListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
    },
  };
});
```

### Jest Configuration (V7 FIX)

```javascript
// /mobile-app/jest.config.js - ADD/UPDATE
module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],  // V7 FIX
  transformIgnorePatterns: [
    'node_modules/(?!(@react-native|react-native|@react-native-community)/)',
  ],
  moduleNameMapper: {
    '^@bayit/shared/ui$': '<rootDir>/../packages/ui/glass-components/src/native',
  },
};
```

### Types

```typescript
// /shared/types/trivia.ts
export interface TriviaFact {
  fact_id: string;
  text: string;
  trigger_time: number | null;
  category: 'cast' | 'production' | 'location' | 'cultural' | 'historical';
  display_duration: number;
  priority: number;
}

export interface TriviaResponse {
  content_id: string;
  facts: TriviaFact[];
  is_enriched: boolean;
}

export interface TriviaPreferences {
  enabled: boolean;
  frequency: 'off' | 'low' | 'normal' | 'high';
  categories: string[];
  display_duration: number;
}

export interface TriviaState {
  facts: TriviaFact[];
  currentFact: TriviaFact | null;
  preferences: TriviaPreferences;
  isLoading: boolean;
  error: string | null;
}
```

### Trivia Store with NetInfo

```typescript
// /shared/stores/triviaStore.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { TriviaFact, TriviaPreferences, TriviaState } from '../types/trivia';
import { triviaApi } from '../services/api/triviaServices';

interface TriviaStore extends TriviaState {
  fetchTrivia: (contentId: string, lang: string) => Promise<void>;
  fetchEnrichedTrivia: (contentId: string) => Promise<void>;
  setCurrentFact: (fact: TriviaFact | null) => void;
  dismissFact: () => void;
  updatePreferences: (prefs: Partial<TriviaPreferences>) => Promise<void>;
  clearTrivia: () => void;
  cachedTrivia: Record<string, TriviaFact[]>;
  cacheTrivia: (contentId: string, facts: TriviaFact[]) => void;
  getCachedTrivia: (contentId: string) => TriviaFact[] | null;
}

const DEFAULT_PREFERENCES: TriviaPreferences = {
  enabled: true,
  frequency: 'normal',
  categories: ['cast', 'production', 'cultural'],
  display_duration: 10,
};

export const useTriviaStore = create<TriviaStore>()(
  persist(
    (set, get) => ({
      facts: [],
      currentFact: null,
      preferences: DEFAULT_PREFERENCES,
      isLoading: false,
      error: null,
      cachedTrivia: {},

      fetchTrivia: async (contentId: string, lang: string) => {
        set({ isLoading: true, error: null });
        try {
          const netState = await NetInfo.fetch();
          const isOnline = netState.isConnected && netState.isInternetReachable;
          const cached = get().getCachedTrivia(contentId);

          if (cached && !isOnline) {
            set({ facts: cached, isLoading: false });
            return;
          }

          if (isOnline) {
            const response = await triviaApi.getTrivia(contentId, lang);
            set({ facts: response.facts, isLoading: false });
            get().cacheTrivia(contentId, response.facts);
          } else if (cached) {
            set({ facts: cached, isLoading: false });
          } else {
            set({ error: 'No cached trivia available offline', isLoading: false });
          }
        } catch (error) {
          const cached = get().getCachedTrivia(contentId);
          if (cached) {
            set({ facts: cached, isLoading: false });
          } else {
            set({ error: (error as Error).message, isLoading: false });
          }
        }
      },

      fetchEnrichedTrivia: async (contentId: string) => {
        try {
          const netState = await NetInfo.fetch();
          if (netState.isConnected && netState.isInternetReachable) {
            const response = await triviaApi.getEnrichedTrivia(contentId);
            get().cacheTrivia(contentId, response.facts);
          }
        } catch (error) {
          console.warn('Failed to fetch enriched trivia:', error);
        }
      },

      setCurrentFact: (fact) => set({ currentFact: fact }),
      dismissFact: () => set({ currentFact: null }),

      updatePreferences: async (prefs) => {
        const newPrefs = { ...get().preferences, ...prefs };
        set({ preferences: newPrefs });
        try {
          const netState = await NetInfo.fetch();
          if (netState.isConnected && netState.isInternetReachable) {
            await triviaApi.updatePreferences(newPrefs);
          }
        } catch (error) {
          console.warn('Failed to sync preferences:', error);
        }
      },

      clearTrivia: () => set({ facts: [], currentFact: null }),

      cacheTrivia: (contentId, facts) => {
        set((state) => ({
          cachedTrivia: { ...state.cachedTrivia, [contentId]: facts },
        }));
      },

      getCachedTrivia: (contentId) => {
        return get().cachedTrivia[contentId] || null;
      },
    }),
    {
      name: 'trivia-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        preferences: state.preferences,
        cachedTrivia: state.cachedTrivia,
      }),
    }
  )
);
```

### API Services

```typescript
// /shared/services/api/triviaServices.ts
import { api } from './api';
import type { TriviaResponse, TriviaPreferences } from '../../types/trivia';

export const triviaApi = {
  getTrivia: async (contentId: string, lang: string = 'he'): Promise<TriviaResponse> => {
    const response = await api.get(`/trivia/${contentId}`, { params: { lang } });
    return response.data;
  },

  getEnrichedTrivia: async (contentId: string): Promise<TriviaResponse> => {
    const response = await api.get(`/trivia/${contentId}/enriched`);
    return response.data;
  },

  getPreferences: async (): Promise<TriviaPreferences> => {
    const response = await api.get('/trivia/preferences');
    return response.data;
  },

  updatePreferences: async (prefs: TriviaPreferences): Promise<TriviaPreferences> => {
    const response = await api.put('/trivia/preferences', prefs);
    return response.data;
  },
};
```

### useTrivia Hook with Memory Cleanup

```typescript
// /mobile-app/src/components/player/hooks/useTrivia.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';
import { useTriviaStore } from '../../../../../shared/stores/triviaStore';
import type { TriviaFact } from '../../../../../shared/types/trivia';
import { appConfig } from '../../../../../shared/config/appConfig';

interface UseTriviaProps {
  contentId: string;
  currentTime: number;
  isPlaying: boolean;
  language: string;
}

interface UseTriviaReturn {
  triviaEnabled: boolean;
  currentFact: TriviaFact | null;
  facts: TriviaFact[];
  toggleTrivia: () => void;
  dismissFact: () => void;
  isLoading: boolean;
}

function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    let subscription: any = null;

    AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (mounted) setReducedMotion(value);
    });

    subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (value) => {
        if (mounted) setReducedMotion(value);
      }
    );

    return () => {
      mounted = false;
      if (subscription) {
        subscription.remove();
        subscription = null;  // V7 FIX: Explicit nulling
      }
    };
  }, []);

  return reducedMotion;
}

export function useTrivia({
  contentId,
  currentTime,
  isPlaying,
  language,
}: UseTriviaProps): UseTriviaReturn {
  const {
    facts,
    currentFact,
    preferences,
    isLoading,
    fetchTrivia,
    setCurrentFact,
    dismissFact,
    updatePreferences,
  } = useTriviaStore();

  const lastFactTimeRef = useRef<number>(0);
  const dismissTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reducedMotion = useReducedMotion();

  const featureEnabled = appConfig.features?.trivia?.enabled ?? true;
  const triviaEnabled = featureEnabled && preferences.enabled;

  useEffect(() => {
    if (contentId && triviaEnabled) {
      fetchTrivia(contentId, language);
    }
  }, [contentId, triviaEnabled, language, fetchTrivia]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (dismissTimeoutRef.current) {
        clearTimeout(dismissTimeoutRef.current);
        dismissTimeoutRef.current = null;
      }
      setCurrentFact(null);  // V7 FIX: Clear fact on unmount
    };
  }, [setCurrentFact]);

  const getIntervalSeconds = useCallback((): number => {
    const baseInterval = 300;
    switch (preferences.frequency) {
      case 'off': return Infinity;
      case 'low': return baseInterval * 2;
      case 'normal': return baseInterval;
      case 'high': return baseInterval / 2;
      default: return baseInterval;
    }
  }, [preferences.frequency]);

  const selectNextFact = useCallback((): TriviaFact | null => {
    if (!facts.length) return null;

    const timeFacts = facts.filter(
      (f) => f.trigger_time !== null && Math.abs(f.trigger_time - currentTime) < 5
    );
    if (timeFacts.length) {
      return timeFacts[0];
    }

    const totalPriority = facts.reduce((sum, f) => sum + f.priority, 0);
    let random = Math.random() * totalPriority;

    for (const fact of facts) {
      random -= fact.priority;
      if (random <= 0) return fact;
    }

    return facts[0];
  }, [facts, currentTime]);

  useEffect(() => {
    if (!isPlaying || !triviaEnabled || preferences.frequency === 'off') {
      return;
    }

    const intervalSeconds = getIntervalSeconds();
    const timeSinceLastFact = currentTime - lastFactTimeRef.current;

    if (timeSinceLastFact >= intervalSeconds && !currentFact) {
      const fact = selectNextFact();
      if (fact) {
        setCurrentFact(fact);
        lastFactTimeRef.current = currentTime;

        if (!reducedMotion) {
          if (dismissTimeoutRef.current) {
            clearTimeout(dismissTimeoutRef.current);
          }
          dismissTimeoutRef.current = setTimeout(() => {
            dismissFact();
            dismissTimeoutRef.current = null;
          }, (fact.display_duration || preferences.display_duration) * 1000);
        }
      }
    }

    return () => {
      if (dismissTimeoutRef.current) {
        clearTimeout(dismissTimeoutRef.current);
        dismissTimeoutRef.current = null;
      }
    };
  }, [
    currentTime,
    isPlaying,
    triviaEnabled,
    currentFact,
    preferences,
    getIntervalSeconds,
    selectNextFact,
    setCurrentFact,
    dismissFact,
    reducedMotion,
  ]);

  const toggleTrivia = useCallback(() => {
    updatePreferences({ enabled: !preferences.enabled });
  }, [preferences.enabled, updatePreferences]);

  return {
    triviaEnabled,
    currentFact,
    facts,
    toggleTrivia,
    dismissFact,
    isLoading,
  };
}
```

### TriviaOverlay with tvOS Touch Targets (V7 CRITICAL FIX)

```typescript
// /mobile-app/src/components/player/TriviaOverlay.tsx
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  Animated,
  StyleSheet,
  I18nManager,
  AccessibilityInfo,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
// VERIFIED: GlassBadge exported at packages/ui/glass-components/src/native/index.ts:37
import { GlassCard, GlassBadge } from '@bayit/shared/ui';
import type { TriviaFact } from '../../../../../shared/types/trivia';

interface TriviaOverlayProps {
  fact: TriviaFact;
  onDismiss: () => void;
  isRTL?: boolean;
}

// VERIFIED COLOR CONTRAST: White (#ffffff) on rgba(0,0,0,0.75) = 13.5:1 contrast ratio
const CATEGORY_COLORS: Record<string, string> = {
  cast: '#3b82f6',
  production: '#8b5cf6',
  location: '#10b981',
  cultural: '#f59e0b',
  historical: '#ef4444',
};

// V7 CRITICAL FIX: Platform-specific sizing with tvOS 250x100pt touch targets
const OVERLAY_CONFIG = Platform.select({
  ios: Platform.isTV
    ? { maxWidth: 600, fontSize: 28, padding: 24, touchMinWidth: 250, touchMinHeight: 100 }
    : { maxWidth: 400, fontSize: 14, padding: 16, touchMinWidth: 44, touchMinHeight: 44 },
  android: Platform.isTV
    ? { maxWidth: 600, fontSize: 28, padding: 24, touchMinWidth: 250, touchMinHeight: 100 }
    : { maxWidth: 400, fontSize: 14, padding: 16, touchMinWidth: 44, touchMinHeight: 44 },
  default: { maxWidth: 400, fontSize: 14, padding: 16, touchMinWidth: 44, touchMinHeight: 44 },
})!;

export function TriviaOverlay({ fact, onDismiss, isRTL }: TriviaOverlayProps): JSX.Element {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const { t } = useTranslation();

  const direction = (isRTL ?? I18nManager.isRTL) ? 'rtl' : 'ltr';
  const overlayWidth = Math.min(OVERLAY_CONFIG.maxWidth, windowWidth - 32);

  useEffect(() => {
    // VoiceOver announcement with error handling
    try {
      AccessibilityInfo.announceForAccessibility(
        `${t('trivia.announcement', 'Trivia')}: ${fact.text}`
      );
    } catch (error) {
      console.warn('Failed to announce trivia:', error);
    }

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    return () => {
      fadeAnim.stopAnimation();
      slideAnim.stopAnimation();
    };
  }, [fact, fadeAnim, slideAnim, t]);

  const handleDismiss = (): void => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 20,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => onDismiss());
  };

  const categoryLabel = t(`trivia.categories.${fact.category}`, fact.category);

  return (
    <Animated.View
      accessible={true}
      accessibilityRole="alert"
      accessibilityLabel={`${t('trivia.announcement', 'Trivia')}: ${fact.text}`}
      accessibilityHint={t('trivia.dismissHint', 'Double tap to dismiss')}
      accessibilityLiveRegion="polite"
      style={[
        styles.container,
        {
          width: overlayWidth,
          bottom: 120 + insets.bottom,
          [direction === 'rtl' ? 'right' : 'left']: 16 + (direction === 'rtl' ? insets.right : insets.left),
        },
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <GlassCard style={[styles.card, { padding: OVERLAY_CONFIG.padding }]}>
        <View style={[styles.content, direction === 'rtl' && styles.contentRTL]}>
          <View style={styles.header}>
            <GlassBadge
              label={categoryLabel}
              size={Platform.isTV ? 'lg' : 'sm'}
              style={{ backgroundColor: CATEGORY_COLORS[fact.category] || '#6b7280' }}
            />
            <Pressable
              onPress={handleDismiss}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={t('trivia.dismiss', 'Dismiss trivia')}
              accessibilityHint={t('trivia.dismissHint', 'Closes the trivia fact')}
              style={[
                styles.dismissButton,
                // V7 CRITICAL FIX: tvOS requires 250x100pt minimum touch targets
                {
                  minWidth: OVERLAY_CONFIG.touchMinWidth,
                  minHeight: OVERLAY_CONFIG.touchMinHeight,
                },
              ]}
              {...(Platform.isTV && { hasTVPreferredFocus: true })}  // V7 FIX: Changed to true
            >
              <Text style={[styles.dismissText, { fontSize: OVERLAY_CONFIG.fontSize }]}>✕</Text>
            </Pressable>
          </View>
          <Text
            accessible={true}
            accessibilityRole="text"
            style={[
              styles.text,
              { fontSize: OVERLAY_CONFIG.fontSize, lineHeight: OVERLAY_CONFIG.fontSize * 1.5 },
              direction === 'rtl' && styles.textRTL,
            ]}
          >
            {fact.text}
          </Text>
        </View>
      </GlassCard>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 50,
    pointerEvents: 'box-none',
  },
  card: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 12,
  },
  content: {
    flexDirection: 'column',
  },
  contentRTL: {
    alignItems: 'flex-end',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    width: '100%',
  },
  dismissButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dismissText: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  text: {
    color: '#ffffff',
  },
  textRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});
```

### Trivia Settings Section

```typescript
// /mobile-app/src/components/player/TriviaSettingsSection.tsx
import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
// VERIFIED: GlassSelect exported at packages/ui/glass-components/src/native/index.ts:31
import { GlassCard, GlassToggle, GlassSelect } from '@bayit/shared/ui';
import { useTriviaStore } from '../../../../../shared/stores/triviaStore';
import { useTranslation } from 'react-i18next';

// V7 FIX: Platform-specific sizing with tvOS touch targets
const SETTINGS_CONFIG = Platform.select({
  ios: Platform.isTV
    ? { titleSize: 28, labelSize: 24, padding: 24, touchMinWidth: 250, touchMinHeight: 100 }
    : { titleSize: 18, labelSize: 14, padding: 16, touchMinWidth: 44, touchMinHeight: 44 },
  android: Platform.isTV
    ? { titleSize: 28, labelSize: 24, padding: 24, touchMinWidth: 250, touchMinHeight: 100 }
    : { titleSize: 18, labelSize: 14, padding: 16, touchMinWidth: 44, touchMinHeight: 44 },
  default: { titleSize: 18, labelSize: 14, padding: 16, touchMinWidth: 44, touchMinHeight: 44 },
})!;

export function TriviaSettingsSection(): JSX.Element {
  const { t } = useTranslation();
  const { preferences, updatePreferences } = useTriviaStore();

  const FREQUENCY_OPTIONS = [
    { value: 'off', label: t('settings.trivia.frequencyOptions.off', 'Off') },
    { value: 'low', label: t('settings.trivia.frequencyOptions.low', 'Low (every 10 min)') },
    { value: 'normal', label: t('settings.trivia.frequencyOptions.normal', 'Normal (every 5 min)') },
    { value: 'high', label: t('settings.trivia.frequencyOptions.high', 'High (every 2.5 min)') },
  ];

  return (
    <GlassCard style={[styles.container, { padding: SETTINGS_CONFIG.padding }]}>
      <Text
        accessible={true}
        accessibilityRole="header"
        style={[styles.title, { fontSize: SETTINGS_CONFIG.titleSize }]}
      >
        {t('settings.trivia.title', 'Trivia & Fun Facts')}
      </Text>

      <View style={styles.row}>
        <Text style={[styles.label, { fontSize: SETTINGS_CONFIG.labelSize }]}>
          {t('settings.trivia.enabled', 'Show Trivia')}
        </Text>
        <GlassToggle
          value={preferences.enabled}
          onValueChange={(enabled) => updatePreferences({ enabled })}
          accessibilityLabel={t('settings.trivia.toggleLabel', 'Toggle trivia display')}
        />
      </View>

      {preferences.enabled && (
        <>
          <View style={styles.row}>
            <Text style={[styles.label, { fontSize: SETTINGS_CONFIG.labelSize }]}>
              {t('settings.trivia.frequency', 'Frequency')}
            </Text>
            <GlassSelect
              value={preferences.frequency}
              options={FREQUENCY_OPTIONS}
              onValueChange={(frequency) => updatePreferences({ frequency: frequency as any })}
              style={[styles.select, { minWidth: SETTINGS_CONFIG.touchMinWidth }]}
            />
          </View>

          <View style={styles.row}>
            <Text style={[styles.label, { fontSize: SETTINGS_CONFIG.labelSize }]}>
              {t('settings.trivia.duration', 'Display Duration')}
            </Text>
            <Text style={[styles.value, { fontSize: SETTINGS_CONFIG.labelSize }]}>
              {preferences.display_duration}s
            </Text>
          </View>
        </>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  title: {
    color: '#ffffff',
    fontWeight: '600',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  label: {
    color: '#ffffff',
  },
  value: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  select: {
    minWidth: 150,
  },
});
```

---

## Tests

### Backend Unit Tests

```python
# /backend/tests/test_trivia_model.py
"""Unit tests for trivia data models."""
import pytest

from app.models.trivia import TriviaFactModel, ContentTrivia


class TestTriviaFactModel:
    """Tests for TriviaFactModel."""

    def test_valid_fact_creation(self):
        fact = TriviaFactModel(
            text="שחקן מפורסם",
            text_en="Famous actor",
            text_es="Actor famoso",
            category="cast",
            source="tmdb",
        )
        assert fact.text == "שחקן מפורסם"
        assert fact.text_en == "Famous actor"
        assert fact.category == "cast"
        assert fact.priority == 5

    def test_fact_id_auto_generated(self):
        fact = TriviaFactModel(
            text="Test", text_en="Test", text_es="Test", category="production",
        )
        assert fact.fact_id is not None
        assert len(fact.fact_id) > 0

    def test_empty_text_validation(self):
        with pytest.raises(ValueError):
            TriviaFactModel(text="", text_en="Test", text_es="Test", category="cast")

    def test_invalid_category_validation(self):
        with pytest.raises(ValueError):
            TriviaFactModel(text="Test", text_en="Test", text_es="Test", category="invalid")


class TestContentTrivia:
    """Tests for ContentTrivia document."""

    def test_valid_trivia_creation(self):
        trivia = ContentTrivia(content_id="test-content-123", content_type="vod", facts=[])
        assert trivia.content_id == "test-content-123"
        assert trivia.is_enriched is False

    def test_max_facts_validation(self):
        facts = [
            TriviaFactModel(text=f"Fact {i}", text_en=f"Fact {i}", text_es=f"Fact {i}", category="cast")
            for i in range(51)
        ]
        with pytest.raises(ValueError, match="Maximum 50 facts"):
            ContentTrivia(content_id="test", content_type="vod", facts=facts)
```

```python
# /backend/tests/test_trivia_security.py
"""Unit tests for trivia security utilities."""
import pytest

from app.services.security_utils import (
    validate_object_id,
    sanitize_for_prompt,
    sanitize_ai_output,
)
from fastapi import HTTPException


class TestSecurityUtils:
    """Tests for security utilities."""

    def test_valid_object_id(self):
        valid_id = "507f1f77bcf86cd799439011"
        assert validate_object_id(valid_id) == valid_id

    def test_invalid_object_id(self):
        with pytest.raises(HTTPException) as exc_info:
            validate_object_id("invalid-id")
        assert exc_info.value.status_code == 400

    def test_sanitize_for_prompt_removes_brackets(self):
        result = sanitize_for_prompt("<script>alert('xss')</script>")
        assert "<" not in result
        assert ">" not in result

    def test_sanitize_for_prompt_truncates(self):
        long_text = "a" * 1000
        result = sanitize_for_prompt(long_text, max_len=100)
        assert len(result) == 100

    def test_sanitize_for_prompt_handles_none(self):
        assert sanitize_for_prompt(None) == "N/A"

    def test_sanitize_ai_output_html_escapes(self):
        result = sanitize_ai_output("<script>alert('xss')</script>")
        assert "<script>" not in result
        assert "&lt;script&gt;" in result

    def test_sanitize_ai_output_removes_javascript(self):
        result = sanitize_ai_output("javascript:alert('xss')")
        assert "javascript:" not in result
```

### Frontend Unit Tests

```typescript
// /mobile-app/src/components/player/__tests__/TriviaOverlay.test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { TriviaOverlay } from '../TriviaOverlay';
import type { TriviaFact } from '../../../../../../shared/types/trivia';

describe('TriviaOverlay', () => {
  const mockFact: TriviaFact = {
    fact_id: 'test-fact-1',
    text: 'This is a test trivia fact',
    trigger_time: null,
    category: 'cast',
    display_duration: 10,
    priority: 5,
  };

  const mockOnDismiss = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the trivia text', () => {
    const { getByText } = render(
      <TriviaOverlay fact={mockFact} onDismiss={mockOnDismiss} />
    );
    expect(getByText('This is a test trivia fact')).toBeTruthy();
  });

  it('renders the category badge', () => {
    const { getByText } = render(
      <TriviaOverlay fact={mockFact} onDismiss={mockOnDismiss} />
    );
    expect(getByText('cast')).toBeTruthy();
  });

  it('calls onDismiss when dismiss button is pressed', async () => {
    const { getByLabelText } = render(
      <TriviaOverlay fact={mockFact} onDismiss={mockOnDismiss} />
    );

    const dismissButton = getByLabelText('Dismiss trivia');
    fireEvent.press(dismissButton);

    await waitFor(() => {
      expect(mockOnDismiss).toHaveBeenCalled();
    });
  });

  it('has accessible role and hint', () => {
    const { getByRole } = render(
      <TriviaOverlay fact={mockFact} onDismiss={mockOnDismiss} />
    );

    const alert = getByRole('alert');
    expect(alert.props.accessible).toBe(true);
    expect(alert.props.accessibilityHint).toBeDefined();
    expect(alert.props.accessibilityLiveRegion).toBe('polite');
  });

  it('applies RTL styles when isRTL is true', () => {
    const { getByRole } = render(
      <TriviaOverlay fact={mockFact} onDismiss={mockOnDismiss} isRTL={true} />
    );

    const alert = getByRole('alert');
    expect(alert.props.style).toBeDefined();
  });
});
```

---

## Translations

Add to existing locale files:

### Hebrew (he.json)

```json
{
  "settings": {
    "trivia": {
      "title": "טריוויה ועובדות מעניינות",
      "enabled": "הצג טריוויה",
      "toggleLabel": "החלף תצוגת טריוויה",
      "frequency": "תדירות",
      "duration": "משך תצוגה",
      "frequencyOptions": {
        "off": "כבוי",
        "low": "נמוכה (כל 10 דק׳)",
        "normal": "רגילה (כל 5 דק׳)",
        "high": "גבוהה (כל 2.5 דק׳)"
      }
    }
  },
  "trivia": {
    "announcement": "טריוויה",
    "categories": {
      "cast": "שחקנים",
      "production": "הפקה",
      "location": "מיקום",
      "cultural": "תרבות",
      "historical": "היסטוריה"
    },
    "dismiss": "סגור",
    "dismissHint": "הקש פעמיים לסגירה"
  }
}
```

### English (en.json)

```json
{
  "settings": {
    "trivia": {
      "title": "Trivia & Fun Facts",
      "enabled": "Show Trivia",
      "toggleLabel": "Toggle trivia display",
      "frequency": "Frequency",
      "duration": "Display Duration",
      "frequencyOptions": {
        "off": "Off",
        "low": "Low (every 10 min)",
        "normal": "Normal (every 5 min)",
        "high": "High (every 2.5 min)"
      }
    }
  },
  "trivia": {
    "announcement": "Trivia",
    "categories": {
      "cast": "Cast",
      "production": "Production",
      "location": "Location",
      "cultural": "Cultural",
      "historical": "Historical"
    },
    "dismiss": "Dismiss",
    "dismissHint": "Double tap to dismiss"
  }
}
```

---

## Files to Create

### Backend
- `backend/app/models/trivia.py` - Data models
- `backend/app/api/routes/trivia.py` - API endpoints with security
- `backend/app/services/trivia_generator.py` - Generation service with sanitization
- `backend/app/services/security_utils.py` - Security utilities (V7)
- `backend/scripts/create_trivia_indexes.py` - Index creation script
- `backend/tests/test_trivia_model.py` - Model unit tests
- `backend/tests/test_trivia_security.py` - Security unit tests (V7)

### Frontend
- `mobile-app/src/components/player/hooks/useTrivia.ts` - Player hook
- `mobile-app/src/components/player/TriviaOverlay.tsx` - Display overlay
- `mobile-app/src/components/player/TriviaSettingsSection.tsx` - Settings UI
- `mobile-app/src/components/player/__tests__/TriviaOverlay.test.tsx` - Tests (V7 FIX)
- `mobile-app/src/setupTests.js` - Test setup with mocks (V7 FIX)
- `shared/stores/triviaStore.ts` - State management
- `shared/services/api/triviaServices.ts` - API client
- `shared/types/trivia.ts` - TypeScript types

### Files to Modify
- `backend/app/api/router_registry.py` - Register trivia router
- `backend/app/core/config.py` - Add configuration with validators
- `backend/app/core/rate_limiter.py` - Add trivia rate limits (V7)
- `backend/app/core/database.py` - Register ContentTrivia model
- `mobile-app/jest.config.js` - Update setupFilesAfterEnv (V7)
- `shared/i18n/locales/he.json` - Hebrew translations
- `shared/i18n/locales/en.json` - English translations

---

## V7 Verification Checklist

### Security (V7 Critical Fixes)
- [ ] Rate limits configured: `trivia_get: 60/minute`, `trivia_enriched: 3/hour`
- [ ] content_id ObjectId validation before database queries
- [ ] AI output sanitized for XSS via `sanitize_ai_output()`
- [ ] Prompt injection prevented via `sanitize_for_prompt()`
- [ ] `test_trivia_security.py` passes

### Platform (V7 Critical Fixes)
- [ ] tvOS dismiss button: 250x100pt minimum (not 44pt)
- [ ] Installation paths: `mobile-app/ios`, `tvos-app/tvos`, `tv-app/ios`
- [ ] NetInfo mock in `mobile-app/src/setupTests.js` (not web)
- [ ] GlassSelect verified: exported at line 31 of native/index.ts

### Backend
- [ ] `poetry run python scripts/create_trivia_indexes.py` succeeds
- [ ] `poetry run pytest tests/test_trivia_*.py -v` passes
- [ ] Server starts: `poetry run uvicorn app.main:app --reload`
- [ ] Config validation: TRIVIA_MIN_INTERVAL_SECONDS < 60 fails
- [ ] `/api/trivia/health` endpoint responds

### Frontend
- [ ] `npm run type-check` passes
- [ ] `npm run test` passes (in mobile-app)
- [ ] Overlay renders at bottom-left during playback
- [ ] VoiceOver announces trivia facts
- [ ] tvOS dismiss button has 250x100pt touch target

---

## V7 Summary

| # | Issue | Status | Verification |
|---|-------|--------|--------------|
| 1 | tvOS touch targets | ✅ FIXED | Changed to 250x100pt via OVERLAY_CONFIG.touchMinWidth/Height |
| 2 | Rate limiting | ✅ FIXED | Added to RATE_LIMITS dict in rate_limiter.py |
| 3 | content_id validation | ✅ FIXED | Added validate_object_id() in security_utils.py |
| 4 | AI sanitization | ✅ FIXED | Added sanitize_ai_output() for XSS prevention |
| 5 | Prompt injection | ✅ FIXED | Added sanitize_for_prompt() for content fields |
| 6 | Installation paths | ✅ FIXED | Corrected to mobile-app/ios, tvos-app/tvos, tv-app/ios |
| 7 | NetInfo mock location | ✅ FIXED | Moved to mobile-app/src/setupTests.js |
| 8 | GlassSelect | ✅ VERIFIED | Exported at packages/ui/glass-components/src/native/index.ts:31 |
