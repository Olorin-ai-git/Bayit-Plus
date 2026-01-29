#!/bin/bash
set -e

# ============================================
# Sync ALL Secrets from Google Cloud to .env Files
# ============================================
#
# This script regenerates .env files from Google Cloud Secret Manager.
# Google Cloud Secret Manager is the SINGLE SOURCE OF TRUTH.
#
# Fetches ALL secrets dynamically and categorizes them:
# - Backend secrets: All secrets except REACT_APP_* and VITE_*
# - Web secrets: REACT_APP_* and VITE_* prefixed secrets
#
# Usage:
#   ./scripts/sync-gcloud-secrets.sh [backend|web|all] [project-id]
#
# Examples:
#   ./scripts/sync-gcloud-secrets.sh backend          # Sync backend only
#   ./scripts/sync-gcloud-secrets.sh web              # Sync web only
#   ./scripts/sync-gcloud-secrets.sh all              # Sync both (default)

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
echo -e "${BLUE}Sync ALL Secrets from Google Cloud${NC}"
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

# Fetch all secrets from Google Cloud
echo -e "${BLUE}Fetching secret list from Google Cloud...${NC}"
ALL_SECRETS=$(gcloud secrets list --project="$PROJECT_ID" --format="value(name)" 2>/dev/null | sort)

if [ -z "$ALL_SECRETS" ]; then
    echo -e "${RED}Error: No secrets found in project $PROJECT_ID${NC}"
    echo "Make sure you have access to the project and secrets exist."
    exit 1
fi

SECRET_COUNT=$(echo "$ALL_SECRETS" | wc -l | tr -d ' ')
echo -e "${GREEN}✓${NC} Found ${SECRET_COUNT} secrets in Google Cloud"
echo ""

# Function to get secret value with error handling
get_secret() {
    local SECRET_NAME=$1
    local VALUE

    VALUE=$(gcloud secrets versions access latest --secret="$SECRET_NAME" --project="$PROJECT_ID" 2>/dev/null)

    if [ $? -eq 0 ]; then
        echo "$VALUE"
        return 0
    else
        return 1
    fi
}

# Function to convert secret name to env var format
# Example: bayit-backend-cors-origins -> BAYIT_BACKEND_CORS_ORIGINS
normalize_secret_name() {
    local SECRET_NAME=$1
    echo "$SECRET_NAME" | tr '[:lower:]' '[:upper:]' | tr '-' '_'
}

# Function to sync backend secrets
sync_backend() {
    echo -e "${BLUE}Syncing backend secrets...${NC}"
    echo ""

    # Create backup
    if [ -f "$BACKEND_ENV" ]; then
        BACKUP_FILE="$BACKEND_ENV.backup.$(date +%Y%m%d_%H%M%S)"
        cp "$BACKEND_ENV" "$BACKUP_FILE"
        echo -e "${GREEN}✓${NC} Backup created: $BACKUP_FILE"
    fi

    # Filter backend secrets (all except REACT_APP_* and VITE_*)
    local BACKEND_SECRETS=$(echo "$ALL_SECRETS" | grep -v -E "^(REACT_APP_|VITE_)")
    local BACKEND_COUNT=$(echo "$BACKEND_SECRETS" | wc -l | tr -d ' ')

    # Create new .env file with header
    cat > "$BACKEND_ENV" << EOF
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
# Total Secrets: $BACKEND_COUNT
# ============================================

EOF

    # Fetch and write backend secrets
    local SUCCESS_COUNT=0
    local FAIL_COUNT=0

    while IFS= read -r SECRET_NAME; do
        [ -z "$SECRET_NAME" ] && continue

        # Get secret value
        VALUE=$(get_secret "$SECRET_NAME")

        if [ $? -eq 0 ]; then
            # Normalize secret name to ENV VAR format
            ENV_VAR_NAME=$(normalize_secret_name "$SECRET_NAME")

            # Write to .env file
            echo "${ENV_VAR_NAME}=${VALUE}" >> "$BACKEND_ENV"

            # Show progress every 20 secrets
            ((SUCCESS_COUNT++))
            if [ $((SUCCESS_COUNT % 20)) -eq 0 ]; then
                echo -e "${GREEN}✓${NC} Synced $SUCCESS_COUNT/$BACKEND_COUNT secrets..."
            fi
        else
            echo -e "${YELLOW}⚠${NC}  Skipped: ${SECRET_NAME} (access denied or not found)"
            ((FAIL_COUNT++))
        fi
    done <<< "$BACKEND_SECRETS"

    echo ""
    echo -e "${GREEN}✓ Backend .env synced: ${SUCCESS_COUNT} secrets${NC}"
    if [ $FAIL_COUNT -gt 0 ]; then
        echo -e "${YELLOW}⚠  Skipped: ${FAIL_COUNT} secrets${NC}"
    fi
    echo -e "   ${BACKEND_ENV}"
    echo ""
}

# Function to sync web secrets
sync_web() {
    echo -e "${BLUE}Syncing web secrets...${NC}"
    echo ""

    # Create backup
    if [ -f "$WEB_ENV" ]; then
        BACKUP_FILE="$WEB_ENV.backup.$(date +%Y%m%d_%H%M%S)"
        cp "$WEB_ENV" "$BACKUP_FILE"
        echo -e "${GREEN}✓${NC} Backup created: $BACKUP_FILE"
    fi

    # Filter web secrets (only REACT_APP_* and VITE_*)
    local WEB_SECRETS=$(echo "$ALL_SECRETS" | grep -E "^(REACT_APP_|VITE_)")
    local WEB_COUNT=$(echo "$WEB_SECRETS" | wc -l | tr -d ' ')

    # Create new .env file with header
    cat > "$WEB_ENV" << EOF
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
# Total Secrets: $WEB_COUNT
# ============================================

EOF

    if [ "$WEB_COUNT" -eq 0 ]; then
        echo -e "${YELLOW}⚠  No REACT_APP_* or VITE_* secrets found${NC}"
        echo ""
        return
    fi

    # Fetch and write web secrets
    local SUCCESS_COUNT=0
    local FAIL_COUNT=0

    while IFS= read -r SECRET_NAME; do
        [ -z "$SECRET_NAME" ] && continue

        # Get secret value
        VALUE=$(get_secret "$SECRET_NAME")

        if [ $? -eq 0 ]; then
            # Web secrets keep their original name (already have REACT_APP_ or VITE_ prefix)
            echo "${SECRET_NAME}=${VALUE}" >> "$WEB_ENV"
            echo -e "${GREEN}✓${NC} ${SECRET_NAME}"
            ((SUCCESS_COUNT++))
        else
            echo -e "${YELLOW}⚠${NC}  Skipped: ${SECRET_NAME} (access denied or not found)"
            ((FAIL_COUNT++))
        fi
    done <<< "$WEB_SECRETS"

    echo ""
    echo -e "${GREEN}✓ Web .env synced: ${SUCCESS_COUNT} secrets${NC}"
    if [ $FAIL_COUNT -gt 0 ]; then
        echo -e "${YELLOW}⚠  Skipped: ${FAIL_COUNT} secrets${NC}"
    fi
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
echo -e "${GREEN}✓ Secrets Synced from Google Cloud${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo ""

if [[ "$TARGET" =~ ^(backend|all)$ ]]; then
    echo -e "1. ${YELLOW}Verify backend .env:${NC}"
    echo -e "   ${GREEN}wc -l backend/.env${NC}"
    echo -e "   ${GREEN}grep -c '=' backend/.env  # Count variables${NC}"
    echo ""
    echo -e "2. ${YELLOW}Restart backend:${NC}"
    echo -e "   ${GREEN}cd backend && poetry run uvicorn app.main:app --host 0.0.0.0 --port 8090 --reload${NC}"
    echo ""
fi

if [[ "$TARGET" =~ ^(web|all)$ ]]; then
    echo -e "3. ${YELLOW}Verify web .env:${NC}"
    echo -e "   ${GREEN}wc -l web/.env${NC}"
    echo -e "   ${GREEN}grep -c '=' web/.env  # Count variables${NC}"
    echo ""
    echo -e "4. ${YELLOW}Restart web:${NC}"
    echo -e "   ${GREEN}cd web && npm run dev${NC}"
    echo ""
fi

echo -e "${GREEN}All configuration synced from Google Cloud Secret Manager!${NC}"
echo ""
