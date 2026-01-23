# Real-time/Offline Trivia and Fun Facts Feature - REVISED PLAN v2

## Overview

Add real-time trivia and fun facts display during video playback in Bayit+, with full offline support for downloaded content. This feature integrates with the Olorin AI Agent ecosystem and follows all platform-specific implementation patterns.

---

## 1. Architecture Integration

### 1.1 Olorin Ecosystem Alignment

**Trivia generation uses existing Olorin paved roads:**

```
┌─────────────────────────────────────────────────────────────────┐
│                    TRIVIA FEATURE ARCHITECTURE                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐     ┌──────────────────────────────┐     │
│  │  FastAPI Router  │────▶│  TriviaService (Orchestrator) │     │
│  │  /api/v1/trivia  │     └──────────────┬───────────────┘     │
│  └──────────────────┘                    │                      │
│                                          │                      │
│         ┌────────────────────────────────┼────────────────┐    │
│         ▼                                ▼                ▼    │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐ │
│  │ Olorin AI Agent │    │ TriviaRepository │   │ TMDBService │ │
│  │ (Claude trivia) │    │ (MongoDB CRUD)   │   │ (enrichment)│ │
│  └─────────────────┘    └─────────────────┘    └─────────────┘ │
│                                                                 │
│  EXISTING SERVICES REUSED:                                      │
│  • app/services/ai_agent/ - Claude integration                  │
│  • app/services/tmdb_service.py - TMDB data                     │
│  • app/core/config.py - Configuration                           │
│  • app/core/database.py - Beanie ODM                            │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Service Separation (SRP Compliance)

```
backend/app/services/trivia/
├── __init__.py
├── service.py           # TriviaService - orchestrator
├── repository.py        # TriviaRepository - MongoDB CRUD
├── generator.py         # TriviaGenerator - AI generation logic
└── sources/
    ├── __init__.py
    ├── base.py          # TriviaSourceStrategy (abstract)
    ├── tmdb_source.py   # TMDBTriviaSource
    └── ai_source.py     # AITriviaSource (Claude)
```

---

## 2. Data Model (MongoDB/Beanie)

### 2.1 Enums for Constrained Fields

```python
# backend/app/models/trivia.py
from enum import Enum

class TriggerType(str, Enum):
    TIME = "time"
    SCENE = "scene"
    ACTOR = "actor"
    RANDOM = "random"

class TriviaCategory(str, Enum):
    CAST = "cast"
    PRODUCTION = "production"
    LOCATION = "location"
    CULTURAL = "cultural"
    HISTORICAL = "historical"

class TriviaSource(str, Enum):
    TMDB = "tmdb"
    IMDB = "imdb"
    AI = "ai"
    MANUAL = "manual"
    CULTURAL_REFERENCE = "cultural_reference"

class ContentType(str, Enum):
    VOD = "vod"
    SERIES_EPISODE = "series_episode"
```

### 2.2 TriviaFactModel (Embedded Document)

```python
from pydantic import BaseModel, Field, validator
from datetime import datetime
from uuid import uuid4

class TriviaFactModel(BaseModel):
    """Single trivia fact with trilingual support (all languages REQUIRED)."""

    fact_id: str = Field(default_factory=lambda: str(uuid4()))

    # Trilingual content - ALL REQUIRED (following Content model pattern)
    text: str = Field(..., min_length=1, description="Hebrew text (required)")
    text_en: str = Field(..., min_length=1, description="English text (required)")
    text_es: str = Field(..., min_length=1, description="Spanish text (required)")

    # Source attribution (trilingual)
    source_attribution: str = Field(default="")
    source_attribution_en: str = Field(default="")
    source_attribution_es: str = Field(default="")

    # Timing and display
    trigger_time: float | None = Field(default=None, ge=0, description="Seconds into content")
    trigger_type: TriggerType = TriggerType.RANDOM
    display_duration: int = Field(default=12, ge=5, le=30, description="Seconds to display")

    # Categorization
    category: TriviaCategory
    source: TriviaSource
    priority: int = Field(default=5, ge=1, le=10, description="Display priority 1-10")

    # Metadata
    related_person_id: str | None = None
    tags: list[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    @validator('text', 'text_en', 'text_es')
    def validate_text_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError("Text field cannot be empty")
        return v.strip()
```

### 2.3 ContentTrivia Document

```python
from beanie import Document, Indexed
from pymongo import IndexModel, ASCENDING, DESCENDING
from typing import List, Optional
from datetime import datetime
from pydantic import Field, validator, root_validator

class ContentTrivia(Document):
    """
    Trivia facts for VOD content.
    Follows Bayit+ patterns: timestamps, cache tracking, denormalized fields.
    """

    # Core fields
    content_id: Indexed(str, unique=True)
    content_type: ContentType
    content_title: str

    # Trivia data (max 200 facts)
    facts: List[TriviaFactModel] = Field(default_factory=list, max_length=200)
    total_duration: float = 0.0  # Content duration in seconds

    # Sources and enrichment
    sources_used: List[TriviaSource] = Field(default_factory=list)
    tmdb_id: Indexed(int, sparse=True) | None = None
    is_enriched: bool = False
    enriched_at: datetime | None = None

    # Denormalized fields (avoid $unwind aggregations)
    fact_count: int = 0
    fact_categories: List[str] = Field(default_factory=list)
    fact_tags: List[str] = Field(default_factory=list)
    estimated_size_kb: int | None = None

    # Cache tracking (matches TranslationCacheDoc pattern)
    access_count: int = 0
    last_accessed_at: datetime | None = None

    # Timestamps (REQUIRED - standard across all models)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Schema versioning for migrations
    schema_version: int = Field(default=1)

    @validator('facts')
    def validate_facts(cls, v):
        if len(v) > 200:
            raise ValueError("Maximum 200 facts allowed per content")
        fact_ids = [f.fact_id for f in v]
        if len(fact_ids) != len(set(fact_ids)):
            raise ValueError("Duplicate fact_id detected")
        return v

    @root_validator
    def validate_and_denormalize(cls, values):
        facts = values.get('facts', [])
        values['fact_count'] = len(facts)
        values['fact_categories'] = list(set(f.category.value for f in facts))
        values['fact_tags'] = list(set(tag for f in facts for tag in f.tags))

        is_enriched = values.get('is_enriched', False)
        enriched_at = values.get('enriched_at')
        if is_enriched and enriched_at is None:
            raise ValueError("enriched_at required when is_enriched is True")

        return values

    def update_timestamp(self):
        self.updated_at = datetime.utcnow()

    class Settings:
        name = "content_trivia"
        use_revision = True  # Optimistic locking
        indexes = [
            # Primary lookup (unique on content_id via Indexed annotation)
            # Admin queries
            IndexModel(
                [("is_enriched", ASCENDING), ("updated_at", DESCENDING)],
                name="idx_enriched_updated"
            ),
            IndexModel(
                [("content_type", ASCENDING), ("is_enriched", ASCENDING)],
                name="idx_type_enriched"
            ),
            # Monitoring and cache management
            IndexModel([("fact_count", DESCENDING)], name="idx_fact_count"),
            IndexModel([("access_count", DESCENDING)], name="idx_access_count"),
            IndexModel([("last_accessed_at", ASCENDING)], name="idx_last_accessed"),
        ]

    @classmethod
    async def get_for_content(cls, content_id: str) -> Optional["ContentTrivia"]:
        """Get trivia with cache hit tracking."""
        doc = await cls.find_one(cls.content_id == content_id)
        if doc:
            doc.access_count += 1
            doc.last_accessed_at = datetime.utcnow()
            await doc.save()
        return doc
```

### 2.4 Model Registration

Add to `/backend/app/core/database.py`:

```python
from app.models.trivia import ContentTrivia

document_models: List[Type[Document]] = [
    # ... existing models ...
    ContentTrivia,  # NEW: Trivia feature
]
```

---

## 3. Backend Implementation

### 3.1 Configuration (app/core/config.py)

```python
class Settings(BaseSettings):
    # ... existing settings ...

    # Trivia Feature Configuration
    TRIVIA_ENABLED: bool = False  # Feature flag (default OFF for safe deployment)
    TRIVIA_ROLLOUT_PERCENTAGE: int = 0  # Gradual rollout 0-100%
    TRIVIA_ALLOWED_USER_IDS: str = ""  # CSV of beta tester user IDs
    TRIVIA_EXCLUDED_CONTENT_IDS: str = ""  # CSV of content IDs to exclude

    # Display settings
    TRIVIA_DEFAULT_DISPLAY_DURATION_SECONDS: int = 12
    TRIVIA_MIN_INTERVAL_SECONDS: int = 300  # 5 minutes minimum between facts
    TRIVIA_MAX_FACTS_PER_CONTENT: int = 50

    # Performance settings
    TRIVIA_CACHE_TTL_SECONDS: int = 3600  # 1 hour
    TRIVIA_AI_GENERATION_TIMEOUT_SECONDS: float = 10.0
    TRIVIA_MAX_RETRIES: int = 3

    # Cost controls
    TRIVIA_DAILY_BUDGET_USD: float = 600.0
    TRIVIA_MAX_REQUESTS_PER_DAY: int = 70000

    # Monitoring
    TRIVIA_MONITORING_ENABLED: bool = True
```

### 3.2 API Endpoints (app/api/routes/trivia.py)

```python
from fastapi import APIRouter, Depends, HTTPException, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from app.core.security import get_current_user, require_admin
from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.trivia import ContentTrivia, TriviaFactModel
from app.services.trivia.service import TriviaService
from pydantic import BaseModel
from typing import List

router = APIRouter()
logger = get_logger(__name__)
limiter = Limiter(key_func=get_remote_address)

# Request/Response schemas
class TriviaFactResponse(BaseModel):
    fact_id: str
    text: str
    text_en: str
    text_es: str
    trigger_time: float | None
    category: str
    display_duration: int

class TriviaResponse(BaseModel):
    content_id: str
    facts: List[TriviaFactResponse]
    fact_count: int

class TriviaPreferencesRequest(BaseModel):
    enabled: bool = True
    frequency: str = "normal"  # off, low, normal, high
    categories: List[str] = []
    display_duration: int = 12

# Feature flag check
def is_trivia_enabled_for_user(user_id: str, content_id: str) -> bool:
    if not settings.TRIVIA_ENABLED:
        return False
    if content_id in settings.TRIVIA_EXCLUDED_CONTENT_IDS.split(","):
        return False
    if user_id in settings.TRIVIA_ALLOWED_USER_IDS.split(","):
        return True
    user_hash = hash(user_id) % 100
    return user_hash < settings.TRIVIA_ROLLOUT_PERCENTAGE

# Endpoints
@router.get("/{content_id}", response_model=TriviaResponse)
@limiter.limit("100/minute")
async def get_trivia(
    content_id: str,
    request: Request,
    language: str = "he",
    current_user = Depends(get_current_user)
):
    """Get trivia facts for content. Generates if missing."""
    # Feature flag check
    if not is_trivia_enabled_for_user(current_user.id, content_id):
        raise HTTPException(status_code=503, detail="Trivia feature disabled")

    # Content access authorization
    if not await user_can_access_content(current_user.id, content_id):
        raise HTTPException(status_code=403, detail="Access denied to this content")

    trivia_service = TriviaService()
    trivia = await trivia_service.get_or_generate(content_id, language)

    logger.info(
        "Trivia retrieved",
        extra={
            "content_id": content_id,
            "user_id": current_user.id,
            "fact_count": trivia.fact_count,
        }
    )

    return TriviaResponse(
        content_id=trivia.content_id,
        facts=[TriviaFactResponse(**f.dict()) for f in trivia.facts],
        fact_count=trivia.fact_count
    )

@router.get("/{content_id}/enriched", response_model=TriviaResponse)
@limiter.limit("30/minute")
async def get_trivia_enriched(
    content_id: str,
    request: Request,
    current_user = Depends(get_current_user)
):
    """Get full trivia bundle for offline caching."""
    if not is_trivia_enabled_for_user(current_user.id, content_id):
        raise HTTPException(status_code=503, detail="Trivia feature disabled")

    if not await user_can_access_content(current_user.id, content_id):
        raise HTTPException(status_code=403, detail="Access denied to this content")

    trivia_service = TriviaService()
    return await trivia_service.get_enriched_bundle(content_id)

@router.post("/{content_id}/generate")
@limiter.limit("10/hour")
async def generate_trivia(
    content_id: str,
    request: Request,
    admin = Depends(require_admin)
):
    """Force regenerate trivia (admin only)."""
    trivia_service = TriviaService()
    trivia = await trivia_service.regenerate(content_id, admin.id)

    logger.info(
        "Trivia regenerated by admin",
        extra={
            "content_id": content_id,
            "admin_id": admin.id,
            "fact_count": trivia.fact_count,
        }
    )

    return {"status": "success", "fact_count": trivia.fact_count}

@router.get("/preferences", response_model=TriviaPreferencesRequest)
async def get_preferences(current_user = Depends(get_current_user)):
    """Get user's trivia preferences."""
    return current_user.preferences.get("trivia", TriviaPreferencesRequest().dict())

@router.put("/preferences")
async def update_preferences(
    prefs: TriviaPreferencesRequest,
    current_user = Depends(get_current_user)
):
    """Update user's trivia preferences."""
    current_user.preferences["trivia"] = prefs.dict()
    await current_user.save()
    return {"status": "success"}
```

### 3.3 Router Registration (app/api/router_registry.py)

```python
from app.api.routes import trivia  # ADD THIS

def register_all_routers(app: FastAPI) -> None:
    # ... existing routes ...

    # Feature Routes
    app.include_router(trivia.router, prefix=f"{prefix}/trivia", tags=["trivia"])
```

### 3.4 Trivia Service (app/services/trivia/service.py)

```python
from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.trivia import ContentTrivia
from app.services.trivia.repository import TriviaRepository
from app.services.trivia.generator import TriviaGenerator
from app.services.content_filter import ContentFilterService

logger = get_logger(__name__)

class TriviaService:
    """Orchestrates trivia retrieval and generation."""

    def __init__(self):
        self.repository = TriviaRepository()
        self.generator = TriviaGenerator()
        self.content_filter = ContentFilterService()

    async def get_or_generate(self, content_id: str, language: str = "he") -> ContentTrivia:
        # Try cache first
        trivia = await self.repository.get_by_content_id(content_id)

        if trivia and trivia.is_enriched:
            return trivia

        # Generate if missing or not enriched
        return await self.regenerate(content_id)

    async def regenerate(self, content_id: str, admin_id: str | None = None) -> ContentTrivia:
        # Generate facts
        raw_facts = await self.generator.generate(content_id)

        # Filter AI outputs for safety
        filtered_facts = []
        for fact in raw_facts:
            safety_result = await self.content_filter.check(fact.text)
            if safety_result.is_safe:
                filtered_facts.append(fact)
            else:
                logger.warning(
                    "Trivia fact filtered for safety",
                    extra={"content_id": content_id, "flags": safety_result.flags}
                )

        # Save to database
        trivia = await self.repository.upsert(content_id, filtered_facts)
        return trivia

    async def get_enriched_bundle(self, content_id: str) -> ContentTrivia:
        """Get complete bundle for offline caching."""
        return await self.get_or_generate(content_id)
```

---

## 4. Frontend Implementation

### 4.1 Platform Specification

**This is React Native Web - NOT pure web components.**

| Platform | Styling Approach | Components |
|----------|------------------|------------|
| iOS | StyleSheet.create() | React Native + Glass |
| Android | StyleSheet.create() | React Native + Glass |
| tvOS | StyleSheet.create() | React Native + Glass |
| Web | StyleSheet.create() | React Native Web + Glass |

### 4.2 TypeScript Types (shared/types/trivia.ts)

```typescript
export interface TriviaFact {
  fact_id: string;
  text: string;
  text_en: string;
  text_es: string;
  trigger_time: number | null;
  trigger_type: 'time' | 'scene' | 'actor' | 'random';
  category: 'cast' | 'production' | 'location' | 'cultural' | 'historical';
  source: 'tmdb' | 'imdb' | 'ai' | 'manual' | 'cultural_reference';
  display_duration: number;
  priority: number;
}

export interface TriviaSettings {
  enabled: boolean;
  frequency: 'off' | 'low' | 'normal' | 'high';
  categories: string[];
  displayDuration: number;
}

export interface TriviaState {
  // Cached facts (offline support)
  cachedFacts: Record<string, TriviaFact[]>;

  // User preferences
  settings: TriviaSettings;

  // Runtime state
  currentFact: TriviaFact | null;
  lastShownTimestamp: number;
  isVisible: boolean;
}
```

### 4.3 Zustand Store (shared/stores/triviaStore.ts)

```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TriviaFact, TriviaSettings, TriviaState } from '../types/trivia';
import { triviaService } from '../services/api/triviaServices';

interface TriviaStore extends TriviaState {
  // Actions
  loadFactsForContent: (contentId: string) => Promise<void>;
  showFact: (fact: TriviaFact) => void;
  dismissCurrentFact: () => void;
  updateSettings: (settings: Partial<TriviaSettings>) => Promise<void>;
  clearCache: () => void;
}

const DEFAULT_SETTINGS: TriviaSettings = {
  enabled: true,
  frequency: 'normal',
  categories: ['cast', 'production', 'cultural', 'historical'],
  displayDuration: 12,
};

export const useTriviaStore = create<TriviaStore>()(
  persist(
    (set, get) => ({
      cachedFacts: {},
      settings: DEFAULT_SETTINGS,
      currentFact: null,
      lastShownTimestamp: 0,
      isVisible: false,

      loadFactsForContent: async (contentId: string) => {
        try {
          const cached = get().cachedFacts[contentId];
          if (cached && cached.length > 0) {
            return; // Use cached
          }

          const response = await triviaService.getFactsForContent(contentId);
          set((state) => ({
            cachedFacts: {
              ...state.cachedFacts,
              [contentId]: response.facts,
            },
          }));
        } catch (error) {
          console.error('[TriviaStore] Failed to load facts:', error);
        }
      },

      showFact: (fact: TriviaFact) => {
        set({
          currentFact: fact,
          isVisible: true,
          lastShownTimestamp: Date.now(),
        });
      },

      dismissCurrentFact: () => {
        set({ currentFact: null, isVisible: false });
      },

      updateSettings: async (updates: Partial<TriviaSettings>) => {
        const newSettings = { ...get().settings, ...updates };
        set({ settings: newSettings });

        try {
          await triviaService.syncPreferences(newSettings);
        } catch (error) {
          console.error('[TriviaStore] Failed to sync settings:', error);
        }
      },

      clearCache: () => {
        set({ cachedFacts: {} });
      },
    }),
    {
      name: 'bayit-trivia',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        cachedFacts: state.cachedFacts,
        settings: state.settings,
      }),
    }
  )
);

// Selectors for memoized access
export const useTriviaSettings = () => useTriviaStore((state) => state.settings);
export const useTriviaCurrentFact = () => useTriviaStore((state) => state.currentFact);
export const useTriviaVisible = () => useTriviaStore((state) => state.isVisible);
```

### 4.4 API Service (shared/services/api/triviaServices.ts)

```typescript
import { api } from './client';
import { TriviaFact, TriviaSettings } from '../../types/trivia';

interface TriviaResponse {
  content_id: string;
  facts: TriviaFact[];
  fact_count: number;
}

export const triviaService = {
  getFactsForContent: (contentId: string, language: string = 'he') =>
    api.get<TriviaResponse>(`/trivia/${contentId}`, {
      params: { language },
    }),

  getEnrichedBundle: (contentId: string) =>
    api.get<TriviaResponse>(`/trivia/${contentId}/enriched`),

  syncPreferences: (preferences: TriviaSettings) =>
    api.put('/trivia/preferences', preferences),

  getPreferences: () =>
    api.get<TriviaSettings>('/trivia/preferences'),
};
```

### 4.5 useTrivia Hook (web/src/components/player/hooks/useTrivia.ts)

```typescript
import { useEffect, useRef, useCallback, useMemo } from 'react';
import { AppState, AccessibilityInfo, Platform } from 'react-native';
import { useTriviaStore, useTriviaSettings } from '@bayit/shared/stores/triviaStore';
import { TriviaFact } from '@bayit/shared/types/trivia';
import { appConfig } from '@bayit/shared/config/appConfig';
import { announceToScreenReader } from '@bayit/shared/utils/accessibility';
import NetInfo from '@react-native-community/netinfo';

interface UseTriviaOptions {
  contentId: string;
  currentTime: number;
  isPlaying: boolean;
  isLive: boolean;
  showSettings: boolean;
  showChapters: boolean;
}

interface UseTriviaReturn {
  triviaEnabled: boolean;
  currentFact: TriviaFact | null;
  isVisible: boolean;
  dismissFact: () => void;
  toggleTrivia: () => void;
}

const FREQUENCY_INTERVALS = {
  off: Infinity,
  low: 600000,    // 10 minutes
  normal: 420000, // 7 minutes
  high: 300000,   // 5 minutes
};

export function useTrivia(options: UseTriviaOptions): UseTriviaReturn {
  const { contentId, currentTime, isPlaying, isLive, showSettings, showChapters } = options;

  const settings = useTriviaSettings();
  const {
    cachedFacts,
    currentFact,
    isVisible,
    lastShownTimestamp,
    loadFactsForContent,
    showFact,
    dismissCurrentFact,
    updateSettings,
  } = useTriviaStore();

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const appStateRef = useRef(AppState.currentState);

  // Feature flag check
  const triviaEnabled = useMemo(() => {
    if (!appConfig.features?.trivia?.enabled) return false;
    if (isLive) return false; // No trivia for live content
    return settings.enabled;
  }, [settings.enabled, isLive]);

  // Load facts on mount
  useEffect(() => {
    if (!triviaEnabled || !contentId) return;
    loadFactsForContent(contentId);
  }, [contentId, triviaEnabled, loadFactsForContent]);

  // Conflict detection - don't show trivia when other UI is active
  const shouldBlockTrivia = useMemo(() => {
    return showSettings || showChapters || !isPlaying;
  }, [showSettings, showChapters, isPlaying]);

  // Schedule next trivia fact
  const scheduleNextFact = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (!triviaEnabled || shouldBlockTrivia) return;

    const interval = FREQUENCY_INTERVALS[settings.frequency];
    const timeSinceLastShown = Date.now() - lastShownTimestamp;
    const delay = Math.max(0, interval - timeSinceLastShown);

    timeoutRef.current = setTimeout(() => {
      const facts = cachedFacts[contentId] || [];
      if (facts.length === 0) return;

      // Find next relevant fact
      const eligibleFacts = facts.filter((f) => {
        if (f.trigger_time === null) return true;
        return Math.abs(f.trigger_time - currentTime) < 30; // Within 30 seconds
      });

      if (eligibleFacts.length > 0) {
        const randomIndex = Math.floor(Math.random() * eligibleFacts.length);
        const fact = eligibleFacts[randomIndex];
        showFact(fact);

        // Announce to screen readers
        const language = 'en'; // Get from user settings
        const text = language === 'he' ? fact.text : fact.text_en;
        announceToScreenReader(`Trivia fact: ${text}`, false);
      }

      // Schedule next
      scheduleNextFact();
    }, delay);
  }, [triviaEnabled, shouldBlockTrivia, settings.frequency, lastShownTimestamp, contentId, cachedFacts, currentTime, showFact]);

  // Start scheduling when conditions are met
  useEffect(() => {
    if (triviaEnabled && isPlaying && !shouldBlockTrivia) {
      scheduleNextFact();
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [triviaEnabled, isPlaying, shouldBlockTrivia, scheduleNextFact]);

  // Handle app state changes (pause when backgrounded)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (appStateRef.current === 'active' && nextAppState.match(/inactive|background/)) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      } else if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        scheduleNextFact();
      }
      appStateRef.current = nextAppState;
    });

    return () => subscription.remove();
  }, [scheduleNextFact]);

  // Auto-dismiss after display duration
  useEffect(() => {
    if (!isVisible || !currentFact) return;

    const dismissTimer = setTimeout(() => {
      dismissCurrentFact();
    }, settings.displayDuration * 1000);

    return () => clearTimeout(dismissTimer);
  }, [isVisible, currentFact, settings.displayDuration, dismissCurrentFact]);

  const toggleTrivia = useCallback(() => {
    updateSettings({ enabled: !settings.enabled });
  }, [settings.enabled, updateSettings]);

  return {
    triviaEnabled,
    currentFact,
    isVisible,
    dismissFact: dismissCurrentFact,
    toggleTrivia,
  };
}
```

### 4.6 TriviaOverlay Component (shared/components/player/TriviaOverlay.tsx)

```typescript
import React, { useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  I18nManager,
  Platform,
  AccessibilityInfo,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassView } from '@bayit/shared/components/ui/GlassView';
import { TriviaFact } from '@bayit/shared/types/trivia';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { X } from 'lucide-react-native';

interface TriviaOverlayProps {
  fact: TriviaFact;
  visible: boolean;
  onDismiss: () => void;
  language?: 'he' | 'en' | 'es';
  reducedMotion?: boolean;
}

// Memoized component to prevent re-renders during video playback
export const TriviaOverlay = React.memo<TriviaOverlayProps>(
  ({ fact, visible, onDismiss, language = 'en', reducedMotion = false }) => {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const isRTL = I18nManager.isRTL || language === 'he';

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(isRTL ? 50 : -50)).current;

    // Get localized text
    const factText = useMemo(() => {
      switch (language) {
        case 'he': return fact.text;
        case 'es': return fact.text_es;
        default: return fact.text_en;
      }
    }, [fact, language]);

    // Entrance/exit animations
    useEffect(() => {
      if (reducedMotion) {
        fadeAnim.setValue(visible ? 1 : 0);
        slideAnim.setValue(0);
        return;
      }

      if (visible) {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.spring(slideAnim, {
            toValue: 0,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
          }),
        ]).start();
      } else {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: isRTL ? 50 : -50,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }, [visible, reducedMotion, isRTL, fadeAnim, slideAnim]);

    // Keyboard dismiss (web)
    useEffect(() => {
      if (Platform.OS !== 'web') return;

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && visible) {
          onDismiss();
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [visible, onDismiss]);

    if (!visible) return null;

    return (
      <Animated.View
        style={[
          styles.container,
          {
            top: insets.top + 80,
            [isRTL ? 'right' : 'left']: insets.left + spacing.md,
            opacity: fadeAnim,
            transform: [{ translateX: slideAnim }],
          },
        ]}
        accessible={true}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        accessibilityLabel={`${t('player.trivia.announcement')}: ${factText}`}
      >
        <GlassView intensity="medium" style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <Text
              style={[styles.title, isRTL && styles.textRTL]}
              accessibilityRole="header"
            >
              {t('player.trivia.didYouKnow')}
            </Text>
            <Pressable
              onPress={onDismiss}
              style={styles.dismissButton}
              accessible={true}
              accessibilityLabel={t('player.trivia.dismiss')}
              accessibilityRole="button"
              accessibilityHint={t('player.trivia.dismissHint')}
            >
              <X size={16} color={colors.textMuted} />
            </Pressable>
          </View>

          {/* Fact text */}
          <Text
            style={[
              styles.factText,
              isRTL && styles.textRTL,
              Platform.OS === 'web' && styles.factTextTV, // Larger for tvOS
            ]}
            accessibilityRole="text"
          >
            {factText}
          </Text>

          {/* Category badge */}
          <View style={styles.footer}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>
                {t(`player.trivia.category_${fact.category}`)}
              </Text>
            </View>
          </View>
        </GlassView>
      </Animated.View>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.visible === nextProps.visible &&
      prevProps.fact?.fact_id === nextProps.fact?.fact_id
    );
  }
);

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    maxWidth: 320,
    zIndex: 150,
  },
  card: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dismissButton: {
    width: 44,
    height: 44,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  factText: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.text,
    lineHeight: 20,
  },
  factTextTV: {
    fontSize: 20, // 52pt equivalent for tvOS 10-foot UI
    lineHeight: 30,
  },
  textRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  categoryBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.glassPurpleLight,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.primary,
  },
});
```

### 4.7 i18n Translation Keys

**shared/i18n/locales/en.json:**
```json
{
  "player": {
    "trivia": {
      "title": "Trivia & Fun Facts",
      "didYouKnow": "Did You Know?",
      "announcement": "Fun Fact",
      "dismiss": "Close trivia",
      "dismissHint": "Dismiss this trivia fact",
      "enabled": "Show trivia facts during playback",
      "frequency": "Frequency",
      "frequency_off": "Off",
      "frequency_low": "Low (Every 10 min)",
      "frequency_normal": "Normal (Every 7 min)",
      "frequency_high": "High (Every 5 min)",
      "categories": "Categories",
      "category_cast": "Cast & Crew",
      "category_production": "Production",
      "category_cultural": "Cultural Context",
      "category_historical": "Historical Facts",
      "category_location": "Locations",
      "displayDuration": "Display Duration"
    }
  }
}
```

**shared/i18n/locales/he.json:**
```json
{
  "player": {
    "trivia": {
      "title": "טריוויה ועובדות מעניינות",
      "didYouKnow": "האם ידעת?",
      "announcement": "עובדה מעניינת",
      "dismiss": "סגור טריוויה",
      "dismissHint": "דחה עובדה זו",
      "enabled": "הצג עובדות מעניינות במהלך הצפייה",
      "frequency": "תדירות",
      "frequency_off": "כבוי",
      "frequency_low": "נמוכה (כל 10 דקות)",
      "frequency_normal": "רגילה (כל 7 דקות)",
      "frequency_high": "גבוהה (כל 5 דקות)",
      "categories": "קטגוריות",
      "category_cast": "שחקנים וצוות",
      "category_production": "הפקה",
      "category_cultural": "הקשר תרבותי",
      "category_historical": "עובדות היסטוריות",
      "category_location": "מיקומים",
      "displayDuration": "משך תצוגה"
    }
  }
}
```

---

## 5. Testing Requirements

### 5.1 Backend Tests (87%+ Coverage Required)

```
backend/tests/
├── test_trivia_service.py           # Unit tests for TriviaService
├── test_trivia_repository.py        # Unit tests for TriviaRepository
├── test_trivia_generator.py         # Unit tests for TriviaGenerator
├── test_trivia_api_integration.py   # Integration tests for API
└── test_trivia_e2e.py               # E2E tests
```

**Test Categories:**
- Feature flag behavior (enabled/disabled/rollout percentage)
- Content access authorization
- Rate limiting per endpoint
- AI content filtering
- Caching and cache invalidation
- Offline bundle generation
- Error handling and resilience

### 5.2 Frontend Tests

```
shared/stores/__tests__/triviaStore.test.ts
shared/components/player/__tests__/TriviaOverlay.test.tsx
web/src/components/player/hooks/__tests__/useTrivia.test.ts
```

### 5.3 Platform-Specific Testing

**iOS:**
- iPhone SE, 15, 15 Pro Max viewports
- iOS 16, 17, 18 compatibility
- VoiceOver accessibility
- Safe area handling
- Landscape orientation

**tvOS:**
- Apple TV 4K physical device
- 10-foot UI readability
- Non-focusable overlay behavior
- Siri Remote gesture handling

**Web:**
- Chrome, Firefox, Safari, Edge
- 320px to 2560px viewports
- Keyboard navigation (Escape to dismiss)
- Backdrop-filter fallback

---

## 6. Deployment Strategy

### 6.1 Multi-Level Feature Flags

```bash
# Phase 0: Deploy disabled
TRIVIA_ENABLED=false
TRIVIA_ROLLOUT_PERCENTAGE=0

# Phase 1: Beta testers only
TRIVIA_ENABLED=true
TRIVIA_ROLLOUT_PERCENTAGE=0
TRIVIA_ALLOWED_USER_IDS=user1,user2,user3

# Phase 2: 5% rollout
TRIVIA_ROLLOUT_PERCENTAGE=5

# Phase 3: 25% rollout
TRIVIA_ROLLOUT_PERCENTAGE=25

# Phase 4: 50% rollout
TRIVIA_ROLLOUT_PERCENTAGE=50

# Phase 5: Full rollout
TRIVIA_ROLLOUT_PERCENTAGE=100
```

### 6.2 Rollback Procedure

```bash
# Instant disable via config (no code deployment)
gcloud secrets versions add bayit-trivia-config --data-file=- <<EOF
{"TRIVIA_ENABLED": "false"}
EOF
```

### 6.3 Monitoring & Alerting

**Metrics:**
- `trivia.generation.total` - Counter
- `trivia.generation.success` - Counter
- `trivia.generation.failure` - Counter
- `trivia.generation.latency_ms` - Histogram
- `trivia.cache.hits` - Counter
- `trivia.cache.misses` - Counter
- `trivia.api.requests` - Counter by endpoint

**Alerts:**
- Error rate > 5% (5 min window) → Critical
- p95 latency > 10s (5 min window) → Warning
- AI timeout rate > 50% (2 min window) → Critical
- Daily cost > $800 → Warning

---

## 7. Files Summary

### Backend (Create)
- `backend/app/models/trivia.py` - Data models with enums
- `backend/app/api/routes/trivia.py` - API endpoints
- `backend/app/services/trivia/__init__.py`
- `backend/app/services/trivia/service.py` - Orchestrator
- `backend/app/services/trivia/repository.py` - MongoDB CRUD
- `backend/app/services/trivia/generator.py` - AI generation
- `backend/app/services/trivia/sources/base.py` - Strategy interface
- `backend/app/services/trivia/sources/tmdb_source.py`
- `backend/app/services/trivia/sources/ai_source.py`

### Backend (Modify)
- `backend/app/api/router_registry.py` - Register trivia router
- `backend/app/core/config.py` - Add configuration
- `backend/app/core/database.py` - Register ContentTrivia model

### Frontend (Create)
- `shared/types/trivia.ts` - TypeScript interfaces
- `shared/stores/triviaStore.ts` - Zustand store
- `shared/services/api/triviaServices.ts` - API client
- `shared/components/player/TriviaOverlay.tsx` - Display component
- `web/src/components/player/hooks/useTrivia.ts` - Player hook

### Frontend (Modify)
- `shared/i18n/locales/en.json` - Add trivia translations
- `shared/i18n/locales/he.json` - Add trivia translations
- `shared/i18n/locales/es.json` - Add trivia translations
- `web/src/components/player/VideoPlayer.tsx` - Integrate overlay
- `web/src/components/player/SettingsPanel.tsx` - Add trivia section

---

## 8. Verification Checklist

- [ ] Backend model registered in database.py
- [ ] All configuration externalized (no hardcoded values)
- [ ] Router registered in router_registry.py
- [ ] Feature flag defaults to OFF for safe deployment
- [ ] Rate limiting on all endpoints
- [ ] Content-level authorization checks
- [ ] AI output content filtering
- [ ] 87%+ test coverage
- [ ] i18n keys for all 3 languages
- [ ] Accessibility: aria-live, keyboard navigation
- [ ] StyleSheet.create() used (not Tailwind classes)
- [ ] Glass components used (not native elements)
- [ ] Safe area handling for all platforms
- [ ] 44pt minimum touch targets
- [ ] tvOS: 52pt minimum font, non-focusable overlay
- [ ] Reduced motion preference respected
- [ ] RTL layout support
- [ ] Offline caching via Zustand persist
- [ ] Monitoring and alerting configured
