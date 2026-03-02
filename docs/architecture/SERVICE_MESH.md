# Bayit+ Service Mesh Architecture

## Overview

Bayit+ uses a service mesh architecture where a monolithic FastAPI backend is progressively decomposed into specialized Cloud Run services. Traffic is routed via a GCP Global Application Load Balancer with path-based URL map rules.

The monolith remains the default backend and handles any path not explicitly routed to an extracted service. This allows gradual, zero-downtime migration.

## Service Inventory

| Service                  | Directory           | Endpoints | Resources   | Min/Max Instances |
| ------------------------ | ------------------- | --------- | ----------- | ----------------- |
| bayit-backend (monolith) | `backend/`          | 400+      | 4Gi / 4 CPU | 1 / 10            |
| bayit-admin              | `bayit-admin/`      | ~170      | 2Gi / 2 CPU | 1 / 3             |
| bayit-ai                 | `bayit-ai/`         | ~200      | 4Gi / 4 CPU | 1 / 10            |
| bayit-search             | `bayit-search/`     | ~30       | 2Gi / 2 CPU | 2 / 20            |
| bayit-workers            | `bayit-workers/`    | ~50       | 1Gi / 2 CPU | 1 / 1             |
| olorin-b2b-api           | `olorin-b2b-api/`   | ~40       | 2Gi / 2 CPU | 1 / 5             |
| bayit-ws-gateway         | `bayit-ws-gateway/` | WebSocket | 1Gi / 2 CPU | 1 / 5             |

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

- `app/main.py` — custom FastAPI app with service-specific startup
- `app/api/router_registry.py` — registers only the service's route subset
- `Dockerfile` — multi-stage build with overlay
- `cloudbuild-*.yaml` — Cloud Build config with full monolith secrets

The overlay approach means services share the monolith's models, services layer, and config. Only the routing and startup differ.

## Shared Configuration

All extracted services use the monolith's Pydantic `Settings` class, which validates ALL fields on import (even unused ones). This means every service's Cloud Build config must include the full set of environment variables and secrets from the monolith.

The `connect_to_mongo_subset()` function in `backend/app/core/database.py` allows services to initialize Beanie with only their required document models (instead of all 120+).

## Infrastructure Components

### GCP Resources

| Resource            | Name                           | Purpose                                |
| ------------------- | ------------------------------ | -------------------------------------- |
| Static IP           | `bayit-api-ip`                 | `34.49.1.183`                          |
| SSL Certificate     | `bayit-api-ssl-cert-v2`        | Google-managed cert for `api.bayit.tv` |
| HTTPS Proxy         | `bayit-api-https-proxy`        | Routes HTTPS to URL map                |
| HTTP Proxy          | `bayit-api-http-proxy`         | 301 redirect to HTTPS                  |
| URL Map             | `bayit-api-url-map`            | Path-based routing                     |
| Forwarding Rule     | `bayit-api-forwarding-rule`    | Port 443 -> HTTPS proxy                |
| Forwarding Rule     | `bayit-api-http-redirect-rule` | Port 80 -> HTTP proxy                  |
| 7x Serverless NEGs  | `*-neg`                        | Cloud Run service endpoints            |
| 7x Backend Services | `*-bs`                         | LB backends                            |

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

## Deployment

### Per-service deploy scripts

```bash
# Individual services
./scripts/deployment/deploy_admin.sh
./scripts/deployment/deploy_ai.sh
./scripts/deployment/deploy_b2b_api.sh
./scripts/deployment/deploy_search.sh
./scripts/deployment/deploy_workers.sh

# All platforms at once
./scripts/deployment/deploy-all-platforms.sh
```

### Infrastructure scripts

```bash
# LB setup (requires bash 4+)
/opt/homebrew/bin/bash infrastructure/deploy-lb.sh bayit-plus

# Cron job setup
/opt/homebrew/bin/bash infrastructure/setup-cron-jobs.sh bayit-plus
```

### Adding a new service

1. Copy `service-template/` to a new directory
2. Customize `app/main.py` with service name and description
3. Customize `app/api/router_registry.py` with the routes to extract
4. Create a `cloudbuild-*.yaml` (copy from existing service, adjust resources)
5. Create a deploy script in `scripts/deployment/`
6. Add NEG + backend service + path rules via deploy-lb.sh or manually
7. Update `infrastructure/url-map.yaml` with new path rules

## Client Configuration

All client platforms connect to `api.bayit.tv`. No client changes were needed for the decomposition.

| Platform          | Config File                              | URL                           |
| ----------------- | ---------------------------------------- | ----------------------------- |
| iOS / tvOS / iPad | `ios-app/Configuration/Release.xcconfig` | `https://api.bayit.tv/api/v1` |
| Android           | `android-app/gradle.properties`          | `https://api.bayit.tv/`       |
| Web               | `web/src/services/api.js`                | Relative `/api/v1`            |
