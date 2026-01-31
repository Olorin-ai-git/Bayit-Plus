# AI API Reference

**Version:** 1.0.0
**Base URL:** `https://api.bayitplus.com/api/v1`
**Last Updated:** 2026-01-30

## Authentication

All AI endpoints require JWT authentication via the `Authorization` header.

::: v-pre
```bash
Authorization: Bearer <your_jwt_token>
```
:::

**Token Requirements:**
- Valid JWT from Firebase Auth
- User must be enrolled in Beta 500 program
- Sufficient credit balance

---

## Beta 500 Endpoints

### Get Credit Balance

Get the current user's credit balance.

**Endpoint:** `GET /beta/credits/balance`

**Authentication:** Required (user's own balance)

**Request:**
```bash
curl -X GET "https://api.bayitplus.com/api/v1/beta/credits/balance" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "balance": 450,
  "is_beta_user": true,
  "last_updated": "2026-01-30T10:30:00Z"
}
```

**TypeScript:**
::: v-pre
```typescript
interface CreditBalanceResponse {
  balance: number;
  is_beta_user: boolean;
  last_updated: string;
}

const getBalance = async (): Promise<CreditBalanceResponse> => {
  const response = await fetch('/api/v1/beta/credits/balance', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return response.json();
};
```
:::

**Error Responses:**
```json
// Not enrolled in Beta 500
{
  "detail": "User is not enrolled in Beta 500 program",
  "status": 403
}

// Unauthorized
{
  "detail": "Invalid or expired token",
  "status": 401
}
```

---

### AI Search

Natural language content search powered by Claude Sonnet 4.5.

**Endpoint:** `POST /beta/search`

**Cost:** 10 credits per request

**Request:**
```bash
curl -X POST "https://api.bayitplus.com/api/v1/beta/search" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Show me Israeli comedy movies from the 2020s",
    "limit": 20,
    "filters": {
      "section": "movies",
      "language": "he"
    }
  }'
```

**Request Body:**
```typescript
interface AISearchRequest {
  query: string;                    // Natural language query (required)
  limit?: number;                   // Max results (default: 20, max: 50)
  filters?: {
    section?: string;                // "movies" | "series" | "podcasts" | "audiobooks"
    language?: string;               // Language code: "he", "en", etc.
    year_min?: number;               // Minimum release year
    year_max?: number;               // Maximum release year
    genre?: string;                  // Genre filter
  };
  user_context?: {
    viewing_history?: string[];      // Recent content IDs
    preferences?: string[];          // User preferences
  };
}
```

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "id": "content_123",
      "title": "הבורר",
      "title_en": "The Arbitrator",
      "type": "series",
      "year": 2023,
      "genre": ["Comedy", "Drama"],
      "language": "he",
      "rating": 8.2,
      "thumbnail": "https://cdn.bayitplus.com/thumbnails/123.jpg",
      "description": "Israeli comedy-drama series...",
      "relevance_score": 0.92
    }
  ],
  "query_understanding": {
    "interpreted_intent": "Find Israeli comedy movies from 2020-2029",
    "extracted_filters": {
      "content_type": "movies",
      "genre": "comedy",
      "year_range": [2020, 2029],
      "origin": "Israel"
    }
  },
  "credits_used": 10,
  "remaining_balance": 440
}
```

**TypeScript:**
::: v-pre
```typescript
interface AISearchResponse {
  success: boolean;
  results: SearchResult[];
  query_understanding: {
    interpreted_intent: string;
    extracted_filters: Record<string, any>;
  };
  credits_used: number;
  remaining_balance: number;
}

interface SearchResult {
  id: string;
  title: string;
  title_en?: string;
  type: 'movie' | 'series' | 'podcast' | 'audiobook';
  year: number;
  genre: string[];
  language: string;
  rating: number;
  thumbnail: string;
  description: string;
  relevance_score: number;
}

const searchWithAI = async (query: string): Promise<AISearchResponse> => {
  const response = await fetch('/api/v1/beta/search', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, limit: 20 }),
  });
  return response.json();
};
```
:::

**Error Responses:**
```json
// Insufficient credits
{
  "detail": "Insufficient credits. Required: 10, Available: 5",
  "status": 402,
  "required_credits": 10,
  "current_balance": 5
}

// Rate limit exceeded
{
  "detail": "Rate limit exceeded. Try again in 60 seconds",
  "status": 429,
  "retry_after": 60
}
```

---

### AI Recommendations

Get personalized content recommendations.

**Endpoint:** `GET /beta/recommendations`

**Cost:** 5 credits per request

**Request:**
```bash
curl -X GET "https://api.bayitplus.com/api/v1/beta/recommendations?limit=10&context=evening" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Query Parameters:**
```typescript
interface RecommendationsParams {
  limit?: number;                   // Max recommendations (default: 10, max: 20)
  context?: string;                  // "morning" | "evening" | "weekend" | "holiday"
  content_type?: string;             // "movies" | "series" | "podcasts" | "audiobooks"
  mood?: string;                     // "relaxing" | "exciting" | "educational" | "funny"
}
```

**Response:**
```json
{
  "success": true,
  "recommendations": [
    {
      "id": "content_456",
      "title": "שטיסל",
      "title_en": "Shtisel",
      "type": "series",
      "reason": "Based on your interest in Israeli drama and family stories",
      "confidence": 0.87,
      "thumbnail": "https://cdn.bayitplus.com/thumbnails/456.jpg"
    }
  ],
  "personalization_factors": [
    "viewing_history",
    "time_of_day",
    "user_preferences"
  ],
  "credits_used": 5,
  "remaining_balance": 435
}
```

**TypeScript:**
::: v-pre
```typescript
interface RecommendationsResponse {
  success: boolean;
  recommendations: Recommendation[];
  personalization_factors: string[];
  credits_used: number;
  remaining_balance: number;
}

interface Recommendation {
  id: string;
  title: string;
  title_en?: string;
  type: 'movie' | 'series' | 'podcast' | 'audiobook';
  reason: string;
  confidence: number;
  thumbnail: string;
}

const getRecommendations = async (
  params?: RecommendationsParams
): Promise<RecommendationsResponse> => {
  const queryString = new URLSearchParams(params as any).toString();
  const response = await fetch(
    `/api/v1/beta/recommendations?${queryString}`,
    {
      headers: { 'Authorization': `Bearer ${token}` },
    }
  );
  return response.json();
};
```
:::

---

### Auto Catch-Up

Get AI-generated summary of missed live content.

**Endpoint:** `GET /live/{channel_id}/catchup`

**Cost:** 15 credits per request

**Request:**
```bash
curl -X GET "https://api.bayitplus.com/api/v1/live/channel13/catchup" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Path Parameters:**
- `channel_id` (string, required) - Channel identifier (e.g., "channel13", "channel12")

**Query Parameters:**
```typescript
interface CatchUpParams {
  since?: string;                   // ISO timestamp (default: last 30 minutes)
  summary_length?: string;          // "brief" | "detailed" (default: "brief")
  include_speakers?: boolean;       // Include speaker names (default: true)
}
```

**Response:**
```json
{
  "success": true,
  "channel_id": "channel13",
  "summary": "In the past 30 minutes, the news covered three main topics: 1) Political developments regarding the coalition, 2) Weather forecast for the weekend, and 3) Sports updates from European leagues.",
  "key_moments": [
    {
      "timestamp": "2026-01-30T14:15:00Z",
      "topic": "Politics",
      "summary": "Coalition meeting results announced",
      "speaker": "News Anchor"
    },
    {
      "timestamp": "2026-01-30T14:20:00Z",
      "topic": "Weather",
      "summary": "Rain expected this weekend",
      "speaker": "Weather Reporter"
    }
  ],
  "topics": ["Politics", "Weather", "Sports"],
  "duration_covered": "30 minutes",
  "credits_used": 15,
  "remaining_balance": 420
}
```

**TypeScript:**
::: v-pre
```typescript
interface CatchUpResponse {
  success: boolean;
  channel_id: string;
  summary: string;
  key_moments: KeyMoment[];
  topics: string[];
  duration_covered: string;
  credits_used: number;
  remaining_balance: number;
}

interface KeyMoment {
  timestamp: string;
  topic: string;
  summary: string;
  speaker: string;
}

const getCatchUp = async (
  channelId: string,
  params?: CatchUpParams
): Promise<CatchUpResponse> => {
  const queryString = params ? `?${new URLSearchParams(params as any)}` : '';
  const response = await fetch(
    `/api/v1/live/${channelId}/catchup${queryString}`,
    {
      headers: { 'Authorization': `Bearer ${token}` },
    }
  );
  return response.json();
};
```
:::

---

## AI Agent Endpoints (Admin Only)

### Execute Comprehensive Audit

Run comprehensive library audit with AI agent.

**Endpoint:** `POST /admin/ai-agent/audit`

**Authentication:** Admin only

**Request:**
```bash
curl -X POST "https://api.bayitplus.com/api/v1/admin/ai-agent/audit" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "scope": "all_content",
    "checks": ["metadata", "streams", "duplicates"],
    "auto_fix": false
  }'
```

**Request Body:**
```typescript
interface AuditRequest {
  scope: 'all_content' | 'movies' | 'series' | 'podcasts';
  checks: Array<'metadata' | 'streams' | 'duplicates' | 'taxonomy'>;
  auto_fix: boolean;
  dry_run?: boolean;
}
```

**Response:**
```json
{
  "success": true,
  "audit_id": "audit_789",
  "status": "completed",
  "findings": {
    "metadata_issues": 12,
    "stream_errors": 3,
    "duplicates_found": 5,
    "taxonomy_warnings": 8
  },
  "fixes_applied": 0,
  "execution_time_seconds": 45.2,
  "cost_dollars": 2.15
}
```

---

### Enrich Metadata

Enrich content metadata using AI and external sources.

**Endpoint:** `POST /admin/ai-agent/enrich`

**Authentication:** Admin only

**Request:**
```bash
curl -X POST "https://api.bayitplus.com/api/v1/admin/ai-agent/enrich" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -H "Content-Type": application/json" \
  -d '{
    "content_id": "content_123",
    "sources": ["tmdb", "olorin_context"],
    "fields": ["description", "genres", "cast"]
  }'
```

**Request Body:**
```typescript
interface EnrichRequest {
  content_id: string;
  sources: Array<'tmdb' | 'olorin_context' | 'opensubtitles'>;
  fields: Array<'description' | 'genres' | 'cast' | 'keywords' | 'ratings'>;
  overwrite?: boolean;
}
```

---

## Rate Limiting

All AI endpoints are rate-limited based on user tier.

### Rate Limit Headers

Every response includes rate limit information:

```
X-RateLimit-Limit: 120
X-RateLimit-Remaining: 115
X-RateLimit-Reset: 1706611200
```

### Rate Limits by Tier

| Tier | Requests/Minute | Burst Limit |
|------|----------------|-------------|
| Free | 60 | 10 |
| Beta 500 | 120 | 20 |
| Premium | 300 | 50 |
| Admin | Unlimited | N/A |

### Retry Strategy

When rate-limited (429 response), implement exponential backoff:

::: v-pre
```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      if (error.status === 429 && i < maxRetries - 1) {
        const waitTime = Math.pow(2, i) * 1000; // 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        throw error;
      }
    }
  }
  throw new Error('Max retries exceeded');
}
```
:::

---

## Error Handling

### Standard Error Response

```json
{
  "detail": "Error message",
  "status": 400,
  "error_code": "INVALID_REQUEST",
  "request_id": "req_abc123"
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `INVALID_REQUEST` | 400 | Malformed request body |
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `INSUFFICIENT_CREDITS` | 402 | Not enough credits |
| `FORBIDDEN` | 403 | Not enrolled in Beta 500 |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |
| `SERVICE_UNAVAILABLE` | 503 | AI service temporarily down |

### Error Handling Example

```typescript
try {
  const results = await searchWithAI(query);
} catch (error: any) {
  if (error.status === 402) {
    // Insufficient credits
    alert(`You need ${error.required_credits} credits. Current balance: ${error.current_balance}`);
  } else if (error.status === 429) {
    // Rate limited
    console.log(`Rate limited. Retry after ${error.retry_after} seconds`);
  } else {
    // Generic error
    console.error('Search failed:', error.detail);
  }
}
```

---

## Best Practices

### 1. Credit Management

Always check balance before expensive operations:

```typescript
const balance = await getBalance();
if (balance.balance < 15) {
  alert('Low credit balance. Please refill.');
  return;
}
```

### 2. Caching

Cache search results to save credits:

```typescript
const cacheKey = `search:${query}`;
const cached = localStorage.getItem(cacheKey);
if (cached) {
  return JSON.parse(cached);
}
const results = await searchWithAI(query);
localStorage.setItem(cacheKey, JSON.stringify(results));
```

### 3. Debouncing

Debounce search input to reduce API calls:

```typescript
import { debounce } from 'lodash';

const debouncedSearch = debounce(async (query: string) => {
  const results = await searchWithAI(query);
  setResults(results);
}, 500);
```

### 4. Error Boundaries

Wrap AI features in error boundaries:

::: v-pre
```typescript
<ErrorBoundary fallback={<div>AI feature temporarily unavailable</div>}>
  <AISearchComponent />
</ErrorBoundary>
```
:::

### 5. Progressive Enhancement

Provide fallback when AI unavailable:

```typescript
async function search(query: string) {
  try {
    return await aiSearch(query);
  } catch (error) {
    // Fallback to keyword search
    return await keywordSearch(query);
  }
}
```

---

## SDK Examples

### JavaScript/TypeScript

```typescript
class BayitPlusAI {
  constructor(private token: string) {}

  async search(query: string, options?: AISearchRequest) {
    const response = await fetch('/api/v1/beta/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, ...options }),
    });
    return response.json();
  }

  async getRecommendations(params?: RecommendationsParams) {
    const queryString = new URLSearchParams(params as any).toString();
    const response = await fetch(
      `/api/v1/beta/recommendations?${queryString}`,
      {
        headers: { 'Authorization': `Bearer ${this.token}` },
      }
    );
    return response.json();
  }

  async getCatchUp(channelId: string, params?: CatchUpParams) {
    const queryString = params ? `?${new URLSearchParams(params as any)}` : '';
    const response = await fetch(
      `/api/v1/live/${channelId}/catchup${queryString}`,
      {
        headers: { 'Authorization': `Bearer ${this.token}` },
      }
    );
    return response.json();
  }

  async getBalance() {
    const response = await fetch('/api/v1/beta/credits/balance', {
      headers: { 'Authorization': `Bearer ${this.token}` },
    });
    return response.json();
  }
}
```

### Python

```python
import requests
from typing import Dict, List, Optional

class BayitPlusAI:
    def __init__(self, token: str, base_url: str = "https://api.bayitplus.com/api/v1"):
        self.token = token
        self.base_url = base_url
        self.headers = {"Authorization": f"Bearer {token}"}

    def search(self, query: str, limit: int = 20, filters: Optional[Dict] = None) -> Dict:
        response = requests.post(
            f"{self.base_url}/beta/search",
            headers={**self.headers, "Content-Type": "application/json"},
            json={"query": query, "limit": limit, "filters": filters or {}},
        )
        response.raise_for_status()
        return response.json()

    def get_recommendations(self, limit: int = 10, context: Optional[str] = None) -> Dict:
        params = {"limit": limit}
        if context:
            params["context"] = context
        response = requests.get(
            f"{self.base_url}/beta/recommendations",
            headers=self.headers,
            params=params,
        )
        response.raise_for_status()
        return response.json()

    def get_catchup(self, channel_id: str, since: Optional[str] = None) -> Dict:
        params = {}
        if since:
            params["since"] = since
        response = requests.get(
            f"{self.base_url}/live/{channel_id}/catchup",
            headers=self.headers,
            params=params,
        )
        response.raise_for_status()
        return response.json()

    def get_balance(self) -> Dict:
        response = requests.get(
            f"{self.base_url}/beta/credits/balance",
            headers=self.headers,
        )
        response.raise_for_status()
        return response.json()
```

---

## Related Documentation

- [AI Features Overview](../features/AI_FEATURES_OVERVIEW.md) - Complete AI features catalog
- [Beta 500 User Manual](../guides/BETA_500_USER_MANUAL.md) - End-user guide
- [Credit System](../technical/CREDIT_SYSTEM.md) - Credit architecture
- [AI Troubleshooting](../guides/AI_TROUBLESHOOTING.md) - Common issues

---

**Document Status:** ✅ Complete
**Last Updated:** 2026-01-30
**Maintained by:** API Team
**Next Review:** 2026-03-30
