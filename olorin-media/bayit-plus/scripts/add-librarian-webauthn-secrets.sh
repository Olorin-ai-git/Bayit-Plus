#!/bin/bash
set -e

# ============================================
# Add Librarian & WebAuthn Secrets to GCloud
# ============================================
#
# This script adds all missing Librarian Agent and WebAuthn
# configuration secrets to Google Cloud Secret Manager.
#
# Usage:
#   ./scripts/add-librarian-webauthn-secrets.sh [project-id]

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_ID="${1:-$(gcloud config get-value project 2>/dev/null)}"

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}Add Librarian & WebAuthn Secrets to GCloud${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""
echo -e "Project ID: ${GREEN}${PROJECT_ID}${NC}"
echo ""

if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}Error: Project ID not specified${NC}"
    echo "Usage: $0 [project-id]"
    exit 1
fi

# Function to create secret (skip if exists)
create_secret() {
    local SECRET_NAME=$1
    local SECRET_VALUE=$2

    # Check if secret exists
    if gcloud secrets describe "$SECRET_NAME" --project="$PROJECT_ID" &>/dev/null; then
        echo -e "${YELLOW}⚠️  Secret already exists: ${SECRET_NAME}${NC}"

        # Update existing secret
        echo -n "$SECRET_VALUE" | gcloud secrets versions add "$SECRET_NAME" \
            --project="$PROJECT_ID" \
            --data-file=- &>/dev/null
        echo -e "   ${GREEN}✓${NC} Updated: ${SECRET_NAME}=${SECRET_VALUE}"
    else
        # Create new secret
        echo -n "$SECRET_VALUE" | gcloud secrets create "$SECRET_NAME" \
            --replication-policy="automatic" \
            --project="$PROJECT_ID" \
            --data-file=- &>/dev/null
        echo -e "${GREEN}✓${NC} Created: ${SECRET_NAME}=${SECRET_VALUE}"
    fi
}

echo -e "${BLUE}Adding Librarian Daily Audit Secrets...${NC}"
create_secret "LIBRARIAN_DAILY_AUDIT_CRON" "0 2 * * *"
create_secret "LIBRARIAN_DAILY_AUDIT_TIME" "2:00 AM Israel Time"
create_secret "LIBRARIAN_DAILY_AUDIT_MODE" "Rule-based"
create_secret "LIBRARIAN_DAILY_AUDIT_COST" "~\$0.01/day"
create_secret "LIBRARIAN_DAILY_AUDIT_STATUS" "ENABLED"
create_secret "LIBRARIAN_DAILY_AUDIT_DESCRIPTION" "Scans recent content and random 10% sample. Auto-fixes safe issues."

echo ""
echo -e "${BLUE}Adding Librarian Weekly Audit Secrets...${NC}"
create_secret "LIBRARIAN_WEEKLY_AUDIT_CRON" "0 3 * * 0"
create_secret "LIBRARIAN_WEEKLY_AUDIT_TIME" "Sundays 3:00 AM Israel Time"
create_secret "LIBRARIAN_WEEKLY_AUDIT_MODE" "AI Agent"
create_secret "LIBRARIAN_WEEKLY_AUDIT_COST" "~\$0.50/week"
create_secret "LIBRARIAN_WEEKLY_AUDIT_STATUS" "ENABLED"
create_secret "LIBRARIAN_WEEKLY_AUDIT_DESCRIPTION" "Claude decides what to check and fix. Sends email only for major issues."

echo ""
echo -e "${BLUE}Adding Librarian Limits & Budget Secrets...${NC}"
create_secret "LIBRARIAN_MAX_ITERATIONS" "50"
create_secret "LIBRARIAN_DEFAULT_BUDGET_USD" "10.0"
create_secret "LIBRARIAN_MIN_BUDGET_USD" "0.1"
create_secret "LIBRARIAN_MAX_BUDGET_USD" "20.0"
create_secret "LIBRARIAN_BUDGET_STEP_USD" "0.5"

echo ""
echo -e "${BLUE}Adding Librarian UI & Pagination Secrets...${NC}"
create_secret "LIBRARIAN_REPORTS_LIMIT" "10"
create_secret "LIBRARIAN_ACTIONS_LIMIT" "50"
create_secret "LIBRARIAN_ACTIVITY_PAGE_SIZE" "10"
create_secret "LIBRARIAN_ID_TRUNCATE_LENGTH" "8"
create_secret "LIBRARIAN_MODAL_MAX_HEIGHT" "600"

echo ""
echo -e "${BLUE}Adding WebAuthn (Passkey) Secrets...${NC}"
create_secret "WEBAUTHN_RP_ID" "bayit.tv"
create_secret "WEBAUTHN_RP_NAME" "Bayit Plus"
create_secret "WEBAUTHN_ORIGIN" "https://bayit.tv,https://www.bayit.tv"

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}✓ All Secrets Added Successfully${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo ""
echo -e "1. ${YELLOW}Update sync script to include new secrets${NC}"
echo -e "   ${GREEN}Edit scripts/sync-gcloud-secrets.sh${NC}"
echo ""
echo -e "2. ${YELLOW}Regenerate .env from GCloud${NC}"
echo -e "   ${GREEN}./scripts/sync-gcloud-secrets.sh backend${NC}"
echo ""
echo -e "3. ${YELLOW}Restart backend${NC}"
echo -e "   ${GREEN}cd backend && poetry run python -m app.local_server${NC}"
echo ""
