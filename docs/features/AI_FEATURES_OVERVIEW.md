# AI Features Overview

**Last Updated:** 2026-01-30
**Status:** ✅ Production

## Overview

Bayit+ integrates advanced AI capabilities across the platform to enhance content discovery, personalization, and user experience. The AI features are powered by state-of-the-art language models including Anthropic Claude (Sonnet 4.5, Haiku 3.5) and OpenAI GPT-4.

### AI Feature Categories

| Category | Features | Status |
|----------|----------|--------|
| **Beta 500 Program** | AI Search, AI Recommendations, Auto Catch-Up | ✅ Production |
| **AI Agent System** | 50+ tools for content management and automation | ✅ Production |
| **LLM Search** | VOD Search, EPG Search, Vector Search | ✅ Production |
| **Specialized AI** | Chess AI, Onboarding AI, Live Dubbing | ✅ Production |
| **Olorin Ecosystem** | Content intelligence, cultural context, partner APIs | ✅ Production |

---

## Beta 500 Program

The Beta 500 program is a closed beta providing 500 AI credits to selected users for testing AI features.

### Features

#### 1. AI Search

**Endpoint:** `POST /api/v1/beta/search`

Natural language search powered by Claude Sonnet 4.5. Users can search using conversational queries instead of keywords.

**Examples:**
```
"Show me movies about family reunions in Israel"
"I want to watch something funny for kids"
"Find documentaries about Jewish history"
```

**Cost:** 10 credits per search

**Key Features:**
- Natural language understanding
- Context-aware results
- Multi-language support (10 languages)
- Semantic search with vector embeddings

#### 2. AI Recommendations

**Endpoint:** `GET /api/v1/beta/recommendations`

Personalized content recommendations based on viewing history, preferences, and contextual factors.

**Cost:** 5 credits per recommendation request

**Key Features:**
- Personalized to user's viewing history
- Time-aware (morning ritual, evening content)
- Cultural context integration
- Diversity in recommendations

#### 3. Auto Catch-Up

**Endpoint:** `GET /api/v1/live/{channel_id}/catchup`

AI-generated summaries of missed live content, allowing users to quickly understand what happened.

**Cost:** 15 credits per summary

**Key Features:**
- Real-time transcript analysis
- Key moments extraction
- Speaker identification
- Topic tracking
- Multi-turn conversation support

### Credit System

**Initial Grant:** 500 credits per Beta 500 user

**Credit Costs:**
| Feature | Cost per Request |
|---------|-----------------|
| AI Search | 10 credits |
| AI Recommendations | 5 credits |
| Auto Catch-Up | 15 credits |

**Credit Balance:**
- Real-time tracking via `/api/v1/beta/credits/balance`
- Low credit warnings at 50, 20, and 10 credits
- Insufficient credit error handling with graceful degradation

### Access Requirements

**Enrollment:**
1. Receive beta invitation email
2. Sign up with Google OAuth
3. Automatic enrollment and credit grant

**Rate Limits:**
- Beta 500 users: 120 requests/minute
- AI Search: 10 searches/minute
- AI Recommendations: 20 requests/minute
- Auto Catch-Up: 5 requests/minute

---

## AI Agent System

The AI Agent System provides 50+ tools for automated content management, metadata enrichment, and system maintenance.

### Architecture

**Components:**
- **Agent Loop:** Orchestrates tool execution with max iterations
- **Tool Dispatcher:** Routes tool calls to appropriate executors
- **Issue Tracker:** Logs problems and findings
- **Logger:** Structured logging with context

**Tool Categories (13 categories, 50+ tools):**

1. **Search & Discovery** (5 tools) - VOD search, EPG search, keyword search
2. **Metadata Management** (8 tools) - TMDB integration, classification, titles
3. **Content Auditing** (6 tools) - Stream validation, duplicate detection, integrity checks
4. **Taxonomy Management** (4 tools) - Category management, tag updates
5. **Subtitle Operations** (5 tools) - Subtitle generation, translation, validation
6. **Podcast Management** (6 tools) - Episode sync, metadata enrichment
7. **Database Operations** (4 tools) - Queries, updates, aggregations
8. **File Operations** (3 tools) - File reading, writing, validation
9. **External APIs** (4 tools) - TMDB, OpenSubtitles, ElevenLabs
10. **Content Intelligence** (3 tools) - Cultural context, recommendations
11. **Quality Assurance** (2 tools) - Test execution, validation
12. **Reporting** (2 tools) - Report generation, statistics
13. **System Maintenance** (2 tools) - Cache clearing, index rebuilding

### Use Cases

**Library Auditing:**
```python
from app.services.ai_agent.agent import AIAgent

agent = AIAgent(model="claude-sonnet-4-5")
result = await agent.execute_comprehensive_audit(
    scope="all_content",
    checks=["metadata", "streams", "duplicates"]
)
```

**Metadata Enrichment:**
```python
result = await agent.enrich_metadata(
    content_id="123",
    sources=["tmdb", "olorin_context"]
)
```

**Stream Validation:**
```python
result = await agent.validate_streams(
    section="movies",
    check_playability=True,
    auto_fix=True
)
```

### Configuration

**Environment Variables:**
::: v-pre
```bash
ANTHROPIC_API_KEY=<secret-manager>  # Claude API key
AI_AGENT_MAX_ITERATIONS=20          # Max tool calls per run
AI_AGENT_BUDGET_LIMIT=5.0           # Max cost per run ($)
AI_AGENT_DRY_RUN=false              # Dry run mode (no writes)
```
:::

**API Endpoints:**
- `POST /api/v1/admin/ai-agent/audit` - Library audit
- `POST /api/v1/admin/ai-agent/enrich` - Metadata enrichment
- `POST /api/v1/admin/ai-agent/validate` - Stream validation
- `GET /api/v1/admin/ai-agent/status` - Agent status

---

## LLM Search Services

### VOD Search

**Service:** `LLMVODSearchService`
**Model:** Claude Haiku 3.5 (fast, cost-effective)

Natural language search for video-on-demand content (movies, series, audiobooks).

**Features:**
- Multi-language query support
- Semantic search with vector embeddings
- Faceted filtering (genre, year, language, rating)
- Result ranking by relevance

**Example:**
```python
from app.services.llm_search_service import LLMVODSearchService

service = LLMVODSearchService()
results = await service.search(
    query="Israeli comedy movies from the 2020s",
    limit=20,
    filters={"section": "movies", "language": "he"}
)
```

### EPG Search

**Service:** `LLMEPGSearchService`
**Model:** Claude Haiku 3.5

Natural language search for electronic program guide (live TV schedules).

**Features:**
- Time-aware search ("what's on now", "tonight at 8pm")
- Channel-specific queries
- Program type filtering (news, sports, movies)

**Example:**
```python
from app.services.llm_search_service import LLMEPGSearchService

service = LLMEPGSearchService()
results = await service.search(
    query="What news shows are on tonight?",
    time_range="tonight"
)
```

### Vector Search

**Service:** `OlorinVectorSearch`
**Engine:** MongoDB Atlas Vector Search

Semantic search using content embeddings for similarity-based retrieval.

**Features:**
- Content embedding generation (OpenAI ada-002)
- Cosine similarity matching
- Hybrid search (vector + keyword)
- Real-time index updates

**Example:**
```python
from app.services.olorin.search import OlorinVectorSearch

service = OlorinVectorSearch()
results = await service.vector_search(
    query_embedding=query_vector,
    limit=10,
    min_score=0.7
)
```

---

## Specialized AI Features

### Chess AI

**Service:** `ChessService`
**Model:** Claude Sonnet 4.5

AI-powered chess opponent with difficulty levels and move analysis.

**Features:**
- Multiple difficulty levels (beginner to expert)
- Move validation and suggestions
- Game analysis and commentary
- Opening book integration

**API:**
- `POST /api/v1/chess/move` - Make a move
- `GET /api/v1/chess/analysis` - Get position analysis
- `POST /api/v1/chess/hint` - Request move hint

### Onboarding AI

**Service:** `OnboardingAIService`
**Model:** Claude Haiku 3.5

Interactive AI-guided onboarding for new users.

**Features:**
- Personalized content recommendations
- User preference learning
- Interactive Q&A
- Tutorial generation

### Live Dubbing

**Service:** `LiveDubbingService`
**Engine:** ElevenLabs TTS + Google Speech-to-Text

Real-time dubbing of live TV channels from Hebrew to other languages.

**Features:**
- Real-time transcription (Google STT)
- Translation (Google Translate)
- Text-to-speech (ElevenLabs)
- Speaker voice matching
- Latency optimization (<3 seconds)

**Supported Languages:**
- Hebrew → English
- Hebrew → Spanish
- Hebrew → French
- Hebrew → Russian

---

## Olorin Ecosystem AI Services

### Content Intelligence

**Service:** `OlorinContextService`

Cultural context detection and content classification for Israeli and Jewish content.

**Features:**
- Jewish holiday detection
- Israeli culture context
- Hebrew language nuances
- Religious content classification
- Kosher content filtering

### Partner AI Integration

**Service:** `OlorinPartnerService`

AI-powered APIs for content partners and third-party integrations.

**Features:**
- Content recommendation API
- Metadata enrichment API
- Search API
- User behavior analytics
- Custom model fine-tuning

---

## LLM Model Selection Guide

### Model Comparison

| Model | Speed | Cost | Use Case |
|-------|-------|------|----------|
| **Claude Sonnet 4.5** | Medium | $15/M tokens | Complex reasoning, comprehensive analysis |
| **Claude Haiku 3.5** | Fast | $1/M tokens | Search, quick queries, high-volume operations |
| **GPT-4 Turbo** | Medium | $10/M tokens | Alternative for specific tasks |
| **OpenAI Embedding** | Fast | $0.13/M tokens | Vector embeddings for search |

### Model Selection Criteria

**Use Claude Sonnet 4.5 for:**
- AI Agent comprehensive audits
- Complex content analysis
- Multi-step reasoning tasks
- High-accuracy requirements

**Use Claude Haiku 3.5 for:**
- Beta 500 AI Search (cost-effective)
- EPG/VOD search services
- High-volume operations
- Real-time applications

**Use OpenAI Embedding for:**
- Vector search indexing
- Semantic similarity
- Content clustering
- Recommendation systems

### Cost Optimization Strategies

**1. Caching:**
```python
from functools import lru_cache

@lru_cache(maxsize=1000)
async def cached_search(query: str):
    return await llm_service.search(query)
```

**2. Batch Operations:**
```python
# Process multiple items in single request
results = await llm_service.batch_process([
    item1, item2, item3
])
```

**3. Token Limits:**
```python
# Limit context size
context = content[:4000]  # ~1000 tokens
result = await llm_service.analyze(context)
```

**4. Prompt Optimization:**
```python
# Use concise prompts
prompt = f"Classify: {title}"  # Instead of verbose instructions
```

**5. Model Downgrading:**
```python
# Use Haiku for simple tasks
if task_complexity == "simple":
    model = "claude-haiku-3-5"
else:
    model = "claude-sonnet-4-5"
```

**6. Result Caching:**
```python
# Cache search results
cache_key = f"search:{query_hash}"
if cached := await redis.get(cache_key):
    return cached
result = await llm_service.search(query)
await redis.setex(cache_key, 3600, result)
```

---

## Monitoring and Observability

### Metrics

**Prometheus Metrics:**
- `bayit_ai_requests_total` - Total AI requests by feature
- `bayit_ai_request_duration_seconds` - Request latency histogram
- `bayit_ai_credits_used_total` - Credits consumed by user
- `bayit_ai_errors_total` - Error count by type
- `bayit_ai_cost_dollars_total` - Total AI cost

**Grafana Dashboards:**
- AI Features Overview
- Beta 500 Credit Usage
- LLM Model Performance
- Error Rate and Latency

### Logging

**Structured Logging:**
```python
from app.core.logging_config import get_logger

logger = get_logger(__name__)

logger.info("AI search executed", extra={
    "user_id": user_id,
    "query": query,
    "credits_used": 10,
    "results_count": len(results),
    "duration_ms": duration
})
```

### Alerts

**Critical Alerts:**
- Credit balance below 10 for user
- AI service error rate > 5%
- Request latency p95 > 2 seconds
- Daily cost > budget threshold

---

## Security and Privacy

### Data Protection

**User Data:**
- Queries encrypted in transit (HTTPS)
- No query logging without consent
- Opt-out available for AI features
- GDPR compliance

**API Keys:**
- Stored in Google Cloud Secret Manager
- Rotated quarterly
- Never logged or exposed
- Rate-limited per service account

### Rate Limiting

**Global Limits:**
- 1000 AI requests/minute (platform-wide)
- 100 concurrent AI operations

**Per-User Limits:**
| Tier | Requests/Minute |
|------|----------------|
| Free | 60 |
| Beta 500 | 120 |
| Premium | 300 |
| Admin | Unlimited |

---

## Related Documentation

- [AI API Reference](../api/AI_API_REFERENCE.md) - Complete API documentation
- [Beta 500 User Manual](../guides/BETA_500_USER_MANUAL.md) - User guide for Beta 500
- [Credit System](../technical/CREDIT_SYSTEM.md) - Credit architecture and metering
- [LLM Configuration](../deployment/LLM_CONFIGURATION.md) - Model setup and configuration
- [AI Agent System](../technical/AI_AGENT_SYSTEM.md) - Agent architecture and tools
- [AI Troubleshooting](../guides/AI_TROUBLESHOOTING.md) - Common issues and solutions

---

**Document Status:** ✅ Complete
**Last Updated:** 2026-01-30
**Maintained by:** AI Team
**Next Review:** 2026-03-30
