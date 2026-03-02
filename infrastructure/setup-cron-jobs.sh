#!/usr/bin/env bash
#
# Provision Cloud Run Jobs and Cloud Scheduler triggers for bayit-workers.
#
# Usage:
#   ./infrastructure/setup-cron-jobs.sh [--project PROJECT_ID] [--region REGION]
#
# Prerequisites:
#   - gcloud CLI authenticated
#   - bayit-jobs image pushed to GCR (via cloudbuild-jobs.yaml)
#   - Secret Manager secrets already exist (shared with monolith)
#
# This creates:
#   1. Service account for cron jobs (with secret access + logging)
#   2. Four Cloud Run Jobs (cleanup-upload-sessions, cleanup-failed-uploads,
#      cost-rollup, youtube-epg-sync)
#   3. Four Cloud Scheduler triggers on the specified cron schedules

set -euo pipefail

PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null)}"
REGION="${REGION:-us-east1}"
SCHEDULER_REGION="${SCHEDULER_REGION:-us-east1}"
IMAGE="gcr.io/${PROJECT_ID}/bayit-jobs:latest"
SA_NAME="bayit-cron-jobs"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
TIMEZONE="Asia/Jerusalem"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

if [ -z "${PROJECT_ID}" ]; then
    log "ERROR: No project ID. Set PROJECT_ID or configure gcloud."
    exit 1
fi

log "Project: ${PROJECT_ID}"
log "Region: ${REGION}"
log "Image: ${IMAGE}"

# ─────────────────────────────────────────────────
# Step 1: Service account for cron jobs
# ─────────────────────────────────────────────────
if gcloud iam service-accounts describe "${SA_EMAIL}" \
    --project="${PROJECT_ID}" &>/dev/null; then
    log "Service account ${SA_NAME} already exists"
else
    log "Creating service account ${SA_NAME}"
    gcloud iam service-accounts create "${SA_NAME}" \
        --display-name="Bayit+ Cron Jobs" \
        --project="${PROJECT_ID}"
fi

# Grant roles: secret access, logging, Cloud Run invoker
for role in roles/secretmanager.secretAccessor roles/logging.logWriter roles/run.invoker; do
    gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
        --member="serviceAccount:${SA_EMAIL}" \
        --role="${role}" \
        --condition=None \
        --quiet 2>/dev/null
done
log "IAM roles granted to ${SA_EMAIL}"

# ─────────────────────────────────────────────────
# Step 2: Shared env/secret args for all jobs
# ─────────────────────────────────────────────────
# Note: Jobs share the monolith's Settings class (Pydantic) which validates
# all fields on import. We must pass the full set of secrets even though
# individual jobs only use a subset. Settings(extra="ignore") handles
# unrecognized env vars, but required fields must be present.

COMMON_ENV="ENVIRONMENT=production"
COMMON_ENV="${COMMON_ENV},GCP_PROJECT_ID=${PROJECT_ID}"
COMMON_ENV="${COMMON_ENV},LOG_LEVEL=INFO"
COMMON_ENV="${COMMON_ENV},DEBUG=false"
COMMON_ENV="${COMMON_ENV},MONGODB_DB_NAME=bayit_plus"
COMMON_ENV="${COMMON_ENV},I18N_LOCALES_PATH=/app/shared/i18n/locales"
COMMON_ENV="${COMMON_ENV},WEBAUTHN_RP_ID=bayit.tv"
COMMON_ENV="${COMMON_ENV},WEBAUTHN_RP_NAME=Bayit Plus"
COMMON_ENV="${COMMON_ENV},AUDIBLE_INTEGRATION_ENABLED=true"
COMMON_ENV="${COMMON_ENV},CAST_ENABLE_AIRPLAY=true"
COMMON_ENV="${COMMON_ENV},CAST_ENABLE_CHROMECAST=true"

# Core: auth, database, Redis, payments
COMMON_SECRETS="SECRET_KEY=bayit-backend-secret-key:latest"
COMMON_SECRETS="${COMMON_SECRETS},CSRF_ENABLED=csrf-enabled:latest"
COMMON_SECRETS="${COMMON_SECRETS},ADMIN_PASSWORD=bayit-admin-password:latest"
COMMON_SECRETS="${COMMON_SECRETS},ADMIN_EMAIL=bayit-admin-email:latest"
COMMON_SECRETS="${COMMON_SECRETS},WEBAUTHN_ORIGIN=bayit-webauthn-origin:latest"
COMMON_SECRETS="${COMMON_SECRETS},MONGODB_URI=bayit-mongodb-uri:latest"
COMMON_SECRETS="${COMMON_SECRETS},OLORIN_MONGODB_URI=olorin-fraud-mongodb-uri:latest"
COMMON_SECRETS="${COMMON_SECRETS},CVPLUS_MONGODB_URI=cvplus-mongodb-uri:latest"
COMMON_SECRETS="${COMMON_SECRETS},STATION_AI_MONGODB_URI=station-ai-mongodb-uri:latest"
COMMON_SECRETS="${COMMON_SECRETS},REDIS_URL=bayit-redis-url:latest"
COMMON_SECRETS="${COMMON_SECRETS},STRIPE_API_KEY=bayit-stripe-api-key:latest"
COMMON_SECRETS="${COMMON_SECRETS},STRIPE_SECRET_KEY=bayit-stripe-secret-key:latest"
COMMON_SECRETS="${COMMON_SECRETS},STRIPE_WEBHOOK_SECRET=bayit-stripe-webhook-secret:latest"
COMMON_SECRETS="${COMMON_SECRETS},STRIPE_PRICE_BASIC=bayit-stripe-price-basic:latest"
COMMON_SECRETS="${COMMON_SECRETS},STRIPE_PRICE_PREMIUM=bayit-stripe-price-premium:latest"
COMMON_SECRETS="${COMMON_SECRETS},STRIPE_PRICE_FAMILY=bayit-stripe-price-family:latest"
# AI services, content, OAuth
COMMON_SECRETS="${COMMON_SECRETS},ANTHROPIC_API_KEY=bayit-anthropic-api-key:latest"
COMMON_SECRETS="${COMMON_SECRETS},OPENAI_API_KEY=bayit-openai-api-key:latest"
COMMON_SECRETS="${COMMON_SECRETS},ELEVENLABS_API_KEY=bayit-elevenlabs-api-key:latest"
COMMON_SECRETS="${COMMON_SECRETS},ELEVENLABS_WEBHOOK_SECRET=bayit-elevenlabs-webhook-secret:latest"
COMMON_SECRETS="${COMMON_SECRETS},TMDB_API_KEY=bayit-tmdb-api-key:latest"
COMMON_SECRETS="${COMMON_SECRETS},TMDB_API_TOKEN=bayit-tmdb-api-token:latest"
COMMON_SECRETS="${COMMON_SECRETS},OPENSUBTITLES_API_KEY=opensubtitles-api-key:latest"
COMMON_SECRETS="${COMMON_SECRETS},PICOVOICE_ACCESS_KEY=picovoice-access-key:latest"
COMMON_SECRETS="${COMMON_SECRETS},GOOGLE_CLIENT_ID=bayit-google-client-id:latest"
COMMON_SECRETS="${COMMON_SECRETS},GOOGLE_CLIENT_SECRET=bayit-google-client-secret:latest"
COMMON_SECRETS="${COMMON_SECRETS},GOOGLE_REDIRECT_URI=bayit-google-redirect-uri:latest"
COMMON_SECRETS="${COMMON_SECRETS},CHROMECAST_RECEIVER_APP_ID=bayit-chromecast-receiver-id:latest"
COMMON_SECRETS="${COMMON_SECRETS},TWILIO_ACCOUNT_SID=bayit-twilio-account-sid:latest"
COMMON_SECRETS="${COMMON_SECRETS},TWILIO_AUTH_TOKEN=bayit-twilio-auth-token:latest"
COMMON_SECRETS="${COMMON_SECRETS},TWILIO_PHONE_NUMBER=bayit-twilio-phone-number:latest"
COMMON_SECRETS="${COMMON_SECRETS},EXA_API_KEY=bayit-exa-api-key:latest"
# Storage, CDN, monitoring, feature flags
COMMON_SECRETS="${COMMON_SECRETS},GCS_BUCKET_NAME=bayit-gcs-bucket-name:latest"
COMMON_SECRETS="${COMMON_SECRETS},BACKEND_CORS_ORIGINS=bayit-backend-cors-origins:latest"
COMMON_SECRETS="${COMMON_SECRETS},FRONTEND_URL=bayit-frontend-url:latest"
COMMON_SECRETS="${COMMON_SECRETS},FRONTEND_WEB_URL=bayit-frontend-web-url:latest"
COMMON_SECRETS="${COMMON_SECRETS},SENTRY_DSN=bayit-sentry-dsn:latest"
COMMON_SECRETS="${COMMON_SECRETS},PODCAST_TRANSLATION_ENABLED=podcast-translation-enabled:latest"
COMMON_SECRETS="${COMMON_SECRETS},PODCAST_TRANSLATION_AUTO_START=podcast-translation-auto-start:latest"
COMMON_SECRETS="${COMMON_SECRETS},FEATURE_SCENE_SEARCH_ENABLED=bayit-feature-scene-search-enabled:latest"
# ElevenLabs voice IDs
COMMON_SECRETS="${COMMON_SECRETS},ELEVENLABS_DEFAULT_VOICE_ID=bayit-elevenlabs-default-voice-id:latest"
COMMON_SECRETS="${COMMON_SECRETS},ELEVENLABS_HEBREW_VOICE_ID=bayit-elevenlabs-hebrew-voice-id:latest"
COMMON_SECRETS="${COMMON_SECRETS},ELEVENLABS_ENGLISH_VOICE_ID=bayit-elevenlabs-english-voice-id:latest"
COMMON_SECRETS="${COMMON_SECRETS},ELEVENLABS_ASSISTANT_VOICE_ID=bayit-elevenlabs-assistant-voice-id:latest"
COMMON_SECRETS="${COMMON_SECRETS},ELEVENLABS_SUPPORT_VOICE_ID=bayit-elevenlabs-support-voice-id:latest"
COMMON_SECRETS="${COMMON_SECRETS},ELEVENLABS_HEBREW_MALE_VOICE_ID=bayit-elevenlabs-hebrew-male-voice-id:latest"
COMMON_SECRETS="${COMMON_SECRETS},ELEVENLABS_ENGLISH_MALE_VOICE_ID=bayit-elevenlabs-english-male-voice-id:latest"
# Apple push, location services
COMMON_SECRETS="${COMMON_SECRETS},APPLE_KEY_ID=bayit-apple-key-id:latest"
COMMON_SECRETS="${COMMON_SECRETS},APPLE_TEAM_ID=bayit-apple-team-id:latest"
COMMON_SECRETS="${COMMON_SECRETS},APPLE_BUNDLE_ID_IOS=bayit-apple-bundle-id-ios:latest"
COMMON_SECRETS="${COMMON_SECRETS},APPLE_BUNDLE_ID_TVOS=bayit-apple-bundle-id-tvos:latest"
COMMON_SECRETS="${COMMON_SECRETS},GEONAMES_USERNAME=bayit-geonames-username:latest"
COMMON_SECRETS="${COMMON_SECRETS},GEONAMES_API_BASE_URL=bayit-geonames-api-base-url:latest"
COMMON_SECRETS="${COMMON_SECRETS},GEONAMES_TIMEOUT_SECONDS=bayit-geonames-timeout-seconds:latest"
COMMON_SECRETS="${COMMON_SECRETS},LOCATION_CACHE_TTL_HOURS=bayit-location-cache-ttl-hours:latest"
COMMON_SECRETS="${COMMON_SECRETS},LOCATION_REVERSE_GEOCODE_RATE_LIMIT=bayit-location-reverse-geocode-rate-limit:latest"
COMMON_SECRETS="${COMMON_SECRETS},LOCATION_CONTENT_RATE_LIMIT=bayit-location-content-rate-limit:latest"
COMMON_SECRETS="${COMMON_SECRETS},LOCATION_ENCRYPTION_KEY=bayit-location-encryption-key:latest"
# Series linker
COMMON_SECRETS="${COMMON_SECRETS},SERIES_LINKER_TITLE_SIMILARITY_THRESHOLD=bayit-series-linker-title-similarity:latest"
COMMON_SECRETS="${COMMON_SECRETS},SERIES_LINKER_AUTO_LINK_CONFIDENCE_THRESHOLD=bayit-series-linker-auto-link-confidence:latest"
COMMON_SECRETS="${COMMON_SECRETS},SERIES_LINKER_AUTO_LINK_BATCH_SIZE=bayit-series-linker-batch-size:latest"
COMMON_SECRETS="${COMMON_SECRETS},SERIES_LINKER_DUPLICATE_RESOLUTION_STRATEGY=bayit-series-linker-duplicate-strategy:latest"
COMMON_SECRETS="${COMMON_SECRETS},SERIES_LINKER_CREATE_MISSING_SERIES=bayit-series-linker-create-missing:latest"
# Judaism section
COMMON_SECRETS="${COMMON_SECRETS},JEWISH_NEWS_CACHE_TTL_MINUTES=bayit-jewish-news-cache-ttl:latest"
COMMON_SECRETS="${COMMON_SECRETS},JEWISH_NEWS_SYNC_INTERVAL_MINUTES=bayit-jewish-news-sync-interval:latest"
COMMON_SECRETS="${COMMON_SECRETS},JEWISH_NEWS_REQUEST_TIMEOUT_SECONDS=bayit-jewish-news-timeout:latest"
COMMON_SECRETS="${COMMON_SECRETS},HEBCAL_API_BASE_URL=bayit-hebcal-api-url:latest"
COMMON_SECRETS="${COMMON_SECRETS},SEFARIA_API_BASE_URL=bayit-sefaria-api-url:latest"
COMMON_SECRETS="${COMMON_SECRETS},JEWISH_CALENDAR_CACHE_TTL_HOURS=bayit-jewish-calendar-cache-ttl:latest"
COMMON_SECRETS="${COMMON_SECRETS},COMMUNITY_SEARCH_RADIUS_MILES=bayit-community-search-radius:latest"
COMMON_SECRETS="${COMMON_SECRETS},COMMUNITY_DEFAULT_REGION=bayit-community-default-region:latest"
COMMON_SECRETS="${COMMON_SECRETS},US_JEWISH_REGIONS=bayit-us-jewish-regions:latest"
COMMON_SECRETS="${COMMON_SECRETS},COMMUNITY_SCRAPE_INTERVAL_HOURS=bayit-community-scrape-interval:latest"
COMMON_SECRETS="${COMMON_SECRETS},YUTORAH_RSS_URL=bayit-yutorah-rss-url:latest"
COMMON_SECRETS="${COMMON_SECRETS},CHABAD_MULTIMEDIA_RSS_URL=bayit-chabad-multimedia-rss-url:latest"
COMMON_SECRETS="${COMMON_SECRETS},TORAHANYTIME_RSS_URL=bayit-torahanytime-rss-url:latest"
# Turborepo
COMMON_SECRETS="${COMMON_SECRETS},TURBO_TOKEN=turbo-token:latest"
COMMON_SECRETS="${COMMON_SECRETS},TURBO_TEAM=turbo-team:latest"
# Voice and avatar AI
COMMON_SECRETS="${COMMON_SECRETS},VOICE_PROACTIVE_SUGGESTIONS_ENABLED=VOICE_PROACTIVE_SUGGESTIONS_ENABLED:latest"
COMMON_SECRETS="${COMMON_SECRETS},VOICE_MULTI_LANGUAGE_ENABLED=VOICE_MULTI_LANGUAGE_ENABLED:latest"
COMMON_SECRETS="${COMMON_SECRETS},VOICE_SHORTCUTS_ENABLED=VOICE_SHORTCUTS_ENABLED:latest"
COMMON_SECRETS="${COMMON_SECRETS},AVATAR_ANIMATIONS_ENABLED=AVATAR_ANIMATIONS_ENABLED:latest"
COMMON_SECRETS="${COMMON_SECRETS},VOICE_ANALYTICS_ENABLED=VOICE_ANALYTICS_ENABLED:latest"
COMMON_SECRETS="${COMMON_SECRETS},VOICE_ANALYTICS_SAMPLE_RATE=VOICE_ANALYTICS_SAMPLE_RATE:latest"
COMMON_SECRETS="${COMMON_SECRETS},AVATAR_CACHE_TTL=AVATAR_CACHE_TTL:latest"
COMMON_SECRETS="${COMMON_SECRETS},VOICE_WEB_MICROPHONE_REQUIRED=VOICE_WEB_MICROPHONE_REQUIRED:latest"
COMMON_SECRETS="${COMMON_SECRETS},VOICE_MOBILE_BACKGROUND_LISTENING=VOICE_MOBILE_BACKGROUND_LISTENING:latest"
COMMON_SECRETS="${COMMON_SECRETS},VOICE_TVOS_SIRI_REMOTE_INTEGRATION=VOICE_TVOS_SIRI_REMOTE_INTEGRATION:latest"
COMMON_SECRETS="${COMMON_SECRETS},FERNET_ENCRYPTION_KEY=FERNET_ENCRYPTION_KEY:latest"

# ─────────────────────────────────────────────────
# Step 3: Create Cloud Run Jobs
# ─────────────────────────────────────────────────

create_job() {
    local job_name="$1"
    local job_module="$2"
    local memory="${3:-512Mi}"
    local cpu="${4:-1}"
    local timeout="${5:-600}"

    if gcloud run jobs describe "${job_name}" \
        --region="${REGION}" --project="${PROJECT_ID}" &>/dev/null; then
        log "Job ${job_name} already exists, updating"
        gcloud run jobs update "${job_name}" \
            --region="${REGION}" \
            --project="${PROJECT_ID}" \
            --image="${IMAGE}" \
            --args="${job_module}" \
            --memory="${memory}" \
            --cpu="${cpu}" \
            --task-timeout="${timeout}" \
            --max-retries=3 \
            --set-env-vars="${COMMON_ENV},SERVICE_NAME=${job_name}" \
            --update-secrets="${COMMON_SECRETS}" \
            --service-account="${SA_EMAIL}" \
            --quiet
    else
        log "Creating job ${job_name} (module: ${job_module})"
        gcloud run jobs create "${job_name}" \
            --region="${REGION}" \
            --project="${PROJECT_ID}" \
            --image="${IMAGE}" \
            --args="${job_module}" \
            --memory="${memory}" \
            --cpu="${cpu}" \
            --task-timeout="${timeout}" \
            --max-retries=3 \
            --set-env-vars="${COMMON_ENV},SERVICE_NAME=${job_name}" \
            --update-secrets="${COMMON_SECRETS}" \
            --service-account="${SA_EMAIL}"
    fi
}

create_job "cleanup-upload-sessions" "jobs.cleanup_uploads" "512Mi" "1" "600"
create_job "cleanup-failed-uploads"  "jobs.cleanup_failed"  "512Mi" "1" "600"
create_job "cost-rollup"             "jobs.cost_rollup"     "512Mi" "1" "600"
create_job "youtube-epg-sync"        "jobs.epg_sync"        "512Mi" "1" "600"

log "All 4 Cloud Run Jobs created"

# ─────────────────────────────────────────────────
# Step 4: Create Cloud Scheduler triggers
# ─────────────────────────────────────────────────

create_scheduler() {
    local scheduler_name="$1"
    local schedule="$2"
    local job_name="$3"
    local description="$4"

    local job_uri
    job_uri="https://${REGION}-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/${PROJECT_ID}/jobs/${job_name}:run"

    if gcloud scheduler jobs describe "${scheduler_name}" \
        --location="${SCHEDULER_REGION}" --project="${PROJECT_ID}" &>/dev/null; then
        log "Scheduler ${scheduler_name} already exists, updating"
        gcloud scheduler jobs update http "${scheduler_name}" \
            --location="${SCHEDULER_REGION}" \
            --project="${PROJECT_ID}" \
            --schedule="${schedule}" \
            --time-zone="${TIMEZONE}" \
            --uri="${job_uri}" \
            --http-method=POST \
            --oauth-service-account-email="${SA_EMAIL}" \
            --description="${description}" \
            --quiet
    else
        log "Creating scheduler ${scheduler_name} (${schedule})"
        gcloud scheduler jobs create http "${scheduler_name}" \
            --location="${SCHEDULER_REGION}" \
            --project="${PROJECT_ID}" \
            --schedule="${schedule}" \
            --time-zone="${TIMEZONE}" \
            --uri="${job_uri}" \
            --http-method=POST \
            --oauth-service-account-email="${SA_EMAIL}" \
            --description="${description}"
    fi
}

create_scheduler \
    "bayit-cleanup-upload-sessions" \
    "0 * * * *" \
    "cleanup-upload-sessions" \
    "Hourly: clean up orphaned upload sessions"

create_scheduler \
    "bayit-cleanup-failed-uploads" \
    "0 3 * * *" \
    "cleanup-failed-uploads" \
    "Daily at 3 AM IST: delete failed upload jobs"

create_scheduler \
    "bayit-cost-rollup" \
    "15 * * * *" \
    "cost-rollup" \
    "Hourly at :15: aggregate cost data"

create_scheduler \
    "bayit-youtube-epg-sync" \
    "30 * * * *" \
    "youtube-epg-sync" \
    "Hourly at :30: sync YouTube playlist EPG"

log "All 4 Cloud Scheduler triggers created"

# ─────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────
echo ""
log "Setup complete. Summary:"
echo "  Service Account: ${SA_EMAIL}"
echo ""
echo "  Cloud Run Jobs:"
echo "    cleanup-upload-sessions  -> python -m jobs.cleanup_uploads"
echo "    cleanup-failed-uploads   -> python -m jobs.cleanup_failed"
echo "    cost-rollup              -> python -m jobs.cost_rollup"
echo "    youtube-epg-sync         -> python -m jobs.epg_sync"
echo ""
echo "  Cloud Scheduler (${TIMEZONE}):"
echo "    bayit-cleanup-upload-sessions  0 * * * *    (every hour)"
echo "    bayit-cleanup-failed-uploads   0 3 * * *    (daily 3 AM)"
echo "    bayit-cost-rollup              15 * * * *   (hourly :15)"
echo "    bayit-youtube-epg-sync         30 * * * *   (hourly :30)"
echo ""
echo "  Next steps:"
echo "    1. Build + push the jobs image:"
echo "       gcloud builds submit --config=bayit-workers/cloudbuild-jobs.yaml ."
echo "    2. Test a job manually:"
echo "       gcloud run jobs execute cost-rollup --region=${REGION}"
echo "    3. Verify scheduler triggers:"
echo "       gcloud scheduler jobs list --location=${SCHEDULER_REGION}"
