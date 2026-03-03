# Bayit+ Service Mesh Architecture

## Overview

Bayit+ uses a service mesh architecture where a monolithic FastAPI backend has been decomposed into 13 specialized Cloud Run services. Traffic is routed via a GCP Global Application Load Balancer with path-based URL map rules through `api.bayit.tv`.

The monolith remains the default backend and handles any path not explicitly routed to an extracted service. This provides instant rollback capability and supports local development without the LB.

## Service Inventory

### Phase 1 Services (Original Extractions)

| Service          | Directory           | Domain                            | Resources   | Min/Max |
| ---------------- | ------------------- | --------------------------------- | ----------- | ------- |
| bayit-backend    | `backend/`          | Default fallback (all unmatched)  | 4Gi / 4 CPU | 1 / 10  |
| bayit-admin      | `bayit-admin/`      | Admin panels, librarian, uploads  | 2Gi / 2 CPU | 1 / 3   |
| bayit-ai         | `bayit-ai/`         | AI/ML features (28 path prefixes) | 4Gi / 4 CPU | 1 / 10  |
| bayit-search     | `bayit-search/`     | Search (unified, scenes, LLM)     | 2Gi / 2 CPU | 2 / 20  |
| bayit-workers    | `bayit-workers/`    | Cron jobs (no path rules)         | 1Gi / 2 CPU | 1 / 1   |
| olorin-b2b-api   | `olorin-b2b-api/`   | Partner API, dubbing, webhooks    | 2Gi / 2 CPU | 1 / 5   |
| bayit-ws-gateway | `bayit-ws-gateway/` | WebSocket connections             | 1Gi / 2 CPU | 1 / 5   |

### Phase 2 Services (2026-03-02)

| Service              | Directory               | Domain                                   | Resources   | Min/Max |
| -------------------- | ----------------------- | ---------------------------------------- | ----------- | ------- |
| bayit-auth           | `bayit-auth/`           | Auth, WebAuthn, verification, MFA        | 1Gi / 1 CPU | 1 / 10  |
| bayit-content        | `bayit-content/`        | Content catalog, live TV, radio, EPG     | 1Gi / 2 CPU | 2 / 20  |
| bayit-user           | `bayit-user/`           | Profiles, subscriptions, family, devices | 1Gi / 1 CPU | 1 / 10  |
| bayit-payments       | `bayit-payments/`       | Payment processing                       | 1Gi / 1 CPU | 1 / 5   |
| bayit-social         | `bayit-social/`         | Friends, DMs, chess, party, stats        | 1Gi / 1 CPU | 1 / 8   |
| bayit-media-pipeline | `bayit-media-pipeline/` | Recordings (ffmpeg), synced streams      | 4Gi / 4 CPU | 0 / 10  |
| bayit-community      | `bayit-community/`      | Judaism, news, widgets, trivia, support  | 1Gi / 1 CPU | 0 / 5   |

## Traffic Flow

```
Client (iOS / tvOS / iPad / Android / Web)
  |
  v
api.bayit.tv  (DNS A record -> 34.49.1.183)
  |
  v
GCP Global Application Load Balancer (EXTERNAL_MANAGED)
  |
  |-- port 80  -> bayit-api-http-proxy -> 301 redirect to HTTPS
  |-- port 443 -> bayit-api-https-proxy -> bayit-api-url-map
  |
  v
URL Map (bayit-api-url-map, path matcher: bayit-services)
  |
  |-- /api/v1/admin/*               -> bayit-admin-bs
  |-- /api/v1/olorin/*              -> olorin-b2b-api-bs
  |-- /api/v1/search/*              -> bayit-search-bs
  |
  |-- /api/v1/chat/*                -> bayit-ai-bs
  |-- /api/v1/voice/*               -> bayit-ai-bs
  |-- /api/v1/dubbing/*             -> bayit-ai-bs
  |-- /api/v1/nlp/*                 -> bayit-ai-bs
  |-- /api/v1/zeh-ani/*             -> bayit-ai-bs
  |-- /api/v1/talk-back/*           -> bayit-ai-bs
  |-- /api/v1/star-story/*          -> bayit-ai-bs
  |-- /api/v1/interactive-missions/* -> bayit-ai-bs
  |-- /api/v1/phonetic-mirror/*     -> bayit-ai-bs
  |-- /api/v1/missions/*            -> bayit-ai-bs
  |-- /api/v1/beta/*                -> bayit-ai-bs
  |-- /api/v1/gamification/*        -> bayit-ai-bs
  |-- /api/v1/vod-interactions/*    -> bayit-ai-bs
  |-- /api/v1/quiz/*                -> bayit-ai-bs
  |-- /api/v1/rewards/*             -> bayit-ai-bs
  |-- /api/v1/comprehension/*       -> bayit-ai-bs
  |-- /api/v1/cultural/*            -> bayit-ai-bs
  |-- /api/v1/chameleon/*           -> bayit-ai-bs
  |-- /api/v1/grandparent-bridge/*  -> bayit-ai-bs
  |-- /api/v1/avatar/*              -> bayit-ai-bs
  |-- /api/v1/avatar-outfits/*      -> bayit-ai-bs
  |-- /api/v1/family-snaps/*        -> bayit-ai-bs
  |-- /api/v1/movie-interactions/*  -> bayit-ai-bs
  |-- /api/v1/bilingual-dubbing/*   -> bayit-ai-bs
  |-- /api/v1/live-dubbing/*        -> bayit-ai-bs
  |-- /api/v1/parties/*             -> bayit-ai-bs
  |-- /api/v1/shekels/*             -> bayit-ai-bs
  |-- /api/v1/leaderboard/*         -> bayit-ai-bs
  |-- /api/v1/zine/*                -> bayit-ai-bs
  |-- /api/v1/coupons/*             -> bayit-ai-bs
  |
  |-- /api/v1/auth/*                -> bayit-auth-bs
  |-- /api/v1/webauthn/*            -> bayit-auth-bs
  |-- /api/v1/verification/*        -> bayit-auth-bs
  |
  |-- /api/v1/content/*             -> bayit-content-bs
  |-- /api/v1/live/*                -> bayit-content-bs
  |-- /api/v1/radio/*               -> bayit-content-bs
  |-- /api/v1/podcasts/*            -> bayit-content-bs
  |-- /api/v1/audiobooks/*          -> bayit-content-bs
  |-- /api/v1/epg/*                 -> bayit-content-bs
  |-- /api/v1/chapters/*            -> bayit-content-bs
  |-- /api/v1/subtitles/*           -> bayit-content-bs
  |-- /api/v1/trending/*            -> bayit-content-bs
  |-- /api/v1/vod/*                 -> bayit-content-bs
  |-- /api/media-proxy/*            -> bayit-content-bs
  |
  |-- /api/v1/profiles/*            -> bayit-user-bs
  |-- /api/v1/subscriptions/*       -> bayit-user-bs
  |-- /api/v1/favorites/*           -> bayit-user-bs
  |-- /api/v1/downloads/*           -> bayit-user-bs
  |-- /api/v1/history/*             -> bayit-user-bs
  |-- /api/v1/user/*                -> bayit-user-bs
  |-- /api/v1/playlist/*            -> bayit-user-bs
  |-- /api/v1/watchlist/*           -> bayit-user-bs
  |-- /api/v1/children/*            -> bayit-user-bs
  |-- /api/v1/youngsters/*          -> bayit-user-bs
  |-- /api/v1/family/*              -> bayit-user-bs
  |-- /api/v1/household/*           -> bayit-user-bs
  |-- /api/v1/users/*               -> bayit-user-bs
  |-- /api/v1/devices/*             -> bayit-user-bs
  |-- /api/v1/playback/*            -> bayit-user-bs
  |-- /api/v1/notifications/*       -> bayit-user-bs
  |-- /api/v1/profile-controls/*    -> bayit-user-bs
  |-- /api/v1/profile/*             -> bayit-user-bs
  |-- /api/v1/config/*              -> bayit-user-bs
  |-- /api/v1/extension/*           -> bayit-user-bs
  |-- /api/v1/location/*            -> bayit-user-bs
  |-- /api/v1/location-consent/*    -> bayit-user-bs
  |
  |-- /api/v1/payments/*            -> bayit-payments-bs
  |
  |-- /api/v1/friends/*             -> bayit-social-bs
  |-- /api/v1/dm/*                  -> bayit-social-bs
  |-- /api/v1/party/*               -> bayit-social-bs
  |-- /api/v1/chess/*               -> bayit-social-bs
  |-- /api/v1/stats/*               -> bayit-social-bs
  |
  |-- /api/v1/recordings/*          -> bayit-media-pipeline-bs
  |
  |-- /api/v1/judaism/*             -> bayit-community-bs
  |-- /api/v1/news/*                -> bayit-community-bs
  |-- /api/v1/jerusalem/*           -> bayit-community-bs
  |-- /api/v1/tel-aviv/*            -> bayit-community-bs
  |-- /api/v1/cultures/*            -> bayit-community-bs
  |-- /api/v1/support/*             -> bayit-community-bs
  |-- /api/v1/zman/*                -> bayit-community-bs
  |-- /api/v1/widgets/*             -> bayit-community-bs
  |-- /api/v1/trivia/*              -> bayit-community-bs
  |-- /api/v1/onboarding/*          -> bayit-community-bs
  |-- /api/v1/ritual/*              -> bayit-community-bs
  |-- /api/v1/features/*            -> bayit-community-bs
  |
  |-- (everything else)             -> bayit-backend-bs (monolith)
  |
  v
Backend Service -> Serverless NEG -> Cloud Run Service
```

## Overlay Pattern

Each extracted service reuses the monolith's codebase via a Docker overlay pattern:

```dockerfile
# Layer 1: Copy the full backend app/ as the base
COPY --from=builder /app/backend/app ./app

# Layer 2: Overlay service-specific files on top
COPY service-name/app/main.py ./app/main.py
COPY service-name/app/api/router_registry.py ./app/api/router_registry.py
```

Each service has its own:

- `app/main.py` -- custom FastAPI app with service-specific startup
- `app/api/router_registry.py` -- registers only the service's route subset + `SERVICE_MODELS` list
- `Dockerfile` -- multi-stage build with overlay
- `cloudbuild-*.yaml` -- Cloud Build config with full monolith secrets

The overlay approach means services share the monolith's models, services layer, and config. Only the routing and startup differ.

## Shared Configuration

All extracted services use the monolith's Pydantic `Settings` class, which validates ALL fields on import (even unused ones). This means every service's Cloud Build config must include the full set of environment variables and secrets from the monolith.

The `connect_to_mongo_subset()` function in `backend/app/core/database.py` allows services to initialize Beanie with only their required document models (instead of all 120+).

## Infrastructure Components

### GCP Resources

| Resource             | Name                           | Purpose                                |
| -------------------- | ------------------------------ | -------------------------------------- |
| Static IP            | `bayit-api-ip`                 | `34.49.1.183`                          |
| SSL Certificate      | `bayit-api-ssl-cert-v2`        | Google-managed cert for `api.bayit.tv` |
| HTTPS Proxy          | `bayit-api-https-proxy`        | Routes HTTPS to URL map                |
| HTTP Proxy           | `bayit-api-http-proxy`         | 301 redirect to HTTPS                  |
| URL Map              | `bayit-api-url-map`            | Path-based routing (~80 path rules)    |
| Forwarding Rule      | `bayit-api-forwarding-rule`    | Port 443 -> HTTPS proxy                |
| Forwarding Rule      | `bayit-api-http-redirect-rule` | Port 80 -> HTTP proxy                  |
| 13x Serverless NEGs  | `*-neg`                        | Cloud Run service endpoints            |
| 13x Backend Services | `*-bs`                         | LB backends (protocol=HTTP)            |

### DNS

- Domain: `api.bayit.tv`
- Record: A -> `34.49.1.183`
- Registrar: GoDaddy (`ns25.domaincontrol.com`)

### Cron Jobs (Cloud Scheduler)

| Job                     | Schedule         | Target                                 |
| ----------------------- | ---------------- | -------------------------------------- |
| `bayit-epg-sync`        | Every 6 hours    | `POST /api/v1/workers/epg-sync`        |
| `bayit-cleanup-uploads` | Daily 3am Israel | `POST /api/v1/workers/cleanup-uploads` |
| `bayit-cost-rollup`     | Daily 4am Israel | `POST /api/v1/workers/cost-rollup`     |
| `bayit-cleanup-failed`  | Daily 5am Israel | `POST /api/v1/workers/cleanup-failed`  |

## Service Details

### bayit-auth

- Auth, OAuth, WebAuthn, device pairing, verification, MFA, account linking, security settings
- SecurityHeaders middleware for auth-specific hardening
- 10 Beanie document models (User, Profile, Subscription, VerificationToken, PasskeyCredential, etc.)

### bayit-content

- Content catalog, live TV, radio, podcasts, audiobooks, EPG, chapters, subtitles, trending, media proxy, channel chat
- Read-heavy, latency-sensitive -- 4 uvicorn workers
- 31 Beanie document models

### bayit-user

- Profiles, subscriptions, favorites, downloads, history, playlist, family controls, household, devices, playback, notifications, location
- `profiles_me` router registered BEFORE `profiles` router (path variable capture order)
- 25 Beanie document models

### bayit-payments

- Payment processing, subscription billing
- SecurityHeaders middleware for PCI compliance
- 10 Beanie document models

### bayit-social

- Friends, DMs, watch party, chess (game, invites, chat), player stats
- Does NOT use pub/sub (channel_chat moved to bayit-content)
- 16 Beanie document models

### bayit-media-pipeline

- Recording sessions, schedules, series rules, synced streams
- ffmpeg installed in Dockerfile for media processing
- 3600s timeout for long-running operations
- minInstances=0 (cold start ~1-2 min)

### bayit-community

- Judaism, news, Jerusalem, Tel Aviv, cultures, support, zman, ritual, onboarding, widgets, trivia, feature validation
- `widget_toggle` router registered BEFORE `widgets` router (routing conflict avoidance)
- minInstances=0 (cold start ~1-2 min)

## Deployment

### Per-service deploy scripts

```bash
# Phase 1 services
./scripts/deployment/deploy_admin.sh
./scripts/deployment/deploy_ai.sh
./scripts/deployment/deploy_b2b_api.sh
./scripts/deployment/deploy_search.sh
./scripts/deployment/deploy_workers.sh
./scripts/deployment/deploy_ws_gateway.sh
./scripts/deployment/deploy_server.sh         # monolith

# Phase 2 services
./scripts/deployment/deploy_auth.sh
./scripts/deployment/deploy_content.sh
./scripts/deployment/deploy_user.sh
./scripts/deployment/deploy_payments.sh
./scripts/deployment/deploy_social.sh
./scripts/deployment/deploy_media.sh
./scripts/deployment/deploy_community.sh

# All platforms at once
./scripts/deployment/deploy-all-platforms.sh
```

### Infrastructure scripts

```bash
# LB setup (requires bash 4+)
/opt/homebrew/bin/bash infrastructure/deploy-lb.sh bayit-plus

# Cron job setup
/opt/homebrew/bin/bash infrastructure/setup-cron-jobs.sh bayit-plus

# Export current URL map
gcloud compute url-maps export bayit-api-url-map --destination=/tmp/bayit-url-map.yaml
```

### Adding a new service

1. Copy `service-template/` to a new directory
2. Customize `app/main.py` with service name and description
3. Customize `app/api/router_registry.py` with the routes to extract
4. Create a `cloudbuild-*.yaml` (copy from existing service, adjust resources)
5. Create a deploy script in `scripts/deployment/`
6. Add service directory to `.gcloudignore` include list (`!service-dir/` + `!service-dir/**`)
7. Add NEG + backend service + path rules via deploy-lb.sh or manually
8. Update URL map with new path rules

### Key deployment constraints

- All services need the FULL monolith secrets set (Pydantic Settings validates all fields)
- Minimum 1Gi memory per service (overlay loads full monolith codebase ~500MB+)
- Serverless NEGs require `--protocol=HTTP` (not HTTPS)
- `.gcloudignore` starts with `*` (exclude all) -- new service dirs must be explicitly included
- macOS ships bash 3.x -- deploy-lb.sh needs bash 4+ (`/opt/homebrew/bin/bash`)

## Local Development

Local development is unchanged. The monolith retains all routes and serves everything on port 8000. The LB path-based routing only applies in production via `api.bayit.tv`. No client changes needed.

## Rollback

Each LB path rule can be removed independently:

```bash
gcloud compute url-maps export bayit-api-url-map --destination=/tmp/bayit-url-map.yaml
# Edit YAML to remove the path rule entry
gcloud compute url-maps import bayit-api-url-map --source=/tmp/bayit-url-map.yaml
```

Traffic falls back to the monolith default backend instantly. No code changes or redeployments needed.

## Client Configuration

All client platforms connect to `api.bayit.tv`. No client changes were needed for the decomposition.

| Platform          | Config File                              | URL                           |
| ----------------- | ---------------------------------------- | ----------------------------- |
| iOS / tvOS / iPad | `ios-app/Configuration/Release.xcconfig` | `https://api.bayit.tv/api/v1` |
| Android           | `android-app/gradle.properties`          | `https://api.bayit.tv/`       |
| Web               | `web/src/services/api.js`                | Relative `/api/v1`            |
