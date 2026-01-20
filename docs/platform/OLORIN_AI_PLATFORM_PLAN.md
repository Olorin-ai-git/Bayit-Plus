# Olorin.ai Platform Transformation Plan

## Executive Summary

**Strategic Pivot**: Transform Bayit-Plus from a streaming/content provider platform into an **AI Overlay Platform** ("Powered by Olorin.ai") that provides AI capabilities to third-party content providers.

### Key Principles:
1. **Integration-First**: All AI capabilities designed for third-party platform consumption
2. **Modular Capabilities**: Each AI feature independently deployable and billable
3. **Documentation-Complete**: All changes documented in all supported languages (he, en, es)
4. **No Mocks/Stubs**: Full production implementations only

---

## 1. Platform Architecture Overview

### 1.1 Current State (Leveraged Infrastructure)

| Component | Status | Location | Reuse Strategy |
|-----------|--------|----------|----------------|
| Voice Pipeline | Ready | `backend/app/services/voice_pipeline_service.py` | Foundation for dubbing |
| ElevenLabs STT | Ready | `backend/app/services/elevenlabs_realtime_service.py` | ~150ms latency, Hebrew 3.1% WER |
| ElevenLabs TTS | Ready | `backend/app/services/elevenlabs_tts_streaming_service.py` | ~300ms streaming latency |
| Live Translation | Ready | `backend/app/services/live_translation_service.py` | Multi-provider STT/translation |
| LLM Search | Ready | `backend/app/services/llm_search_service.py` | Query interpretation patterns |
| Unified Search | Ready | `backend/app/services/unified_search_service.py` | MongoDB text search (extend for hybrid) |
| AI Agent Framework | Ready | `backend/app/services/ai_agent/agent.py` | Tool use architecture |
| Support Context | Ready | `backend/app/services/support/` | Context building patterns |
| WebSocket Subtitles | Ready | `backend/app/api/routes/websocket_live_subtitles.py` | Real-time streaming patterns |

### 1.2 Target Architecture (Olorin.ai Platform)

```
                    OLORIN.AI PLATFORM
         ┌──────────────────────────────────────────┐
         │          INTEGRATION GATEWAY              │
         │  ┌────────────┐ ┌────────────┐ ┌────────┐│
         │  │ API Key    │ │ Rate       │ │Webhook ││
         │  │ Auth       │ │ Limiter    │ │Events  ││
         │  │ Partners   │ │ Per-Partner│ │System  ││
         │  └────────────┘ └────────────┘ └────────┘│
         └──────────────────────────────────────────┘
                            │
       ┌────────────────────┼────────────────────┐
       ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   REALTIME      │  │    SEMANTIC     │  │    CONTEXT      │
│   DUBBING       │  │    SEARCH       │  │    ENGINE       │
│   SERVICE       │  │    SERVICE      │  │                 │
│                 │  │                 │  │ ┌─────────────┐ │
│ Audio→STT→TTS   │  │ Pinecone+       │  │ │ Cultural    │ │
│ <2s latency     │  │ MongoDB Hybrid  │  │ │ References  │ │
│ He→En/Es        │  │ Deep-linking    │  │ └─────────────┘ │
│                 │  │                 │  │ ┌─────────────┐ │
└─────────────────┘  └─────────────────┘  │ │ Recap Agent │ │
                                          │ │ Summaries   │ │
┌─────────────────┐                       │ └─────────────┘ │
│   METERING &    │                       └─────────────────┘
│   BILLING       │
│ Usage per       │
│ capability      │
│ Per-partner     │
└─────────────────┘
```

---

## 2. New File Structure

```
backend/app/
├── api/routes/
│   └── olorin/                          # NEW - Platform API routes
│       ├── __init__.py                  # Router aggregation
│       ├── dubbing.py                   # Real-time dubbing endpoints
│       ├── search.py                    # Semantic search endpoints
│       ├── context.py                   # Cultural context endpoints
│       ├── recap.py                     # Recap agent endpoints
│       ├── partner.py                   # Partner management
│       ├── webhooks.py                  # Webhook handlers
│       └── dependencies.py              # Auth/rate limit dependencies
│
├── models/
│   ├── integration_partner.py           # NEW - Partner & usage models
│   ├── cultural_reference.py            # NEW - Cultural knowledge base
│   └── content_embedding.py             # NEW - Vector/recap models
│
├── services/
│   └── olorin/                          # NEW - Platform services
│       ├── __init__.py
│       ├── realtime_dubbing_service.py  # Dubbing orchestration
│       ├── vector_search_service.py     # Pinecone + hybrid search
│       ├── cultural_context_service.py  # Reference detection/explanation
│       ├── recap_agent_service.py       # Live recap generation
│       ├── partner_service.py           # Partner management
│       └── metering_service.py          # Usage tracking
│
└── scripts/
    ├── seed_cultural_references.py      # NEW - Knowledge base seeder
    └── embed_content.py                 # NEW - Batch embedding script
```

---

## 3. Data Models

### 3.1 Integration Partner Model

**File**: `backend/app/models/integration_partner.py`

```python
class IntegrationPartner(Document):
    """Third-party platform integration configuration."""

    partner_id: str                              # Unique slug
    name: str
    name_en: Optional[str] = None

    # Authentication
    api_key_hash: str                            # Hashed API key
    api_key_prefix: str                          # First 8 chars for ID
    webhook_secret: Optional[str] = None

    # Contact
    contact_email: str
    contact_name: Optional[str] = None

    # Capabilities (feature flags per partner)
    enabled_capabilities: List[str] = []
    # ["realtime_dubbing", "semantic_search", "recap_agent", "cultural_context"]

    # Rate limits per capability
    rate_limits: Dict[str, RateLimitConfig] = {}

    # Billing
    billing_tier: str = "standard"               # "free", "standard", "enterprise"
    monthly_usage_limit_usd: Optional[float] = None

    # Webhooks
    webhook_url: Optional[str] = None
    webhook_events: List[str] = []

    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    class Settings:
        name = "integration_partners"
        indexes = ["partner_id", "api_key_prefix", "is_active"]


class UsageRecord(Document):
    """Track usage for billing."""
    partner_id: str
    capability: str
    request_count: int = 0
    audio_seconds_processed: float = 0.0
    tokens_consumed: int = 0
    estimated_cost_usd: float = 0.0
    period_start: datetime
    period_end: datetime
    granularity: str = "hourly"

    class Settings:
        name = "usage_records"
        indexes = [("partner_id", "capability", "period_start")]
```

### 3.2 Cultural Reference Model

**File**: `backend/app/models/cultural_reference.py`

```python
class CulturalReference(Document):
    """Israeli/Jewish cultural reference knowledge base."""

    reference_id: str                            # Normalized identifier
    canonical_name: str                          # Hebrew canonical
    canonical_name_en: Optional[str] = None

    category: str                                # person, place, event, term, etc.
    subcategory: Optional[str] = None            # politician, city, holiday, slang

    aliases: List[str] = []                      # All known names/spellings
    aliases_en: List[str] = []

    short_explanation: str                       # Hebrew (1-2 sentences)
    short_explanation_en: Optional[str] = None
    short_explanation_es: Optional[str] = None
    detailed_explanation: Optional[str] = None
    detailed_explanation_en: Optional[str] = None

    relevance_keywords: List[str] = []
    related_references: List[str] = []

    source: str = "manual"                       # manual, wikipedia, ai_generated
    verified: bool = False
    lookup_count: int = 0

    class Settings:
        name = "cultural_references"
        indexes = ["reference_id", "category", "aliases"]
```

### 3.3 Content Embedding Model

**File**: `backend/app/models/content_embedding.py`

```python
class ContentEmbedding(Document):
    """Vector embeddings for semantic search."""

    content_id: str
    embedding_type: str                          # title, description, subtitle_segment

    segment_index: Optional[int] = None
    segment_start_time: Optional[float] = None   # seconds
    segment_end_time: Optional[float] = None
    segment_text: Optional[str] = None

    embedding_model: str
    embedding_dimensions: int = 1536
    pinecone_vector_id: str                      # Vector stored in Pinecone

    language: str = "he"
    content_type: Optional[str] = None
    genre_ids: List[str] = []

    class Settings:
        name = "content_embeddings"
        indexes = [("content_id", "embedding_type"), "pinecone_vector_id"]


class RecapSession(Document):
    """Session for live broadcast recap generation."""

    session_id: str
    partner_id: Optional[str] = None
    channel_id: Optional[str] = None
    stream_url: Optional[str] = None

    transcript_segments: List[TranscriptSegment] = []
    total_duration_seconds: float = 0.0
    recaps: List[RecapEntry] = []

    status: str = "active"                       # active, paused, ended
    started_at: datetime
    ended_at: Optional[datetime] = None

    class Settings:
        name = "recap_sessions"
        indexes = ["session_id", "channel_id", "status"]
```

---

## 4. API Endpoints

### 4.1 Integration Gateway (`/api/v1/olorin/`)

**Partner Management**:
- `POST /partner/register` - Register new integration partner
- `GET /partner/me` - Get current partner info
- `PUT /partner/me` - Update partner configuration
- `GET /partner/usage` - Get usage statistics

### 4.2 Realtime Dubbing (`/api/v1/olorin/dubbing/`)

- `POST /sessions` - Create dubbing session
- `WS /ws/{session_id}` - WebSocket for audio streaming
- `DELETE /sessions/{session_id}` - End session, get stats
- `GET /voices` - List available voices

**WebSocket Protocol**:
```
Client sends: Binary audio (16kHz, mono, LINEAR16)
Server sends:
  - {"type": "transcript", "original": "...", "translated": "..."}
  - {"type": "dubbed_audio", "data": "<base64>", "timestamp": 123.45}
  - {"type": "error", "message": "..."}
```

### 4.3 Semantic Search (`/api/v1/olorin/search/`)

- `POST /semantic` - Semantic search with timestamp deep-linking
- `POST /dialogue` - Search within subtitles/dialogue
- `POST /index` - Index partner's content

**Response includes**:
- `content_id`, `title`, `matched_segment`
- `timestamp_seconds` (for deep-linking: `?t=1234`)
- `relevance_score`

### 4.4 Cultural Context (`/api/v1/olorin/context/`)

- `POST /cultural/detect` - Detect references in text
- `GET /cultural/explain/{reference_id}` - Get explanation
- `POST /cultural/enrich` - Enrich transcript with annotations

### 4.5 Recap Agent (`/api/v1/olorin/recap/`)

- `POST /sessions` - Create recap session
- `POST /sessions/{session_id}/transcript` - Add transcript segment
- `GET /sessions/{session_id}/recap` - Generate catch-up summary

---

## 5. Configuration Additions

**File**: `backend/app/core/config.py` (additions)

```python
# === OLORIN.AI PLATFORM ===

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

## 6. Implementation Phases

### Phase 1: Realtime Dubbing Service (PRIORITY)

**Rationale**: Builds entirely on existing ElevenLabs infrastructure, provides immediate value.

**Pipeline** (target: <2s latency):
```
Audio Stream → ElevenLabs STT (~150ms) → Claude Translation → ElevenLabs TTS (~300ms) → Dubbed Audio
```

**Leverages**:
- `VoicePipelineService` patterns
- `ElevenLabsRealtimeService` for STT
- `ElevenLabsTTSStreamingService` for TTS
- `LiveTranslationService` for translation

**New Files**:
- `backend/app/services/olorin/realtime_dubbing_service.py`
- `backend/app/api/routes/olorin/dubbing.py`
- `backend/app/models/integration_partner.py` (shared)

### Phase 2: Integration Gateway

**Partner onboarding infrastructure**:

**New Files**:
- `backend/app/api/routes/olorin/partner.py`
- `backend/app/api/routes/olorin/dependencies.py`
- `backend/app/services/olorin/partner_service.py`
- `backend/app/services/olorin/metering_service.py`

**Features**:
- API key authentication
- Per-partner rate limiting
- Usage metering
- Webhook event system

### Phase 3: Semantic Search & Vector Database

**Hybrid search approach**:
1. MongoDB text search for exact matches
2. Pinecone vector search for semantic similarity
3. Result fusion with weighted ranking

**New Dependencies**: `pinecone-client>=3.0.0`

**New Files**:
- `backend/app/services/olorin/vector_search_service.py`
- `backend/app/api/routes/olorin/search.py`
- `backend/app/models/content_embedding.py`
- `backend/scripts/embed_content.py`

**Migration Strategy**:
1. Create Pinecone index
2. Batch embed existing subtitles (~30s segments for timestamp accuracy)
3. Hook subtitle uploads for incremental embedding
4. Implement hybrid search with fallback

### Phase 4: Cultural Context Engine

**Knowledge base for Israeli/Jewish cultural references**:

**New Files**:
- `backend/app/services/olorin/cultural_context_service.py`
- `backend/app/api/routes/olorin/context.py`
- `backend/app/models/cultural_reference.py`
- `backend/scripts/seed_cultural_references.py`

**Categories to seed**:
- Israeli politicians (current & historical)
- Political parties
- Israeli laws & legal terms
- Hebrew slang & idioms
- Jewish holidays & traditions
- Historical events (1948, 1967, etc.)
- IDF terminology

### Phase 5: Recap Agent

**Real-time summaries for late-joiners**:

**New Files**:
- `backend/app/services/olorin/recap_agent_service.py`
- `backend/app/api/routes/olorin/recap.py`

**Architecture**:
```
LiveTranslationService → Rolling Transcript Buffer (60 min)
                              ↓
User joins late → Claude Summarization → Catch-up summary
```

---

## 7. Documentation Phase

**All pivotal changes must be documented in all supported languages (Hebrew, English, Spanish).**

### 7.1 Documentation Updates Required

| Documentation Area | Updates Needed |
|-------------------|----------------|
| API Documentation | New `/olorin/` endpoints, WebSocket protocols, authentication |
| User Guides | Platform capabilities for end-users joining via partners |
| Integration Guides | Partner onboarding, API key setup, capability configuration |
| Developer Docs | Service architecture, data models, configuration reference |
| Admin Guides | Partner management, usage monitoring, billing |

### 7.2 Documentation Files to Update

**Existing documentation module locations**:
- User guides (all platforms)
- API reference documentation
- Admin/CMS documentation
- Quick start guides

### 7.3 New Documentation to Create

| Document | Languages | Purpose |
|----------|-----------|---------|
| Olorin.ai Platform Overview | he, en, es | High-level platform capabilities |
| Partner Integration Guide | en | Technical integration documentation |
| API Reference: Dubbing | en | Dubbing endpoints and WebSocket protocol |
| API Reference: Semantic Search | en | Search endpoints and query syntax |
| API Reference: Context Engine | en | Cultural context and recap endpoints |
| Partner Dashboard Guide | he, en, es | Usage monitoring and configuration |

### 7.4 Documentation Workflow

Each implementation phase includes documentation:
1. **Phase 1 (Dubbing)**: Document dubbing API, WebSocket protocol
2. **Phase 2 (Gateway)**: Document partner onboarding, authentication
3. **Phase 3 (Search)**: Document semantic search, deep-linking
4. **Phase 4 (Context)**: Document cultural reference API, recap API
5. **Phase 5 (Recap)**: Complete platform documentation review

---

## 8. Third-Party Integration Example

```python
# Partner client pseudo-code
async def integrate_dubbing(stream_url: str):
    # 1. Create session
    session = await olorin_client.post("/olorin/dubbing/sessions", {
        "source_language": "he",
        "target_language": "en"
    }, headers={"X-Olorin-API-Key": API_KEY})

    # 2. WebSocket for real-time dubbing
    async with olorin_client.websocket(f"/olorin/dubbing/ws/{session.session_id}") as ws:
        async for audio_chunk in source_audio:
            await ws.send_bytes(audio_chunk)

        async for message in ws:
            if message["type"] == "dubbed_audio":
                await play_audio(base64.decode(message["data"]))
```

---

## 9. Verification Steps

### Phase 1: Realtime Dubbing
- [ ] End-to-end latency < 2 seconds
- [ ] Audio quality acceptable for 30+ minute viewing
- [ ] Hebrew→English dubbing accurate
- [ ] WebSocket stable for 2+ hours
- [ ] Session metering records usage

### Phase 2: Integration Gateway
- [ ] Partner registration works
- [ ] API key authentication enforced
- [ ] Rate limiting per capability
- [ ] Usage metering accurate
- [ ] Webhooks deliver events

### Phase 3: Semantic Search
- [ ] Pinecone index created
- [ ] Content embedding pipeline works
- [ ] "Show me the scene where..." returns relevant results
- [ ] Timestamp deep-linking accurate
- [ ] Hybrid search fallback works

### Phase 4: Cultural Context
- [ ] Knowledge base seeded with 500+ entries
- [ ] Entity detection in Hebrew text works
- [ ] Explanations available in en/es
- [ ] Real-time context stream works

### Phase 5: Recap Agent
- [ ] Rolling transcript buffer maintains 60 min
- [ ] Recap generation < 3 seconds
- [ ] Multi-language summaries accurate
- [ ] Key points extraction works

### Documentation Verification
- [ ] API documentation complete for all `/olorin/` endpoints
- [ ] Partner Integration Guide reviewed and accurate
- [ ] User-facing docs available in Hebrew, English, Spanish
- [ ] All documentation passes localization audit
- [ ] Code examples in documentation are tested and functional

---

## 10. Critical Files to Modify

| File | Changes |
|------|---------|
| `backend/app/core/config.py` | Add Olorin.ai configuration |
| `backend/pyproject.toml` | Add pinecone-client dependency |
| `backend/app/core/database.py` | Register new document models |
| `backend/app/main.py` | Register `/olorin` router |
| `backend/.env.example` | Document new environment variables |

---

## 11. Cost Estimates

| Service | Purpose | Est. Monthly Cost |
|---------|---------|-------------------|
| Pinecone | Vector database | ~$70 (Standard tier) |
| OpenAI | Embeddings | ~$0.02/1K tokens |
| ElevenLabs | TTS/STT (existing) | Variable by usage |
| Claude | Recap/Context (existing) | Variable by usage |

---

## Notes

1. **Feature Flags**: All capabilities have enable/disable flags for gradual rollout
2. **No Mocks**: All implementations complete and functional
3. **Configuration-Driven**: All settings from environment variables
4. **Integration-First**: APIs designed for third-party consumption
5. **Existing Infrastructure**: Maximum reuse of voice pipeline, translation, search services
6. **Documentation-Complete**: All changes documented in Hebrew, English, Spanish
7. **Out of Scope**: VOD content access control (passkey system) - handled separately

---

## Implementation Status

| Phase | Status | Started | Completed |
|-------|--------|---------|-----------|
| Phase 1: Realtime Dubbing | Not Started | - | - |
| Phase 2: Integration Gateway | Not Started | - | - |
| Phase 3: Semantic Search | Not Started | - | - |
| Phase 4: Cultural Context | Not Started | - | - |
| Phase 5: Recap Agent | Not Started | - | - |
| Documentation | Not Started | - | - |

---

*Last Updated: 2026-01-20*
