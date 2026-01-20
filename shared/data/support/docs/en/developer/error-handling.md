# Error Handling

The Bayit+ API uses standard HTTP status codes and consistent error response formats. This guide covers error structures, common error codes, and retry strategies.

## Error Response Format

All errors return a JSON object with this structure:

```json
{
  "error": {
    "code": "validation_error",
    "message": "The request contains invalid parameters.",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ],
    "request_id": "req_abc123"
  }
}
```

| Field | Description |
|-------|-------------|
| `code` | Machine-readable error code |
| `message` | Human-readable description |
| `details` | Array of field-level errors (when applicable) |
| `request_id` | Unique identifier for support inquiries |

## HTTP Status Codes

| Status | Meaning |
|--------|---------|
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Invalid or missing authentication |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource does not exist |
| 409 | Conflict - Resource state conflict |
| 422 | Unprocessable Entity - Validation failed |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server-side issue |
| 503 | Service Unavailable - Temporary maintenance |

## Common Error Codes

| Code | Description | Resolution |
|------|-------------|------------|
| `invalid_token` | Access token is invalid or expired | Refresh the token |
| `insufficient_scope` | Token lacks required permissions | Request additional scopes |
| `resource_not_found` | Requested item does not exist | Verify the resource ID |
| `validation_error` | Request parameters are invalid | Check the details array |
| `rate_limit_exceeded` | Too many requests | Wait and retry |
| `concurrent_limit` | Too many active streams | Close other sessions |

## Retry Strategy

Implement intelligent retry logic for transient errors:

```python
RETRYABLE_CODES = [429, 500, 502, 503, 504]

def should_retry(status_code, attempt, max_attempts=3):
    if attempt >= max_attempts:
        return False
    return status_code in RETRYABLE_CODES

def calculate_delay(attempt, base_delay=1):
    return base_delay * (2 ** attempt)
```

## Idempotency

For write operations, include an idempotency key to safely retry:

```
POST /v1/profiles
Idempotency-Key: unique-request-id-123
```

Repeated requests with the same key return the original response without creating duplicates.

## Error Logging

Log errors with the request ID for troubleshooting:

```python
if response.status_code >= 400:
    error = response.json().get("error", {})
    logger.error(
        f"API Error: {error.get('code')} - {error.get('message')} "
        f"(request_id: {error.get('request_id')})"
    )
```

## Support Escalation

For persistent errors, contact support with:

- The `request_id` from the error response
- Timestamp of the request
- Full request details (sanitize sensitive data)
- Expected versus actual behavior
