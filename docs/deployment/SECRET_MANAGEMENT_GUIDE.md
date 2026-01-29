# Secret Management Guide

## Overview

Bayit+ uses **Google Cloud Secret Manager** as the single source of truth for all production secrets. This ensures secure, centralized, and consistent secret management across all deployment methods.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│          GOOGLE CLOUD SECRET MANAGER                                        │
│          (Single Source of Truth)                                           │
│                                                                              │
│  Naming Convention:                                                          │
│  - Secret Name: bayit-{feature}-{component}                                 │
│  - Example: bayit-stripe-secret-key                                         │
│  - Environment Variable: SCREAMING_SNAKE_CASE                               │
│    Example: STRIPE_SECRET_KEY                                               │
└─────────────────────────────────────────────────────────────────────────────┘
                           ▲
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          │                │                │
┌─────────▼─────┐  ┌───────▼──────┐  ┌─────▼────────┐
│ Root          │  │ Backend      │  │ deploy_      │
│ cloudbuild.   │  │ cloudbuild.  │  │ server.sh    │
│ yaml          │  │ yaml         │  │              │
│               │  │              │  │              │
│ References    │  │ References   │  │ Creates/     │
│ ALL secrets   │  │ ALL secrets  │  │ Updates      │
│               │  │              │  │ secrets      │
└───────────────┘  └──────────────┘  └──────────────┘
                           │
                           ▼
          ┌────────────────────────────────┐
          │   Cloud Run Service            │
          │   bayit-plus-backend           │
          │                                │
          │   Receives ALL secrets as      │
          │   environment variables        │
          └────────────────────────────────┘
                           │
                           ▼
          ┌────────────────────────────────┐
          │   Backend Application          │
          │   app/core/config.py           │
          │                                │
          │   Reads SCREAMING_SNAKE_CASE   │
          │   environment variables        │
          └────────────────────────────────┘
```

## Naming Convention

### Secret Manager Secret Names
**Format**: `bayit-{category}-{name}` (lowercase, hyphenated)

**Examples**:
- `bayit-stripe-secret-key`
- `bayit-mongodb-uri`
- `bayit-openai-api-key`
- `bayit-twilio-account-sid`

**Special cases** (platform-level, no bayit prefix):
- `csrf-enabled`
- `podcast-translation-enabled`
- `podcast-translation-auto-start`
- `turbo-token`
- `turbo-team`

**Cross-platform secrets** (no bayit prefix):
- `olorin-fraud-mongodb-uri` (Olorin Fraud Detection)
- `cvplus-mongodb-uri` (CVPlus)
- `station-ai-mongodb-uri` (Station AI / Israeli Radio Manager)

### Environment Variable Names
**Format**: `{CATEGORY}_{NAME}` (SCREAMING_SNAKE_CASE)

**Examples**:
- `STRIPE_SECRET_KEY`
- `MONGODB_URI`
- `OPENAI_API_KEY`
- `TWILIO_ACCOUNT_SID`

### Mapping Pattern
```yaml
--update-secrets=STRIPE_SECRET_KEY=bayit-stripe-secret-key:latest
                 ▲                  ▲
                 │                  └─ Secret Manager name (hyphenated)
                 └─ Environment variable (SNAKE_CASE)
```

## Secret Categories

### Core Authentication & Security (5 secrets)
- `bayit-backend-secret-key` → `SECRET_KEY`
- `csrf-enabled` → `CSRF_ENABLED`
- `bayit-admin-password` → `ADMIN_PASSWORD`
- `bayit-admin-email` → `ADMIN_EMAIL`
- `bayit-webauthn-origin` → `WEBAUTHN_ORIGIN`

### Database (4 secrets)
- `bayit-mongodb-uri` → `MONGODB_URI`
- `olorin-fraud-mongodb-uri` → `OLORIN_MONGODB_URI`
- `cvplus-mongodb-uri` → `CVPLUS_MONGODB_URI`
- `station-ai-mongodb-uri` → `STATION_AI_MONGODB_URI`

### Payment Processing - Stripe (6 secrets)
- `bayit-stripe-api-key` → `STRIPE_API_KEY`
- `bayit-stripe-secret-key` → `STRIPE_SECRET_KEY`
- `bayit-stripe-webhook-secret` → `STRIPE_WEBHOOK_SECRET`
- `bayit-stripe-price-basic` → `STRIPE_PRICE_BASIC`
- `bayit-stripe-price-premium` → `STRIPE_PRICE_PREMIUM`
- `bayit-stripe-price-family` → `STRIPE_PRICE_FAMILY`

### AI Services (4 secrets)
- `bayit-anthropic-api-key` → `ANTHROPIC_API_KEY`
- `bayit-openai-api-key` → `OPENAI_API_KEY`
- `bayit-elevenlabs-api-key` → `ELEVENLABS_API_KEY`
- `bayit-elevenlabs-webhook-secret` → `ELEVENLABS_WEBHOOK_SECRET`

### Content Metadata Services (4 secrets)
- `bayit-tmdb-api-key` → `TMDB_API_KEY`
- `bayit-tmdb-api-token` → `TMDB_API_TOKEN`
- `opensubtitles-api-key` → `OPENSUBTITLES_API_KEY`
- `picovoice-access-key` → `PICOVOICE_ACCESS_KEY`

### OAuth & Authentication (4 secrets)
- `bayit-google-client-id` → `GOOGLE_CLIENT_ID`
- `bayit-google-client-secret` → `GOOGLE_CLIENT_SECRET`
- `bayit-google-redirect-uri` → `GOOGLE_REDIRECT_URI`
- `bayit-chromecast-receiver-id` → `CHROMECAST_RECEIVER_APP_ID`

### Communications (3 secrets)
- `bayit-twilio-account-sid` → `TWILIO_ACCOUNT_SID`
- `bayit-twilio-auth-token` → `TWILIO_AUTH_TOKEN`
- `bayit-twilio-phone-number` → `TWILIO_PHONE_NUMBER`

### Storage & CDN (4 secrets)
- `bayit-gcs-bucket-name` → `GCS_BUCKET_NAME`
- `bayit-backend-cors-origins` → `BACKEND_CORS_ORIGINS`
- `bayit-frontend-url` → `FRONTEND_URL`
- `bayit-frontend-web-url` → `FRONTEND_WEB_URL`

### Monitoring (1 secret)
- `bayit-sentry-dsn` → `SENTRY_DSN`

### Feature Flags (3 secrets)
- `podcast-translation-enabled` → `PODCAST_TRANSLATION_ENABLED`
- `podcast-translation-auto-start` → `PODCAST_TRANSLATION_AUTO_START`
- `bayit-feature-scene-search-enabled` → `FEATURE_SCENE_SEARCH_ENABLED`

### ElevenLabs Voice IDs (7 secrets)
- `bayit-elevenlabs-default-voice-id` → `ELEVENLABS_DEFAULT_VOICE_ID`
- `bayit-elevenlabs-hebrew-voice-id` → `ELEVENLABS_HEBREW_VOICE_ID`
- `bayit-elevenlabs-english-voice-id` → `ELEVENLABS_ENGLISH_VOICE_ID`
- `bayit-elevenlabs-assistant-voice-id` → `ELEVENLABS_ASSISTANT_VOICE_ID`
- `bayit-elevenlabs-support-voice-id` → `ELEVENLABS_SUPPORT_VOICE_ID`
- `bayit-elevenlabs-hebrew-male-voice-id` → `ELEVENLABS_HEBREW_MALE_VOICE_ID`
- `bayit-elevenlabs-english-male-voice-id` → `ELEVENLABS_ENGLISH_MALE_VOICE_ID`

### Apple Push Notifications (4 secrets)
- `bayit-apple-key-id` → `APPLE_KEY_ID`
- `bayit-apple-team-id` → `APPLE_TEAM_ID`
- `bayit-apple-bundle-id-ios` → `APPLE_BUNDLE_ID_IOS`
- `bayit-apple-bundle-id-tvos` → `APPLE_BUNDLE_ID_TVOS`

### Location Services (7 secrets)
- `bayit-geonames-username` → `GEONAMES_USERNAME`
- `bayit-geonames-api-base-url` → `GEONAMES_API_BASE_URL`
- `bayit-geonames-timeout-seconds` → `GEONAMES_TIMEOUT_SECONDS`
- `bayit-location-cache-ttl-hours` → `LOCATION_CACHE_TTL_HOURS`
- `bayit-location-reverse-geocode-rate-limit` → `LOCATION_REVERSE_GEOCODE_RATE_LIMIT`
- `bayit-location-content-rate-limit` → `LOCATION_CONTENT_RATE_LIMIT`
- `bayit-location-encryption-key` → `LOCATION_ENCRYPTION_KEY`

### Series Linker Configuration (5 secrets)
- `bayit-series-linker-title-similarity` → `SERIES_LINKER_TITLE_SIMILARITY_THRESHOLD`
- `bayit-series-linker-auto-link-confidence` → `SERIES_LINKER_AUTO_LINK_CONFIDENCE_THRESHOLD`
- `bayit-series-linker-batch-size` → `SERIES_LINKER_AUTO_LINK_BATCH_SIZE`
- `bayit-series-linker-duplicate-strategy` → `SERIES_LINKER_DUPLICATE_RESOLUTION_STRATEGY`
- `bayit-series-linker-create-missing` → `SERIES_LINKER_CREATE_MISSING_SERIES`

### Judaism Section Configuration (13 secrets)
- `bayit-jewish-news-cache-ttl` → `JEWISH_NEWS_CACHE_TTL_MINUTES`
- `bayit-jewish-news-sync-interval` → `JEWISH_NEWS_SYNC_INTERVAL_MINUTES`
- `bayit-jewish-news-timeout` → `JEWISH_NEWS_REQUEST_TIMEOUT_SECONDS`
- `bayit-hebcal-api-url` → `HEBCAL_API_BASE_URL`
- `bayit-sefaria-api-url` → `SEFARIA_API_BASE_URL`
- `bayit-jewish-calendar-cache-ttl` → `JEWISH_CALENDAR_CACHE_TTL_HOURS`
- `bayit-community-search-radius` → `COMMUNITY_SEARCH_RADIUS_MILES`
- `bayit-community-default-region` → `COMMUNITY_DEFAULT_REGION`
- `bayit-us-jewish-regions` → `US_JEWISH_REGIONS`
- `bayit-community-scrape-interval` → `COMMUNITY_SCRAPE_INTERVAL_HOURS`
- `bayit-yutorah-rss-url` → `YUTORAH_RSS_URL`
- `bayit-chabad-multimedia-rss-url` → `CHABAD_MULTIMEDIA_RSS_URL`
- `bayit-torahanytime-rss-url` → `TORAHANYTIME_RSS_URL`

### Turborepo (2 secrets)
- `turbo-token` → `TURBO_TOKEN`
- `turbo-team` → `TURBO_TEAM`

**Total: 85+ secrets**

## Managing Secrets

### Creating Critical Secrets

For first-time setup, create critical secrets that are currently hardcoded:

```bash
./scripts/deployment/bayit-plus/create_critical_secrets.sh
```

This creates:
- `bayit-admin-password` (auto-generated secure password)
- `bayit-admin-email`
- `bayit-location-encryption-key` (auto-generated Fernet key)
- `bayit-elevenlabs-webhook-secret` (auto-generated)

**Note**: You must manually create the MongoDB URI secrets:
```bash
echo -n 'mongodb+srv://...' | gcloud secrets create olorin-fraud-mongodb-uri --data-file=-
echo -n 'mongodb+srv://...' | gcloud secrets create cvplus-mongodb-uri --data-file=-
```

### Syncing All Secrets from .env

To sync all secrets from backend/.env to Google Cloud Secret Manager:

```bash
./scripts/deployment/bayit-plus/sync_secrets_to_gcp.sh [project-id]
```

This will:
- Read all environment variables from backend/.env
- Skip placeholders and non-sensitive configuration
- Create new secrets or update existing ones
- Use standardized naming convention

### Validating Secrets

To verify all required secrets exist in Secret Manager:

```bash
./scripts/deployment/bayit-plus/validate_secrets.sh
```

Expected output:
```
✅ All secrets validated successfully
Total placeholder secrets in .env: 85+
Missing in Secret Manager: 0
```

### Adding a New Secret

1. **Add to backend/.env** with placeholder:
   ```
   NEW_API_KEY=<from-secret-manager:bayit-new-api-key>
   ```

2. **Create secret in Secret Manager**:
   ```bash
   echo -n 'actual_secret_value' | gcloud secrets create bayit-new-api-key --data-file=-
   ```

3. **Add to cloudbuild.yaml** (both root and backend/):
   ```yaml
   - '--update-secrets=NEW_API_KEY=bayit-new-api-key:latest'
   ```

4. **Validate**:
   ```bash
   ./scripts/deployment/bayit-plus/validate_secrets.sh
   ```

### Rotating a Secret

1. **Update secret value**:
   ```bash
   echo -n 'new_secret_value' | gcloud secrets versions add bayit-secret-name --data-file=-
   ```

2. **Redeploy application**:
   ```bash
   gcloud builds submit --config=cloudbuild.yaml
   ```

   The Cloud Run service will automatically use the latest version.

### Viewing Secrets

List all secrets:
```bash
gcloud secrets list --filter="name~bayit-"
```

Get secret value (requires permissions):
```bash
gcloud secrets versions access latest --secret=bayit-secret-name
```

### Deleting a Secret

⚠️ **Warning**: Only delete secrets that are no longer referenced in cloudbuild.yaml

```bash
gcloud secrets delete bayit-secret-name
```

## Security Best Practices

### ✅ DO:
- Use Google Cloud Secret Manager as single source of truth
- Use `<from-secret-manager:secret-name>` placeholders in backend/.env
- Rotate secrets regularly (every 90 days recommended)
- Use principle of least privilege for secret access
- Enable secret version expiration
- Monitor secret access logs

### ❌ DON'T:
- Hardcode secrets in backend/.env
- Commit real secrets to version control
- Share secrets via email or Slack
- Use the same secret across environments (dev/staging/prod)
- Grant broad access to Secret Manager

## Deployment Methods

### Method 1: Cloud Build (Automated - Recommended)

Triggered automatically on push to main branch:

```bash
git push origin main
```

Uses: `cloudbuild.yaml` (root directory)

### Method 2: Manual Cloud Build

Build and deploy manually:

```bash
gcloud builds submit --config=cloudbuild.yaml
```

### Method 3: Deploy Script

Deploy using shell script:

```bash
./scripts/deployment/deploy_server.sh production us-east1 bayit-plus
```

**All three methods reference the same secrets from Secret Manager.**

## Troubleshooting

### Secret Not Found Error

```
ERROR: Secret bayit-secret-name not found
```

**Solution**:
1. Check secret exists: `gcloud secrets describe bayit-secret-name`
2. Create secret: `echo -n 'value' | gcloud secrets create bayit-secret-name --data-file=-`
3. Redeploy

### Application Can't Read Secret

**Symptoms**: Application starts but fails to connect to service (database, Stripe, etc.)

**Solutions**:
1. Verify secret is referenced in cloudbuild.yaml
2. Check Cloud Run service logs: `gcloud run services logs read bayit-plus-backend --region=us-east1 --limit=50`
3. Verify secret value is correct: `gcloud secrets versions access latest --secret=bayit-secret-name`

### Placeholder in Production

**Symptoms**: Application logs show `<from-secret-manager:...>` in production

**Solution**:
- This should never happen in Cloud Run (secrets are injected at deployment)
- If seen in local development, use real values or mock services
- backend/.env placeholders are for documentation only

## Migration Checklist

For migrating from hardcoded secrets to Secret Manager:

- [x] Create all critical secrets (create_critical_secrets.sh)
- [x] Sync all secrets to Secret Manager (sync_secrets_to_gcp.sh)
- [x] Replace hardcoded values with placeholders in backend/.env
- [x] Update cloudbuild.yaml with all secret references
- [x] Update backend/cloudbuild.yaml with all secret references
- [x] Validate all secrets exist (validate_secrets.sh)
- [x] Test deployment with Cloud Build
- [x] Verify application starts successfully
- [x] Document new secrets management process

## Related Documentation

- [SECRETS_ENVIRONMENT_AUDIT_2026-01-28.md](SECRETS_ENVIRONMENT_AUDIT_2026-01-28.md) - Initial audit findings
- [Google Cloud Secret Manager Documentation](https://cloud.google.com/secret-manager/docs)
- [Cloud Run Secrets Integration](https://cloud.google.com/run/docs/configuring/secrets)

## Support

For issues or questions:
1. Check this guide first
2. Review application logs
3. Contact platform team
