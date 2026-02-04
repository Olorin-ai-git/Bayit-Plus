#!/bin/bash
# GCS Upload Configuration Update Script
# Updates GCS upload settings in Google Cloud Secret Manager
# These settings control retry logic and timeouts for large file uploads to GCS

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

print_info() { echo -e "${CYAN}$1${NC}"; }
print_success() { echo -e "${GREEN}$1${NC}"; }
print_warning() { echo -e "${YELLOW}$1${NC}"; }

# Configuration defaults (match backend/app/core/config.py)
GCS_UPLOAD_TIMEOUT_SECONDS="${GCS_UPLOAD_TIMEOUT_SECONDS:-600}"
GCS_UPLOAD_CHUNK_SIZE_MB="${GCS_UPLOAD_CHUNK_SIZE_MB:-8}"
GCS_UPLOAD_MAX_RETRIES="${GCS_UPLOAD_MAX_RETRIES:-5}"
GCS_UPLOAD_RETRY_INITIAL_DELAY_SECONDS="${GCS_UPLOAD_RETRY_INITIAL_DELAY_SECONDS:-1.0}"
GCS_UPLOAD_RETRY_MAX_DELAY_SECONDS="${GCS_UPLOAD_RETRY_MAX_DELAY_SECONDS:-60.0}"

PROJECT_ID="${GCP_PROJECT_ID:-bayit-plus}"

print_info "GCS Upload Configuration Update"
print_info "================================"
echo ""
echo "Current values (from environment or defaults):"
echo "  GCS_UPLOAD_TIMEOUT_SECONDS: $GCS_UPLOAD_TIMEOUT_SECONDS"
echo "  GCS_UPLOAD_CHUNK_SIZE_MB: $GCS_UPLOAD_CHUNK_SIZE_MB"
echo "  GCS_UPLOAD_MAX_RETRIES: $GCS_UPLOAD_MAX_RETRIES"
echo "  GCS_UPLOAD_RETRY_INITIAL_DELAY_SECONDS: $GCS_UPLOAD_RETRY_INITIAL_DELAY_SECONDS"
echo "  GCS_UPLOAD_RETRY_MAX_DELAY_SECONDS: $GCS_UPLOAD_RETRY_MAX_DELAY_SECONDS"
echo ""

# Function to create or update secret
create_or_update_secret() {
    local secret_name=$1
    local value=$2

    if gcloud secrets describe "$secret_name" --project="$PROJECT_ID" >/dev/null 2>&1; then
        echo -n "$value" | gcloud secrets versions add "$secret_name" --project="$PROJECT_ID" --data-file=- 2>/dev/null
        print_success "Updated: $secret_name = $value"
    else
        echo -n "$value" | gcloud secrets create "$secret_name" --project="$PROJECT_ID" --data-file=- 2>/dev/null
        print_success "Created: $secret_name = $value"
    fi
}

print_info "Creating/updating secrets in Google Cloud Secret Manager..."
echo ""

create_or_update_secret "bayit-gcs-upload-timeout" "$GCS_UPLOAD_TIMEOUT_SECONDS"
create_or_update_secret "bayit-gcs-upload-chunk-size" "$GCS_UPLOAD_CHUNK_SIZE_MB"
create_or_update_secret "bayit-gcs-upload-max-retries" "$GCS_UPLOAD_MAX_RETRIES"
create_or_update_secret "bayit-gcs-upload-retry-initial-delay" "$GCS_UPLOAD_RETRY_INITIAL_DELAY_SECONDS"
create_or_update_secret "bayit-gcs-upload-retry-max-delay" "$GCS_UPLOAD_RETRY_MAX_DELAY_SECONDS"

echo ""
print_success "GCS upload configuration updated in Secret Manager!"
echo ""
print_warning "Note: To use secrets instead of env vars, update cloudbuild.yaml:"
echo "  Add to --set-secrets:"
echo "    GCS_UPLOAD_TIMEOUT_SECONDS=bayit-gcs-upload-timeout:latest"
echo "    GCS_UPLOAD_CHUNK_SIZE_MB=bayit-gcs-upload-chunk-size:latest"
echo "    GCS_UPLOAD_MAX_RETRIES=bayit-gcs-upload-max-retries:latest"
echo "    GCS_UPLOAD_RETRY_INITIAL_DELAY_SECONDS=bayit-gcs-upload-retry-initial-delay:latest"
echo "    GCS_UPLOAD_RETRY_MAX_DELAY_SECONDS=bayit-gcs-upload-retry-max-delay:latest"
echo ""
echo "  Remove from --set-env-vars:"
echo "    GCS_UPLOAD_TIMEOUT_SECONDS, GCS_UPLOAD_CHUNK_SIZE_MB, etc."
echo ""
print_info "To change values, set environment variables before running this script:"
echo "  GCS_UPLOAD_TIMEOUT_SECONDS=900 ./update-gcs-upload-config.sh"
