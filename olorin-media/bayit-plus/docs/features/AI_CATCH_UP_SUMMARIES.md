# AI-Powered "Catch Up" Summaries

**Date**: 2026-01-30
**Status**: Implemented (Beta 500)
**Component**: Live Channel Catch-Up System
**Platform**: Web (with mobile/tvOS planned)

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Beta 500 Integration](#beta-500-integration)
4. [Backend Components](#backend-components)
5. [Frontend Components](#frontend-components)
6. [Summary Generation Pipeline](#summary-generation-pipeline)
7. [Caching Strategy](#caching-strategy)
8. [Configuration](#configuration)
9. [Testing](#testing)
10. [Related Documents](#related-documents)

---

## Overview

AI-powered "Catch Up" feature that generates real-time summaries of live channel content. When a user joins a live channel that has been broadcasting for 5 or more minutes, they are automatically prompted with a summary of what they missed. Summaries are enriched with EPG (Electronic Program Guide) data for context.

### Key Capabilities

- Automatic prompt when joining a live channel that has been live 5+ minutes
- EPG-enriched summaries via RecapAgentService + EPGService
- Credit-gated: 5 credits per summary (Beta 500 only)
- Configurable time windows (default: 15 minutes)
- Multi-language summary generation (target language selectable)
- Background transcript feeding from live audio streams
- Summary caching with 3-minute TTL, quantized to 1-minute intervals
- Manual re-trigger via dedicated button

---

## Architecture

```
                     Frontend                              Backend
              +------------------+                 +------------------+
              | CatchUpOverlay   |                 | REST Endpoint    |
              | (auto-prompt)    |----GET--------->| /api/v1/live/    |
              |                  |<---JSON---------|  {channel_id}/   |
              | CatchUpButton    |                 |  catchup         |
              | (manual trigger) |                 +--------+---------+
              |                  |                          |
              | CatchUpSummary   |                 +--------+---------+
              | Card             |                 | CatchUpIntegration|
              +--------+---------+                 | (credit wrapper) |
                       |                           +--------+---------+
              +--------+---------+                          |
              | useCatchUp       |                 +--------+---------+
              | (hook)           |                 | CatchUpSession   |
              +--------+---------+                 | Manager          |
                       |                           | (cache + summary)|
              +--------+---------+                 +--------+---------+
              | catchUpConfig.ts |                          |
              | (env-driven)     |                 +--------+---------+
              +------------------+                 | ChannelTranscript|
                                                   | Service          |
                                                   +--------+---------+
                                                            |
                                                   +--------+---------+
                                                   | TranscriptFeeder |
                                                   | (background STT) |
                                                   +------------------+
                                                            |
                                                   +--------+---------+
                                                   | RecapAgentService|
                                                   | + EPGService     |
                                                   +------------------+
```

### 3-Class Decomposition

The backend is structured into three focused classes:

1. **CatchUpIntegration** (`integration.py`) - Credit validation wrapper; checks Beta 500 status and deducts 5 credits before generating a summary
2. **CatchUpSessionManager** (`session_manager.py`) - Session management, cache lookups, summary generation orchestration, and TTL enforcement
3. **ChannelTranscriptService** (`transcript_service.py`) - Shared per-channel transcript buffer management; provides transcript windows to the session manager

---

## Beta 500 Integration

### Credit Cost

| Action | Credits | Description |
|--------|---------|-------------|
| Generate catch-up summary | 5 | Per summary request |
| Cached summary (within TTL) | 0 | Served from cache, no credit deduction |

### Access Control

- **Beta 500 users**: Full access to catch-up summaries (credit-gated)
- **Standard users**: Feature not available (endpoint returns 403)
- **Unauthenticated users**: Endpoint returns 401

### Credit Flow

```
1. User requests catch-up summary
   |
2. CatchUpIntegration checks Beta 500 status
   |-- Not Beta 500 -> Return 403
   |
3. Check cache for existing summary
   |-- Cache hit -> Return cached (0 credits)
   |
4. Verify user has >= 5 credits
   |-- Insufficient -> Return 402
   |
5. Generate summary via RecapAgentService + EPG
   |
6. Deduct 5 credits atomically
   |
7. Cache result (3-min TTL)
   |
8. Return summary to user
```

---

## Backend Components

### Service Files

| File | Class | Description |
|------|-------|-------------|
| `backend/app/services/catchup/integration.py` | `CatchUpIntegration` | Credit validation and deduction wrapper |
| `backend/app/services/catchup/session_manager.py` | `CatchUpSessionManager` | Session tracking, cache management, summary orchestration |
| `backend/app/services/catchup/transcript_service.py` | `ChannelTranscriptService` | Per-channel transcript buffer management |
| `backend/app/services/catchup/transcript_feeder.py` | `TranscriptFeeder` | Background STT worker populating transcript buffers |

### REST Endpoint

Located in `backend/app/api/routes/` (registered via router registry):

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/live/{channel_id}/catchup` | Generate or retrieve a catch-up summary |

**Query Parameters**:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `window_minutes` | integer | 15 | How many minutes of content to summarize |
| `target_language` | string | `en` | Target language for the summary |

### Dependencies

- **RecapAgentService**: AI-powered summarization using LLM
- **EPGService**: Electronic Program Guide data for context enrichment
- **CreditService**: Beta 500 credit balance checking and atomic deduction

---

## Frontend Components

### UI Components

| Component | File | Description |
|-----------|------|-------------|
| `CatchUpOverlay` | `web/src/components/player/catchup/CatchUpOverlay.tsx` | Auto-prompt overlay shown when joining a live channel (22-second auto-dismiss) |
| `CatchUpButton` | `web/src/components/player/catchup/CatchUpButton.tsx` | Floating action button for manual catch-up trigger |
| `CatchUpSummaryCard` | `web/src/components/player/catchup/CatchUpSummaryCard.tsx` | Summary display card with program info and key points |
| `VideoPlayerCatchUp` | `web/src/components/player/VideoPlayerCatchUp.tsx` | Wrapper integrating catch-up into the video player |

### Hooks and Configuration

| File | Description |
|------|-------------|
| `web/src/components/player/hooks/useCatchUp.ts` | Feature hook managing state, API calls, auto-trigger logic |
| `web/src/config/catchUpConfig.ts` | Environment-driven configuration (enable/disable, credit cost, dismiss timer) |

### Auto-Prompt Behavior

1. User joins a live channel
2. Hook checks if channel has been live for 5+ minutes (configurable via `VITE_CATCHUP_AUTO_TRIGGER_MINUTES`)
3. If threshold met, `CatchUpOverlay` appears with prompt
4. Overlay auto-dismisses after 22 seconds (configurable via `VITE_CATCHUP_AUTO_DISMISS_SECONDS`)
5. User can accept (triggers summary generation) or dismiss
6. After dismissal, `CatchUpButton` remains available for manual trigger

---

## Summary Generation Pipeline

```
1. TranscriptFeeder (background)
   - Continuously feeds live audio through STT
   - Populates per-channel transcript buffers
   |
2. ChannelTranscriptService
   - Maintains rolling transcript windows
   - Provides windowed transcript to session manager
   |
3. CatchUpSessionManager
   - Receives transcript for requested window
   - Queries EPGService for current program metadata
   - Passes transcript + EPG context to RecapAgentService
   |
4. RecapAgentService (LLM)
   - Generates structured summary with key points
   - Localizes to target language
   |
5. Cache + Return
   - Summary cached with 3-min TTL
   - Quantized to 1-minute intervals for cache efficiency
   - Returned to client
```

### Cache Quantization

To maximize cache hit rates, time windows are quantized to 1-minute intervals:

- Request at 12:03:27 for 15 minutes -> cached as 11:48:00-12:03:00
- Request at 12:03:45 for 15 minutes -> same cache key (11:48:00-12:03:00)
- Cache TTL: 3 minutes (configurable via `CATCHUP_CACHE_TTL_SECONDS`)

---

## Caching Strategy

| Parameter | Value | Description |
|-----------|-------|-------------|
| Cache TTL | 3 minutes | How long a cached summary remains valid |
| Time quantization | 1 minute | Time window rounding interval |
| Cache key | `{channel_id}:{window_start}:{window_end}:{language}` | Composite cache key |
| Credit on cache hit | 0 | No credits deducted for cached responses |

---

## Configuration

All configuration is managed via Google Cloud Secret Manager. See [GCLOUD_SECRETS_CATCH_UP.md](../deployment/GCLOUD_SECRETS_CATCH_UP.md) for the complete list of secrets.

### Backend Configuration

| Parameter | Description |
|-----------|-------------|
| `CATCHUP_ENABLED` | Feature toggle (true/false) |
| `CATCHUP_AUTO_TRIGGER_MINUTES` | Minutes live before auto-prompt triggers |
| `CATCHUP_DEFAULT_WINDOW_MINUTES` | Default summary window |
| `CATCHUP_CACHE_TTL_SECONDS` | Summary cache TTL |

### Frontend Configuration

| Parameter | Description |
|-----------|-------------|
| `VITE_CATCHUP_ENABLED` | Feature toggle for web UI |
| `VITE_CATCHUP_CREDIT_COST` | Credit cost display value |
| `VITE_CATCHUP_AUTO_DISMISS_SECONDS` | Auto-dismiss timer for overlay |

---

## Testing

### Backend Tests (37 tests)

| Test File | Tests | Lines | Coverage |
|-----------|-------|-------|----------|
| `test_catchup_integration.py` | 11 | 153 | Credit gating and integration logic |
| `test_catchup_session_manager.py` | 11 | 176 | Session management and caching |
| `test_catchup_route.py` | 15 | 169 | REST endpoint behavior |

### Frontend Tests (15 tests)

| Test File | Tests | Lines | Coverage |
|-----------|-------|-------|----------|
| `CatchUpOverlay.test.tsx` | 15 | 187 | Overlay rendering, auto-dismiss, user interactions |

---

## Related Documents

- [Catch-Up API Reference](../api/CATCH_UP_API.md) - Complete API documentation
- [Google Cloud Secrets: Catch-Up](../deployment/GCLOUD_SECRETS_CATCH_UP.md) - Secrets management
- [Channel Live Chat](./CHANNEL_LIVE_CHAT.md) - Companion Beta 500 live feature
- [Beta 500 Implementation Plan](../implementation/BETA_500_REVISED_PLAN.md) - Overall beta program
- [Beta 500 User Manual](../guides/BETA_500_USER_MANUAL.md) - User-facing documentation
