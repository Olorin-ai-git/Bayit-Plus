# API Overview

**Base URL (Production):** `https://api.bayitplus.com`
**Base URL (Staging):** `https://staging-api.bayitplus.com`
**Base URL (Local):** `http://localhost:8000`
**API Version:** v1
**Last Updated:** 2026-01-30

## Introduction

The Bayit+ API is a RESTful API built with FastAPI that provides access to all platform features including content management, user authentication, subscriptions, AI features, and more. This document provides a comprehensive overview of API architecture, authentication, common patterns, and best practices.

### Key Features

- **RESTful Design** - Resource-based URLs, HTTP verbs
- **JWT Authentication** - Secure token-based auth
- **OAuth 2.0 Support** - Google OAuth integration
- **Firebase Auth Integration** - Cross-platform authentication
- **Rate Limiting** - Per-user and global limits
- **Comprehensive Error Handling** - Consistent error format
- **CORS Support** - Cross-origin requests enabled
- **OpenAPI/Swagger** - Interactive API documentation
- **Async Architecture** - High-performance async operations

---

## Architecture

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Framework** | FastAPI 0.104+ | Async web framework |
| **Database** | MongoDB Atlas | NoSQL document store |
| **ODM** | Beanie | Async object-document mapper |
| **Auth** | JWT + Firebase | Authentication & authorization |
| **Validation** | Pydantic v2 | Request/response validation |
| **Async Runtime** | Uvicorn | ASGI server |
| **Monitoring** | Sentry + Prometheus | Error tracking & metrics |

### Request/Response Flow

```
Client Request
     ↓
CORS Middleware
     ↓
Correlation ID Middleware (adds X-Correlation-ID)
     ↓
Request Timing Middleware (measures latency)
     ↓
Rate Limiting Middleware
     ↓
Authentication (JWT verification)
     ↓
Authorization (role/permissions check)
     ↓
Request Validation (Pydantic)
     ↓
Route Handler (business logic)
     ↓
Response Validation (Pydantic)
     ↓
Response Headers (CORS, timing)
     ↓
Client Response
```

---

## Authentication

### Authentication Methods

Bayit+ supports multiple authentication methods:

1. **JWT Bearer Tokens** - Primary method for API access
2. **Firebase ID Tokens** - For mobile apps
3. **OAuth 2.0** - Google OAuth for social login

### JWT Authentication

**How it works:**

1. User logs in with email/password
2. Server validates credentials
3. Server returns JWT access token (1-hour expiry)
4. Client includes token in `Authorization` header
5. Server validates token on each request

**Login Endpoint:**

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!@#"
}
```

**Response:**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user"
  }
}
```

**Using the Token:**

```http
GET /api/v1/content
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Token Expiration:**

- **Access Token:** 1 hour (default)
- **Refresh Token:** 30 days (if implemented)

**Token Structure:**

```json
{
  "sub": "507f1f77bcf86cd799439011",  // User ID
  "email": "user@example.com",
  "role": "user",
  "exp": 1706630400,  // Expiration timestamp
  "iat": 1706626800   // Issued at timestamp
}
```

### Firebase Authentication

**For Mobile Apps:**

Firebase ID tokens can be used directly:

```http
GET /api/v1/content
Authorization: Bearer <firebase_id_token>
```

The backend validates Firebase tokens using Firebase Admin SDK.

### OAuth 2.0 (Google)

**Login Flow:**

1. Client redirects to Google OAuth
2. User authorizes app
3. Google redirects back with auth code
4. Client exchanges code for tokens via backend
5. Backend creates user account (if new)
6. Backend returns JWT access token

**Endpoint:**

```http
POST /api/v1/auth/google
Content-Type: application/json

{
  "code": "4/0AY0e-g7...",  // Google auth code
  "redirect_uri": "http://localhost:3000/auth/callback"
}
```

---

## Authorization

### Role-Based Access Control (RBAC)

**Roles:**

| Role | Description | Permissions |
|------|-------------|-------------|
| **user** | Standard user | Read content, manage own profile |
| **beta** | Beta 500 participant | user + AI features (500 credits) |
| **premium** | Premium subscriber | user + premium content, no ads |
| **admin** | Administrator | Full access to all endpoints |

**Checking User Role:**

```python
from app.core.security import get_current_user, require_role

@router.get("/admin/users")
async def list_users(
    current_user: User = Depends(require_role("admin"))
):
    # Only admins can access this endpoint
    pass
```

**Permission Hierarchy:**

```
admin > premium > beta > user
```

---

## Common Patterns

### Pagination

**Query Parameters:**

| Parameter | Type | Default | Max | Description |
|-----------|------|---------|-----|-------------|
| `limit` | integer | 20 | 100 | Items per page |
| `offset` | integer | 0 | - | Items to skip |

**Example Request:**

```http
GET /api/v1/content?limit=50&offset=100
```

**Response:**

```json
{
  "success": true,
  "data": [
    { "id": "1", "title": "Movie 1" },
    { "id": "2", "title": "Movie 2" }
  ],
  "meta": {
    "total": 1500,
    "limit": 50,
    "offset": 100,
    "next_offset": 150
  }
}
```

### Filtering

**Query Parameters:**

```http
GET /api/v1/content?section=movies&audience=kids&year=2023
```

**Common Filters:**

| Parameter | Type | Example | Description |
|-----------|------|---------|-------------|
| `section` | string | `movies` | Filter by section |
| `audience` | string | `kids` | Filter by audience |
| `genre` | string | `comedy` | Filter by genre |
| `year` | integer | `2023` | Filter by year |
| `is_featured` | boolean | `true` | Featured content only |
| `search` | string | `romantic` | Full-text search |

### Sorting

**Query Parameter:**

```http
GET /api/v1/content?sort=-created_at,title
```

**Sort Syntax:**
- **Ascending:** `field_name` or `+field_name`
- **Descending:** `-field_name`
- **Multiple:** Comma-separated

**Common Sort Fields:**

| Field | Description |
|-------|-------------|
| `created_at` | Creation date |
| `updated_at` | Last modified |
| `view_count` | Popularity |
| `rating` | Content rating |
| `title` | Alphabetical |

### Searching

**Full-Text Search:**

```http
GET /api/v1/content?search=romantic+comedy
```

**Search Fields:**
- Title (Hebrew, English, Spanish)
- Description
- Cast
- Director

**Search Ranking:**
- Title matches: Highest priority
- Description matches: Medium priority
- Cast/Director: Lower priority

---

## Rate Limiting

### Rate Limit Tiers

| Tier | Requests per Minute | Requests per Hour |
|------|---------------------|-------------------|
| **Free** | 60 | 1,000 |
| **Beta 500** | 120 | 5,000 |
| **Premium** | 300 | 10,000 |
| **Admin** | Unlimited | Unlimited |

### Rate Limit Headers

```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1706630400
```

### Rate Limit Exceeded

**Response (429):**

```json
{
  "error": {
    "code": "rate_limit_exceeded",
    "message": "Rate limit exceeded. Try again in 30 seconds.",
    "retry_after": 30
  }
}
```

**Retry Strategy:**

Implement exponential backoff:

```typescript
const retryWithBackoff = async (fn: () => Promise<any>, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.status === 429) {
        const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
  throw new Error('Max retries exceeded');
};
```

---

## Error Handling

### Error Response Format

**All errors follow this consistent format:**

```json
{
  "error": {
    "code": "error_code",
    "message": "Human-readable error message",
    "details": {
      "field": "Additional context"
    },
    "request_id": "req_abc123"
  }
}
```

### HTTP Status Codes

| Code | Meaning | When to Use |
|------|---------|-------------|
| **200 OK** | Success | Successful GET, PUT, PATCH |
| **201 Created** | Resource created | Successful POST |
| **204 No Content** | Success, no body | Successful DELETE |
| **400 Bad Request** | Invalid input | Validation errors |
| **401 Unauthorized** | Auth required | Missing/invalid token |
| **403 Forbidden** | Insufficient permissions | Authorization failure |
| **404 Not Found** | Resource not found | Invalid ID |
| **409 Conflict** | Resource conflict | Duplicate email, etc. |
| **422 Unprocessable Entity** | Validation error | Pydantic validation |
| **429 Too Many Requests** | Rate limit | Too many requests |
| **500 Internal Server Error** | Server error | Unexpected errors |
| **503 Service Unavailable** | Maintenance | Planned downtime |

### Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| `invalid_request` | 400 | Invalid request parameters |
| `validation_error` | 422 | Pydantic validation failed |
| `unauthorized` | 401 | Authentication required |
| `forbidden` | 403 | Insufficient permissions |
| `not_found` | 404 | Resource not found |
| `conflict` | 409 | Resource conflict (duplicate) |
| `rate_limit_exceeded` | 429 | Rate limit exceeded |
| `internal_error` | 500 | Internal server error |
| `service_unavailable` | 503 | Service temporarily unavailable |
| `insufficient_credits` | 402 | Not enough AI credits (Beta 500) |

### Example Error Responses

**400 Bad Request:**

```json
{
  "error": {
    "code": "invalid_request",
    "message": "Invalid request parameters",
    "details": {
      "limit": "Must be between 1 and 100",
      "offset": "Must be non-negative"
    }
  }
}
```

**401 Unauthorized:**

```json
{
  "error": {
    "code": "unauthorized",
    "message": "Invalid or expired token",
    "details": {
      "reason": "token_expired"
    }
  }
}
```

**404 Not Found:**

```json
{
  "error": {
    "code": "not_found",
    "message": "Content not found",
    "details": {
      "resource_type": "content",
      "resource_id": "invalid_id_123"
    }
  }
}
```

**422 Validation Error:**

```json
{
  "error": {
    "code": "validation_error",
    "message": "Request validation failed",
    "details": {
      "email": "Invalid email format",
      "password": "Password must be at least 8 characters"
    }
  }
}
```

---

## Request Headers

### Required Headers

| Header | Required | Value | Purpose |
|--------|----------|-------|---------|
| `Authorization` | Yes* | `Bearer <token>` | Authentication (* for protected endpoints) |
| `Content-Type` | Yes** | `application/json` | Request body format (** for POST/PUT) |

### Optional Headers

| Header | Value | Purpose |
|--------|-------|---------|
| `Accept-Language` | `he`, `en`, `es` | Preferred response language |
| `X-Client-Version` | `1.2.3` | Client app version |
| `X-Device-ID` | `device_hash` | Device fingerprint |
| `X-Platform` | `web`, `ios`, `android`, `tvos` | Client platform |

### Response Headers

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Correlation-ID` | `uuid` | Request tracing |
| `X-Request-ID` | `uuid` | Request identifier |
| `X-Response-Time` | `123ms` | Server processing time |
| `X-RateLimit-*` | Various | Rate limit info |
| `Access-Control-*` | Various | CORS headers |

---

## CORS (Cross-Origin Resource Sharing)

### Allowed Origins

**Production:**
- `https://bayitplus.com`
- `https://www.bayitplus.com`
- `https://app.bayitplus.com`

**Staging:**
- `https://staging.bayitplus.com`

**Development:**
- `http://localhost:3000` (Web)
- `http://localhost:3001` (Mobile dev server)
- `capacitor://localhost` (Mobile apps)

### Allowed Methods

```
GET, POST, PUT, PATCH, DELETE, OPTIONS
```

### Allowed Headers

```
Authorization, Content-Type, Accept, Accept-Language,
X-Client-Version, X-Device-ID, X-Platform
```

### Exposed Headers

```
X-Correlation-ID, X-Request-ID, X-Response-Time,
X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
```

### Preflight Requests

**OPTIONS request:**

```http
OPTIONS /api/v1/content
Origin: http://localhost:3000
Access-Control-Request-Method: POST
Access-Control-Request-Headers: Authorization, Content-Type
```

**Response:**

```http
HTTP/1.1 200 OK
Access-Control-Allow-Origin: http://localhost:3000
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Authorization, Content-Type, Accept
Access-Control-Max-Age: 600
```

---

## API Versioning

### Current Version: v1

**Base Path:** `/api/v1/`

**Full URL:** `https://api.bayitplus.com/api/v1/`

### Version Strategy

- **URL-based versioning** - Version in path (`/api/v1/`, `/api/v2/`)
- **Backward compatibility** - v1 will remain supported for 1 year after v2 release
- **Deprecation warnings** - Response header `X-API-Deprecated: true`
- **Sunset date** - Response header `Sunset: 2027-01-01T00:00:00Z`

### Breaking Changes

Breaking changes require a new API version. Examples:
- Removing endpoints
- Changing response structure
- Removing required fields
- Changing authentication method

### Non-Breaking Changes

Can be deployed to existing version:
- Adding new endpoints
- Adding optional fields
- Adding response fields
- Bug fixes

---

## Interactive Documentation

### Swagger UI

**URL:** `https://api.bayitplus.com/docs`

**Features:**
- Interactive API testing
- Request/response examples
- Schema definitions
- Authentication testing
- Try it out functionality

### ReDoc

**URL:** `https://api.bayitplus.com/redoc`

**Features:**
- Clean, readable API docs
- Searchable endpoints
- Code samples
- Markdown support

### OpenAPI JSON

**URL:** `https://api.bayitplus.com/openapi.json`

**Use cases:**
- Generate SDKs
- Import into Postman
- API testing tools
- Documentation generation

---

## Best Practices

### Client Implementation

#### DO ✅

- **Always include `Authorization` header** for protected endpoints
- **Handle rate limits** - Implement exponential backoff
- **Validate responses** - Check `success` field
- **Use correlation IDs** - For debugging and support
- **Cache aggressively** - Reduce API calls
- **Handle errors gracefully** - Show user-friendly messages
- **Respect rate limits** - Don't hammer the API
- **Use pagination** - Don't fetch all data at once
- **Set timeouts** - 30s for reads, 60s for writes
- **Retry transient errors** - 429, 500, 503 with backoff

#### DON'T ❌

- **Don't hardcode tokens** - Use secure storage
- **Don't log sensitive data** - Passwords, tokens, PII
- **Don't ignore errors** - Always handle error responses
- **Don't spam requests** - Implement debouncing
- **Don't trust client-side validation only** - Server validates
- **Don't use GET for mutations** - Use POST/PUT/DELETE
- **Don't expose API keys** - Keep in environment variables
- **Don't skip HTTPS** - Always use secure connections

### Request Examples

**TypeScript/JavaScript:**

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://api.bayitplus.com/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - Handle errors
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Token expired - redirect to login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Example request
const getContent = async (limit = 20, offset = 0) => {
  try {
    const response = await api.get('/content', {
      params: { limit, offset, section: 'movies' }
    });
    return response.data;
  } catch (error) {
    console.error('Failed to fetch content:', error);
    throw error;
  }
};
```

**Python:**

```python
import httpx
from typing import Dict, Any

class BayitPlusAPI:
    def __init__(self, base_url: str, token: str):
        self.base_url = base_url
        self.client = httpx.AsyncClient(
            base_url=base_url,
            timeout=30.0,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

    async def get_content(
        self,
        limit: int = 20,
        offset: int = 0,
        section: str = None
    ) -> Dict[str, Any]:
        """Fetch content with pagination."""
        params = {"limit": limit, "offset": offset}
        if section:
            params["section"] = section

        response = await self.client.get("/content", params=params)
        response.raise_for_status()
        return response.json()

    async def close(self):
        """Close HTTP client."""
        await self.client.aclose()

# Usage
async def main():
    api = BayitPlusAPI(
        base_url="https://api.bayitplus.com/api/v1",
        token="your_jwt_token"
    )
    try:
        content = await api.get_content(limit=50, section="movies")
        print(f"Fetched {len(content['data'])} items")
    finally:
        await api.close()
```

---

## Monitoring & Debugging

### Correlation IDs

Every request receives a unique `X-Correlation-ID` header:

```http
X-Correlation-ID: 550e8400-e29b-41d4-a716-446655440000
```

**Use correlation IDs to:**
- Track requests across services
- Debug issues in logs
- Report bugs to support

### Request Timing

Response includes `X-Response-Time` header:

```http
X-Response-Time: 145ms
```

### Health Check

**Endpoint:** `/health`

**Response:**

```json
{
  "status": "healthy",
  "app": "Bayit+ API",
  "version": "1.0.0",
  "timestamp": "2026-01-30T12:00:00Z"
}
```

---

## Related Documents

- [Authentication Guide](../guides/AUTHENTICATION_GUIDE.md)
- [AI API Reference](AI_API_REFERENCE.md)
- [Beta 500 API Reference](BETA_500_API_REFERENCE.md)
- [Channel Chat API](CHANNEL_CHAT_API.md)
- [Voice API Reference](VOICE_API_REFERENCE.md)
- [Database Schema Reference](../technical/DATABASE_SCHEMA_REFERENCE.md)
- [Rate Limiting Guide](../guides/RATE_LIMITING_GUIDE.md)
- [Error Handling Guide](../guides/ERROR_HANDLING_GUIDE.md)

---

**Document Status:** ✅ Complete
**Last Updated:** 2026-01-30
**Maintained by:** Backend Team
**Next Review:** 2026-04-30
