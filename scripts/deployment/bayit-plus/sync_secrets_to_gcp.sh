#!/bin/bash
set -euo pipefail

# ============================================
# Sync Secrets from backend/.env to Google Cloud Secret Manager
# ============================================
# This script reads the current backend/.env file and creates/updates
# corresponding secrets in Google Cloud Secret Manager.
#
# Usage:
#   ./scripts/deployment/bayit-plus/sync_secrets_to_gcp.sh [project-id]
#
# Example:
#   ./scripts/deployment/bayit-plus/sync_secrets_to_gcp.sh bayit-plus
# ============================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_ID="${1:-$(gcloud config get-value project 2>/dev/null)}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
ENV_FILE="$REPO_ROOT/backend/.env"

if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}❌ Error: Project ID not provided and gcloud default not set${NC}"
    echo ""
    echo "Usage:"
    echo "  ./scripts/deployment/bayit-plus/sync_secrets_to_gcp.sh [project-id]"
    exit 1
fi

echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   Syncing Secrets to Google Cloud Secret Manager${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Project: ${PROJECT_ID}${NC}"
echo -e "${YELLOW}Reading from: ${ENV_FILE}${NC}"
echo ""

# Function to create or update a secret
create_or_update_secret() {
    local secret_name="$1"
    local secret_value="$2"

    # Skip placeholders
    if [[ "$secret_value" == "<from-secret-manager:"* ]]; then
        echo -e "${YELLOW}⊘${NC} Skipped: $secret_name (placeholder)"
        return 0
    fi

    # Check if secret exists
    if gcloud secrets describe "$secret_name" --project="$PROJECT_ID" >/dev/null 2>&1; then
        # Update existing secret
        echo -n "$secret_value" | gcloud secrets versions add "$secret_name" \
            --data-file=- \
            --project="$PROJECT_ID" >/dev/null 2>&1
        echo -e "${GREEN}↻${NC} Updated: $secret_name"
    else
        # Create new secret
        echo -n "$secret_value" | gcloud secrets create "$secret_name" \
            --data-file=- \
            --project="$PROJECT_ID" >/dev/null 2>&1
        echo -e "${GREEN}+${NC} Created: $secret_name"
    fi
}

# Helper function to convert env var name to secret name
env_to_secret_name() {
    local env_var="$1"
    local secret_name

    # Special cases (platform-level, no bayit prefix)
    case "$env_var" in
        "CSRF_ENABLED"|"PODCAST_TRANSLATION_ENABLED"|"PODCAST_TRANSLATION_AUTO_START")
            secret_name=$(echo "$env_var" | tr '[:upper:]' '[:lower:]' | tr '_' '-')
            ;;
        "TURBO_TOKEN"|"TURBO_TEAM")
            secret_name=$(echo "$env_var" | tr '[:upper:]' '[:lower:]' | tr '_' '-')
            ;;
        "OPENSUBTITLES_API_KEY"|"PICOVOICE_ACCESS_KEY")
            secret_name=$(echo "$env_var" | tr '[:upper:]' '[:lower:]' | tr '_' '-')
            ;;
        # Olorin and CVPlus MongoDB (separate clusters)
        "OLORIN_MONGODB_URI")
            secret_name="olorin-fraud-mongodb-uri"
            ;;
        "OLORIN_MONGODB_SOURCE_URI")
            secret_name="olorin-fraud-mongodb-source-uri"
            ;;
        "CVPLUS_MONGODB_URI")
            secret_name="cvplus-mongodb-uri"
            ;;
        "CVPLUS_MONGODB_SOURCE_URI")
            secret_name="cvplus-mongodb-source-uri"
            ;;
        "STATION_AI_MONGODB_URI")
            secret_name="station-ai-mongodb-uri"
            ;;
        # Default: bayit- prefix for all Bayit+ secrets
        *)
            secret_name="bayit-$(echo "$env_var" | tr '[:upper:]' '[:lower:]' | tr '_' '-')"
            ;;
    esac

    echo "$secret_name"
}

echo -e "${BLUE}Processing environment variables...${NC}"
echo ""

created_count=0
updated_count=0
skipped_count=0

# Read .env and process each variable
while IFS='=' read -r key value; do
    # Skip comments and empty lines
    [[ "$key" =~ ^#.*$ ]] && continue
    [[ -z "$key" ]] && continue

    # Skip non-sensitive configuration (these are set via --set-env-vars in cloudbuild.yaml)
    case "$key" in
        "ENVIRONMENT"|"DEBUG"|"LOG_LEVEL"|"GCP_PROJECT_ID"|"MONGODB_DB_NAME"|\
        "OLORIN_MONGODB_DB_NAME"|"CVPLUS_MONGODB_DB_NAME"|"STATION_AI_MONGODB_DB_NAME"|\
        "MONGODB_MAX_POOL_SIZE"|"MONGODB_MIN_POOL_SIZE"|"MONGODB_MAX_IDLE_TIME_MS"|\
        "MONGODB_CONNECT_TIMEOUT_MS"|"MONGODB_SERVER_SELECTION_TIMEOUT_MS"|\
        "GOOGLE_APPLICATION_CREDENTIALS"|"FRONTEND_MOBILE_URL"|\
        "PODCAST_TRANSLATION_POLL_INTERVAL"|"PODCAST_TRANSLATION_MAX_CONCURRENT"|\
        "TEMP_AUDIO_DIR"|"PODCAST_DEFAULT_ORIGINAL_LANGUAGE"|"ALLOWED_AUDIO_DOMAINS"|\
        "LIBRARIAN_"*|"AUDIT_"*|"WEBAUTHN_RP_ID"|"WEBAUTHN_RP_NAME"|\
        "DUBBING_REQUIRE_SECURE_WEBSOCKET"|"LOCATION_CACHE_COLLECTION"|\
        "LOCATION_CONTENT_TOPIC_TAGS"|"LOCATION_CONTENT_EVENT_TYPES"|"LOCATION_CONTENT_ARTICLE_FORMATS"|\
        "I18N_LOCALES_PATH"|"CAST_ENABLE_"*|"OLORIN_NLP_"*)
            continue
            ;;
    esac

    # Determine secret name
    secret_name=$(env_to_secret_name "$key")

    # Create or update secret
    if [[ "$value" == "<from-secret-manager:"* ]]; then
        skipped_count=$((skipped_count + 1))
    elif gcloud secrets describe "$secret_name" --project="$PROJECT_ID" >/dev/null 2>&1; then
        create_or_update_secret "$secret_name" "$value"
        updated_count=$((updated_count + 1))
    else
        create_or_update_secret "$secret_name" "$value"
        created_count=$((created_count + 1))
    fi

done < "$ENV_FILE"

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   Sync Complete${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}Created: $created_count secrets${NC}"
echo -e "${GREEN}Updated: $updated_count secrets${NC}"
echo -e "${YELLOW}Skipped: $skipped_count placeholders${NC}"
echo ""
echo "Next steps:"
echo "  1. Run validation:"
echo "     ./scripts/deployment/bayit-plus/validate_secrets.sh"
echo ""
echo "  2. Deploy backend:"
echo "     gcloud builds submit --config=cloudbuild.yaml"
echo ""
