#!/bin/bash
set -e

# GCP Secret Manager Setup Script for Bayit+
# Creates and updates secrets in Google Cloud Secret Manager
# Reads values from backend/.env file

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

print_header() {
    echo -e "\n${BLUE}===================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}===================================================${NC}\n"
}

print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠ $1${NC}"; }
print_info() { echo -e "${CYAN}ℹ $1${NC}"; }

# Configuration
PROJECT_ID="${GCP_PROJECT_ID:-bayit-plus}"
SERVICE_ACCOUNT="${SERVICE_ACCOUNT_EMAIL:-624470113582-compute@developer.gserviceaccount.com}"

# Get script directory and repo root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="$REPO_ROOT/backend/.env"

print_header "Bayit+ GCP Secrets Setup"
print_info "Project: $PROJECT_ID"
print_info "Service Account: $SERVICE_ACCOUNT"
print_info "Env File: $ENV_FILE"

# Check prerequisites
if ! command -v gcloud &> /dev/null; then
    print_error "gcloud CLI not found. Install: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
    print_error "Environment file not found: $ENV_FILE"
    exit 1
fi

gcloud config set project "$PROJECT_ID"

# Function to create or update secret
create_or_update_secret() {
    local secret_name=$1
    local env_key=$2
    local value=""

    # Read from .env file
    value=$(grep "^${env_key}=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2-)

    # Fallback to environment variable
    if [[ -z "$value" ]]; then
        value="${!env_key}"
    fi

    if [[ -n "$value" ]]; then
        if gcloud secrets describe "$secret_name" &>/dev/null; then
            echo -n "$value" | gcloud secrets versions add "$secret_name" --data-file=- 2>/dev/null
            print_success "Updated: $secret_name"
        else
            echo -n "$value" | gcloud secrets create "$secret_name" --data-file=- 2>/dev/null
            print_success "Created: $secret_name"
        fi
    else
        print_warning "Skipped: $secret_name (value not found)"
    fi
}

print_header "Creating/Updating Secrets"

# Core Application Secrets
print_info "Core Application..."
create_or_update_secret "bayit-secret-key" "SECRET_KEY"
create_or_update_secret "csrf-enabled" "CSRF_ENABLED"

# Database
print_info "Database..."
create_or_update_secret "mongodb-url" "MONGODB_URL"
create_or_update_secret "mongodb-db-name" "MONGODB_DB_NAME"

# Payment Processing
print_info "Stripe Payments..."
create_or_update_secret "stripe-api-key" "STRIPE_API_KEY"
create_or_update_secret "stripe-secret-key" "STRIPE_SECRET_KEY"
create_or_update_secret "stripe-webhook-secret" "STRIPE_WEBHOOK_SECRET"
create_or_update_secret "stripe-price-basic" "STRIPE_PRICE_BASIC"
create_or_update_secret "stripe-price-premium" "STRIPE_PRICE_PREMIUM"
create_or_update_secret "stripe-price-family" "STRIPE_PRICE_FAMILY"

# AI Services
print_info "AI Services..."
create_or_update_secret "anthropic-api-key" "ANTHROPIC_API_KEY"
create_or_update_secret "openai-api-key" "OPENAI_API_KEY"
create_or_update_secret "elevenlabs-api-key" "ELEVENLABS_API_KEY"

# Content Enrichment APIs
print_info "Content Enrichment (TMDB, OpenSubtitles)..."
create_or_update_secret "tmdb-api-key" "TMDB_API_KEY"
create_or_update_secret "tmdb-api-token" "TMDB_API_TOKEN"
create_or_update_secret "opensubtitles-api-key" "OPENSUBTITLES_API_KEY"

# Authentication
print_info "Google OAuth..."
create_or_update_secret "google-client-id" "GOOGLE_CLIENT_ID"
create_or_update_secret "google-client-secret" "GOOGLE_CLIENT_SECRET"
create_or_update_secret "google-redirect-uri" "GOOGLE_REDIRECT_URI"

# SMS Verification
print_info "Twilio SMS..."
create_or_update_secret "bayit-twilio-account-sid" "TWILIO_ACCOUNT_SID"
create_or_update_secret "bayit-twilio-auth-token" "TWILIO_AUTH_TOKEN"
create_or_update_secret "bayit-twilio-phone-number" "TWILIO_PHONE_NUMBER"

# Voice/Wake Word
print_info "Picovoice Wake Word..."
create_or_update_secret "picovoice-access-key" "PICOVOICE_ACCESS_KEY"

# Storage
print_info "Google Cloud Storage..."
create_or_update_secret "gcs-bucket-name" "GCS_BUCKET_NAME"

# CORS
CORS_ORIGINS='["https://bayit.tv","https://www.bayit.tv","http://localhost:3000"]'
if gcloud secrets describe "backend-cors-origins" &>/dev/null; then
    echo -n "$CORS_ORIGINS" | gcloud secrets versions add "backend-cors-origins" --data-file=- 2>/dev/null
    print_success "Updated: backend-cors-origins"
else
    echo -n "$CORS_ORIGINS" | gcloud secrets create "backend-cors-origins" --data-file=- 2>/dev/null
    print_success "Created: backend-cors-origins"
fi

# Librarian Agent Configuration
print_info "Librarian Agent Configuration..."
create_or_update_secret "bayit-librarian-daily-audit-cron" "LIBRARIAN_DAILY_AUDIT_CRON"
create_or_update_secret "bayit-librarian-daily-audit-time" "LIBRARIAN_DAILY_AUDIT_TIME"
create_or_update_secret "bayit-librarian-daily-audit-mode" "LIBRARIAN_DAILY_AUDIT_MODE"
create_or_update_secret "bayit-librarian-daily-audit-cost" "LIBRARIAN_DAILY_AUDIT_COST"
create_or_update_secret "bayit-librarian-daily-audit-status" "LIBRARIAN_DAILY_AUDIT_STATUS"
create_or_update_secret "bayit-librarian-daily-audit-description" "LIBRARIAN_DAILY_AUDIT_DESCRIPTION"
create_or_update_secret "bayit-librarian-weekly-audit-cron" "LIBRARIAN_WEEKLY_AUDIT_CRON"
create_or_update_secret "bayit-librarian-weekly-audit-time" "LIBRARIAN_WEEKLY_AUDIT_TIME"
create_or_update_secret "bayit-librarian-weekly-audit-mode" "LIBRARIAN_WEEKLY_AUDIT_MODE"
create_or_update_secret "bayit-librarian-weekly-audit-cost" "LIBRARIAN_WEEKLY_AUDIT_COST"
create_or_update_secret "bayit-librarian-weekly-audit-status" "LIBRARIAN_WEEKLY_AUDIT_STATUS"
create_or_update_secret "bayit-librarian-weekly-audit-description" "LIBRARIAN_WEEKLY_AUDIT_DESCRIPTION"
create_or_update_secret "bayit-librarian-max-iterations" "LIBRARIAN_MAX_ITERATIONS"
create_or_update_secret "bayit-librarian-default-budget-usd" "LIBRARIAN_DEFAULT_BUDGET_USD"
create_or_update_secret "bayit-librarian-min-budget-usd" "LIBRARIAN_MIN_BUDGET_USD"
create_or_update_secret "bayit-librarian-max-budget-usd" "LIBRARIAN_MAX_BUDGET_USD"
create_or_update_secret "bayit-librarian-budget-step-usd" "LIBRARIAN_BUDGET_STEP_USD"
create_or_update_secret "bayit-librarian-reports-limit" "LIBRARIAN_REPORTS_LIMIT"
create_or_update_secret "bayit-librarian-actions-limit" "LIBRARIAN_ACTIONS_LIMIT"
create_or_update_secret "bayit-librarian-activity-page-size" "LIBRARIAN_ACTIVITY_PAGE_SIZE"
create_or_update_secret "bayit-librarian-id-truncate-length" "LIBRARIAN_ID_TRUNCATE_LENGTH"
create_or_update_secret "bayit-librarian-modal-max-height" "LIBRARIAN_MODAL_MAX_HEIGHT"

# Judaism Section
print_info "Judaism Section Configuration..."
create_or_update_secret "bayit-jewish-news-cache-ttl" "JEWISH_NEWS_CACHE_TTL_MINUTES"
create_or_update_secret "bayit-jewish-news-sync-interval" "JEWISH_NEWS_SYNC_INTERVAL_MINUTES"
create_or_update_secret "bayit-jewish-news-timeout" "JEWISH_NEWS_REQUEST_TIMEOUT_SECONDS"
create_or_update_secret "bayit-hebcal-api-url" "HEBCAL_API_BASE_URL"
create_or_update_secret "bayit-sefaria-api-url" "SEFARIA_API_BASE_URL"
create_or_update_secret "bayit-jewish-calendar-cache-ttl" "JEWISH_CALENDAR_CACHE_TTL_HOURS"
create_or_update_secret "bayit-community-search-radius" "COMMUNITY_SEARCH_RADIUS_MILES"
create_or_update_secret "bayit-community-default-region" "COMMUNITY_DEFAULT_REGION"
create_or_update_secret "bayit-us-jewish-regions" "US_JEWISH_REGIONS"
create_or_update_secret "bayit-community-scrape-interval" "COMMUNITY_SCRAPE_INTERVAL_HOURS"
create_or_update_secret "bayit-yutorah-rss-url" "YUTORAH_RSS_URL"
create_or_update_secret "bayit-chabad-multimedia-rss-url" "CHABAD_MULTIMEDIA_RSS_URL"
create_or_update_secret "bayit-torahanytime-rss-url" "TORAHANYTIME_RSS_URL"

# Apple Push Notifications (APNs)
print_info "Apple Push Notifications..."
create_or_update_secret "bayit-apple-key-id" "APPLE_KEY_ID"
create_or_update_secret "bayit-apple-team-id" "APPLE_TEAM_ID"
create_or_update_secret "bayit-apple-bundle-id-ios" "APPLE_BUNDLE_ID_IOS"
create_or_update_secret "bayit-apple-bundle-id-tvos" "APPLE_BUNDLE_ID_TVOS"

# Olorin Platform Secrets
print_info "Olorin Platform..."
create_or_update_secret "olorin-pinecone-api-key" "PINECONE_API_KEY"
create_or_update_secret "olorin-partner-api-key-salt" "PARTNER_API_KEY_SALT"
create_or_update_secret "olorin-secret-key" "SECRET_KEY"

# Turborepo Remote Cache (for CI/CD build caching)
print_info "Turborepo Remote Cache..."
create_or_update_secret "turbo-token" "TURBO_TOKEN"
create_or_update_secret "turbo-team" "TURBO_TEAM"

# Note: The APNs .p8 key file (APPLE_KEY_PATH) should be stored separately
# as a file-based secret or mounted as a volume in Cloud Run/GKE

print_header "Granting Secret Access to Service Account"

ALL_SECRETS=(
    "bayit-secret-key" "csrf-enabled" "mongodb-url" "mongodb-db-name"
    "stripe-api-key" "stripe-secret-key" "stripe-webhook-secret"
    "stripe-price-basic" "stripe-price-premium" "stripe-price-family"
    "anthropic-api-key" "openai-api-key" "elevenlabs-api-key"
    "tmdb-api-key" "tmdb-api-token" "opensubtitles-api-key"
    "google-client-id" "google-client-secret" "google-redirect-uri"
    "bayit-twilio-account-sid" "bayit-twilio-auth-token" "bayit-twilio-phone-number"
    "picovoice-access-key" "gcs-bucket-name" "backend-cors-origins"
    "bayit-librarian-daily-audit-cron" "bayit-librarian-daily-audit-time"
    "bayit-librarian-daily-audit-mode" "bayit-librarian-daily-audit-cost"
    "bayit-librarian-daily-audit-status" "bayit-librarian-daily-audit-description"
    "bayit-librarian-weekly-audit-cron" "bayit-librarian-weekly-audit-time"
    "bayit-librarian-weekly-audit-mode" "bayit-librarian-weekly-audit-cost"
    "bayit-librarian-weekly-audit-status" "bayit-librarian-weekly-audit-description"
    "bayit-librarian-max-iterations" "bayit-librarian-default-budget-usd"
    "bayit-librarian-min-budget-usd" "bayit-librarian-max-budget-usd"
    "bayit-librarian-budget-step-usd" "bayit-librarian-reports-limit"
    "bayit-librarian-actions-limit" "bayit-librarian-activity-page-size"
    "bayit-librarian-id-truncate-length" "bayit-librarian-modal-max-height"
    "bayit-jewish-news-cache-ttl" "bayit-jewish-news-sync-interval"
    "bayit-jewish-news-timeout" "bayit-hebcal-api-url" "bayit-sefaria-api-url"
    "bayit-jewish-calendar-cache-ttl" "bayit-community-search-radius"
    "bayit-community-default-region" "bayit-us-jewish-regions"
    "bayit-community-scrape-interval" "bayit-yutorah-rss-url"
    "bayit-chabad-multimedia-rss-url" "bayit-torahanytime-rss-url"
    "bayit-apple-key-id" "bayit-apple-team-id"
    "bayit-apple-bundle-id-ios" "bayit-apple-bundle-id-tvos"
    "olorin-pinecone-api-key" "olorin-partner-api-key-salt" "olorin-secret-key"
    "turbo-token" "turbo-team"
)

for secret in "${ALL_SECRETS[@]}"; do
    if gcloud secrets describe "$secret" &>/dev/null; then
        gcloud secrets add-iam-policy-binding "$secret" \
            --member="serviceAccount:$SERVICE_ACCOUNT" \
            --role="roles/secretmanager.secretAccessor" \
            --quiet 2>/dev/null || true
    fi
done

print_success "IAM bindings configured"

print_header "Summary"
print_success "GCP Secrets setup complete!"
echo ""
echo "Secrets configured for:"
echo "  - Core Application (SECRET_KEY)"
echo "  - Database (MongoDB)"
echo "  - Payments (Stripe)"
echo "  - AI Services (Anthropic, OpenAI, ElevenLabs)"
echo "  - Content Enrichment (TMDB, OpenSubtitles)"
echo "  - Authentication (Google OAuth)"
echo "  - SMS (Twilio)"
echo "  - Voice (Picovoice)"
echo "  - Librarian Agent"
echo "  - Judaism Section"
echo "  - Apple Push Notifications (APNs)"
echo "  - Olorin Platform (Pinecone, Partner API, JWT)"
echo "  - Turborepo Remote Cache"
echo ""
echo "Service account with access: $SERVICE_ACCOUNT"
echo ""
print_info "View all secrets: gcloud secrets list"
print_info "View secret value: gcloud secrets versions access latest --secret=SECRET_NAME"
