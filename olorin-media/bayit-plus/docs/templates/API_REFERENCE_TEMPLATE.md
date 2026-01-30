# [Service Name] API Reference

**Version:** [1.0.0]
**Base URL:** `https://api.bayitplus.com`
**Last Updated:** [YYYY-MM-DD]

## Overview

[Brief description of the API service - what it does, who uses it, key capabilities]

## Authentication

### Authentication Methods

**Bearer Token (OAuth 2.0):**
```bash
curl -X GET "https://api.bayitplus.com/api/v1/resource" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Firebase ID Token:**
```bash
curl -X GET "https://api.bayitplus.com/api/v1/resource" \
  -H "Authorization: Bearer FIREBASE_ID_TOKEN"
```

### Getting an Access Token

```bash
# Example: Get Firebase ID token
firebase login:ci
```

### Token Expiration

- **Access Token:** Expires in 1 hour
- **Refresh Token:** Expires in 30 days

## Rate Limits

| Tier | Requests per Minute | Requests per Hour |
|------|---------------------|-------------------|
| Free | 60 | 1,000 |
| Beta 500 | 120 | 5,000 |
| Premium | 300 | 10,000 |

### Rate Limit Headers

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1643723400
```

### Rate Limit Exceeded Response

```json
{
  "error": {
    "code": "rate_limit_exceeded",
    "message": "Rate limit exceeded. Try again in 30 seconds.",
    "retry_after": 30
  }
}
```

## Endpoints

### [Endpoint Category]

---

### [Endpoint Name]

[Brief description of what this endpoint does]

**Method:** `GET` | `POST` | `PUT` | `DELETE`
**Path:** `/api/v1/resource/{id}`

**Authentication:** Required ✅ | Not Required ❌

**Rate Limit:** [X] requests per minute

#### Request

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Resource ID |

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `limit` | integer | No | 20 | Number of results (max 100) |
| `offset` | integer | No | 0 | Pagination offset |
| `sort` | string | No | `created_at` | Sort field |
| `order` | string | No | `desc` | Sort order (`asc` or `desc`) |

**Headers:**

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Yes | Bearer token |
| `Content-Type` | Yes | `application/json` |

**Request Body:**

```json
{
  "field1": "string",
  "field2": 123,
  "field3": {
    "nested_field": "value"
  },
  "field4": ["array", "values"]
}
```

**TypeScript Interface:**

```typescript
interface CreateResourceRequest {
  field1: string;
  field2: number;
  field3: {
    nested_field: string;
  };
  field4: string[];
}
```

#### Response

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "res_abc123",
    "field1": "string",
    "field2": 123,
    "created_at": "2026-01-30T12:00:00Z",
    "updated_at": "2026-01-30T12:00:00Z"
  },
  "meta": {
    "total": 150,
    "limit": 20,
    "offset": 0
  }
}
```

**TypeScript Interface:**

```typescript
interface ResourceResponse {
  success: boolean;
  data: {
    id: string;
    field1: string;
    field2: number;
    created_at: string;
    updated_at: string;
  };
  meta: {
    total: number;
    limit: number;
    offset: number;
  };
}
```

**Response Headers:**

```
Content-Type: application/json
X-Request-ID: req_abc123
X-RateLimit-Remaining: 45
```

#### Error Responses

**400 Bad Request:**

```json
{
  "error": {
    "code": "invalid_request",
    "message": "Invalid request parameters",
    "details": {
      "field1": "Field is required",
      "field2": "Must be a positive integer"
    }
  }
}
```

**401 Unauthorized:**

```json
{
  "error": {
    "code": "unauthorized",
    "message": "Invalid or expired token"
  }
}
```

**403 Forbidden:**

```json
{
  "error": {
    "code": "forbidden",
    "message": "Insufficient permissions to access this resource"
  }
}
```

**404 Not Found:**

```json
{
  "error": {
    "code": "not_found",
    "message": "Resource not found"
  }
}
```

**429 Too Many Requests:**

```json
{
  "error": {
    "code": "rate_limit_exceeded",
    "message": "Rate limit exceeded. Try again in 30 seconds.",
    "retry_after": 30
  }
}
```

**500 Internal Server Error:**

```json
{
  "error": {
    "code": "internal_error",
    "message": "An internal error occurred. Please try again later.",
    "request_id": "req_abc123"
  }
}
```

#### Examples

**cURL Example:**

```bash
curl -X GET "https://api.bayitplus.com/api/v1/resource/res_abc123?limit=20" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

**JavaScript Example:**

```javascript
const response = await fetch('https://api.bayitplus.com/api/v1/resource/res_abc123?limit=20', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
console.log(data);
```

**Python Example:**

```python
import requests

response = requests.get(
    'https://api.bayitplus.com/api/v1/resource/res_abc123',
    params={'limit': 20},
    headers={
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }
)

data = response.json()
print(data)
```

**TypeScript Example:**

```typescript
import { api } from './services/api';

interface ResourceResponse {
  success: boolean;
  data: {
    id: string;
    field1: string;
    field2: number;
  };
}

const fetchResource = async (id: string): Promise<ResourceResponse> => {
  const response = await api.get<ResourceResponse>(`/api/v1/resource/${id}`, {
    params: { limit: 20 }
  });
  return response.data;
};
```

---

## Common Patterns

### Pagination

All list endpoints support pagination:

```
GET /api/v1/resources?limit=20&offset=0
```

**Response:**
```json
{
  "success": true,
  "data": [...],
  "meta": {
    "total": 150,
    "limit": 20,
    "offset": 0,
    "next_offset": 20
  }
}
```

### Sorting

All list endpoints support sorting:

```
GET /api/v1/resources?sort=created_at&order=desc
```

### Filtering

Filter by specific fields:

```
GET /api/v1/resources?status=active&category=video
```

### Cursor-Based Pagination

For real-time data, use cursor-based pagination:

```
GET /api/v1/resources?cursor=abc123&limit=20
```

## Error Handling

### Error Response Format

All errors follow this format:

```json
{
  "error": {
    "code": "error_code",
    "message": "Human-readable error message",
    "details": {
      "field": "Additional error context"
    },
    "request_id": "req_abc123"
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `invalid_request` | 400 | Invalid request parameters |
| `unauthorized` | 401 | Authentication required |
| `forbidden` | 403 | Insufficient permissions |
| `not_found` | 404 | Resource not found |
| `conflict` | 409 | Resource conflict |
| `rate_limit_exceeded` | 429 | Rate limit exceeded |
| `internal_error` | 500 | Internal server error |
| `service_unavailable` | 503 | Service temporarily unavailable |

### Retry Strategy

For `429` and `5xx` errors, implement exponential backoff:

```typescript
const retryWithBackoff = async (fn: () => Promise<any>, maxRetries = 3) => {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await fn();
    } catch (error) {
      if (error.status === 429 || error.status >= 500) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        attempt++;
      } else {
        throw error;
      }
    }
  }
  throw new Error('Max retries exceeded');
};
```

## Webhooks

*[If applicable]*

### Webhook Events

| Event | Description |
|-------|-------------|
| `resource.created` | Resource created |
| `resource.updated` | Resource updated |
| `resource.deleted` | Resource deleted |

### Webhook Payload

```json
{
  "event": "resource.created",
  "timestamp": "2026-01-30T12:00:00Z",
  "data": {
    "id": "res_abc123",
    "field1": "value"
  }
}
```

## SDKs

### Official SDKs

- **JavaScript/TypeScript:** `npm install @bayit/api-client`
- **Python:** `pip install bayit-api-client`

### SDK Example

```typescript
import { BayitAPI } from '@bayit/api-client';

const client = new BayitAPI({
  apiKey: 'YOUR_API_KEY'
});

const resource = await client.resources.get('res_abc123');
```

## Related Documents

- [Feature Documentation](../features/FEATURE_NAME.md)
- [Authentication Guide](../guides/AUTHENTICATION.md)
- [Rate Limiting Guide](../guides/RATE_LIMITING.md)
- [Troubleshooting Guide](../guides/TROUBLESHOOTING.md)

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | YYYY-MM-DD | Initial API release |

---

**API Status:** ✅ Stable
**Last Reviewed:** [YYYY-MM-DD]
**Feedback:** [support@bayitplus.com](mailto:support@bayitplus.com)
