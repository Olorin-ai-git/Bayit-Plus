#!/bin/bash
#
# Create Beta 500 Secrets in Google Cloud Secret Manager
#
# This script creates ALL secrets required for the Beta 500 closed beta program
# in Google Cloud Secret Manager. It is the SINGLE SOURCE OF TRUTH for secret management.
#
# Usage:
#   ./scripts/create-beta-500-secrets.sh [--project PROJECT_ID] [--service-account SA_EMAIL]
#
# Prerequisites:
#   - gcloud CLI installed and authenticated
#   - openssl installed (for generating secure keys)
#   - Permissions: roles/secretmanager.admin
#
# After running this script, regenerate .env files:
#   ./scripts/sync-gcloud-secrets.sh
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
PROJECT_ID="${GCP_PROJECT_ID:-bayit-plus}"
SERVICE_ACCOUNT="${SERVICE_ACCOUNT:-bayit-plus-backend@bayit-plus.iam.gserviceaccount.com}"
GITHUB_SA="${GITHUB_SA:-github-actions@bayit-plus.iam.gserviceaccount.com}"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --project)
            PROJECT_ID="$2"
            shift 2
            ;;
        --service-account)
            SERVICE_ACCOUNT="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [--project PROJECT_ID] [--service-account SA_EMAIL]"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

create_secret() {
    local name=$1
    local value=$2
    local labels=$3

    if gcloud secrets describe "$name" --project="$PROJECT_ID" &>/dev/null; then
        log_warn "Secret $name already exists, adding new version..."
        echo "$value" | gcloud secrets versions add "$name" \
            --data-file=- \
            --project="$PROJECT_ID"
    else
        echo "$value" | gcloud secrets create "$name" \
            --data-file=- \
            --replication-policy="automatic" \
            --labels="$labels" \
            --project="$PROJECT_ID"
        log_success "Created secret: $name"
    fi
}

grant_access() {
    local secret_name=$1
    local member=$2

    gcloud secrets add-iam-policy-binding "$secret_name" \
        --member="$member" \
        --role="roles/secretmanager.secretAccessor" \
        --project="$PROJECT_ID" \
        --quiet &>/dev/null

    log_success "Granted access to $member for $secret_name"
}

# ============================================================================
# MAIN SCRIPT
# ============================================================================

log_info "Creating Beta 500 secrets in Google Cloud Secret Manager"
log_info "Project: $PROJECT_ID"
log_info "Service Account: $SERVICE_ACCOUNT"
echo ""

# Verify prerequisites
if ! command -v gcloud &> /dev/null; then
    log_error "gcloud CLI not found. Please install it first."
    exit 1
fi

if ! command -v openssl &> /dev/null; then
    log_error "openssl not found. Please install it first."
    exit 1
fi

# Verify authentication
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &>/dev/null; then
    log_error "Not authenticated with gcloud. Run: gcloud auth login"
    exit 1
fi

# Set project
gcloud config set project "$PROJECT_ID" --quiet

log_info "Starting secret creation..."
echo ""

# Common labels
LABELS="env=production,app=bayit-plus,feature=beta-500"
LABELS_SECURITY="env=production,app=bayit-plus,feature=beta-500,security=critical"

# ============================================================================
# 1. BETA PROGRAM CONFIGURATION
# ============================================================================

log_info "Creating Beta Program Configuration secrets..."

create_secret "BETA_MAX_USERS" "500" "$LABELS"
create_secret "BETA_AI_CREDITS" "5000" "$LABELS"
create_secret "BETA_DURATION_DAYS" "90" "$LABELS"

log_success "Beta Program Configuration secrets created"
echo ""

# ============================================================================
# 2. CREDIT SYSTEM CONFIGURATION
# ============================================================================

log_info "Creating Credit System Configuration secrets..."

create_secret "CREDIT_RATE_LIVE_DUBBING" "1.0" "$LABELS"
create_secret "CREDIT_RATE_AI_SEARCH" "10.0" "$LABELS"
create_secret "CREDIT_RATE_AI_RECOMMENDATIONS" "5.0" "$LABELS"
create_secret "BETA_CREDIT_WARNING_THRESHOLD" "500" "$LABELS"
create_secret "BETA_CREDIT_CRITICAL_THRESHOLD" "100" "$LABELS"

log_success "Credit System Configuration secrets created"
echo ""

# ============================================================================
# 3. SESSION MANAGEMENT
# ============================================================================

log_info "Creating Session Management secrets..."

create_secret "SESSION_CHECKPOINT_INTERVAL_SECONDS" "30" "$LABELS"
create_secret "SESSION_CLEANUP_INTERVAL_SECONDS" "300" "$LABELS"
create_secret "SESSION_TIMEOUT_SECONDS" "3600" "$LABELS"

log_success "Session Management secrets created"
echo ""

# ============================================================================
# 4. EMAIL VERIFICATION
# ============================================================================

log_info "Creating Email Verification secrets..."

create_secret "EMAIL_VERIFICATION_TOKEN_EXPIRY_HOURS" "24" "$LABELS"

# Generate secure verification key (64 bytes = 128 hex characters)
log_info "Generating secure email verification key..."
VERIFICATION_KEY=$(openssl rand -hex 64)
create_secret "EMAIL_VERIFICATION_SECRET_KEY" "$VERIFICATION_KEY" "$LABELS_SECURITY"

log_success "Email Verification secrets created"
echo ""

# ============================================================================
# 5. TWILIO SMS CONFIGURATION (MANUAL INPUT REQUIRED)
# ============================================================================

log_info "Twilio SMS Configuration secrets..."
echo ""

if [[ -n "${TWILIO_ACCOUNT_SID:-}" && -n "${TWILIO_AUTH_TOKEN:-}" && -n "${TWILIO_PHONE_NUMBER:-}" ]]; then
    log_info "Using Twilio credentials from environment variables"
    create_secret "TWILIO_ACCOUNT_SID" "$TWILIO_ACCOUNT_SID" "env=production,app=bayit-plus,feature=beta-500,vendor=twilio"
    create_secret "TWILIO_AUTH_TOKEN" "$TWILIO_AUTH_TOKEN" "env=production,app=bayit-plus,feature=beta-500,vendor=twilio,security=critical"
    create_secret "TWILIO_PHONE_NUMBER" "$TWILIO_PHONE_NUMBER" "env=production,app=bayit-plus,feature=beta-500,vendor=twilio"
    log_success "Twilio secrets created"
else
    log_warn "TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_PHONE_NUMBER not set in environment"
    log_warn "Skipping Twilio secrets creation. You can create them manually later:"
    echo ""
    echo "  export TWILIO_ACCOUNT_SID='your_account_sid'"
    echo "  export TWILIO_AUTH_TOKEN='your_auth_token'"
    echo "  export TWILIO_PHONE_NUMBER='+1234567890'"
    echo "  ./scripts/create-beta-500-secrets.sh"
    echo ""
fi

# ============================================================================
# 6. MARKETING INTEGRATION
# ============================================================================

log_info "Creating Marketing Integration secrets..."

create_secret "BETA_LANDING_PAGE_URL" "https://bayitplus.com/beta-500" "$LABELS"
create_secret "BETA_SUPPORT_EMAIL" "beta@bayitplus.com" "$LABELS"

log_success "Marketing Integration secrets created"
echo ""

# ============================================================================
# 7. GRANT ACCESS TO SERVICE ACCOUNTS
# ============================================================================

log_info "Granting access to service accounts..."
echo ""

SECRETS=(
    "BETA_MAX_USERS"
    "BETA_AI_CREDITS"
    "BETA_DURATION_DAYS"
    "CREDIT_RATE_LIVE_DUBBING"
    "CREDIT_RATE_AI_SEARCH"
    "CREDIT_RATE_AI_RECOMMENDATIONS"
    "BETA_CREDIT_WARNING_THRESHOLD"
    "BETA_CREDIT_CRITICAL_THRESHOLD"
    "SESSION_CHECKPOINT_INTERVAL_SECONDS"
    "SESSION_CLEANUP_INTERVAL_SECONDS"
    "SESSION_TIMEOUT_SECONDS"
    "EMAIL_VERIFICATION_TOKEN_EXPIRY_HOURS"
    "EMAIL_VERIFICATION_SECRET_KEY"
    "BETA_LANDING_PAGE_URL"
    "BETA_SUPPORT_EMAIL"
)

# Add Twilio secrets if they exist
if gcloud secrets describe "TWILIO_ACCOUNT_SID" --project="$PROJECT_ID" &>/dev/null; then
    SECRETS+=("TWILIO_ACCOUNT_SID" "TWILIO_AUTH_TOKEN" "TWILIO_PHONE_NUMBER")
fi

for secret in "${SECRETS[@]}"; do
    # Grant access to backend service account
    grant_access "$secret" "serviceAccount:$SERVICE_ACCOUNT"

    # Grant access to GitHub Actions service account
    grant_access "$secret" "serviceAccount:$GITHUB_SA"
done

log_success "Service account access granted for all secrets"
echo ""

# ============================================================================
# 8. SUMMARY
# ============================================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_success "Beta 500 Secrets Setup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

log_info "Summary:"
echo "  - Project: $PROJECT_ID"
echo "  - Secrets created: ${#SECRETS[@]}"
echo "  - Service accounts granted access: 2"
echo ""

log_info "Next Steps:"
echo "  1. Verify secrets were created:"
echo "     gcloud secrets list --filter='labels.feature=beta-500' --project=$PROJECT_ID"
echo ""
echo "  2. Regenerate .env files from secrets:"
echo "     ./scripts/sync-gcloud-secrets.sh"
echo ""
echo "  3. Restart backend services to pick up new configuration:"
echo "     kubectl rollout restart deployment/bayit-plus-backend"
echo ""

if [[ -z "${TWILIO_ACCOUNT_SID:-}" ]]; then
    log_warn "Twilio secrets were NOT created. Set environment variables and rerun:"
    echo "  export TWILIO_ACCOUNT_SID='...'"
    echo "  export TWILIO_AUTH_TOKEN='...'"
    echo "  export TWILIO_PHONE_NUMBER='+...'"
    echo "  ./scripts/create-beta-500-secrets.sh"
    echo ""
fi

log_info "Documentation:"
echo "  - Secrets Management Guide: docs/deployment/SECRETS_MANAGEMENT.md"
echo "  - Beta 500 Secrets Reference: docs/deployment/GCLOUD_SECRETS_BETA_500.md"
echo ""

log_success "Done! 🎉"
