#!/bin/bash
set -e

# ============================================
# Sync Secrets from Google Cloud to .env Files
# ============================================
#
# This script regenerates .env files from Google Cloud Secret Manager.
# Google Cloud Secret Manager is the SINGLE SOURCE OF TRUTH.
#
# Usage:
#   ./scripts/sync-gcloud-secrets.sh [backend|web|all] [project-id]
#
# Examples:
#   ./scripts/sync-gcloud-secrets.sh backend          # Sync backend only
#   ./scripts/sync-gcloud-secrets.sh web              # Sync web only
#   ./scripts/sync-gcloud-secrets.sh all              # Sync both
#   ./scripts/sync-gcloud-secrets.sh all my-project   # Use specific project

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TARGET="${1:-all}"
PROJECT_ID="${2:-$(gcloud config get-value project 2>/dev/null)}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_ENV="$REPO_ROOT/backend/.env"
WEB_ENV="$REPO_ROOT/web/.env"

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}Sync Secrets from Google Cloud${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""
echo -e "Project ID: ${GREEN}${PROJECT_ID}${NC}"
echo -e "Target: ${GREEN}${TARGET}${NC}"
echo ""

# Validate project ID
if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}Error: Project ID not specified${NC}"
    echo "Usage: $0 [backend|web|all] [project-id]"
    echo "Or set default project: gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

# Validate target
if [[ ! "$TARGET" =~ ^(backend|web|all)$ ]]; then
    echo -e "${RED}Error: Invalid target '$TARGET'${NC}"
    echo "Valid targets: backend, web, all"
    exit 1
fi

# Function to get secret value
get_secret() {
    local SECRET_NAME=$1
    local DEFAULT_VALUE=$2

    if gcloud secrets versions access latest --secret="$SECRET_NAME" --project="$PROJECT_ID" 2>/dev/null; then
        return 0
    else
        if [ -n "$DEFAULT_VALUE" ]; then
            echo -e "${YELLOW}Warning: Secret '$SECRET_NAME' not found, using default: $DEFAULT_VALUE${NC}" >&2
            echo "$DEFAULT_VALUE"
        else
            echo -e "${RED}Error: Secret '$SECRET_NAME' not found and no default provided${NC}" >&2
            return 1
        fi
    fi
}

# Function to sync backend secrets
sync_backend() {
    echo -e "${BLUE}Syncing backend secrets...${NC}"
    echo ""

    # Create backup
    if [ -f "$BACKEND_ENV" ]; then
        cp "$BACKEND_ENV" "$BACKEND_ENV.backup.$(date +%Y%m%d_%H%M%S)"
        echo -e "${GREEN}✓${NC} Backup created: ${BACKEND_ENV}.backup.*"
    fi

    # Create new .env file
    cat > "$BACKEND_ENV" << 'EOF'
# ============================================
# BACKEND ENVIRONMENT VARIABLES
# ============================================
#
# ⚠️  NEVER EDIT THIS FILE DIRECTLY
# This file is GENERATED from Google Cloud Secret Manager
#
# To update configuration:
# 1. Update secrets in Google Cloud Secret Manager
# 2. Run: ./scripts/sync-gcloud-secrets.sh backend
# 3. Restart backend service
#
# Generated: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
# Project: $PROJECT_ID
# ============================================

EOF

    echo "" >> "$BACKEND_ENV"
    echo "# ============================================" >> "$BACKEND_ENV"
    echo "# PAYMENT FLOW CONFIGURATION" >> "$BACKEND_ENV"
    echo "# ============================================" >> "$BACKEND_ENV"
    echo "" >> "$BACKEND_ENV"

    # Fetch and write payment flow secrets
    PAYMENT_SECRETS=(
        "REQUIRE_PAYMENT_ON_SIGNUP"
        "REQUIRE_PAYMENT_ON_SIGNUP_PERCENTAGE"
        "SIGNUP_TRIAL_PERIOD_DAYS"
        "PAYMENT_SUCCESS_PATH"
        "PAYMENT_CANCELLED_PATH"
        "PAYMENT_STATUS_POLL_INTERVAL_MS"
        "PAYMENT_PENDING_CLEANUP_DAYS"
        "PAYMENT_CHECKOUT_SESSION_TTL_HOURS"
        "PAYMENT_CONVERSION_THRESHOLD"
    )

    for SECRET in "${PAYMENT_SECRETS[@]}"; do
        echo -e "📝 Fetching ${SECRET}..."
        VALUE=$(get_secret "$SECRET")
        if [ $? -eq 0 ]; then
            echo "${SECRET}=${VALUE}" >> "$BACKEND_ENV"
            echo -e "   ${GREEN}✓${NC} ${SECRET}=${VALUE}"
        else
            echo -e "   ${RED}✗${NC} Failed to fetch ${SECRET}"
            return 1
        fi
    done

    echo ""
    echo -e "${GREEN}✓ Backend .env synced successfully${NC}"
    echo -e "   ${BACKEND_ENV}"
    echo ""
}

# Function to sync web secrets
sync_web() {
    echo -e "${BLUE}Syncing web secrets...${NC}"
    echo ""

    # Create backup
    if [ -f "$WEB_ENV" ]; then
        cp "$WEB_ENV" "$WEB_ENV.backup.$(date +%Y%m%d_%H%M%S)"
        echo -e "${GREEN}✓${NC} Backup created: ${WEB_ENV}.backup.*"
    fi

    # Create new .env file
    cat > "$WEB_ENV" << 'EOF'
# ============================================
# WEB ENVIRONMENT VARIABLES
# ============================================
#
# ⚠️  NEVER EDIT THIS FILE DIRECTLY
# This file is GENERATED from Google Cloud Secret Manager
#
# To update configuration:
# 1. Update secrets in Google Cloud Secret Manager
# 2. Run: ./scripts/sync-gcloud-secrets.sh web
# 3. Restart web service
#
# Generated: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
# Project: $PROJECT_ID
# ============================================

EOF

    echo "" >> "$WEB_ENV"
    echo "# ============================================" >> "$WEB_ENV"
    echo "# PAYMENT FLOW CONFIGURATION" >> "$WEB_ENV"
    echo "# ============================================" >> "$WEB_ENV"
    echo "" >> "$WEB_ENV"

    # Fetch and write payment flow secrets
    echo -e "📝 Fetching REACT_APP_PAYMENT_STATUS_POLL_INTERVAL_MS..."
    VALUE=$(get_secret "REACT_APP_PAYMENT_STATUS_POLL_INTERVAL_MS")
    if [ $? -eq 0 ]; then
        echo "REACT_APP_PAYMENT_STATUS_POLL_INTERVAL_MS=${VALUE}" >> "$WEB_ENV"
        echo -e "   ${GREEN}✓${NC} REACT_APP_PAYMENT_STATUS_POLL_INTERVAL_MS=${VALUE}"
    else
        echo -e "   ${RED}✗${NC} Failed to fetch REACT_APP_PAYMENT_STATUS_POLL_INTERVAL_MS"
        return 1
    fi

    echo ""
    echo -e "${GREEN}✓ Web .env synced successfully${NC}"
    echo -e "   ${WEB_ENV}"
    echo ""
}

# Execute sync based on target
case "$TARGET" in
    backend)
        sync_backend
        ;;
    web)
        sync_web
        ;;
    all)
        sync_backend
        echo ""
        sync_web
        ;;
esac

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}✓ Secrets Synced Successfully${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo ""

if [[ "$TARGET" =~ ^(backend|all)$ ]]; then
    echo -e "1. ${YELLOW}Verify backend .env:${NC}"
    echo -e "   ${GREEN}cat backend/.env${NC}"
    echo ""
    echo -e "2. ${YELLOW}Restart backend:${NC}"
    echo -e "   ${GREEN}cd backend && poetry run python -m app.local_server${NC}"
    echo ""
fi

if [[ "$TARGET" =~ ^(web|all)$ ]]; then
    echo -e "3. ${YELLOW}Verify web .env:${NC}"
    echo -e "   ${GREEN}cat web/.env${NC}"
    echo ""
    echo -e "4. ${YELLOW}Restart web:${NC}"
    echo -e "   ${GREEN}cd web && npm start${NC}"
    echo ""
fi

echo -e "${GREEN}Configuration synced from Google Cloud Secret Manager!${NC}"
echo ""
