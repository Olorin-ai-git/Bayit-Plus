# Google Cloud Secrets: Dubbing Pipeline Improvements

**Created:** 2026-01-29
**Status:** New Secrets Required
**Related:** Olorin Dubbing Service, P0-P3 Improvements
**Config File:** `backend/app/core/olorin_config.py` (`DubbingConfig` class)

## Overview

This document describes all new configuration values required for the dubbing pipeline
improvements (P0 through P3). These configuration values are exposed via environment
variables with the `DUBBING_` prefix and managed through the `DubbingConfig` Pydantic
model.

## CRITICAL WORKFLOW

**NEVER edit `.env` or `.env.example` files directly.**

### Required Steps:
```bash
# 1. Add secrets to Google Cloud Secret Manager (commands below)
# 2. Regenerate .env files from GCloud
./scripts/sync-gcloud-secrets.sh backend
# 3. Restart backend
cd backend && poetry run python -m app.local_server
```

---

## P0 - Security Configuration

| Secret Name | Type | Default | Description |
|------------|------|---------|-------------|
| `DUBBING_MAX_AUDIO_CHUNK_BYTES` | integer | `65536` | Maximum audio chunk size in bytes (64KB). Range: 1024-1048576 |
| `DUBBING_WS_AUTH_TIMEOUT_SECONDS` | float | `10.0` | Timeout for WebSocket authentication message. Range: 1.0-60.0 |
| `DUBBING_OUTPUT_QUEUE_MAXSIZE` | integer | `50` | Maximum queued output messages before backpressure. Range: 5-500 |
| `DUBBING_MAX_CONCURRENT_PIPELINE_TASKS` | integer | `5` | Maximum concurrent translation+TTS pipeline tasks. Range: 1-50 |
| `DUBBING_SESSION_IDLE_TIMEOUT_SECONDS` | integer | `7200` | Auto-stop session after this many seconds idle (2h). Range: 60-86400 |
| `DUBBING_IDLE_CHECK_INTERVAL_SECONDS` | integer | `60` | How often to check for idle sessions. Range: 10-600 |
| `DUBBING_MAX_ACTIVE_SESSIONS` | integer | `500` | Maximum concurrent B2B dubbing sessions per instance. Range: 1-10000 |

### GCloud Commands - P0

```bash
# P0-1: WebSocket message size limit
gcloud secrets create DUBBING_MAX_AUDIO_CHUNK_BYTES --data-file=- <<< "65536"

# P0-2: WebSocket auth timeout
gcloud secrets create DUBBING_WS_AUTH_TIMEOUT_SECONDS --data-file=- <<< "10.0"

# P0-3: Bounded output queue
gcloud secrets create DUBBING_OUTPUT_QUEUE_MAXSIZE --data-file=- <<< "50"

# P0-4: Concurrency semaphore
gcloud secrets create DUBBING_MAX_CONCURRENT_PIPELINE_TASKS --data-file=- <<< "5"

# P0-5: Session idle timeout
gcloud secrets create DUBBING_SESSION_IDLE_TIMEOUT_SECONDS --data-file=- <<< "7200"
gcloud secrets create DUBBING_IDLE_CHECK_INTERVAL_SECONDS --data-file=- <<< "60"
gcloud secrets create DUBBING_MAX_ACTIVE_SESSIONS --data-file=- <<< "500"
```

---

## P1 - Scalability Configuration

| Secret Name | Type | Default | Description |
|------------|------|---------|-------------|
| `DUBBING_TTS_CONNECTION_POOL_SIZE` | integer | `10` | TTS WebSocket connection pool size. Range: 1-100 |
| `DUBBING_TRANSLATION_THREAD_POOL_SIZE` | integer | `50` | Dedicated translation thread pool workers. Range: 1-200 |
| `DUBBING_PII_DETECTION_ENABLED` | boolean | `true` | Enable PII detection and masking before storage |
| `DUBBING_SESSION_RETENTION_DAYS` | integer | `7` | Session data retention period in days. Range: 1-365 |

### GCloud Commands - P1

```bash
# P1-1: TTS connection pool
gcloud secrets create DUBBING_TTS_CONNECTION_POOL_SIZE --data-file=- <<< "10"

# P1-4: Translation thread pool
gcloud secrets create DUBBING_TRANSLATION_THREAD_POOL_SIZE --data-file=- <<< "50"

# P1-5: PII detection
gcloud secrets create DUBBING_PII_DETECTION_ENABLED --data-file=- <<< "true"

# P1-6: Session retention
gcloud secrets create DUBBING_SESSION_RETENTION_DAYS --data-file=- <<< "7"
```

---

## P2 - Performance Configuration

| Secret Name | Type | Default | Description |
|------------|------|---------|-------------|
| `DUBBING_MAX_PARALLEL_TRANSLATION_CHUNKS` | integer | `10` | Maximum parallel translation chunk requests. Range: 1-50 |
| `DUBBING_TRANSCRIPT_COMPRESSION_ENABLED` | boolean | `true` | Enable filler word removal from transcripts |
| `DUBBING_TRANSLATION_CACHE_ENABLED` | boolean | `true` | Enable two-tier translation caching (LRU + MongoDB) |
| `DUBBING_AUDIO_QUALITY_CHECK_ENABLED` | boolean | `true` | Enable audio quality verification on incoming chunks |
| `DUBBING_AUDIO_CLIPPING_THRESHOLD` | float | `0.01` | Fraction of samples at max amplitude before clipping warning. Range: 0.0-1.0 |
| `DUBBING_AUDIO_SILENCE_THRESHOLD` | float | `0.8` | Fraction of silent samples before silence warning. Range: 0.0-1.0 |
| `DUBBING_PROMETHEUS_METRICS_ENABLED` | boolean | `true` | Enable Prometheus metrics export for dubbing |

### GCloud Commands - P2

```bash
# P2-1: Parallel translation
gcloud secrets create DUBBING_MAX_PARALLEL_TRANSLATION_CHUNKS --data-file=- <<< "10"

# P2-5: Transcript compression
gcloud secrets create DUBBING_TRANSCRIPT_COMPRESSION_ENABLED --data-file=- <<< "true"

# P2-4: Translation cache
gcloud secrets create DUBBING_TRANSLATION_CACHE_ENABLED --data-file=- <<< "true"

# P2-6: Audio quality
gcloud secrets create DUBBING_AUDIO_QUALITY_CHECK_ENABLED --data-file=- <<< "true"
gcloud secrets create DUBBING_AUDIO_CLIPPING_THRESHOLD --data-file=- <<< "0.01"
gcloud secrets create DUBBING_AUDIO_SILENCE_THRESHOLD --data-file=- <<< "0.8"

# P2-3: Prometheus metrics
gcloud secrets create DUBBING_PROMETHEUS_METRICS_ENABLED --data-file=- <<< "true"
```

---

## Pre-existing Dubbing Configuration (already in GCloud)

These settings were already part of `DubbingConfig` before the improvements. Listed here
for completeness:

| Secret Name | Type | Default | Description |
|------------|------|---------|-------------|
| `DUBBING_MAX_CONCURRENT_SESSIONS` | integer | `100` | Maximum concurrent sessions per instance |
| `DUBBING_SESSION_TIMEOUT_MINUTES` | integer | `120` | Session timeout (minutes) |
| `DUBBING_TARGET_LATENCY_MS` | integer | `2000` | Target end-to-end latency |
| `DUBBING_STT_PROVIDER` | string | `elevenlabs` | STT provider |
| `DUBBING_REDIS_URL` | string | `redis://localhost:6379/0` | Redis connection URL |
| `DUBBING_REDIS_SESSION_TTL_SECONDS` | integer | `7200` | Session state TTL in Redis |
| `DUBBING_REDIS_MAX_CONNECTIONS` | integer | `50` | Redis connection pool size |

---

## Service Account Access

Grant the backend Cloud Run service account access to these secrets:

```bash
# Get the service account email
SA_EMAIL=$(gcloud run services describe bayit-plus-backend \
  --region=us-central1 \
  --format='value(spec.template.spec.serviceAccountName)')

# Grant access to all new dubbing secrets
for SECRET in \
  DUBBING_MAX_AUDIO_CHUNK_BYTES \
  DUBBING_WS_AUTH_TIMEOUT_SECONDS \
  DUBBING_OUTPUT_QUEUE_MAXSIZE \
  DUBBING_MAX_CONCURRENT_PIPELINE_TASKS \
  DUBBING_SESSION_IDLE_TIMEOUT_SECONDS \
  DUBBING_IDLE_CHECK_INTERVAL_SECONDS \
  DUBBING_MAX_ACTIVE_SESSIONS \
  DUBBING_TTS_CONNECTION_POOL_SIZE \
  DUBBING_TRANSLATION_THREAD_POOL_SIZE \
  DUBBING_PII_DETECTION_ENABLED \
  DUBBING_SESSION_RETENTION_DAYS \
  DUBBING_MAX_PARALLEL_TRANSLATION_CHUNKS \
  DUBBING_TRANSCRIPT_COMPRESSION_ENABLED \
  DUBBING_TRANSLATION_CACHE_ENABLED \
  DUBBING_AUDIO_QUALITY_CHECK_ENABLED \
  DUBBING_AUDIO_CLIPPING_THRESHOLD \
  DUBBING_AUDIO_SILENCE_THRESHOLD \
  DUBBING_PROMETHEUS_METRICS_ENABLED; do

  gcloud secrets add-iam-policy-binding "$SECRET" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/secretmanager.secretAccessor"
done
```

---

## Deployment Checklist

After adding secrets to GCloud:

1. [ ] All secrets created via `gcloud secrets create` commands above
2. [ ] Service account granted `secretAccessor` role for all new secrets
3. [ ] Sync script updated: `./scripts/sync-gcloud-secrets.sh backend`
4. [ ] `.env` regenerated from GCloud secrets
5. [ ] Backend restarted and confirmed healthy
6. [ ] MongoDB TTL index updated (P1-6: 30 days -> 7 days)
7. [ ] Prometheus `/metrics` endpoint verified (if P2-3 enabled)
8. [ ] Redis connectivity verified (P1-2 session registry)

---

## Tuning Guide

### Production Recommendations

| Parameter | Development | Staging | Production |
|-----------|------------|---------|------------|
| `MAX_AUDIO_CHUNK_BYTES` | 65536 | 65536 | 65536 |
| `WS_AUTH_TIMEOUT_SECONDS` | 30.0 | 10.0 | 10.0 |
| `OUTPUT_QUEUE_MAXSIZE` | 50 | 50 | 100 |
| `MAX_CONCURRENT_PIPELINE_TASKS` | 3 | 5 | 10 |
| `SESSION_IDLE_TIMEOUT_SECONDS` | 300 | 7200 | 7200 |
| `MAX_ACTIVE_SESSIONS` | 10 | 100 | 500 |
| `TTS_CONNECTION_POOL_SIZE` | 3 | 10 | 20 |
| `TRANSLATION_THREAD_POOL_SIZE` | 10 | 50 | 100 |
| `MAX_PARALLEL_TRANSLATION_CHUNKS` | 5 | 10 | 20 |

### Feature Flags

To disable any improvement without code changes:

```bash
# Disable PII detection
gcloud secrets versions add DUBBING_PII_DETECTION_ENABLED --data-file=- <<< "false"

# Disable transcript compression
gcloud secrets versions add DUBBING_TRANSCRIPT_COMPRESSION_ENABLED --data-file=- <<< "false"

# Disable translation caching
gcloud secrets versions add DUBBING_TRANSLATION_CACHE_ENABLED --data-file=- <<< "false"

# Disable audio quality checks
gcloud secrets versions add DUBBING_AUDIO_QUALITY_CHECK_ENABLED --data-file=- <<< "false"

# Disable Prometheus metrics
gcloud secrets versions add DUBBING_PROMETHEUS_METRICS_ENABLED --data-file=- <<< "false"
```

Then regenerate and restart:
```bash
./scripts/sync-gcloud-secrets.sh backend
cd backend && poetry run python -m app.local_server
```

---

## Related Documents

- [Secrets Management Guide](SECRETS_MANAGEMENT.md)
- [Payment Flow Secrets](GCLOUD_SECRETS_PAYMENT_FLOW.md)
- [Librarian & WebAuthn Secrets](GCLOUD_SECRETS_LIBRARIAN_WEBAUTHN.md)
- [Unified Voice Architecture](../architecture/UNIFIED_VOICE_ARCHITECTURE.md)
