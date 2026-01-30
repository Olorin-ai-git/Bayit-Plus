# Live Trivia Setup Guide

This guide covers installation and testing of the Live Trivia system.

## Prerequisites

- Python 3.11+
- Poetry installed
- Anthropic API key (Claude)
- MongoDB Atlas connection

## Installation

### 1. Install Python Dependencies

```bash
cd backend
poetry install
```

This will install the new dependencies:
- `spacy` (>=3.8.0) - NLP library for entity recognition
- `wikipediaapi` (>=0.8.0) - Wikipedia API client

### 2. Install spaCy Language Models

The Live Trivia system requires spaCy language models for entity detection:

```bash
# English model (required)
poetry run python -m spacy download en_core_web_sm

# Hebrew model (required for Hebrew transcripts)
poetry run python -m spacy download he_core_web_sm
```

**Verification:**
```bash
poetry run python -c "import spacy; spacy.load('en_core_web_sm'); print('✓ English model loaded')"
poetry run python -c "import spacy; spacy.load('he_core_web_sm'); print('✓ Hebrew model loaded')"
```

## Configuration

Add the following environment variables to your Google Cloud Secret Manager (see `docs/deployment/SECRETS_MANAGEMENT.md` for the workflow):

```bash
# Live Trivia Feature Flag
LIVE_TRIVIA_ENABLED=false  # Set to true when ready to enable

# NER Provider (spacy or hybrid)
LIVE_TRIVIA_NER_PROVIDER=hybrid  # hybrid = spacy + Claude validation

# Search Provider
LIVE_TRIVIA_SEARCH_PROVIDER=wikipedia  # wikipedia (primary) or duckduckgo

# Topic Detection
LIVE_TRIVIA_MIN_TOPIC_MENTIONS=2  # Require 2+ mentions before generating facts

# Caching
LIVE_TRIVIA_FACT_CACHE_TTL_SECONDS=3600  # 1 hour cache

# User Experience
LIVE_TRIVIA_TOPIC_COOLDOWN_MINUTES=15  # Don't repeat topics within 15 min
LIVE_TRIVIA_MIN_INTERVAL_SECONDS=30    # Minimum 30s between facts (high frequency)
LIVE_TRIVIA_MAX_FACTS_PER_SESSION=50   # Max 50 facts per user session

# Access Control
LIVE_TRIVIA_REQUIRES_SUBSCRIPTION=premium,family,beta  # Tiers with access

# Cost Control
LIVE_TRIVIA_MAX_DAILY_COST_USD=30  # Alert if daily costs exceed $30
```

**After updating secrets, regenerate `.env` files:**
```bash
./scripts/sync-gcloud-secrets.sh
```

## Running Tests

### Unit Tests

Run all live trivia unit tests:

```bash
cd backend
poetry run pytest tests/unit/live_trivia/ -v
```

Run specific test files:

```bash
# Topic detection tests
poetry run pytest tests/unit/live_trivia/test_topic_detector.py -v

# Web search tests
poetry run pytest tests/unit/live_trivia/test_web_search_service.py -v

# Fact extraction tests
poetry run pytest tests/unit/live_trivia/test_fact_extractor.py -v
```

### Test Coverage

Run tests with coverage report:

```bash
poetry run pytest tests/unit/live_trivia/ --cov=app.services.live_trivia --cov-report=html
```

View coverage report:
```bash
open htmlcov/index.html
```

**Target: 87%+ coverage**

## Manual Testing

### Test Topic Detection

```python
import asyncio
from app.services.live_trivia.topic_detector import TopicDetectionService

async def test_detection():
    detector = TopicDetectionService()

    transcript = "Putin announced today that Russia will implement new policies."
    topics = await detector.detect_topics(transcript, "en", validate_with_ai=True)

    print(f"Detected {len(topics)} topics:")
    for topic in topics:
        print(f"  - {topic['topic_text']} ({topic['entity_type']}) confidence: {topic['confidence_score']:.2f}")

asyncio.run(test_detection())
```

Expected output:
```
Detected 2 topics:
  - Putin (person) confidence: 0.85
  - Russia (place) confidence: 0.80
```

### Test Web Search

```python
import asyncio
from app.services.live_trivia.web_search_service import WebSearchService

async def test_search():
    search = WebSearchService()

    result = await search.search("Vladimir Putin")

    if result:
        print(f"Source: {result['source']}")
        print(f"Title: {result['title']}")
        print(f"Summary: {result['summary'][:200]}...")
        print(f"URL: {result['url']}")
    else:
        print("No results found")

asyncio.run(test_search())
```

### Test Fact Extraction

```python
import asyncio
from app.services.live_trivia.fact_extractor import FactExtractionService

async def test_extraction():
    extractor = FactExtractionService()

    search_result = {
        "title": "Vladimir Putin",
        "summary": "Putin is the President of Russia since 2000. He previously served from 1999-2008 and again from 2012. He was a KGB officer before entering politics.",
        "url": "https://en.wikipedia.org/wiki/Vladimir_Putin",
        "source": "wikipedia"
    }

    facts = await extractor.extract_facts(
        "Vladimir Putin",
        "person",
        search_result
    )

    print(f"Extracted {len(facts)} facts:")
    for i, fact in enumerate(facts, 1):
        print(f"\nFact {i}:")
        print(f"  EN: {fact.text_en}")
        print(f"  HE: {fact.text}")
        print(f"  ES: {fact.text_es}")
        print(f"  Category: {fact.category}")
        print(f"  Priority: {fact.priority}")

asyncio.run(test_extraction())
```

## Troubleshooting

### spaCy Model Not Found

**Error:** `Can't find model 'en_core_web_sm'`

**Solution:**
```bash
poetry run python -m spacy download en_core_web_sm
```

### Anthropic API Error

**Error:** `AuthenticationError: Invalid API key`

**Solution:** Verify `ANTHROPIC_API_KEY` is set in your environment:
```bash
echo $ANTHROPIC_API_KEY
```

If not set, add it to Google Cloud Secret Manager and regenerate `.env`:
```bash
gcloud secrets create ANTHROPIC_API_KEY --data-file=- <<< "sk-ant-..."
./scripts/sync-gcloud-secrets.sh
```

### Wikipedia API Timeout

**Error:** `ClientError: Timeout`

**Solution:** The service automatically falls back to DuckDuckGo. Check logs:
```bash
grep "Wikipedia failed" backend/logs/backend.log
grep "DuckDuckGo found" backend/logs/backend.log
```

### Memory Issues with spaCy

**Error:** `MemoryError` when loading models

**Solution:** Use smaller models or increase container memory:
```bash
# Use small models (already configured)
poetry run python -m spacy download en_core_web_sm  # Not en_core_web_lg
```

## Next Steps

After setup and testing:

1. **Phase 2:** Implement orchestration and caching (Task #3)
2. **Phase 3:** Integrate with WebSocket endpoint (Task #4)
3. **Phase 4:** Build frontend components (Task #5)
4. **Phase 5:** Production deployment (Task #6)

## Monitoring

Once deployed, monitor:
- **API Costs:** Claude API calls (target: <$200/month)
- **Cache Hit Rate:** Redis cache efficiency (target: >60%)
- **Latency:** Transcript → fact display (target: <2 seconds p95)
- **Error Rate:** Failed fact generations (target: <1%)

View metrics in Grafana dashboard: `Bayit+ → Live Trivia`

## Support

For issues or questions:
- **Documentation:** `/docs/features/LIVE_TRIVIA_SYSTEM.md`
- **Architecture:** `/docs/architecture/LIVE_TRIVIA_ARCHITECTURE.md`
- **GitHub Issues:** https://github.com/bayit-plus/issues
