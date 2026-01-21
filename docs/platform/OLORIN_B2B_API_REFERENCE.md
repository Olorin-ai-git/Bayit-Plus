# Olorin.ai B2B Platform API Reference

API reference documentation for the Olorin.ai B2B platform, providing AI-powered media capabilities for integration partners.

## Base URL

```
Production: https://api.bayit.tv/api/v1/olorin
```

## Authentication

All API requests (except partner registration) require authentication using an API key.

**Header Format:**
```
X-API-Key: olorin_<your_api_key>
```

## Rate Limiting

Rate limits vary by billing tier:

| Tier | Requests/min | Requests/hour | Concurrent Sessions |
|------|-------------|---------------|---------------------|
| Free | 10 | 100 | 2 |
| Standard | 50 | 500 | 10 |
| Enterprise | 200 | 2000 | 40 |

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Maximum requests per minute
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Unix timestamp when limit resets

---

## Partner Management

### Register Partner

Register as a new integration partner.

```http
POST /olorin/partner/register
Content-Type: application/json
```

**Request Body:**
```json
{
  "partner_id": "my-company-id",
  "name": "My Company",
  "name_en": "My Company (English)",
  "contact_email": "api@mycompany.com",
  "contact_name": "John Doe",
  "capabilities": ["realtime_dubbing", "semantic_search", "cultural_context", "recap_agent"]
}
```

**Response:**
```json
{
  "partner_id": "my-company-id",
  "api_key": "olorin_xxxxxxxxxxxxxxxxxxxxx",
  "enabled_capabilities": ["realtime_dubbing", "semantic_search", "cultural_context", "recap_agent"],
  "billing_tier": "standard",
  "created_at": "2026-01-20T10:00:00Z"
}
```

### Get Partner Profile

Retrieve current partner profile and configuration.

```http
GET /olorin/partner/me
X-API-Key: olorin_xxxxx
```

**Response:**
```json
{
  "partner_id": "my-company-id",
  "name": "My Company",
  "contact_email": "api@mycompany.com",
  "enabled_capabilities": ["realtime_dubbing", "semantic_search"],
  "billing_tier": "standard",
  "monthly_usage_limit_usd": 100.0,
  "webhook_url": "https://mycompany.com/webhook",
  "created_at": "2026-01-20T10:00:00Z",
  "last_active_at": "2026-01-20T12:30:00Z"
}
```

### Update Partner Profile

Update partner configuration.

```http
PUT /olorin/partner/me
X-API-Key: olorin_xxxxx
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Updated Company Name",
  "contact_email": "new-email@mycompany.com"
}
```

### Configure Webhook

Set up webhook for receiving events.

```http
POST /olorin/partner/me/webhook
X-API-Key: olorin_xxxxx
Content-Type: application/json
```

**Request Body:**
```json
{
  "webhook_url": "https://mycompany.com/olorin-webhook",
  "events": ["session.started", "session.ended", "usage.threshold_reached", "error.occurred"]
}
```

### Regenerate API Key

Generate a new API key (invalidates the old one).

```http
POST /olorin/partner/me/api-key/regenerate
X-API-Key: olorin_xxxxx
```

**Response:**
```json
{
  "api_key": "olorin_new_key_xxxxxxxxxxxxx",
  "regenerated_at": "2026-01-20T10:00:00Z"
}
```

### Get Usage Summary

Retrieve usage statistics and costs.

```http
GET /olorin/partner/usage
X-API-Key: olorin_xxxxx
```

**Query Parameters:**
- `start_date` (optional): ISO 8601 datetime
- `end_date` (optional): ISO 8601 datetime
- `capability` (optional): Filter by capability type

**Response:**
```json
{
  "partner_id": "my-company-id",
  "period": {
    "start": "2026-01-01T00:00:00Z",
    "end": "2026-01-20T23:59:59Z"
  },
  "by_capability": {
    "realtime_dubbing": {
      "request_count": 150,
      "audio_seconds_processed": 4500.5,
      "characters_processed": 125000,
      "estimated_cost_usd": 45.50
    },
    "semantic_search": {
      "request_count": 1200,
      "tokens_consumed": 600000,
      "estimated_cost_usd": 1.20
    }
  },
  "totals": {
    "request_count": 1350,
    "estimated_cost_usd": 46.70
  }
}
```

---

## Realtime Dubbing

### Create Dubbing Session

Start a new realtime dubbing session.

```http
POST /olorin/dubbing/sessions
X-API-Key: olorin_xxxxx
Content-Type: application/json
```

**Request Body:**
```json
{
  "source_language": "he",
  "target_language": "en",
  "voice_id": "voice_123",
  "stream_url": "wss://stream.mycompany.com/audio"
}
```

**Response:**
```json
{
  "session_id": "dubbing_abc123",
  "websocket_url": "wss://api.bayit.tv/ws/dubbing/dubbing_abc123",
  "source_language": "he",
  "target_language": "en",
  "voice_id": "voice_123",
  "status": "active",
  "created_at": "2026-01-20T10:00:00Z"
}
```

### End Dubbing Session

End an active dubbing session.

```http
DELETE /olorin/dubbing/sessions/{session_id}
X-API-Key: olorin_xxxxx
```

**Response:**
```json
{
  "session_id": "dubbing_abc123",
  "status": "ended",
  "duration_seconds": 1250.5,
  "segments_processed": 420,
  "estimated_cost_usd": 12.50,
  "ended_at": "2026-01-20T10:20:50Z"
}
```

### Get Session Status

Get status of a dubbing session.

```http
GET /olorin/dubbing/sessions/{session_id}
X-API-Key: olorin_xxxxx
```

### List Available Voices

Get available TTS voices for dubbing.

```http
GET /olorin/dubbing/voices
X-API-Key: olorin_xxxxx
```

**Query Parameters:**
- `language` (optional): Filter by target language code

**Response:**
```json
{
  "voices": [
    {
      "voice_id": "voice_123",
      "name": "Michael",
      "language": "en",
      "gender": "male",
      "style": "conversational",
      "preview_url": "https://cdn.bayit.tv/voices/michael_preview.mp3"
    },
    {
      "voice_id": "voice_456",
      "name": "Sarah",
      "language": "en",
      "gender": "female",
      "style": "news"
    }
  ]
}
```

---

## Semantic Search

### Semantic Content Search

Search content using semantic understanding.

```http
POST /olorin/search/semantic
X-API-Key: olorin_xxxxx
Content-Type: application/json
```

**Request Body:**
```json
{
  "query": "family drama about tradition",
  "filters": {
    "content_types": ["movie", "series"],
    "genres": ["Drama", "Family"],
    "languages": ["he", "en"],
    "year_min": 2015
  },
  "limit": 20,
  "threshold": 0.7
}
```

**Response:**
```json
{
  "results": [
    {
      "content_id": "content_abc123",
      "title": "Shtisel",
      "title_en": "Shtisel",
      "description": "Drama about an Orthodox Jewish family...",
      "similarity_score": 0.92,
      "content_type": "series",
      "genres": ["Drama", "Family"],
      "thumbnail_url": "https://cdn.bayit.tv/thumbnails/shtisel.jpg"
    }
  ],
  "total": 15,
  "tokens_used": 150
}
```

### Dialogue Search

Search within subtitle/dialogue content.

```http
POST /olorin/search/dialogue
X-API-Key: olorin_xxxxx
Content-Type: application/json
```

**Request Body:**
```json
{
  "query": "I will always love you",
  "language": "en",
  "content_ids": ["content_abc123", "content_def456"],
  "limit": 10
}
```

**Response:**
```json
{
  "results": [
    {
      "content_id": "content_abc123",
      "content_title": "Shtisel",
      "matches": [
        {
          "text": "I will always love you, my son",
          "timestamp_seconds": 1234.5,
          "episode": "S01E05",
          "speaker": "Shulem"
        }
      ]
    }
  ],
  "total_matches": 3
}
```

### Index Content

Add content to the semantic search index.

```http
POST /olorin/search/index
X-API-Key: olorin_xxxxx
Content-Type: application/json
```

**Request Body:**
```json
{
  "content_id": "my_content_123",
  "title": "My Video Title",
  "title_en": "My Video Title (English)",
  "description": "Description of the video content...",
  "content_type": "movie",
  "genres": ["Drama"],
  "metadata": {
    "year": 2024,
    "duration_minutes": 120
  }
}
```

---

## Cultural Context

### Detect Cultural References

Detect cultural references in text.

```http
POST /olorin/context/cultural/detect
X-API-Key: olorin_xxxxx
Content-Type: application/json
```

**Request Body:**
```json
{
  "text": "He wore his kippa and tallit during the davening",
  "source_language": "en",
  "target_language": "es",
  "context": "religious practice"
}
```

**Response:**
```json
{
  "references": [
    {
      "reference_id": "ref_abc123",
      "term": "kippa",
      "category": "religious_garments",
      "explanation_en": "A small round cap worn by Jewish men as a sign of respect for God",
      "explanation_target": "Una pequeña gorra redonda usada por hombres judíos...",
      "confidence": 0.95,
      "position": {"start": 8, "end": 13}
    },
    {
      "reference_id": "ref_def456",
      "term": "tallit",
      "category": "religious_garments",
      "explanation_en": "A fringed prayer shawl worn during morning prayers",
      "confidence": 0.94,
      "position": {"start": 18, "end": 24}
    }
  ],
  "tokens_used": 250
}
```

### Get Reference Explanation

Get detailed explanation for a cultural reference.

```http
GET /olorin/context/cultural/explain/{reference_id}
X-API-Key: olorin_xxxxx
```

**Query Parameters:**
- `target_language`: Language for explanation (default: en)

### Enrich Text with Context

Enrich text with cultural context annotations.

```http
POST /olorin/context/cultural/enrich
X-API-Key: olorin_xxxxx
Content-Type: application/json
```

**Request Body:**
```json
{
  "text": "The rabbi gave a drash about Tu B'Shvat",
  "output_format": "annotated",
  "target_audience": "general"
}
```

### Get Category References

Get all references for a category.

```http
GET /olorin/context/cultural/categories/{category}
X-API-Key: olorin_xxxxx
```

**Categories:**
- `holidays` - Jewish holidays and observances
- `religious_garments` - Religious clothing items
- `food` - Traditional foods and dietary laws
- `lifecycle` - Life cycle events
- `prayer` - Prayer and worship terms
- `hebrew_terms` - Common Hebrew/Yiddish terms

### Get Popular References

Get most commonly detected references.

```http
GET /olorin/context/cultural/popular
X-API-Key: olorin_xxxxx
```

**Query Parameters:**
- `limit`: Number of results (default: 20)
- `category`: Filter by category

---

## Recap Agent

### Create Recap Session

Start a new recap session for live content.

```http
POST /olorin/recap/sessions
X-API-Key: olorin_xxxxx
Content-Type: application/json
```

**Request Body:**
```json
{
  "channel_id": "channel_news_123",
  "stream_url": "https://stream.example.com/live"
}
```

**Response:**
```json
{
  "session_id": "recap_abc123",
  "channel_id": "channel_news_123",
  "status": "active",
  "created_at": "2026-01-20T10:00:00Z"
}
```

### Add Transcript Segment

Add a transcript segment to the session.

```http
POST /olorin/recap/sessions/{session_id}/transcript
X-API-Key: olorin_xxxxx
Content-Type: application/json
```

**Request Body:**
```json
{
  "text": "And now for the weather forecast...",
  "timestamp": 1250.5,
  "speaker": "Anchor",
  "language": "he",
  "confidence": 0.95
}
```

### Generate Recap

Generate a recap summary for the session.

```http
GET /olorin/recap/sessions/{session_id}/recap
X-API-Key: olorin_xxxxx
```

**Query Parameters:**
- `window_minutes`: Time window for recap (default: 15)
- `target_language`: Output language (default: same as source)

**Response:**
```json
{
  "session_id": "recap_abc123",
  "summary": "The broadcast covered three main topics: political developments in the region, economic updates, and weather forecast...",
  "key_points": [
    "Government announced new policy on housing",
    "Stock market reached all-time high",
    "Rain expected throughout the week"
  ],
  "window_minutes": 15,
  "transcript_seconds": 900,
  "language": "en",
  "generated_at": "2026-01-20T10:15:00Z",
  "tokens_used": 450
}
```

### Get Session Details

Get details of a recap session.

```http
GET /olorin/recap/sessions/{session_id}
X-API-Key: olorin_xxxxx
```

### End Recap Session

End a recap session.

```http
DELETE /olorin/recap/sessions/{session_id}
X-API-Key: olorin_xxxxx
```

### List Active Sessions

List all active recap sessions.

```http
GET /olorin/recap/sessions
X-API-Key: olorin_xxxxx
```

---

## Webhooks

### Get Webhook Configuration

Get current webhook configuration.

```http
GET /olorin/webhooks/config
X-API-Key: olorin_xxxxx
```

**Response:**
```json
{
  "webhook_url": "https://mycompany.com/olorin-webhook",
  "events": ["session.started", "session.ended", "error.occurred"],
  "secret": "whsec_xxxxx",
  "is_active": true
}
```

### Update Webhook Configuration

Update webhook settings.

```http
PUT /olorin/webhooks/config
X-API-Key: olorin_xxxxx
Content-Type: application/json
```

**Request Body:**
```json
{
  "webhook_url": "https://mycompany.com/new-webhook",
  "events": ["session.started", "session.ended", "usage.threshold_reached"],
  "secret": "my_custom_secret"
}
```

### Delete Webhook Configuration

Remove webhook configuration.

```http
DELETE /olorin/webhooks/config
X-API-Key: olorin_xxxxx
```

### Test Webhook

Send a test event to your webhook.

```http
POST /olorin/webhooks/test
X-API-Key: olorin_xxxxx
```

**Response:**
```json
{
  "success": true,
  "response_status": 200,
  "response_time_ms": 125
}
```

### List Webhook Deliveries

Get history of webhook deliveries.

```http
GET /olorin/webhooks/deliveries
X-API-Key: olorin_xxxxx
```

**Query Parameters:**
- `limit`: Number of results (default: 50)
- `status`: Filter by status (success, failed, pending)

**Response:**
```json
{
  "deliveries": [
    {
      "delivery_id": "del_abc123",
      "event_type": "session.ended",
      "payload": {"session_id": "recap_xyz"},
      "status": "success",
      "response_status": 200,
      "attempts": 1,
      "delivered_at": "2026-01-20T10:00:00Z"
    }
  ],
  "total": 150
}
```

---

## Webhook Events

### Event Types

| Event | Description |
|-------|-------------|
| `session.started` | A dubbing or recap session was started |
| `session.ended` | A session has ended |
| `usage.threshold_reached` | Usage limit threshold reached (80%, 90%, 100%) |
| `error.occurred` | An error occurred during processing |
| `partner.updated` | Partner configuration was updated |

### Webhook Payload Format

```json
{
  "event_type": "session.ended",
  "event_id": "evt_abc123",
  "partner_id": "my-company-id",
  "timestamp": "2026-01-20T10:00:00Z",
  "data": {
    "session_id": "recap_abc123",
    "duration_seconds": 900,
    "status": "completed"
  }
}
```

### Webhook Signature Verification

Webhooks are signed using HMAC-SHA256. Verify using the `X-Olorin-Signature` header:

```python
import hmac
import hashlib

def verify_signature(payload: bytes, signature: str, secret: str) -> bool:
    expected = hmac.new(
        secret.encode('utf-8'),
        payload,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(f"sha256={expected}", signature)
```

---

## Error Handling

### Error Response Format

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Please retry after 60 seconds.",
    "details": {
      "limit": 60,
      "reset_at": "2026-01-20T10:01:00Z"
    }
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Invalid or missing API key |
| `FORBIDDEN` | 403 | Capability not enabled or suspended |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMIT_EXCEEDED` | 429 | Rate limit exceeded |
| `USAGE_LIMIT_EXCEEDED` | 402 | Monthly usage limit exceeded |
| `INVALID_REQUEST` | 400 | Invalid request parameters |
| `INTERNAL_ERROR` | 500 | Internal server error |

---

## SDKs and Libraries

### Python SDK

```bash
pip install olorin-sdk
```

```python
from olorin import OlorinClient

client = OlorinClient(api_key="olorin_xxxxx")

# Create a recap session
session = client.recap.create_session(channel_id="news_channel")

# Add transcript
client.recap.add_transcript(
    session_id=session.id,
    text="Breaking news today...",
    timestamp=0.0
)

# Generate recap
recap = client.recap.generate(session_id=session.id)
print(recap.summary)
```

### JavaScript/TypeScript SDK

```bash
npm install @olorin/sdk
```

```typescript
import { OlorinClient } from '@olorin/sdk';

const client = new OlorinClient({ apiKey: 'olorin_xxxxx' });

// Semantic search
const results = await client.search.semantic({
  query: 'family drama',
  filters: { genres: ['Drama'] }
});
```

---

## Support

- **Documentation**: https://docs.olorin.ai
- **API Status**: https://status.olorin.ai
- **Support Email**: api-support@olorin.ai
- **Developer Discord**: https://discord.gg/olorin-dev
