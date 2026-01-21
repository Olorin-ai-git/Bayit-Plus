# Rate Limits

The Bayit+ API implements rate limiting to ensure fair usage and platform stability. This guide explains rate limit policies, response headers, and best practices for handling limits.

## Rate Limit Tiers

Limits vary by authentication method and endpoint category:

| Tier | Requests per Minute | Requests per Day |
|------|---------------------|------------------|
| Free | 60 | 1,000 |
| Standard | 300 | 10,000 |
| Premium | 1,000 | 100,000 |
| Enterprise | Custom | Custom |

Streaming and playback endpoints have separate, higher limits.

## Rate Limit Headers

Every API response includes rate limit information:

```
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 295
X-RateLimit-Reset: 1705312800
```

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Maximum requests in current window |
| `X-RateLimit-Remaining` | Requests remaining in current window |
| `X-RateLimit-Reset` | Unix timestamp when window resets |

## Exceeding Limits

When rate limited, the API returns `429 Too Many Requests`:

```json
{
  "error": {
    "code": "rate_limit_exceeded",
    "message": "Rate limit exceeded. Please retry after 45 seconds.",
    "retry_after": 45
  }
}
```

The `Retry-After` header indicates seconds until the next request is allowed.

## Best Practices

**Implement Exponential Backoff**:

```python
import time

def api_request_with_retry(url, max_retries=5):
    for attempt in range(max_retries):
        response = make_request(url)
        if response.status_code == 429:
            wait_time = 2 ** attempt
            time.sleep(wait_time)
            continue
        return response
    raise Exception("Max retries exceeded")
```

**Cache Responses**: Store frequently accessed data locally to reduce API calls.

**Use Bulk Endpoints**: Request multiple items in a single call when available.

**Monitor Usage**: Track your consumption via the developer portal dashboard.

## Endpoint-Specific Limits

Some endpoints have additional restrictions:

| Endpoint | Special Limit |
|----------|---------------|
| `/v1/search` | 30 requests/minute |
| `/v1/playback/sessions` | 10 sessions/minute |
| `/v1/users/*/profiles` | 5 creates/hour |

## Burst Handling

The API allows brief bursts above the per-minute limit. However, sustained high-volume requests trigger throttling. Spread requests evenly over time for optimal throughput.

## Requesting Higher Limits

Contact the API team for limit increases:

1. Navigate to **Developer Portal** > **Support**
2. Select **Rate Limit Increase Request**
3. Describe your use case and expected volume
4. Submit for review

Increases are evaluated based on account standing and use case legitimacy.
