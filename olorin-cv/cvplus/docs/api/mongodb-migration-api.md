# MongoDB Migration API Contract Documentation

**Version**: 2.0
**Last Updated**: 2026-01-21
**Status**: Production

## Overview

This document provides complete API contracts for the MongoDB Atlas migration, including all endpoints, request/response schemas, error codes, and integration patterns.

---

## Base Configuration

**Base URL**: `https://us-central1-olorin-cvplus.cloudfunctions.net`
**API Version Header**: `X-API-Version: 2.0`
**Authentication**: Firebase JWT Bearer token
**Content-Type**: `application/json`
**Rate Limiting**: See rate limit section below

---

## Authentication

### Headers Required

```http
Authorization: Bearer <firebase-jwt-token>
X-API-Version: 2.0
Content-Type: application/json
```

### Error Responses

| Status | Code | Message |
|--------|------|---------|
| 401 | UNAUTHORIZED | Invalid or expired token |
| 403 | FORBIDDEN | Insufficient permissions |
| 426 | UPGRADE_REQUIRED | API version mismatch |

---

## Rate Limiting

### Headers

All responses include rate limit headers (RFC 7231):

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642867200
```

### Limits

| Endpoint Category | Limit | Window |
|-------------------|-------|--------|
| Global | 100 requests | 15 minutes |
| Authentication | 5 attempts | 15 minutes |
| Database Operations | 60 requests | 1 minute |
| Audio Generation | 10 requests | 1 hour |

---

## Endpoints

### 1. Health Check

**GET** `/health`

Check API and database connectivity status.

#### Request

No authentication required.

```http
GET /health HTTP/1.1
Host: us-central1-olorin-cvplus.cloudfunctions.net
```

#### Response (200 OK)

```json
{
  "status": "healthy",
  "timestamp": "2026-01-21T10:30:00Z",
  "database": {
    "connected": true,
    "poolUtilization": 0.35,
    "activeConnections": 17,
    "maxPoolSize": 50
  },
  "services": {
    "mongodb": "healthy",
    "redis": "healthy",
    "firebaseAuth": "healthy"
  }
}
```

#### Response (503 Service Unavailable)

```json
{
  "status": "unhealthy",
  "timestamp": "2026-01-21T10:30:00Z",
  "database": {
    "connected": false,
    "error": "Connection timeout"
  }
}
```

---

### 2. User Profile

**GET** `/api/user/profile`

Retrieve authenticated user's profile with preferences.

#### Request

```http
GET /api/user/profile HTTP/1.1
Host: us-central1-olorin-cvplus.cloudfunctions.net
Authorization: Bearer <token>
X-API-Version: 2.0
```

#### Response (200 OK)

```json
{
  "_id": "550e8400-e29b-41d4-a716-446655440000",
  "uid": "firebase-uid-123",
  "email": "user@example.com",
  "displayName": "John Doe",
  "photoURL": "https://example.com/photo.jpg",
  "locale": "en",
  "textDirection": "ltr",
  "timezone": "America/New_York",
  "accessibility": {
    "screenReader": false,
    "highContrast": false,
    "fontSize": "normal",
    "reducedMotion": false,
    "keyboardOnly": false,
    "colorBlindMode": "none",
    "focusIndicatorStyle": "default"
  },
  "preferences": {
    "theme": "dark",
    "notifications": true
  },
  "version": 3,
  "createdAt": "2025-12-01T10:00:00Z",
  "updatedAt": "2026-01-15T14:30:00Z"
}
```

#### Response (404 Not Found)

```json
{
  "error": {
    "message": "User profile not found",
    "code": "NOT_FOUND"
  }
}
```

---

### 3. Update User Preferences

**PUT** `/api/user/preferences`

Update user locale, accessibility, and preference settings.

#### Request

```http
PUT /api/user/preferences HTTP/1.1
Host: us-central1-olorin-cvplus.cloudfunctions.net
Authorization: Bearer <token>
X-API-Version: 2.0
Content-Type: application/json

{
  "locale": "es",
  "accessibility": {
    "screenReader": true,
    "highContrast": true,
    "fontSize": "large",
    "reducedMotion": true,
    "keyboardOnly": false,
    "colorBlindMode": "deuteranopia",
    "focusIndicatorStyle": "high-contrast"
  },
  "preferences": {
    "theme": "dark"
  },
  "version": 3
}
```

#### Response (200 OK)

```json
{
  "success": true,
  "user": {
    "_id": "550e8400-e29b-41d4-a716-446655440000",
    "locale": "es",
    "textDirection": "ltr",
    "accessibility": {
      "screenReader": true,
      "highContrast": true,
      "fontSize": "large",
      "reducedMotion": true,
      "keyboardOnly": false,
      "colorBlindMode": "deuteranopia",
      "focusIndicatorStyle": "high-contrast"
    },
    "version": 4,
    "updatedAt": "2026-01-21T10:35:00Z"
  }
}
```

#### Response (409 Version Conflict)

```json
{
  "error": {
    "message": "Document was modified by another user. Please refresh and try again.",
    "code": "VERSION_CONFLICT",
    "details": {
      "expectedVersion": 3,
      "actualVersion": 5
    }
  }
}
```

---

### 4. Create Job

**POST** `/api/jobs`

Create a new CV processing job.

#### Request

```http
POST /api/jobs HTTP/1.1
Host: us-central1-olorin-cvplus.cloudfunctions.net
Authorization: Bearer <token>
X-API-Version: 2.0
Content-Type: application/json

{
  "data": {
    "personalInfo": {
      "firstName": "Jane",
      "lastName": "Smith",
      "email": "jane@example.com",
      "phone": "+1-555-0100",
      "location": "San Francisco, CA"
    },
    "experience": [
      {
        "id": "exp-1",
        "company": "Tech Corp",
        "position": "Senior Developer",
        "startDate": "2020-01-01",
        "current": true,
        "achievements": ["Led team of 5", "Shipped 3 major features"]
      }
    ],
    "education": [],
    "skills": [],
    "languages": [],
    "certifications": [],
    "projects": []
  },
  "publicProfile": {
    "isPublic": false
  }
}
```

#### Response (201 Created)

```json
{
  "_id": "job-uuid-123",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "data": { "..." },
  "version": 1,
  "createdAt": "2026-01-21T10:40:00Z",
  "updatedAt": "2026-01-21T10:40:00Z"
}
```

---

### 5. Get Job

**GET** `/api/jobs/:id`

Retrieve a job by ID.

#### Request

```http
GET /api/jobs/job-uuid-123 HTTP/1.1
Host: us-central1-olorin-cvplus.cloudfunctions.net
Authorization: Bearer <token>
X-API-Version: 2.0
```

#### Response (200 OK)

```json
{
  "_id": "job-uuid-123",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "data": { "..." },
  "processingMetadata": {
    "startedAt": "2026-01-21T10:40:05Z",
    "completedAt": "2026-01-21T10:40:30Z"
  },
  "version": 2,
  "createdAt": "2026-01-21T10:40:00Z",
  "updatedAt": "2026-01-21T10:40:30Z"
}
```

---

### 6. List User Jobs

**GET** `/api/jobs`

List all jobs for authenticated user with pagination.

#### Request

```http
GET /api/jobs?limit=10&skip=0 HTTP/1.1
Host: us-central1-olorin-cvplus.cloudfunctions.net
Authorization: Bearer <token>
X-API-Version: 2.0
```

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | integer | 10 | Max results (1-100) |
| skip | integer | 0 | Offset for pagination |

#### Response (200 OK)

```json
{
  "jobs": [
    { "_id": "job-1", "status": "completed", "..." },
    { "_id": "job-2", "status": "pending", "..." }
  ],
  "total": 25,
  "limit": 10,
  "skip": 0
}
```

---

### 7. Public Profile

**GET** `/api/publicProfile/:slug`

Retrieve a public CV profile by slug (no authentication required).

#### Request

```http
GET /api/publicProfile/jane-smith-senior-dev HTTP/1.1
Host: us-central1-olorin-cvplus.cloudfunctions.net
X-API-Version: 2.0
```

#### Response (200 OK)

```json
{
  "_id": "profile-uuid-456",
  "slug": "jane-smith-senior-dev",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "jobId": "job-uuid-123",
  "visibility": {
    "personalInfo": true,
    "experience": true,
    "education": true,
    "skills": true,
    "languages": false,
    "certifications": true,
    "projects": true
  },
  "data": { "..." },
  "analytics": {
    "views": 142,
    "lastViewedAt": "2026-01-20T15:30:00Z"
  },
  "version": 1,
  "createdAt": "2026-01-10T12:00:00Z"
}
```

---

### 8. Migration Status

**GET** `/api/migration/status`

Get current migration status (maintenance mode, progress).

#### Request

```http
GET /api/migration/status HTTP/1.1
Host: us-central1-olorin-cvplus.cloudfunctions.net
```

#### Response (200 OK - Not in Maintenance)

```json
{
  "maintenanceMode": false,
  "migrationStatus": "completed",
  "lastMigration": "2026-01-15T00:00:00Z"
}
```

#### Response (200 OK - In Maintenance)

```json
{
  "maintenanceMode": true,
  "migrationStatus": "in_progress",
  "progress": 65,
  "estimatedCompletion": "2026-01-21T12:00:00Z",
  "message": "System is undergoing database migration. Please check back soon."
}
```

---

### 9. WebSocket Events (Change Streams)

**WebSocket URL**: `wss://us-central1-olorin-cvplus.cloudfunctions.net/ws`

#### Connection

```javascript
import io from 'socket.io-client';

const socket = io('wss://us-central1-olorin-cvplus.cloudfunctions.net', {
  auth: { token: firebaseToken },
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000
});
```

#### Events

**Client → Server**

```javascript
// Subscribe to job updates
socket.emit('subscribe', { channel: 'jobs', userId: 'user-id' });

// Unsubscribe
socket.emit('unsubscribe', { channel: 'jobs' });

// Heartbeat (every 30s)
socket.emit('heartbeat', { timestamp: Date.now() });
```

**Server → Client**

```javascript
// Job status update
socket.on('job:updated', (data) => {
  // data: { jobId, status, updatedAt }
});

// Connection established
socket.on('connect', () => console.log('Connected'));

// Disconnected
socket.on('disconnect', () => console.log('Disconnected'));

// Error
socket.on('error', (error) => console.error('Socket error:', error));
```

---

## Error Handling

### Standard Error Response

```json
{
  "error": {
    "message": "Human-readable error message",
    "code": "ERROR_CODE",
    "details": {
      "field": "Additional context"
    }
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| VALIDATION_ERROR | 400 | Invalid request data |
| UNAUTHORIZED | 401 | Missing or invalid authentication |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| VERSION_CONFLICT | 409 | Optimistic concurrency conflict |
| UPGRADE_REQUIRED | 426 | API version mismatch |
| RATE_LIMIT_EXCEEDED | 429 | Too many requests |
| INTERNAL_ERROR | 500 | Server error (no details) |
| DB_ERROR | 503 | Database connection error |

---

## TypeScript Types

```typescript
// Request/Response types for TypeScript clients

export interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  database: {
    connected: boolean;
    poolUtilization?: number;
    activeConnections?: number;
    maxPoolSize?: number;
    error?: string;
  };
  services: {
    mongodb: 'healthy' | 'unhealthy';
    redis: 'healthy' | 'unhealthy';
    firebaseAuth: 'healthy' | 'unhealthy';
  };
}

export interface UserProfileResponse {
  _id: string;
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  locale: Locale;
  textDirection: 'ltr' | 'rtl';
  timezone?: string;
  accessibility: AccessibilityPreferences;
  preferences?: UserPreferences;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpdatePreferencesRequest {
  locale?: Locale;
  accessibility?: Partial<AccessibilityPreferences>;
  preferences?: Partial<UserPreferences>;
  version: number;
}

export interface ErrorResponse {
  error: {
    message: string;
    code: string;
    details?: Record<string, any>;
  };
}
```

---

## Pagination

All list endpoints support pagination:

```http
GET /api/jobs?limit=20&skip=40
```

Response includes pagination metadata:

```json
{
  "items": [...],
  "total": 100,
  "limit": 20,
  "skip": 40,
  "hasMore": true
}
```

---

## Versioning

API version is specified via header:

```http
X-API-Version: 2.0
```

Clients using outdated versions receive `426 Upgrade Required`.

---

## Security

- **TLS 1.3** required for all connections
- **Firebase JWT** authentication
- **Rate limiting** on all endpoints
- **Input validation** on all requests
- **NoSQL injection** prevention
- **XSS sanitization** on all user input

---

## Testing

### Example cURL Requests

```bash
# Health check
curl https://us-central1-olorin-cvplus.cloudfunctions.net/health

# Get user profile
curl -H "Authorization: Bearer $TOKEN" \
     -H "X-API-Version: 2.0" \
     https://us-central1-olorin-cvplus.cloudfunctions.net/api/user/profile

# Create job
curl -X POST \
     -H "Authorization: Bearer $TOKEN" \
     -H "X-API-Version: 2.0" \
     -H "Content-Type: application/json" \
     -d '{"data": {...}}' \
     https://us-central1-olorin-cvplus.cloudfunctions.net/api/jobs
```

---

## Support

For API issues or questions:
- **GitHub**: https://github.com/olorin/cvplus/issues
- **Documentation**: https://docs.olorin.ai/cvplus/api