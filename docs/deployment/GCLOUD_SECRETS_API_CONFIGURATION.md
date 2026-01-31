# Google Cloud Secrets - API Configuration

**Date**: 2026-01-31
**Feature**: Advanced Hebrew Subtitle Features - API Retry Configuration
**Related Issue**: Multi-agent review findings - Hardcoded Axios configuration

---

## Overview

This document describes the Google Cloud Secret Manager configuration for API retry and timeout settings used by the frontend Axios client.

**CRITICAL**: Never edit `.env` or `.env.example` files directly. Follow the workflow in [Secrets Management Guide](SECRETS_MANAGEMENT.md).

---

## Required Secrets

### 1. VITE_API_RETRY_COUNT

**Description**: Maximum number of retry attempts for failed API requests
**Type**: Integer
**Default**: 3
**Required**: Optional (has safe default)
**Used By**: web/src/services/api.js

**GCloud Command**:
```bash
echo "3" | gcloud secrets create VITE_API_RETRY_COUNT \
  --data-file=- \
  --replication-policy="automatic" \
  --project=bayit-plus
```

---

### 2. VITE_API_RETRY_DELAY

**Description**: Initial delay in milliseconds before first retry attempt (uses exponential backoff)
**Type**: Integer (milliseconds)
**Default**: 1000 (1 second)
**Required**: Optional (has safe default)
**Used By**: web/src/services/api.js

**GCloud Command**:
```bash
echo "1000" | gcloud secrets create VITE_API_RETRY_DELAY \
  --data-file=- \
  --replication-policy="automatic" \
  --project=bayit-plus
```

---

### 3. VITE_API_TIMEOUT

**Description**: Request timeout in milliseconds before cancellation
**Type**: Integer (milliseconds)
**Default**: 30000 (30 seconds)
**Required**: Optional (has safe default)
**Used By**: web/src/services/api.js

**GCloud Command**:
```bash
echo "30000" | gcloud secrets create VITE_API_TIMEOUT \
  --data-file=- \
  --replication-policy="automatic" \
  --project=bayit-plus
```

---

### 4. VITE_API_RETRY_STATUS_CODES

**Description**: Comma-separated HTTP status codes that should trigger retry
**Type**: String (comma-separated integers)
**Default**: "408,429,500,502,503,504"
**Required**: Optional (has safe default)
**Used By**: web/src/services/api.js

**Status Codes**:
- `408` - Request Timeout
- `429` - Too Many Requests (Rate Limit)
- `500` - Internal Server Error
- `502` - Bad Gateway
- `503` - Service Unavailable
- `504` - Gateway Timeout

**GCloud Command**:
```bash
echo "408,429,500,502,503,504" | gcloud secrets create VITE_API_RETRY_STATUS_CODES \
  --data-file=- \
  --replication-policy="automatic" \
  --project=bayit-plus
```

---

## Grant Access to Service Accounts

```bash
# Grant access to Cloud Run service account
gcloud secrets add-iam-policy-binding VITE_API_RETRY_COUNT \
  --member="serviceAccount:bayit-plus-web@bayit-plus.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=bayit-plus

gcloud secrets add-iam-policy-binding VITE_API_RETRY_DELAY \
  --member="serviceAccount:bayit-plus-web@bayit-plus.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=bayit-plus

gcloud secrets add-iam-policy-binding VITE_API_TIMEOUT \
  --member="serviceAccount:bayit-plus-web@bayit-plus.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=bayit-plus

gcloud secrets add-iam-policy-binding VITE_API_RETRY_STATUS_CODES \
  --member="serviceAccount:bayit-plus-web@bayit-plus.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=bayit-plus
```

---

## Regenerate .env Files

After adding secrets to Google Cloud Secret Manager:

```bash
# Regenerate .env from GCloud secrets
./scripts/sync-gcloud-secrets.sh

# Verify secrets were synced
grep "VITE_API_RETRY" web/.env
```

---

## Deployment

After regenerating `.env` files:

```bash
# Rebuild frontend with new configuration
cd web
npm run build

# Deploy to Cloud Run (or your deployment target)
gcloud run deploy bayit-plus-web \
  --source . \
  --project=bayit-plus \
  --region=us-central1
```

---

## Testing Retry Behavior

### Test Rate Limiting

```javascript
// Simulate rate limit by making rapid requests
for (let i = 0; i < 10; i++) {
  await api.get('/api/v1/subtitles/tracks/123')
}
// Should see automatic retry on 429 responses
```

### Test Network Timeout

```javascript
// Set low timeout to test timeout behavior
// In .env.local (development only):
VITE_API_TIMEOUT=1000  # 1 second

// Make slow request - should timeout and retry
await api.get('/api/v1/subtitles/cues/slow-content')
```

---

## Monitoring

Monitor retry behavior in application logs:

```bash
# View retry logs
gcloud logging read "resource.type=cloud_run_revision AND textPayload=~\"Retry attempt\"" \
  --project=bayit-plus \
  --limit=50 \
  --format=json
```

---

## Recommended Values by Environment

| Environment | Retry Count | Retry Delay | Timeout | Status Codes |
|-------------|-------------|-------------|---------|--------------|
| **Development** | 2 | 500ms | 10000ms | 408,429,500,502,503,504 |
| **Staging** | 3 | 1000ms | 30000ms | 408,429,500,502,503,504 |
| **Production** | 3 | 1000ms | 30000ms | 408,429,500,502,503,504 |

---

## Related Documentation

- [Secrets Management Guide](SECRETS_MANAGEMENT.md) - Complete workflow
- [API Configuration](../api/API_CONFIGURATION.md) - API client setup
- [Error Handling](../development/ERROR_HANDLING.md) - Error handling patterns

---

## Version History

- **2026-01-31**: Initial creation for API retry configuration externalization
