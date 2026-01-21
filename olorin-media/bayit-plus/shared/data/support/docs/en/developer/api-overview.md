# REST API Overview

The Bayit+ API provides programmatic access to the streaming platform. This guide covers base URLs, versioning, request formats, and general conventions used across all endpoints.

## Base URLs

| Environment | Base URL |
|-------------|----------|
| Production | `https://api.bayit.plus/v1` |
| Staging | `https://api.staging.bayit.plus/v1` |
| Sandbox | `https://api.sandbox.bayit.plus/v1` |

All API requests must use HTTPS. HTTP requests are rejected.

## API Versioning

The API version is included in the URL path. The current stable version is `v1`. When breaking changes are introduced, a new version is released while maintaining support for previous versions during a deprecation period.

Version lifecycle:
- **Current**: Actively developed and fully supported
- **Deprecated**: Supported but no new features; migration recommended
- **Retired**: No longer available

## Request Format

All requests should include these headers:

```
Content-Type: application/json
Accept: application/json
Authorization: Bearer {access_token}
```

Request bodies must be valid JSON. Date values use ISO 8601 format.

## Response Format

Successful responses return JSON with consistent structure:

```json
{
  "data": { },
  "meta": {
    "request_id": "req_abc123",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

## Pagination

List endpoints support pagination through query parameters:

| Parameter | Description | Default |
|-----------|-------------|---------|
| `page` | Page number (1-indexed) | 1 |
| `per_page` | Items per page | 20 |
| `sort` | Sort field | varies |
| `order` | Sort direction (asc/desc) | desc |

Paginated responses include navigation metadata:

```json
{
  "data": [ ],
  "pagination": {
    "current_page": 1,
    "per_page": 20,
    "total_items": 150,
    "total_pages": 8
  }
}
```

## Filtering

Most list endpoints support filtering via query parameters. Filter syntax varies by field type:

- **Exact match**: `?status=published`
- **Multiple values**: `?category=drama,comedy`
- **Range**: `?release_year_gte=2020&release_year_lte=2024`
- **Search**: `?q=search+term`

## SDK Availability

Official SDKs are available for:

- JavaScript/TypeScript
- Python
- Swift
- Kotlin

SDKs handle authentication, pagination, and error handling automatically.
