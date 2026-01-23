# Real-time/Offline Trivia and Fun Facts Feature - V5

## Overview

Add real-time trivia and fun facts display during video playback in Bayit+, with full offline support for downloaded content.

**CRITICAL V5 CHANGES**: This version fixes ALL 15 issues identified in V4 review with VERIFIED codebase patterns:

### Verified Patterns from Codebase Scan

| Pattern | V4 (Wrong) | V5 (Correct - Verified) |
|---------|------------|-------------------------|
| Glass imports (web) | `@olorin/glass-ui` | `@bayit/shared/ui` |
| AI service | `AIService` | `from anthropic import AsyncAnthropic` |
| TMDB credits | `get_credits()` | `get_movie_details()` includes credits |
| Network status | `navigator.onLine` | `NetInfo` from `@react-native-community/netinfo` |
| Beanie upsert | `.upsert()` | find-then-save pattern |
| Test path | `tests/unit/test_*.py` | `tests/test_*.py` |
| CI test command | `npm run test:unit -- --grep "trivia"` | `npm run test:unit` (turbo-based) |

### Additional V5 Fixes
- iOS safe area insets via `useSafeAreaInsets`
- tvOS 10-foot UI compliance (28pt text, 600px containers)
- Web responsive breakpoints
- `useTranslation` in TriviaOverlay
- RTL operator precedence fix
- Memory cleanup for refs/intervals
- Sentry monitoring integration

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

### API Endpoints

```python
# /backend/app/api/routes/trivia.py
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field

from app.core.config import settings
from app.core.security import get_current_active_user
from app.models.content import Content
from app.models.trivia import ContentTrivia, TriviaFactModel
from app.models.user import User
from app.services.audit_logger import AuditLogger
from app.services.trivia_generator import TriviaGenerationService

router = APIRouter(prefix="/trivia", tags=["trivia"])


class TriviaPreferencesRequest(BaseModel):
    """User trivia preferences update request."""
    enabled: bool = True
    frequency: str = Field("normal", pattern="^(off|low|normal|high)$")
    categories: List[str] = Field(default_factory=lambda: ["cast", "production", "cultural"])
    display_duration: int = Field(10, ge=5, le=30)


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
    """
    Check if user can access content based on subscription tier.
    Uses existing User.can_access_premium_features() method.
    """
    # Admin users can access everything
    if user.is_admin_role():
        return True

    # Check content subscription requirement against user tier
    content_tier = content.requires_subscription  # "none", "basic", "premium", "family"
    user_tier = user.subscription_tier  # None, "basic", "premium", "family"

    if content_tier == "none":
        return True
    if content_tier == "basic":
        return user_tier in ["basic", "premium", "family"]
    if content_tier in ["premium", "family"]:
        return user.can_access_premium_features()

    return False


@router.get("/{content_id}", response_model=TriviaResponse)
async def get_trivia(
    content_id: str,
    request: Request,
    lang: str = Query("he", pattern="^(he|en|es)$"),
    current_user: User = Depends(get_current_active_user),
):
    """Get trivia facts for content. Generates if missing."""
    # Verify content exists
    content = await Content.get(content_id)
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")

    # Check user can access this content
    if not await check_content_access(current_user, content):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Subscription required for this content"
        )

    # Get or generate trivia
    trivia = await ContentTrivia.find_one(ContentTrivia.content_id == content_id)

    if not trivia:
        # Generate trivia on-demand
        trivia_service = TriviaGenerationService()
        trivia = await trivia_service.generate_trivia(content)

    # Localize facts based on language
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

    # Audit log using verified AuditLogger.log_event() interface
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
async def get_trivia_enriched(
    content_id: str,
    request: Request,
    current_user: User = Depends(get_current_active_user),
):
    """Get full trivia bundle for offline caching (downloads)."""
    content = await Content.get(content_id)
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")

    if not await check_content_access(current_user, content):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Subscription required"
        )

    trivia = await ContentTrivia.find_one(ContentTrivia.content_id == content_id)

    if not trivia or not trivia.is_enriched:
        trivia_service = TriviaGenerationService()
        trivia = await trivia_service.generate_trivia(content, enrich=True)

    # Return all languages for offline
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

    return TriviaResponse(
        content_id=content_id,
        facts=all_facts,
        is_enriched=True,
    )


@router.get("/preferences", response_model=TriviaPreferencesRequest)
async def get_preferences(
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
async def update_preferences(
    prefs: TriviaPreferencesRequest,
    request: Request,
    current_user: User = Depends(get_current_active_user),
):
    """Update user's trivia preferences using flat key storage pattern."""
    # Use flat key pattern matching existing Profile.preferences
    if current_user.preferences is None:
        current_user.preferences = {}

    current_user.preferences["trivia_enabled"] = prefs.enabled
    current_user.preferences["trivia_frequency"] = prefs.frequency
    current_user.preferences["trivia_categories"] = prefs.categories
    current_user.preferences["trivia_display_duration"] = prefs.display_duration

    # Use verified Beanie save pattern
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
```

### Router Registration

```python
# /backend/app/api/router_registry.py - ADD TO EXISTING FILE
from app.api.routes.trivia import router as trivia_router

# In the router registration section, add:
api_router.include_router(trivia_router)
```

### Trivia Generation Service

```python
# /backend/app/services/trivia_generator.py
import json
import logging
from datetime import datetime
from typing import Optional
from uuid import uuid4

from app.core.config import settings
from app.models.content import Content
from app.models.trivia import ContentTrivia, TriviaFactModel
from app.services.tmdb_service import TMDBService

logger = logging.getLogger(__name__)


class TriviaGenerationService:
    """Service for generating and enriching content trivia."""

    def __init__(self):
        self.tmdb_service = TMDBService()

    async def generate_trivia(
        self,
        content: Content,
        enrich: bool = False,
    ) -> ContentTrivia:
        """
        Generate trivia for content using TMDB and AI.
        Uses find-then-save pattern (verified from codebase).
        """
        facts: list[TriviaFactModel] = []
        sources_used: list[str] = []

        # Fetch TMDB data if available
        if content.tmdb_id:
            tmdb_facts = await self._fetch_tmdb_facts(content)
            facts.extend(tmdb_facts)
            if tmdb_facts:
                sources_used.append("tmdb")

        # Generate AI facts if enabled and we need more
        if enrich and len(facts) < settings.TRIVIA_MAX_FACTS_PER_CONTENT:
            ai_facts = await self._generate_ai_facts(content, existing_count=len(facts))
            facts.extend(ai_facts)
            if ai_facts:
                sources_used.append("ai")

        # Use find-then-save pattern (VERIFIED from codebase: chapters.py, subtitles.py)
        existing = await ContentTrivia.find_one(
            ContentTrivia.content_id == str(content.id)
        )

        if existing:
            # Update existing document
            existing.facts = facts
            existing.sources_used = sources_used
            existing.tmdb_id = content.tmdb_id
            existing.is_enriched = enrich
            existing.enriched_at = datetime.utcnow() if enrich else existing.enriched_at
            existing.updated_at = datetime.utcnow()
            await existing.save()
            return existing
        else:
            # Insert new document
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
        """
        Fetch trivia from TMDB API.
        Uses get_movie_details() which includes credits via append_to_response.
        VERIFIED: tmdb_service.py lines 94-102 shows get_movie_details includes credits.
        """
        facts = []

        try:
            if content.tmdb_id:
                # get_movie_details includes credits via append_to_response
                details = await self.tmdb_service.get_movie_details(content.tmdb_id)
                if not details:
                    return facts

                # Extract credits from details (included in response)
                credits = details.get("credits", {})
                cast = credits.get("cast", [])

                # Create facts from cast (top 3 actors)
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

                # Extract director from crew
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
        """
        Generate AI facts using Claude API.
        VERIFIED: Uses direct Anthropic client (from live_translation_service.py pattern).
        """
        facts = []
        max_to_generate = min(5, settings.TRIVIA_MAX_FACTS_PER_CONTENT - existing_count)

        if max_to_generate <= 0:
            return facts

        try:
            # Direct Anthropic import (VERIFIED from codebase)
            from anthropic import AsyncAnthropic

            client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

            prompt = f"""Generate {max_to_generate} interesting trivia facts about this content:
Title: {content.title}
Description: {content.description or 'N/A'}
Year: {content.year or 'N/A'}
Genre: {content.genre or 'N/A'}
Director: {content.director or 'N/A'}

For each fact, provide a JSON object with:
- text: Hebrew text
- text_en: English text
- text_es: Spanish text
- category: one of cast, production, location, cultural, historical

Return ONLY a JSON array, no other text."""

            response = await client.messages.create(
                model=settings.AI_MODEL_DEFAULT or "claude-3-haiku-20240307",
                max_tokens=1024,
                messages=[{"role": "user", "content": prompt}],
            )

            # Parse response
            content_text = response.content[0].text if response.content else "[]"
            # Handle potential markdown code blocks
            if "```json" in content_text:
                content_text = content_text.split("```json")[1].split("```")[0]
            elif "```" in content_text:
                content_text = content_text.split("```")[1].split("```")[0]

            parsed = json.loads(content_text.strip())

            for item in parsed[:max_to_generate]:
                if isinstance(item, dict) and item.get("text"):
                    facts.append(TriviaFactModel(
                        fact_id=str(uuid4()),
                        text=item.get("text", ""),
                        text_en=item.get("text_en", item.get("text", "")),
                        text_es=item.get("text_es", item.get("text", "")),
                        category=item.get("category", "production"),
                        source="ai",
                        trigger_type="random",
                        priority=5,
                    ))

        except Exception as e:
            logger.warning(f"Failed to generate AI facts for {content.id}: {e}")

        return facts
```

### Configuration

```python
# /backend/app/core/config.py - ADD TO EXISTING Settings CLASS

# Trivia Feature Configuration
TRIVIA_ENABLED: bool = Field(default=True, env="TRIVIA_ENABLED")
TRIVIA_DEFAULT_DISPLAY_DURATION_SECONDS: int = Field(default=10, env="TRIVIA_DISPLAY_DURATION")
TRIVIA_MIN_INTERVAL_SECONDS: int = Field(default=300, env="TRIVIA_MIN_INTERVAL")  # 5 minutes
TRIVIA_MAX_FACTS_PER_CONTENT: int = Field(default=50, env="TRIVIA_MAX_FACTS")
TRIVIA_ROLLOUT_PERCENTAGE: int = Field(default=100, env="TRIVIA_ROLLOUT_PERCENTAGE")
```

---

## Frontend Implementation

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

### Trivia Store (Zustand) with NetInfo

```typescript
// /shared/stores/triviaStore.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { TriviaFact, TriviaPreferences, TriviaState } from '../types/trivia';
import { triviaApi } from '../services/api/triviaServices';

interface TriviaStore extends TriviaState {
  // Actions
  fetchTrivia: (contentId: string, lang: string) => Promise<void>;
  fetchEnrichedTrivia: (contentId: string) => Promise<void>;
  setCurrentFact: (fact: TriviaFact | null) => void;
  dismissFact: () => void;
  updatePreferences: (prefs: Partial<TriviaPreferences>) => Promise<void>;
  clearTrivia: () => void;
  // Offline cache
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
      // State
      facts: [],
      currentFact: null,
      preferences: DEFAULT_PREFERENCES,
      isLoading: false,
      error: null,
      cachedTrivia: {},

      // Actions
      fetchTrivia: async (contentId: string, lang: string) => {
        set({ isLoading: true, error: null });
        try {
          // Check network status using NetInfo (VERIFIED from codebase)
          const netState = await NetInfo.fetch();
          const isOnline = netState.isConnected && netState.isInternetReachable;

          // Check offline cache first
          const cached = get().getCachedTrivia(contentId);
          if (cached && !isOnline) {
            set({ facts: cached, isLoading: false });
            return;
          }

          if (isOnline) {
            const response = await triviaApi.getTrivia(contentId, lang);
            set({ facts: response.facts, isLoading: false });
            // Cache for offline
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

      // Offline cache
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
// /web/src/components/player/hooks/useTrivia.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';
import { useTriviaStore } from '../../../../shared/stores/triviaStore';
import type { TriviaFact } from '../../../../shared/types/trivia';
import { appConfig } from '../../../../shared/config/appConfig';

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

// Hook to detect reduced motion preference
function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    let mounted = true;

    AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (mounted) setReducedMotion(value);
    });

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (value) => {
        if (mounted) setReducedMotion(value);
      }
    );

    return () => {
      mounted = false;
      subscription.remove();
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

  // Check if feature is enabled globally
  const featureEnabled = appConfig.features?.trivia?.enabled ?? true;
  const triviaEnabled = featureEnabled && preferences.enabled;

  // Fetch trivia on mount
  useEffect(() => {
    if (contentId && triviaEnabled) {
      fetchTrivia(contentId, language);
    }
  }, [contentId, triviaEnabled, language, fetchTrivia]);

  // Cleanup on unmount (MEMORY CLEANUP FIX)
  useEffect(() => {
    return () => {
      if (dismissTimeoutRef.current) {
        clearTimeout(dismissTimeoutRef.current);
        dismissTimeoutRef.current = null;
      }
    };
  }, []);

  // Calculate interval based on frequency preference
  const getIntervalSeconds = useCallback((): number => {
    const baseInterval = 300; // 5 minutes
    switch (preferences.frequency) {
      case 'off': return Infinity;
      case 'low': return baseInterval * 2; // 10 minutes
      case 'normal': return baseInterval; // 5 minutes
      case 'high': return baseInterval / 2; // 2.5 minutes
      default: return baseInterval;
    }
  }, [preferences.frequency]);

  // Select next fact based on time and priority
  const selectNextFact = useCallback((): TriviaFact | null => {
    if (!facts.length) return null;

    // First check for time-triggered facts
    const timeFacts = facts.filter(
      (f) => f.trigger_time !== null &&
             Math.abs(f.trigger_time - currentTime) < 5
    );
    if (timeFacts.length) {
      return timeFacts[0];
    }

    // Otherwise, select random fact weighted by priority
    const totalPriority = facts.reduce((sum, f) => sum + f.priority, 0);
    let random = Math.random() * totalPriority;

    for (const fact of facts) {
      random -= fact.priority;
      if (random <= 0) return fact;
    }

    return facts[0];
  }, [facts, currentTime]);

  // Show facts at intervals while playing
  useEffect(() => {
    if (!isPlaying || !triviaEnabled || preferences.frequency === 'off') {
      return;
    }

    const intervalSeconds = getIntervalSeconds();
    const timeSinceLastFact = currentTime - lastFactTimeRef.current;

    // Check if enough time has passed
    if (timeSinceLastFact >= intervalSeconds && !currentFact) {
      const fact = selectNextFact();
      if (fact) {
        setCurrentFact(fact);
        lastFactTimeRef.current = currentTime;

        // Auto-dismiss after display duration (skip if reduced motion)
        if (!reducedMotion) {
          // Clear any existing timeout first
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

### TriviaOverlay Component (React Native with StyleSheet + Platform Adaptations)

```typescript
// /web/src/components/player/TriviaOverlay.tsx
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
  Dimensions,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
// VERIFIED: Web components import from @bayit/shared/ui
import { GlassCard, GlassBadge } from '@bayit/shared/ui';
import type { TriviaFact } from '../../../../shared/types/trivia';

interface TriviaOverlayProps {
  fact: TriviaFact;
  onDismiss: () => void;
  isRTL?: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  cast: '#3b82f6',
  production: '#8b5cf6',
  location: '#10b981',
  cultural: '#f59e0b',
  historical: '#ef4444',
};

// Responsive breakpoints for web
const BREAKPOINTS = {
  mobile: 480,
  tablet: 768,
  desktop: 1024,
};

// Platform-specific sizing
const getOverlayWidth = (windowWidth: number): number => {
  if (Platform.isTV) {
    // tvOS: 10-foot UI requires larger containers
    return Math.min(600, windowWidth * 0.4);
  }
  if (windowWidth < BREAKPOINTS.mobile) {
    return windowWidth - 32; // Mobile: full width minus margins
  }
  if (windowWidth < BREAKPOINTS.tablet) {
    return 350; // Tablet
  }
  return 400; // Desktop
};

// Platform-specific font sizes (tvOS 10-foot compliance: 28pt minimum)
const getFontSizes = () => {
  if (Platform.isTV) {
    return { title: 32, body: 28, badge: 24 };
  }
  return { title: 16, body: 14, badge: 12 };
};

export function TriviaOverlay({ fact, onDismiss, isRTL }: TriviaOverlayProps): JSX.Element {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const { t } = useTranslation();

  // Fix RTL operator precedence (V5 fix)
  const direction = (isRTL ?? I18nManager.isRTL) ? 'rtl' : 'ltr';
  const overlayWidth = getOverlayWidth(windowWidth);
  const fontSizes = getFontSizes();

  useEffect(() => {
    // Announce to screen readers
    AccessibilityInfo.announceForAccessibility(
      `${t('trivia.announcement', 'Trivia')}: ${fact.text}`
    );

    // Entry animation
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

    // Cleanup animations on unmount (MEMORY CLEANUP)
    return () => {
      fadeAnim.stopAnimation();
      slideAnim.stopAnimation();
    };
  }, [fact, fadeAnim, slideAnim, t]);

  const handleDismiss = (): void => {
    // Exit animation
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

  // Category label translation
  const categoryLabel = t(`trivia.categories.${fact.category}`, fact.category);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          width: overlayWidth,
          // iOS safe area insets
          bottom: 120 + insets.bottom,
          [direction === 'rtl' ? 'right' : 'left']: 16 + (direction === 'rtl' ? insets.right : insets.left),
        },
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <GlassCard style={styles.card}>
        <View style={[styles.content, direction === 'rtl' && styles.contentRTL]}>
          <View style={styles.header}>
            <GlassBadge
              label={categoryLabel}
              size={Platform.isTV ? 'lg' : 'sm'}
              style={{ backgroundColor: CATEGORY_COLORS[fact.category] || '#6b7280' }}
            />
            <Pressable
              onPress={handleDismiss}
              accessibilityLabel={t('trivia.dismiss', 'Dismiss trivia')}
              accessibilityRole="button"
              style={styles.dismissButton}
              // tvOS focus handling
              {...(Platform.isTV && { hasTVPreferredFocus: false })}
            >
              <Text style={[styles.dismissText, { fontSize: fontSizes.body }]}>✕</Text>
            </Pressable>
          </View>
          <Text
            style={[
              styles.text,
              { fontSize: fontSizes.body, lineHeight: fontSizes.body * 1.5 },
              direction === 'rtl' && styles.textRTL,
            ]}
            accessibilityRole="text"
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
    padding: Platform.isTV ? 24 : 16,
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
    marginBottom: Platform.isTV ? 16 : 8,
    width: '100%',
  },
  dismissButton: {
    padding: 4,
    minWidth: 44,
    minHeight: 44,
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
// /web/src/components/player/TriviaSettingsSection.tsx
import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
// VERIFIED: Web components import from @bayit/shared/ui
import { GlassCard, GlassToggle, GlassSelect } from '@bayit/shared/ui';
import { useTriviaStore } from '../../../../shared/stores/triviaStore';
import { useTranslation } from 'react-i18next';

export function TriviaSettingsSection(): JSX.Element {
  const { t } = useTranslation();
  const { preferences, updatePreferences } = useTriviaStore();

  // Translated frequency options
  const FREQUENCY_OPTIONS = [
    { value: 'off', label: t('settings.trivia.frequencyOptions.off', 'Off') },
    { value: 'low', label: t('settings.trivia.frequencyOptions.low', 'Low (every 10 min)') },
    { value: 'normal', label: t('settings.trivia.frequencyOptions.normal', 'Normal (every 5 min)') },
    { value: 'high', label: t('settings.trivia.frequencyOptions.high', 'High (every 2.5 min)') },
  ];

  // tvOS-compliant font sizes
  const titleSize = Platform.isTV ? 28 : 18;
  const labelSize = Platform.isTV ? 24 : 14;

  return (
    <GlassCard style={styles.container}>
      <Text style={[styles.title, { fontSize: titleSize }]}>
        {t('settings.trivia.title', 'Trivia & Fun Facts')}
      </Text>

      <View style={styles.row}>
        <Text style={[styles.label, { fontSize: labelSize }]}>
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
            <Text style={[styles.label, { fontSize: labelSize }]}>
              {t('settings.trivia.frequency', 'Frequency')}
            </Text>
            <GlassSelect
              value={preferences.frequency}
              options={FREQUENCY_OPTIONS}
              onValueChange={(frequency) => updatePreferences({ frequency: frequency as any })}
              style={styles.select}
            />
          </View>

          <View style={styles.row}>
            <Text style={[styles.label, { fontSize: labelSize }]}>
              {t('settings.trivia.duration', 'Display Duration')}
            </Text>
            <Text style={[styles.value, { fontSize: labelSize }]}>
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
    padding: Platform.isTV ? 24 : 16,
    marginVertical: 8,
  },
  title: {
    color: '#ffffff',
    fontWeight: '600',
    marginBottom: Platform.isTV ? 24 : 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Platform.isTV ? 16 : 12,
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

### VideoPlayer Integration

```typescript
// /web/src/components/player/VideoPlayer.tsx - ADD TO EXISTING FILE

// Add import at top:
import { useTrivia } from './hooks/useTrivia';
import { TriviaOverlay } from './TriviaOverlay';

// Inside VideoPlayer component, add:
const { currentFact, dismissFact, triviaEnabled } = useTrivia({
  contentId: content.id,
  currentTime: currentPlaybackTime,
  isPlaying: !paused,
  language: i18n.language,
});

// In the render, add overlay before controls:
{triviaEnabled && currentFact && (
  <TriviaOverlay
    fact={currentFact}
    onDismiss={dismissFact}
    isRTL={i18n.language === 'he'}
  />
)}
```

---

## Tests

### Backend Unit Tests

```python
# /backend/tests/test_trivia_model.py
"""Unit tests for trivia data models."""
import pytest
from datetime import datetime

from app.models.trivia import TriviaFactModel, ContentTrivia


class TestTriviaFactModel:
    """Tests for TriviaFactModel."""

    def test_valid_fact_creation(self):
        """Test creating a valid trivia fact."""
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
        assert fact.priority == 5  # default

    def test_fact_id_auto_generated(self):
        """Test that fact_id is auto-generated."""
        fact = TriviaFactModel(
            text="Test",
            text_en="Test",
            text_es="Test",
            category="production",
        )
        assert fact.fact_id is not None
        assert len(fact.fact_id) > 0

    def test_empty_text_validation(self):
        """Test that empty text raises validation error."""
        with pytest.raises(ValueError):
            TriviaFactModel(
                text="",
                text_en="Test",
                text_es="Test",
                category="cast",
            )

    def test_invalid_category_validation(self):
        """Test that invalid category raises validation error."""
        with pytest.raises(ValueError):
            TriviaFactModel(
                text="Test",
                text_en="Test",
                text_es="Test",
                category="invalid",
            )


class TestContentTrivia:
    """Tests for ContentTrivia document."""

    def test_valid_trivia_creation(self):
        """Test creating valid content trivia."""
        trivia = ContentTrivia(
            content_id="test-content-123",
            content_type="vod",
            facts=[],
        )
        assert trivia.content_id == "test-content-123"
        assert trivia.is_enriched is False

    def test_max_facts_validation(self):
        """Test that more than 50 facts raises error."""
        facts = [
            TriviaFactModel(
                text=f"Fact {i}",
                text_en=f"Fact {i}",
                text_es=f"Fact {i}",
                category="cast",
            )
            for i in range(51)
        ]
        with pytest.raises(ValueError, match="Maximum 50 facts"):
            ContentTrivia(
                content_id="test",
                content_type="vod",
                facts=facts,
            )
```

```python
# /backend/tests/test_trivia_service.py
"""Unit tests for trivia generation service."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.trivia_generator import TriviaGenerationService
from app.models.content import Content


class TestTriviaGenerationService:
    """Tests for TriviaGenerationService."""

    @pytest.fixture
    def service(self):
        """Create service instance."""
        return TriviaGenerationService()

    @pytest.fixture
    def mock_content(self):
        """Create mock content."""
        content = MagicMock(spec=Content)
        content.id = "test-content-123"
        content.tmdb_id = 12345
        content.title = "Test Movie"
        content.description = "A test movie"
        content.year = 2024
        content.genre = "Drama"
        content.director = "Test Director"
        content.is_series = False
        return content

    @pytest.mark.asyncio
    async def test_fetch_tmdb_facts(self, service, mock_content):
        """Test fetching facts from TMDB."""
        mock_details = {
            "credits": {
                "cast": [
                    {"name": "Actor One", "character": "Character One"},
                    {"name": "Actor Two", "character": "Character Two"},
                ],
                "crew": [
                    {"name": "Director Name", "job": "Director"},
                ],
            }
        }

        with patch.object(
            service.tmdb_service,
            'get_movie_details',
            new_callable=AsyncMock,
            return_value=mock_details,
        ):
            facts = await service._fetch_tmdb_facts(mock_content)

        assert len(facts) >= 2  # At least 2 cast facts
        assert any(f.category == "cast" for f in facts)

    @pytest.mark.asyncio
    async def test_generate_trivia_creates_new(self, service, mock_content):
        """Test generating trivia for new content."""
        with patch.object(
            service.tmdb_service,
            'get_movie_details',
            new_callable=AsyncMock,
            return_value={"credits": {"cast": [], "crew": []}},
        ):
            with patch(
                'app.models.trivia.ContentTrivia.find_one',
                new_callable=AsyncMock,
                return_value=None,
            ):
                with patch(
                    'app.models.trivia.ContentTrivia.insert',
                    new_callable=AsyncMock,
                ):
                    trivia = await service.generate_trivia(mock_content)

        assert trivia is not None
        assert trivia.content_id == "test-content-123"
```

### Frontend Unit Tests

```typescript
// /web/src/components/player/__tests__/TriviaOverlay.test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { TriviaOverlay } from '../TriviaOverlay';
import type { TriviaFact } from '../../../../../shared/types/trivia';

// Mock dependencies
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue: string) => defaultValue,
  }),
}));

jest.mock('@bayit/shared/ui', () => ({
  GlassCard: ({ children, style }: any) => <div style={style}>{children}</div>,
  GlassBadge: ({ label }: any) => <span>{label}</span>,
}));

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

  it('applies RTL styles when isRTL is true', () => {
    const { getByRole } = render(
      <TriviaOverlay fact={mockFact} onDismiss={mockOnDismiss} isRTL={true} />
    );

    const alert = getByRole('alert');
    // Check that RTL positioning is applied
    expect(alert.props.style).toBeDefined();
  });

  it('has accessible role and live region', () => {
    const { getByRole } = render(
      <TriviaOverlay fact={mockFact} onDismiss={mockOnDismiss} />
    );

    const alert = getByRole('alert');
    expect(alert.props.accessibilityLiveRegion).toBe('polite');
  });
});
```

```typescript
// /web/src/components/player/__tests__/useTrivia.test.ts
import { renderHook, act } from '@testing-library/react-hooks';
import { useTrivia } from '../hooks/useTrivia';
import { useTriviaStore } from '../../../../../shared/stores/triviaStore';

// Mock the store
jest.mock('../../../../../shared/stores/triviaStore');
jest.mock('../../../../../shared/config/appConfig', () => ({
  appConfig: {
    features: {
      trivia: { enabled: true },
    },
  },
}));

describe('useTrivia', () => {
  const mockStore = {
    facts: [
      { fact_id: '1', text: 'Fact 1', priority: 5, category: 'cast', display_duration: 10, trigger_time: null },
      { fact_id: '2', text: 'Fact 2', priority: 7, category: 'production', display_duration: 10, trigger_time: null },
    ],
    currentFact: null,
    preferences: { enabled: true, frequency: 'normal', categories: ['cast'], display_duration: 10 },
    isLoading: false,
    fetchTrivia: jest.fn(),
    setCurrentFact: jest.fn(),
    dismissFact: jest.fn(),
    updatePreferences: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useTriviaStore as unknown as jest.Mock).mockReturnValue(mockStore);
  });

  it('fetches trivia on mount when enabled', () => {
    renderHook(() =>
      useTrivia({
        contentId: 'test-123',
        currentTime: 0,
        isPlaying: true,
        language: 'en',
      })
    );

    expect(mockStore.fetchTrivia).toHaveBeenCalledWith('test-123', 'en');
  });

  it('does not fetch trivia when disabled', () => {
    (useTriviaStore as unknown as jest.Mock).mockReturnValue({
      ...mockStore,
      preferences: { ...mockStore.preferences, enabled: false },
    });

    renderHook(() =>
      useTrivia({
        contentId: 'test-123',
        currentTime: 0,
        isPlaying: true,
        language: 'en',
      })
    );

    expect(mockStore.fetchTrivia).not.toHaveBeenCalled();
  });

  it('returns triviaEnabled based on preferences', () => {
    const { result } = renderHook(() =>
      useTrivia({
        contentId: 'test-123',
        currentTime: 0,
        isPlaying: true,
        language: 'en',
      })
    );

    expect(result.current.triviaEnabled).toBe(true);
  });

  it('toggles trivia preference', () => {
    const { result } = renderHook(() =>
      useTrivia({
        contentId: 'test-123',
        currentTime: 0,
        isPlaying: true,
        language: 'en',
      })
    );

    act(() => {
      result.current.toggleTrivia();
    });

    expect(mockStore.updatePreferences).toHaveBeenCalledWith({ enabled: false });
  });
});
```

---

## Translations

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
      "categories": "קטגוריות",
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
    "dismiss": "סגור"
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
      "categories": "Categories",
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
    "dismiss": "Dismiss"
  }
}
```

### Spanish (es.json)

```json
{
  "settings": {
    "trivia": {
      "title": "Trivia y Datos Curiosos",
      "enabled": "Mostrar Trivia",
      "toggleLabel": "Alternar visualización de trivia",
      "frequency": "Frecuencia",
      "duration": "Duración de Visualización",
      "categories": "Categorías",
      "frequencyOptions": {
        "off": "Desactivado",
        "low": "Baja (cada 10 min)",
        "normal": "Normal (cada 5 min)",
        "high": "Alta (cada 2.5 min)"
      }
    }
  },
  "trivia": {
    "announcement": "Trivia",
    "categories": {
      "cast": "Elenco",
      "production": "Producción",
      "location": "Ubicación",
      "cultural": "Cultural",
      "historical": "Histórico"
    },
    "dismiss": "Cerrar"
  }
}
```

---

## Monitoring & Error Tracking

```typescript
// /shared/utils/triviaSentry.ts
import * as Sentry from '@sentry/react-native';

export const triviaErrorBoundary = {
  captureException: (error: Error, context: Record<string, any>) => {
    Sentry.captureException(error, {
      tags: {
        feature: 'trivia',
        ...context,
      },
    });
  },

  captureMessage: (message: string, level: Sentry.SeverityLevel = 'info') => {
    Sentry.captureMessage(message, {
      level,
      tags: { feature: 'trivia' },
    });
  },

  addBreadcrumb: (message: string, data?: Record<string, any>) => {
    Sentry.addBreadcrumb({
      category: 'trivia',
      message,
      data,
      level: 'info',
    });
  },
};

// Usage in triviaStore.ts fetchTrivia:
// import { triviaErrorBoundary } from '../utils/triviaSentry';
// catch (error) {
//   triviaErrorBoundary.captureException(error as Error, { contentId });
//   ...
// }
```

---

## Feature Flag Configuration

```typescript
// /shared/config/appConfig.ts - ADD TO EXISTING features OBJECT

export const appConfig = {
  // ... existing config
  features: {
    // ... existing features
    trivia: {
      enabled: process.env.REACT_APP_TRIVIA_ENABLED !== 'false',
      rolloutPercentage: parseInt(process.env.REACT_APP_TRIVIA_ROLLOUT || '100', 10),
    },
  },
};
```

---

## Files to Create

### Backend
- `backend/app/models/trivia.py` - Data models
- `backend/app/api/routes/trivia.py` - API endpoints
- `backend/app/services/trivia_generator.py` - Generation service
- `backend/tests/test_trivia_model.py` - Model unit tests
- `backend/tests/test_trivia_service.py` - Service unit tests

### Frontend
- `web/src/components/player/hooks/useTrivia.ts` - Player hook
- `web/src/components/player/TriviaOverlay.tsx` - Display overlay
- `web/src/components/player/TriviaSettingsSection.tsx` - Settings UI
- `web/src/components/player/__tests__/TriviaOverlay.test.tsx` - Overlay tests
- `web/src/components/player/__tests__/useTrivia.test.ts` - Hook tests
- `shared/stores/triviaStore.ts` - State management
- `shared/services/api/triviaServices.ts` - API client
- `shared/types/trivia.ts` - TypeScript types
- `shared/utils/triviaSentry.ts` - Error tracking

### Files to Modify
- `backend/app/api/router_registry.py` - Register trivia router
- `backend/app/core/config.py` - Add configuration
- `web/src/components/player/VideoPlayer.tsx` - Integrate overlay
- `web/src/components/player/SettingsPanel.tsx` - Add trivia section
- `shared/config/appConfig.ts` - Add feature flag
- `shared/i18n/locales/he.json` - Hebrew translations
- `shared/i18n/locales/en.json` - English translations
- `shared/i18n/locales/es.json` - Spanish translations

---

## Verification Checklist

### Backend
- [ ] `poetry run pytest tests/test_trivia_model.py -v` passes
- [ ] `poetry run pytest tests/test_trivia_service.py -v` passes
- [ ] Server starts: `poetry run uvicorn app.main:app --reload`
- [ ] API responds: `curl http://localhost:8000/api/v1/trivia/{content_id}`
- [ ] Preferences persist: PUT then GET `/trivia/preferences`
- [ ] Test coverage > 87%

### Frontend
- [ ] `npm run type-check` passes
- [ ] `npm run test:unit` passes (includes trivia tests)
- [ ] Overlay renders at bottom-left during playback
- [ ] RTL layout correct for Hebrew
- [ ] Dismiss button works (44x44pt touch target)
- [ ] Settings toggle works
- [ ] Responsive breakpoints work on web
- [ ] tvOS overlay uses 28pt+ text
- [ ] iOS safe area insets respected

### Accessibility
- [ ] Screen reader announces trivia facts
- [ ] Reduced motion disables animations
- [ ] WCAG 2.1 AA color contrast (4.5:1)
- [ ] Focus management correct
- [ ] tvOS focus navigation works

### Offline
- [ ] Trivia cached when downloaded
- [ ] Trivia loads from cache when offline (NetInfo)
- [ ] Preferences persist offline

### Monitoring
- [ ] Sentry errors captured
- [ ] Breadcrumbs logged for trivia actions

---

## Summary of V5 Fixes

| Issue | V4 Problem | V5 Fix (Verified) |
|-------|------------|-------------------|
| Glass imports | `@olorin/glass-ui` | `@bayit/shared/ui` (verified from AISettings.tsx) |
| AI service | `AIService` doesn't exist | Direct `AsyncAnthropic` (verified from live_translation_service.py) |
| TMDB credits | `get_credits()` doesn't exist | `get_movie_details()` includes credits (verified from tmdb_service.py:100) |
| Network status | `navigator.onLine` (web-only) | `NetInfo` (verified from errorHandling.ts) |
| Beanie upsert | `.upsert()` syntax wrong | find-then-save pattern (verified from chapters.py, subtitles.py) |
| Test paths | `tests/unit/test_*.py` | `tests/test_*.py` (verified from backend/tests/) |
| CI commands | `--grep "trivia"` | Standard turbo test (verified from ci.yml:108) |
| iOS safe area | Missing | `useSafeAreaInsets` added |
| tvOS 10-foot | Missing | 28pt text, 600px containers added |
| Web responsive | Missing | Breakpoints (480/768/1024px) added |
| useTranslation | Missing in TriviaOverlay | Added with `t()` calls |
| RTL operator | Wrong precedence | Fixed: `(isRTL ?? I18nManager.isRTL)` |
| Memory cleanup | Missing | Timeout/animation cleanup added |
| Sentry | Missing | triviaSentry.ts added |
| Tests | Insufficient | Full test suites added |
