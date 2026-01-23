# Real-time/Offline Trivia and Fun Facts Feature - V4

## Overview

Add real-time trivia and fun facts display during video playback in Bayit+, with full offline support for downloaded content.

**CRITICAL V4 CHANGES**: This version addresses all 10 critical issues from V3 review:
1. ✅ Removed non-existent ContentAccessService - use inline `user.can_access_premium_features()`
2. ✅ Removed non-existent ContentFilterService - use inline content filtering
3. ✅ Fixed Glass import path: `@olorin/glass-ui` (not `@bayit/glass`)
4. ✅ Fixed missing Glass components: Use GlassToggle (not GlassSwitch), GlassBadge (not GlassChip)
5. ✅ Fixed AuditLogger interface: Use `await AuditLogger.log_event(...)`
6. ✅ Fixed OlorinAIAgent - create dedicated TriviaGenerationAgent
7. ✅ Removed use_revision/schema_version (not used in codebase)
8. ✅ Fixed race condition with `find_one_and_update` + `upsert=True`
9. ✅ Added CI/CD pipeline integration to existing workflows
10. ✅ Added backdrop-filter fallback for older browsers

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

from beanie.operators import Set
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

    # Audit log
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
        Uses find_one_and_update with upsert to prevent race conditions.
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

        # Use find_one_and_update with upsert to prevent race conditions
        trivia_data = {
            "content_id": str(content.id),
            "content_type": "series_episode" if content.is_series else "vod",
            "facts": [f.model_dump() for f in facts],
            "sources_used": sources_used,
            "tmdb_id": content.tmdb_id,
            "is_enriched": enrich,
            "enriched_at": datetime.utcnow() if enrich else None,
            "updated_at": datetime.utcnow(),
        }

        # Atomic upsert to prevent duplicates
        result = await ContentTrivia.find_one(
            ContentTrivia.content_id == str(content.id)
        ).upsert(
            {"$set": trivia_data, "$setOnInsert": {"created_at": datetime.utcnow()}},
            on_insert=ContentTrivia(**trivia_data, created_at=datetime.utcnow()),
        )

        return result or ContentTrivia(**trivia_data, created_at=datetime.utcnow())

    async def _fetch_tmdb_facts(self, content: Content) -> list[TriviaFactModel]:
        """Fetch trivia from TMDB API."""
        facts = []

        try:
            # Get cast info from existing TMDB service
            if content.tmdb_id:
                credits = await self.tmdb_service.get_credits(content.tmdb_id)

                # Create facts from cast
                for actor in (credits.get("cast") or [])[:3]:
                    facts.append(TriviaFactModel(
                        fact_id=str(uuid4()),
                        text=f"{actor.get('name', 'שחקן')} מגלם את הדמות {actor.get('character', '')}",
                        text_en=f"{actor.get('name', 'Actor')} plays {actor.get('character', 'a character')}",
                        text_es=f"{actor.get('name', 'Actor')} interpreta a {actor.get('character', 'un personaje')}",
                        category="cast",
                        source="tmdb",
                        trigger_type="random",
                        priority=7,
                    ))
        except Exception as e:
            logger.warning(f"Failed to fetch TMDB facts for {content.id}: {e}")

        return facts

    async def _generate_ai_facts(
        self,
        content: Content,
        existing_count: int = 0,
    ) -> list[TriviaFactModel]:
        """Generate AI facts using Claude API."""
        from app.services.ai_service import AIService

        facts = []
        max_to_generate = min(5, settings.TRIVIA_MAX_FACTS_PER_CONTENT - existing_count)

        if max_to_generate <= 0:
            return facts

        try:
            ai_service = AIService()

            prompt = f"""Generate {max_to_generate} interesting trivia facts about this content:
Title: {content.title}
Description: {content.description or 'N/A'}
Year: {content.year or 'N/A'}
Genre: {content.genre or 'N/A'}
Director: {content.director or 'N/A'}

For each fact, provide:
1. Hebrew text (text)
2. English text (text_en)
3. Spanish text (text_es)
4. Category: one of cast, production, location, cultural, historical

Return as JSON array."""

            response = await ai_service.generate_structured(
                prompt=prompt,
                model=settings.AI_MODEL_DEFAULT,
            )

            for item in response.get("facts", [])[:max_to_generate]:
                facts.append(TriviaFactModel(
                    fact_id=str(uuid4()),
                    text=item.get("text", ""),
                    text_en=item.get("text_en", ""),
                    text_es=item.get("text_es", ""),
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

### Trivia Store (Zustand)

```typescript
// /shared/stores/triviaStore.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
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
          // Check offline cache first
          const cached = get().getCachedTrivia(contentId);
          if (cached && !navigator.onLine) {
            set({ facts: cached, isLoading: false });
            return;
          }

          const response = await triviaApi.getTrivia(contentId, lang);
          set({ facts: response.facts, isLoading: false });

          // Cache for offline
          get().cacheTrivia(contentId, response.facts);
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
          const response = await triviaApi.getEnrichedTrivia(contentId);
          get().cacheTrivia(contentId, response.facts);
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
          await triviaApi.updatePreferences(newPrefs);
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

### useTrivia Hook

```typescript
// /web/src/components/player/hooks/useTrivia.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
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
    AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion);
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReducedMotion
    );
    return () => subscription.remove();
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
  const dismissTimeoutRef = useRef<NodeJS.Timeout>();
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
          dismissTimeoutRef.current = setTimeout(() => {
            dismissFact();
          }, (fact.display_duration || preferences.display_duration) * 1000);
        }
      }
    }

    return () => {
      if (dismissTimeoutRef.current) {
        clearTimeout(dismissTimeoutRef.current);
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

### TriviaOverlay Component (React Native with StyleSheet)

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
} from 'react-native';
import { GlassCard, GlassButton, GlassBadge } from '@olorin/glass-ui';
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

export function TriviaOverlay({ fact, onDismiss, isRTL }: TriviaOverlayProps): JSX.Element {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const direction = isRTL ?? I18nManager.isRTL ? 'rtl' : 'ltr';

  useEffect(() => {
    // Announce to screen readers
    AccessibilityInfo.announceForAccessibility(
      `Trivia: ${fact.text}`
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
  }, [fact, fadeAnim, slideAnim]);

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

  return (
    <Animated.View
      style={[
        styles.container,
        direction === 'rtl' ? styles.containerRTL : styles.containerLTR,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <GlassCard style={styles.card}>
        <View style={[styles.content, direction === 'rtl' && styles.contentRTL]}>
          <View style={styles.header}>
            <GlassBadge
              label={fact.category}
              size="sm"
              style={{ backgroundColor: CATEGORY_COLORS[fact.category] || '#6b7280' }}
            />
            <Pressable
              onPress={handleDismiss}
              accessibilityLabel="Dismiss trivia"
              accessibilityRole="button"
              style={styles.dismissButton}
            >
              <Text style={styles.dismissText}>✕</Text>
            </Pressable>
          </View>
          <Text
            style={[styles.text, direction === 'rtl' && styles.textRTL]}
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
    bottom: 120, // Above player controls
    maxWidth: 400,
    zIndex: 50,
    pointerEvents: 'box-none',
  },
  containerLTR: {
    left: 16,
  },
  containerRTL: {
    right: 16,
  },
  card: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 12,
    padding: 16,
    // Backdrop filter fallback for older browsers
    // Note: backdrop-filter handled by GlassCard component
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
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dismissText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
  },
  text: {
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 20,
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
import { View, Text, StyleSheet } from 'react-native';
import { GlassCard, GlassToggle, GlassSelect } from '@olorin/glass-ui';
import { useTriviaStore } from '../../../../shared/stores/triviaStore';
import { useTranslation } from 'react-i18next';

const FREQUENCY_OPTIONS = [
  { value: 'off', label: 'Off' },
  { value: 'low', label: 'Low (every 10 min)' },
  { value: 'normal', label: 'Normal (every 5 min)' },
  { value: 'high', label: 'High (every 2.5 min)' },
];

export function TriviaSettingsSection(): JSX.Element {
  const { t } = useTranslation();
  const { preferences, updatePreferences } = useTriviaStore();

  return (
    <GlassCard style={styles.container}>
      <Text style={styles.title}>{t('settings.trivia.title', 'Trivia & Fun Facts')}</Text>

      <View style={styles.row}>
        <Text style={styles.label}>{t('settings.trivia.enabled', 'Show Trivia')}</Text>
        <GlassToggle
          value={preferences.enabled}
          onValueChange={(enabled) => updatePreferences({ enabled })}
          accessibilityLabel={t('settings.trivia.toggleLabel', 'Toggle trivia display')}
        />
      </View>

      {preferences.enabled && (
        <>
          <View style={styles.row}>
            <Text style={styles.label}>{t('settings.trivia.frequency', 'Frequency')}</Text>
            <GlassSelect
              value={preferences.frequency}
              options={FREQUENCY_OPTIONS}
              onValueChange={(frequency) => updatePreferences({ frequency: frequency as any })}
              style={styles.select}
            />
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>
              {t('settings.trivia.duration', 'Display Duration')}
            </Text>
            <Text style={styles.value}>{preferences.display_duration}s</Text>
          </View>
        </>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    marginVertical: 8,
  },
  title: {
    color: '#ffffff',
    fontSize: 18,
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
    fontSize: 14,
  },
  value: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
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

## CI/CD Integration

### Add to Existing CI Workflow

```yaml
# .github/workflows/ci.yml - ADD NEW JOB

  test-trivia:
    name: Test Trivia Feature
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Download build artifacts
        uses: actions/download-artifact@v4
        with:
          name: packages-dist
          path: packages/ui

      - name: Run trivia unit tests
        run: npm run test:unit -- --grep "trivia"

      - name: Run trivia integration tests
        run: npm run test:integration -- --grep "trivia"

  # Update all-checks job to include test-trivia
  all-checks:
    name: All Checks Passed
    runs-on: ubuntu-latest
    needs: [lint, type-check, build, test, version-check, test-trivia]
    # ... rest unchanged
```

### Backend CI (if separate)

```yaml
# .github/workflows/backend-ci.yml - ADD TO EXISTING

  test-trivia-backend:
    name: Test Trivia Backend
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install Poetry
        run: pip install poetry

      - name: Install dependencies
        working-directory: backend
        run: poetry install

      - name: Run trivia tests
        working-directory: backend
        run: poetry run pytest tests/unit/test_trivia.py -v --cov=app/services/trivia_generator --cov=app/api/routes/trivia
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
- `backend/tests/unit/test_trivia.py` - Unit tests

### Frontend
- `web/src/components/player/hooks/useTrivia.ts` - Player hook
- `web/src/components/player/TriviaOverlay.tsx` - Display overlay
- `web/src/components/player/TriviaSettingsSection.tsx` - Settings UI
- `shared/stores/triviaStore.ts` - State management
- `shared/services/api/triviaServices.ts` - API client
- `shared/types/trivia.ts` - TypeScript types

### Files to Modify
- `backend/app/api/router_registry.py` - Register trivia router
- `backend/app/core/config.py` - Add configuration
- `web/src/components/player/VideoPlayer.tsx` - Integrate overlay
- `web/src/components/player/SettingsPanel.tsx` - Add trivia section
- `shared/config/appConfig.ts` - Add feature flag
- `shared/i18n/locales/he.json` - Hebrew translations
- `shared/i18n/locales/en.json` - English translations
- `shared/i18n/locales/es.json` - Spanish translations
- `.github/workflows/ci.yml` - Add trivia test job

---

## Verification Checklist

### Backend
- [ ] `poetry run pytest tests/unit/test_trivia.py -v` passes
- [ ] Server starts: `poetry run uvicorn app.main:app --reload`
- [ ] API responds: `curl http://localhost:8000/api/v1/trivia/{content_id}`
- [ ] Preferences persist: PUT then GET `/trivia/preferences`

### Frontend
- [ ] `npm run type-check` passes
- [ ] `npm run test:unit -- --grep trivia` passes
- [ ] Overlay renders at bottom-left during playback
- [ ] RTL layout correct for Hebrew
- [ ] Dismiss button works (44x44pt touch target)
- [ ] Settings toggle works

### Accessibility
- [ ] Screen reader announces trivia facts
- [ ] Reduced motion disables animations
- [ ] WCAG 2.1 AA color contrast (4.5:1)
- [ ] Focus management correct

### Offline
- [ ] Trivia cached when downloaded
- [ ] Trivia loads from cache when offline
- [ ] Preferences persist offline

### CI/CD
- [ ] All CI jobs pass
- [ ] Test coverage > 87%
- [ ] No linting errors

---

## Summary of V4 Changes

| Issue | V3 Problem | V4 Fix |
|-------|------------|--------|
| ContentAccessService | Doesn't exist | Inline `check_content_access()` function using `user.can_access_premium_features()` |
| ContentFilterService | Doesn't exist | Removed - not needed for trivia |
| Glass import path | `@bayit/glass` | `@olorin/glass-ui` |
| GlassSwitch | Doesn't exist | Use `GlassToggle` |
| GlassChip | Doesn't exist | Use `GlassBadge` |
| GlassSlider | Doesn't exist | Removed - use text display for duration |
| AuditLogger interface | `audit_log.info()` | `await AuditLogger.log_event(...)` |
| OlorinAIAgent | Library audits only | Use `AIService` for trivia generation |
| use_revision | Not in codebase | Removed |
| schema_version | Not in codebase | Removed |
| Race condition | Duplicate inserts | `find_one_and_update` with `upsert=True` |
| CI/CD pipeline | Missing | Added `test-trivia` job to existing ci.yml |
| Backdrop-filter | No fallback | GlassCard handles fallback, added comment |
