# Olorin Ecosystem Architecture Analysis

## Executive Summary

This document provides a comprehensive architectural analysis of the Olorin ecosystem within the Bayit-Plus platform. The analysis evaluates current modularization, separation of concerns, and provides recommendations for improving the architecture.

### Key Findings

1. **Current State**: Olorin services are **well-modularized at the code level** but remain **tightly coupled to Bayit-Plus infrastructure** at the deployment and database level.

2. **Architecture Pattern**: The current architecture follows a **Modular Monolith** pattern - good internal separation but shared runtime and database.

3. **Recommendation**: Implement a **Strangler Fig Pattern** for gradual separation, enabling Olorin to operate as an independent platform while maintaining backward compatibility.

---

## 1. Current Architecture Analysis

### 1.1 Project Overview

The Bayit-Plus repository contains:

| Component | Purpose | Technology |
|-----------|---------|------------|
| `backend/` | FastAPI Python API server | Python 3.11+, FastAPI, MongoDB |
| `web/` | React web application | React, Vite, TailwindCSS |
| `mobile-app/` | React Native mobile app | React Native 0.83 |
| `tv-app/` | TV application | React-based |
| `tvos-app/` | Apple TV application | tvOS native |
| `shared/` | Shared components and services | TypeScript |

### 1.2 Olorin Component Inventory

**Backend Services** (`backend/app/services/olorin/`):

```
olorin/
├── __init__.py                    # Module exports and documentation
├── partner_service.py             # Integration partner management
├── metering_service.py            # Usage tracking facade
├── recap_agent_service.py         # Live broadcast summaries
├── realtime_dubbing_service.py    # Dubbing facade
├── vector_search_service.py       # Search facade
├── cultural_context_service.py    # Context detection facade
├── context/                       # Cultural context submodule
│   ├── service.py                 # Main context service
│   ├── detection.py               # Reference detection logic
│   ├── explanation.py             # Reference explanations
│   ├── cache.py                   # Alias caching
│   └── crud.py                    # Database operations
├── dubbing/                       # Realtime dubbing submodule
│   ├── service.py                 # Main dubbing orchestration
│   ├── pipeline.py                # Audio processing pipeline
│   ├── models.py                  # Dubbing-specific models
│   └── translation.py             # Translation provider
├── metering/                      # Usage metering submodule
│   ├── service.py                 # Main metering service
│   ├── sessions.py                # Session tracking
│   ├── usage.py                   # Usage recording
│   ├── summary.py                 # Usage summaries
│   └── costs.py                   # Cost calculations
└── search/                        # Vector search submodule
    ├── service.py                 # Main search service
    ├── client.py                  # Pinecone client management
    ├── embedding.py               # Embedding generation
    ├── indexer.py                 # Content indexing
    ├── searcher.py                # Search execution
    └── helpers.py                 # Utility functions
```

**API Routes** (`backend/app/api/routes/olorin/`):

```
olorin/
├── __init__.py                    # Router aggregation
├── partner.py                     # Partner management endpoints
├── dubbing.py                     # Dubbing endpoint facade
├── search.py                      # Search endpoints
├── context.py                     # Context endpoints
├── recap.py                       # Recap endpoints
├── webhooks.py                    # Webhook management
├── dependencies.py                # Auth/rate limit dependencies
├── errors.py                      # Error handling
└── dubbing_routes/                # Dubbing sub-routes
    ├── sessions.py                # Session management
    ├── websocket.py               # WebSocket streaming
    ├── state.py                   # Session state
    └── models.py                  # Request/response models
```

**Data Models** (`backend/app/models/`):

| Model | Purpose | Olorin-Specific |
|-------|---------|-----------------|
| `integration_partner.py` | Partner/API key management | Yes |
| `content_embedding.py` | Vector embeddings, recap sessions | Yes |
| `cultural_reference.py` | Cultural knowledge base | Yes |

### 1.3 Dependency Analysis

**Olorin Dependencies on Bayit-Plus Core**:

```
app.core.config (settings)
├── Used by: All Olorin services
├── Coupling: Tight (shared configuration)
└── Examples: ANTHROPIC_API_KEY, ELEVENLABS_*, PINECONE_*

app.core.database
├── Used by: All Olorin models (implicit via Beanie)
├── Coupling: Tight (shared MongoDB connection)
└── Impact: Cannot deploy Olorin independently

app.services.elevenlabs_realtime_service
├── Used by: olorin/dubbing/service.py
├── Coupling: Direct import
└── Shared: Voice pipeline infrastructure

app.services.elevenlabs_tts_streaming_service
├── Used by: olorin/dubbing/pipeline.py
├── Coupling: Direct import
└── Shared: TTS infrastructure

app.models.content
├── Used by: olorin/search/indexer.py, olorin/search/searcher.py
├── Coupling: Direct import (Content model)
└── Impact: Olorin search depends on Bayit+ content structure
```

**Bayit-Plus Dependencies on Olorin**:

```
Minimal - Good separation
├── Router registration in router_registry.py
├── Model registration in database.py
└── Configuration in config.py
```

### 1.4 Current Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           BAYIT-PLUS MONOLITH                                    │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │                          SHARED INFRASTRUCTURE                               ││
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐ ││
│  │  │   MongoDB    │  │   Redis      │  │  Config      │  │    ElevenLabs    │ ││
│  │  │   (Beanie)   │  │   (Cache)    │  │  (Shared)    │  │    (Shared)      │ ││
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────────┘ ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                        │                                         │
│              ┌─────────────────────────┼─────────────────────────┐              │
│              ▼                         ▼                         ▼              │
│  ┌───────────────────┐   ┌───────────────────────────────────────────────────┐  │
│  │   BAYIT+ CORE     │   │                OLORIN MODULE                      │  │
│  │                   │   │                                                   │  │
│  │  ┌─────────────┐  │   │  ┌─────────────┐  ┌─────────────┐  ┌───────────┐ │  │
│  │  │  Content    │  │   │  │  Partner    │  │  Dubbing    │  │  Search   │ │  │
│  │  │  Service    │◄─┼───┼──│  Service    │  │  Service    │  │  Service  │ │  │
│  │  └─────────────┘  │   │  └─────────────┘  └─────────────┘  └───────────┘ │  │
│  │                   │   │                                                   │  │
│  │  ┌─────────────┐  │   │  ┌─────────────┐  ┌─────────────┐  ┌───────────┐ │  │
│  │  │  Auth       │  │   │  │  Metering   │  │  Context    │  │  Recap    │ │  │
│  │  │  Service    │  │   │  │  Service    │  │  Service    │  │  Agent    │ │  │
│  │  └─────────────┘  │   │  └─────────────┘  └─────────────┘  └───────────┘ │  │
│  │                   │   │                                                   │  │
│  │  ┌─────────────┐  │   │  API Routes: /api/v1/olorin/*                    │  │
│  │  │  AI Agent   │  │   │                                                   │  │
│  │  │  (Librarian)│  │   └───────────────────────────────────────────────────┘  │
│  │  └─────────────┘  │                                                          │
│  │                   │                                                          │
│  │  API Routes:      │                                                          │
│  │  /api/v1/content  │                                                          │
│  │  /api/v1/auth     │                                                          │
│  │  /api/v1/live     │                                                          │
│  │  ...              │                                                          │
│  └───────────────────┘                                                          │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Coupling Analysis

### 2.1 Tight Coupling Points

| Coupling Point | Impact | Severity |
|---------------|--------|----------|
| **Shared MongoDB Connection** | Cannot deploy Olorin database separately | High |
| **Shared Configuration** | Settings mixed in single config class | Medium |
| **ElevenLabs Services** | Dubbing depends on shared voice services | Medium |
| **Content Model Dependency** | Search indexes Bayit+ Content model | Medium |
| **Database Model Registration** | All models in single `database.py` | Low |

### 2.2 Well-Separated Concerns

| Aspect | Quality | Notes |
|--------|---------|-------|
| **Code Organization** | Excellent | Clear `olorin/` namespace |
| **API Routing** | Excellent | `/olorin/*` prefix, separate router |
| **Service Modularity** | Good | Internal facade pattern |
| **Model Isolation** | Good | Olorin-specific models in own files |
| **Configuration Grouping** | Good | OLORIN_* prefix for settings |

### 2.3 Shared Infrastructure Analysis

**Voice Pipeline Services** (Shared between Bayit+ and Olorin):

```python
# Used by BOTH Bayit+ support system AND Olorin dubbing
app/services/
├── elevenlabs_realtime_service.py     # STT streaming
├── elevenlabs_tts_streaming_service.py # TTS streaming
├── live_translation_service.py         # Translation
└── voice_pipeline_service.py           # Orchestration
```

**AI Services** (Shared):

```python
app/services/
├── ai_agent_service.py                 # Librarian agent (Bayit+)
└── olorin/recap_agent_service.py       # Recap agent (Olorin)
# Both use Claude API via shared ANTHROPIC_API_KEY
```

---

## 3. Architectural Evaluation

### 3.1 Current Architecture Pattern: Modular Monolith

**Characteristics**:
- Single deployable unit
- Well-defined internal modules
- Shared database and runtime
- Good code-level separation

**Advantages**:
- Simple deployment
- No network latency between services
- Shared transactions
- Easy debugging

**Disadvantages**:
- Cannot scale Olorin independently
- Cannot deploy Olorin to other platforms
- Shared failure domain
- Technology lock-in

### 3.2 Domain Analysis

**Distinct Business Domains Identified**:

```
┌─────────────────────────────────────────────────────────────────┐
│                         BAYIT+ DOMAIN                            │
│  Purpose: Hebrew streaming platform for Israeli expats           │
│                                                                  │
│  Subdomains:                                                     │
│  ├── Content Management (VOD, Live, Radio, Podcasts)            │
│  ├── User Management (Auth, Profiles, Subscriptions)            │
│  ├── Social Features (Watch Party, Chess, Chat)                 │
│  ├── Kids/Youngsters Safety                                     │
│  └── AI Librarian (Content curation)                            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                         OLORIN DOMAIN                            │
│  Purpose: AI overlay platform for content providers              │
│                                                                  │
│  Subdomains:                                                     │
│  ├── Partner Integration (API keys, webhooks, metering)         │
│  ├── Realtime Dubbing (Hebrew→English/Spanish)                  │
│  ├── Semantic Search (Vector search with deep-linking)          │
│  ├── Cultural Context (Reference detection/explanation)         │
│  └── Recap Agent (Late-joiner summaries)                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     SHARED INFRASTRUCTURE                        │
│  Purpose: Common capabilities used by both domains               │
│                                                                  │
│  Components:                                                     │
│  ├── Voice Pipeline (ElevenLabs STT/TTS)                        │
│  ├── Translation Services (Google, Claude)                      │
│  ├── AI Foundation (Claude API client)                          │
│  ├── Storage (GCS)                                              │
│  └── Search Infrastructure (MongoDB text, Pinecone vectors)     │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 Bounded Context Mapping

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              CONTEXT MAP                                      │
│                                                                              │
│   ┌─────────────────┐                          ┌─────────────────┐           │
│   │   Bayit+        │  Content Model           │   Olorin        │           │
│   │   Content       │◄─────────────────────────│   Search        │           │
│   │   Context       │  (Conformist)            │   Context       │           │
│   └─────────────────┘                          └─────────────────┘           │
│                                                                              │
│   ┌─────────────────┐                          ┌─────────────────┐           │
│   │   Bayit+        │                          │   Olorin        │           │
│   │   Auth          │  No Direct Dependency    │   Partner       │           │
│   │   Context       │                          │   Context       │           │
│   └─────────────────┘                          └─────────────────┘           │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────┐       │
│   │                    SHARED KERNEL                                 │       │
│   │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐    │       │
│   │  │ Voice Pipeline │  │ Translation    │  │ AI Services    │    │       │
│   │  │ Services       │  │ Services       │  │ (Claude)       │    │       │
│   │  └────────────────┘  └────────────────┘  └────────────────┘    │       │
│   └─────────────────────────────────────────────────────────────────┘       │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Recommendations

### 4.1 Strategic Recommendation: Gradual Extraction via Strangler Fig Pattern

**Rationale**: Complete separation is recommended but should be done incrementally to minimize risk and maintain backward compatibility.

**Target Architecture**:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           FUTURE STATE ARCHITECTURE                              │
│                                                                                  │
│  ┌──────────────────────────────────────┐  ┌──────────────────────────────────┐ │
│  │         BAYIT+ PLATFORM              │  │       OLORIN.AI PLATFORM         │ │
│  │                                      │  │                                  │ │
│  │  ┌────────────────────────────────┐  │  │  ┌────────────────────────────┐ │ │
│  │  │        Application Layer        │  │  │  │      Application Layer     │ │ │
│  │  │  Content, Auth, Social, Kids    │  │  │  │  Partner, Dubbing, Search  │ │ │
│  │  └────────────────────────────────┘  │  │  │  Context, Recap             │ │ │
│  │                 │                    │  │  └────────────────────────────┘ │ │
│  │  ┌────────────────────────────────┐  │  │               │                │ │
│  │  │        Domain Layer            │  │  │  ┌────────────────────────────┐ │ │
│  │  │  Streaming-specific logic      │  │  │  │       Domain Layer         │ │ │
│  │  └────────────────────────────────┘  │  │  │  AI platform logic         │ │ │
│  │                 │                    │  │  └────────────────────────────┘ │ │
│  │  ┌────────────────────────────────┐  │  │               │                │ │
│  │  │     Infrastructure Layer       │  │  │  ┌────────────────────────────┐ │ │
│  │  │  MongoDB (bayit_plus)          │  │  │  │   Infrastructure Layer     │ │ │
│  │  │  GCS Storage                   │  │  │  │  MongoDB (olorin)          │ │ │
│  │  └────────────────────────────────┘  │  │  │  Pinecone                  │ │ │
│  │                                      │  │  │  GCS Storage               │ │ │
│  └──────────────────────────────────────┘  │  └────────────────────────────┘ │ │
│                      │                     │                │                │ │
│                      │                     └────────────────┼────────────────┘ │
│                      │                                      │                  │
│  ┌───────────────────┴──────────────────────────────────────┴────────────────┐ │
│  │                      SHARED SERVICES LAYER                                 │ │
│  │                                                                            │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐            │ │
│  │  │  Voice Pipeline │  │  Translation    │  │  AI Client      │            │ │
│  │  │  Package        │  │  Package        │  │  Package        │            │ │
│  │  │                 │  │                 │  │                 │            │ │
│  │  │  ElevenLabs STT │  │  Google         │  │  Claude/OpenAI  │            │ │
│  │  │  ElevenLabs TTS │  │  Claude         │  │  Embeddings     │            │ │
│  │  └─────────────────┘  │  OpenAI         │  └─────────────────┘            │ │
│  │                       └─────────────────┘                                  │ │
│  │                                                                            │ │
│  │  Deployment: Shared Python packages OR Microservices with gRPC            │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Phased Migration Plan

#### Phase 1: Configuration Separation (Low Risk)

**Goal**: Isolate Olorin configuration from Bayit+ configuration.

**Actions**:
1. Create `OlorinSettings` class in `backend/app/services/olorin/config.py`
2. Move OLORIN_* settings to dedicated class
3. Implement settings inheritance for shared values
4. Add Olorin-specific `.env` support

**Example**:
```python
# backend/app/services/olorin/config.py
from pydantic_settings import BaseSettings

class OlorinSettings(BaseSettings):
    """Olorin.ai Platform Configuration"""

    # Pinecone (Olorin-specific)
    PINECONE_API_KEY: str = ""
    PINECONE_ENVIRONMENT: str = "us-east-1-aws"
    PINECONE_INDEX_NAME: str = "olorin-content"

    # Embeddings
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    EMBEDDING_DIMENSIONS: int = 1536

    # Dubbing
    DUBBING_MAX_CONCURRENT_SESSIONS: int = 100
    DUBBING_TARGET_LATENCY_MS: int = 2000

    # Shared services (inherited or injected)
    ANTHROPIC_API_KEY: str = ""  # Can be shared or separate
    ELEVENLABS_API_KEY: str = ""

    class Config:
        env_prefix = "OLORIN_"
        env_file = ".env.olorin"
```

#### Phase 2: Database Separation (Medium Risk)

**Goal**: Enable Olorin to use a separate MongoDB database.

**Actions**:
1. Create `OlorinDatabase` class with separate connection
2. Migrate Olorin models to use separate database
3. Implement data synchronization for shared data (if needed)
4. Add database routing logic

**Example**:
```python
# backend/app/services/olorin/database.py
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

class OlorinDatabase:
    client: AsyncIOMotorClient = None

async def connect_olorin_db():
    """Connect to Olorin-specific database."""
    from app.services.olorin.config import olorin_settings

    OlorinDatabase.client = AsyncIOMotorClient(
        olorin_settings.MONGODB_URL  # Can be same or different from Bayit+
    )

    await init_beanie(
        database=OlorinDatabase.client[olorin_settings.MONGODB_DB_NAME],
        document_models=[
            IntegrationPartner,
            UsageRecord,
            DubbingSession,
            WebhookDelivery,
            ContentEmbedding,
            RecapSession,
            CulturalReference,
        ],
    )
```

#### Phase 3: Shared Services Extraction (Medium Risk)

**Goal**: Extract voice pipeline and translation services into reusable packages.

**Actions**:
1. Create `bayit-voice-pipeline` Python package
2. Move ElevenLabs services to package
3. Create `bayit-translation` Python package
4. Update imports in both Bayit+ and Olorin

**Package Structure**:
```
packages/
├── bayit-voice-pipeline/
│   ├── pyproject.toml
│   └── src/
│       └── bayit_voice/
│           ├── __init__.py
│           ├── elevenlabs_stt.py
│           ├── elevenlabs_tts.py
│           └── pipeline.py
│
└── bayit-translation/
    ├── pyproject.toml
    └── src/
        └── bayit_translation/
            ├── __init__.py
            ├── google.py
            ├── claude.py
            └── providers.py
```

#### Phase 4: Content Model Decoupling (Higher Risk)

**Goal**: Remove Olorin Search dependency on Bayit+ Content model.

**Actions**:
1. Create `IndexableContent` interface/protocol in Olorin
2. Implement adapter pattern for Bayit+ Content
3. Allow partners to index their own content formats
4. Remove direct Content model import

**Example**:
```python
# backend/app/services/olorin/search/interfaces.py
from typing import Protocol, List, Optional

class IndexableContent(Protocol):
    """Interface for content that can be indexed by Olorin Search."""

    @property
    def content_id(self) -> str: ...

    @property
    def title(self) -> str: ...

    @property
    def title_en(self) -> Optional[str]: ...

    @property
    def description(self) -> Optional[str]: ...

    @property
    def content_type(self) -> str: ...

    @property
    def language(self) -> str: ...

    @property
    def genre_ids(self) -> List[str]: ...

# Adapter for Bayit+ Content
class BayitContentAdapter:
    def __init__(self, content: Content):
        self._content = content

    @property
    def content_id(self) -> str:
        return str(self._content.id)

    # ... implement other properties
```

#### Phase 5: Deployment Separation (Highest Risk)

**Goal**: Enable independent deployment of Olorin.

**Options**:

**Option A: Separate FastAPI Application**
```
deployments/
├── bayit-plus/
│   ├── Dockerfile
│   ├── cloudbuild.yaml
│   └── app.yaml
│
└── olorin-ai/
    ├── Dockerfile
    ├── cloudbuild.yaml
    └── app.yaml
```

**Option B: Modular Monolith with Feature Flags**
- Keep single deployment
- Use feature flags to enable/disable modules
- Route requests internally

**Option C: API Gateway Pattern**
```
                    ┌─────────────────┐
                    │  API Gateway    │
                    │  (Cloud Run)    │
                    └────────┬────────┘
                             │
            ┌────────────────┼────────────────┐
            ▼                ▼                ▼
     ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
     │  Bayit+     │  │  Olorin     │  │  Shared     │
     │  Service    │  │  Service    │  │  Services   │
     └─────────────┘  └─────────────┘  └─────────────┘
```

### 4.3 Recommended Approach: Hybrid Strategy

**Immediate (0-3 months)**:
- Phase 1: Configuration separation
- Document all Olorin APIs
- Stabilize current architecture

**Short-term (3-6 months)**:
- Phase 2: Database separation (same MongoDB cluster, different database)
- Phase 3: Extract voice pipeline package
- Add comprehensive testing

**Medium-term (6-12 months)**:
- Phase 4: Content model decoupling
- Evaluate deployment separation needs
- Consider separate deployment if business requires

**Long-term (12+ months)**:
- Phase 5: Full deployment separation (if needed)
- Consider microservices for scaling
- Evaluate gRPC for service communication

---

## 5. Trade-offs Analysis

### 5.1 Separation Benefits

| Benefit | Impact | Effort |
|---------|--------|--------|
| Independent scaling | High | High |
| Technology flexibility | Medium | High |
| Team autonomy | High | Medium |
| Fault isolation | High | Medium |
| Independent deployment | High | High |

### 5.2 Separation Risks

| Risk | Probability | Mitigation |
|------|-------------|------------|
| Data consistency issues | Medium | Eventual consistency patterns |
| Increased complexity | High | Good documentation, testing |
| Network latency | Medium | Shared services layer |
| Duplicate code | Medium | Shared packages |
| Migration bugs | Medium | Phased approach, feature flags |

### 5.3 Keep Together vs. Separate Decision Matrix

| Factor | Keep Together | Separate |
|--------|--------------|----------|
| Team size < 5 | Recommended | Not recommended |
| Shared data access | Recommended | Complex |
| Independent scaling needs | Not ideal | Recommended |
| Different tech stacks | Not ideal | Recommended |
| Separate deployment cycles | Not ideal | Recommended |
| B2B vs B2C business | B2C | B2B (Olorin) |

---

## 6. Proposed Architecture Diagrams

### 6.1 As-Is Architecture (Current)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        SINGLE CLOUD RUN INSTANCE                         │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                       FastAPI Application                         │   │
│  │                                                                   │   │
│  │   /api/v1/content/*     /api/v1/olorin/*     /api/v1/auth/*      │   │
│  │   /api/v1/live/*        /api/v1/olorin/dubbing/*                  │   │
│  │   /api/v1/podcasts/*    /api/v1/olorin/search/*                   │   │
│  │   /api/v1/admin/*       /api/v1/olorin/context/*                  │   │
│  │   ...                   /api/v1/olorin/recap/*                    │   │
│  │                         /api/v1/olorin/partner/*                  │   │
│  │                                                                   │   │
│  │   All services share: config, database, voice pipeline            │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                       │                                  │
└───────────────────────────────────────┼──────────────────────────────────┘
                                        │
                                        ▼
                    ┌─────────────────────────────────────┐
                    │         MongoDB Atlas               │
                    │         (Single Database)           │
                    │                                     │
                    │  Collections:                       │
                    │  - users, content, profiles         │
                    │  - integration_partners             │
                    │  - content_embeddings               │
                    │  - cultural_references              │
                    │  - recap_sessions                   │
                    │  - usage_records                    │
                    │  - ...                              │
                    └─────────────────────────────────────┘
```

### 6.2 To-Be Architecture (Recommended)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            GOOGLE CLOUD PLATFORM                             │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         CLOUD LOAD BALANCER                            │  │
│  │                    (Routing by path prefix)                            │  │
│  └───────────────────────────────┬────────────────────────────────────────┘  │
│                                  │                                           │
│           ┌──────────────────────┼──────────────────────┐                   │
│           ▼                      ▼                      ▼                   │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐           │
│  │  BAYIT+ SERVICE │   │ OLORIN SERVICE  │   │ SHARED SERVICES │           │
│  │  (Cloud Run)    │   │ (Cloud Run)     │   │ (Cloud Run)     │           │
│  │                 │   │                 │   │                 │           │
│  │  /api/v1/*      │   │ /api/v1/olorin/*│   │ /internal/*     │           │
│  │  (except olorin)│   │                 │   │                 │           │
│  │                 │   │ Partner API     │   │ Voice Pipeline  │           │
│  │  Content        │   │ Dubbing         │   │ Translation     │           │
│  │  Auth           │   │ Search          │   │ AI Services     │           │
│  │  Social         │   │ Context         │   │                 │           │
│  │  Kids           │   │ Recap           │   │                 │           │
│  │  ...            │   │ Metering        │   │                 │           │
│  └────────┬────────┘   └────────┬────────┘   └────────┬────────┘           │
│           │                     │                     │                     │
│           ▼                     ▼                     │                     │
│  ┌─────────────────┐   ┌─────────────────┐           │                     │
│  │ MongoDB Atlas   │   │ MongoDB Atlas   │           │                     │
│  │ (bayit_plus)    │   │ (olorin)        │           │                     │
│  │                 │   │                 │           │                     │
│  │ - users         │   │ - partners      │           │                     │
│  │ - content       │   │ - embeddings    │           │                     │
│  │ - profiles      │   │ - cultural_refs │           │                     │
│  │ - subscriptions │   │ - recap_sessions│           │                     │
│  │ - ...           │   │ - usage_records │           │                     │
│  └─────────────────┘   └─────────────────┘           │                     │
│                                 │                     │                     │
│                                 ▼                     │                     │
│                        ┌─────────────────┐           │                     │
│                        │    Pinecone     │◄──────────┘                     │
│                        │ (Vector Search) │                                  │
│                        └─────────────────┘                                  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                     EXTERNAL SERVICES                                  │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │  │
│  │  │ ElevenLabs  │  │ Anthropic   │  │ OpenAI      │  │ Google      │   │  │
│  │  │ (STT/TTS)   │  │ (Claude)    │  │ (Embeddings)│  │ (Translate) │   │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.3 Migration Strategy Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         STRANGLER FIG MIGRATION                              │
│                                                                              │
│  PHASE 1                    PHASE 2                    PHASE 3              │
│  Config Separation          Database Separation        Service Extraction   │
│                                                                              │
│  ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐   │
│  │  Single App     │       │  Single App     │       │  Two Services   │   │
│  │  Two Configs    │  ──►  │  Two Databases  │  ──►  │  Shared Layer   │   │
│  │                 │       │                 │       │                 │   │
│  │  settings.py    │       │  bayit_plus DB  │       │  Bayit+ App     │   │
│  │  olorin_config  │       │  olorin DB      │       │  Olorin App     │   │
│  └─────────────────┘       └─────────────────┘       └─────────────────┘   │
│                                                                              │
│  Duration: 1 month         Duration: 2 months        Duration: 3 months    │
│  Risk: Low                 Risk: Medium              Risk: Medium-High      │
│                                                                              │
│  ────────────────────────────────────────────────────────────────────────   │
│                                                                              │
│  PHASE 4                    PHASE 5                                         │
│  Content Decoupling         Independent Deployment                          │
│                                                                              │
│  ┌─────────────────┐       ┌─────────────────┐                             │
│  │  Adapter Layer  │       │  Full Separation│                             │
│  │  Interfaces     │  ──►  │  API Gateway    │                             │
│  │                 │       │                 │                             │
│  │  IndexableContent│       │  Independent    │                             │
│  │  Protocol       │       │  Scaling        │                             │
│  └─────────────────┘       └─────────────────┘                             │
│                                                                              │
│  Duration: 2 months        Duration: 3 months                               │
│  Risk: Medium              Risk: High                                       │
│                                                                              │
│  ────────────────────────────────────────────────────────────────────────   │
│                                                                              │
│  FEATURE FLAGS THROUGHOUT:                                                   │
│  - OLORIN_USE_SEPARATE_CONFIG=true                                          │
│  - OLORIN_USE_SEPARATE_DATABASE=true                                        │
│  - OLORIN_CONTENT_ADAPTER_ENABLED=true                                      │
│  - OLORIN_STANDALONE_DEPLOYMENT=true                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Immediate Action Items

### 7.1 Quick Wins (No Risk)

1. **Document Current APIs**
   - Complete OpenAPI documentation for `/olorin/*` endpoints
   - Generate API client SDKs (Python, TypeScript)

2. **Add Configuration Comments**
   - Group OLORIN_* settings with clear documentation
   - Add deprecation notices for any settings to be migrated

3. **Create Architecture Decision Records (ADRs)**
   - ADR-001: Modular Monolith Architecture Decision
   - ADR-002: Olorin Separation Strategy

### 7.2 Phase 1 Implementation Steps

1. **Create Olorin Configuration Module**
   ```
   backend/app/services/olorin/config.py
   ```

2. **Update Olorin Services to Use New Config**
   - Partner service
   - Metering service
   - Dubbing service
   - Search service
   - Context service
   - Recap service

3. **Add Configuration Validation**
   - Validate Olorin-specific settings on startup
   - Log configuration status

4. **Create Tests**
   - Configuration loading tests
   - Service initialization tests
   - API endpoint tests

---

## 8. Conclusion

The current Olorin implementation within Bayit-Plus demonstrates **good modular design at the code level** but remains **deployment-coupled** as a monolith. This is appropriate for the current stage but should evolve as the platform matures.

### Key Recommendations Summary

1. **Keep current architecture short-term** - The modular monolith is appropriate for small teams
2. **Implement Phase 1 (Config Separation)** - Low risk, high documentation value
3. **Plan for Phase 2-3** - Database and service extraction when needed
4. **Defer Phase 4-5** - Full separation only when business requires

### Success Metrics

| Metric | Current | Target (Phase 1) | Target (Phase 5) |
|--------|---------|------------------|------------------|
| Code coupling | Medium | Low | Minimal |
| Config isolation | None | Partial | Full |
| Database isolation | None | None | Full |
| Independent deployment | No | No | Yes |
| API documentation | Partial | Complete | Complete |

---

## Appendix A: File Inventory

### Olorin Services (Current)

| File | Lines | Purpose |
|------|-------|---------|
| `olorin/__init__.py` | 40 | Module exports |
| `olorin/partner_service.py` | 386 | Partner management |
| `olorin/recap_agent_service.py` | 358 | Recap generation |
| `olorin/context/service.py` | 207 | Cultural context |
| `olorin/context/detection.py` | ~200 | Reference detection |
| `olorin/dubbing/service.py` | 236 | Dubbing orchestration |
| `olorin/dubbing/pipeline.py` | ~180 | Audio pipeline |
| `olorin/metering/service.py` | ~150 | Usage tracking |
| `olorin/search/service.py` | 85 | Search facade |
| `olorin/search/indexer.py` | ~200 | Content indexing |
| `olorin/search/searcher.py` | ~200 | Search execution |

### Olorin Models (Current)

| File | Collections | Purpose |
|------|-------------|---------|
| `integration_partner.py` | 4 | Partner, Usage, Sessions, Webhooks |
| `content_embedding.py` | 2 | Embeddings, RecapSessions |
| `cultural_reference.py` | 1 | Cultural references |

### Olorin API Routes (Current)

| File | Endpoints | Purpose |
|------|-----------|---------|
| `olorin/__init__.py` | Router aggregation | Main router |
| `olorin/partner.py` | 8 | Partner management |
| `olorin/dubbing.py` | Facade | Routes to dubbing_routes |
| `olorin/search.py` | 4 | Semantic search |
| `olorin/context.py` | 6 | Cultural context |
| `olorin/recap.py` | 5 | Recap agent |
| `olorin/webhooks.py` | 4 | Webhook management |

---

## Appendix B: Configuration Reference

### Current Olorin Configuration (in settings)

```python
# Pinecone Vector Database
PINECONE_API_KEY: str = ""
PINECONE_ENVIRONMENT: str = "us-east-1-aws"
PINECONE_INDEX_NAME: str = "olorin-content"

# Embeddings
EMBEDDING_MODEL: str = "text-embedding-3-small"
EMBEDDING_DIMENSIONS: int = 1536

# Realtime Dubbing
DUBBING_MAX_CONCURRENT_SESSIONS: int = 100
DUBBING_SESSION_TIMEOUT_MINUTES: int = 120
DUBBING_TARGET_LATENCY_MS: int = 2000

# Recap Agent
RECAP_MAX_CONTEXT_TOKENS: int = 8000
RECAP_WINDOW_DEFAULT_MINUTES: int = 15
RECAP_SUMMARY_MAX_TOKENS: int = 300

# Cultural Context
CULTURAL_REFERENCE_CACHE_TTL_HOURS: int = 24
CULTURAL_DETECTION_MIN_CONFIDENCE: float = 0.7

# Partner API
PARTNER_API_KEY_SALT: str = ""
PARTNER_DEFAULT_RATE_LIMIT_RPM: int = 60
PARTNER_WEBHOOK_TIMEOUT_SECONDS: float = 10.0

# Feature Flags
OLORIN_DUBBING_ENABLED: bool = False
OLORIN_SEMANTIC_SEARCH_ENABLED: bool = False
OLORIN_CULTURAL_CONTEXT_ENABLED: bool = False
OLORIN_RECAP_ENABLED: bool = False
```

---

*Document Version: 1.0*
*Last Updated: 2026-01-20*
*Author: System Architect Agent*
