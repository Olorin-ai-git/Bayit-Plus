#!/bin/bash
set -e

# ============================================
# Deploy Payment Flow Configuration to GCloud
# ============================================
#
# This script adds all payment flow secrets to Google Cloud Secret Manager
# and configures for IMMEDIATE FULL ROLLOUT (100% of users).
#
# Usage:
#   ./scripts/deploy-payment-flow-config.sh [project-id]
#
# Prerequisites:
#   - gcloud CLI installed and authenticated
#   - Appropriate IAM permissions to create secrets
#   - Service accounts must exist

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="${1:-$(gcloud config get-value project 2>/dev/null)}"
BACKEND_SA="bayit-plus-backend@${PROJECT_ID}.iam.gserviceaccount.com"
WEB_SA="bayit-plus-web@${PROJECT_ID}.iam.gserviceaccount.com"

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}Payment Flow Configuration Deployment${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""
echo -e "Project ID: ${GREEN}${PROJECT_ID}${NC}"
echo -e "Backend SA: ${GREEN}${BACKEND_SA}${NC}"
echo -e "Web SA: ${GREEN}${WEB_SA}${NC}"
echo ""

# Validate project ID
if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}Error: Project ID not specified${NC}"
    echo "Usage: $0 [project-id]"
    echo "Or set default project: gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

# Confirm with user
echo -e "${YELLOW}This will create 10 new secrets in Google Cloud Secret Manager.${NC}"
echo -e "${YELLOW}Feature will be ENABLED at 100% (immediate full rollout).${NC}"
echo ""
read -p "Continue? (yes/no): " -r
echo ""
if [[ ! $REPLY =~ ^[Yy]es$ ]]; then
    echo -e "${RED}Deployment cancelled.${NC}"
    exit 0
fi

echo -e "${BLUE}Creating secrets...${NC}"
echo ""

# Function to create or update secret
create_or_update_secret() {
    local SECRET_NAME=$1
    local SECRET_VALUE=$2
    local DESCRIPTION=$3

    echo -e "📝 ${SECRET_NAME}..."

    # Check if secret exists
    if gcloud secrets describe "$SECRET_NAME" --project="$PROJECT_ID" &>/dev/null; then
        echo -e "   ${YELLOW}Secret exists, adding new version${NC}"
        echo -n "$SECRET_VALUE" | gcloud secrets versions add "$SECRET_NAME" \
            --project="$PROJECT_ID" \
            --data-file=- 2>&1 | grep -v "Created version"
    else
        echo -e "   ${GREEN}Creating new secret${NC}"
        echo -n "$SECRET_VALUE" | gcloud secrets create "$SECRET_NAME" \
            --project="$PROJECT_ID" \
            --data-file=- \
            --replication-policy="automatic" 2>&1 | grep -v "Created secret"
    fi

    echo -e "   ${GREEN}✓${NC} ${DESCRIPTION}"
}

# Backend Secrets (9 secrets)
echo -e "${BLUE}Backend Configuration Secrets:${NC}"

create_or_update_secret \
    "REQUIRE_PAYMENT_ON_SIGNUP" \
    "true" \
    "Payment required on signup: ENABLED (100%)"

create_or_update_secret \
    "REQUIRE_PAYMENT_ON_SIGNUP_PERCENTAGE" \
    "100" \
    "Rollout percentage: 100% (all users)"

create_or_update_secret \
    "SIGNUP_TRIAL_PERIOD_DAYS" \
    "7" \
    "Trial period: 7 days free"

create_or_update_secret \
    "PAYMENT_SUCCESS_PATH" \
    "/payment/success" \
    "Success redirect path"

create_or_update_secret \
    "PAYMENT_CANCELLED_PATH" \
    "/payment/cancelled" \
    "Cancelled redirect path"

create_or_update_secret \
    "PAYMENT_STATUS_POLL_INTERVAL_MS" \
    "5000" \
    "Backend polling interval: 5s"

create_or_update_secret \
    "PAYMENT_PENDING_CLEANUP_DAYS" \
    "7" \
    "Cleanup abandoned signups: 7 days"

create_or_update_secret \
    "PAYMENT_CHECKOUT_SESSION_TTL_HOURS" \
    "24" \
    "Checkout session TTL: 24 hours"

create_or_update_secret \
    "PAYMENT_CONVERSION_THRESHOLD" \
    "0.40" \
    "Rollback threshold: 40% conversion"

echo ""
echo -e "${BLUE}Frontend Configuration Secrets:${NC}"

create_or_update_secret \
    "REACT_APP_PAYMENT_STATUS_POLL_INTERVAL_MS" \
    "5000" \
    "Frontend polling interval: 5s"

echo ""
echo -e "${BLUE}Granting service account permissions...${NC}"
echo ""

# Function to grant secret access
grant_access() {
    local SECRET_NAME=$1
    local SERVICE_ACCOUNT=$2

    echo -e "🔐 ${SECRET_NAME} → ${SERVICE_ACCOUNT}..."

    gcloud secrets add-iam-policy-binding "$SECRET_NAME" \
        --project="$PROJECT_ID" \
        --member="serviceAccount:${SERVICE_ACCOUNT}" \
        --role="roles/secretmanager.secretAccessor" \
        2>&1 | grep -v "Updated IAM policy" || true

    echo -e "   ${GREEN}✓${NC} Access granted"
}

# Grant backend access to all backend secrets
BACKEND_SECRETS=(
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

echo -e "${BLUE}Backend Service Account:${NC}"
for SECRET in "${BACKEND_SECRETS[@]}"; do
    grant_access "$SECRET" "$BACKEND_SA"
done

echo ""
echo -e "${BLUE}Frontend Service Account:${NC}"
grant_access "REACT_APP_PAYMENT_STATUS_POLL_INTERVAL_MS" "$WEB_SA"

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}✓ Secrets Created and Permissions Granted${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""

# Verify secrets
echo -e "${BLUE}Verifying secrets...${NC}"
echo ""

VERIFY_SECRETS=(
    "${BACKEND_SECRETS[@]}"
    "REACT_APP_PAYMENT_STATUS_POLL_INTERVAL_MS"
)

ALL_GOOD=true
for SECRET in "${VERIFY_SECRETS[@]}"; do
    if gcloud secrets versions access latest --secret="$SECRET" --project="$PROJECT_ID" &>/dev/null; then
        VALUE=$(gcloud secrets versions access latest --secret="$SECRET" --project="$PROJECT_ID")
        echo -e "${GREEN}✓${NC} ${SECRET}=${VALUE}"
    else
        echo -e "${RED}✗${NC} ${SECRET} - FAILED"
        ALL_GOOD=false
    fi
done

echo ""
if [ "$ALL_GOOD" = true ]; then
    echo -e "${GREEN}✓ All secrets verified successfully${NC}"
else
    echo -e "${RED}✗ Some secrets failed verification${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}Next Steps:${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""
echo -e "1. ${YELLOW}Regenerate .env files:${NC}"
echo -e "   ${GREEN}./scripts/sync-gcloud-secrets.sh all${NC}"
echo ""
echo -e "2. ${YELLOW}Verify .env files contain new secrets:${NC}"
echo -e "   ${GREEN}grep REQUIRE_PAYMENT_ON_SIGNUP backend/.env${NC}"
echo -e "   ${GREEN}grep REACT_APP_PAYMENT_STATUS_POLL_INTERVAL_MS web/.env${NC}"
echo ""
echo -e "3. ${YELLOW}Restart backend:${NC}"
echo -e "   ${GREEN}cd backend && poetry run python -m app.local_server${NC}"
echo -e "   ${GREEN}# Or in production:${NC}"
echo -e "   ${GREEN}kubectl rollout restart deployment/bayit-plus-backend${NC}"
echo ""
echo -e "4. ${YELLOW}Restart frontend:${NC}"
echo -e "   ${GREEN}cd web && npm start${NC}"
echo -e "   ${GREEN}# Or in production:${NC}"
echo -e "   ${GREEN}kubectl rollout restart deployment/bayit-plus-web${NC}"
echo ""
echo -e "5. ${YELLOW}Monitor metrics:${NC}"
echo -e "   - Signup attempts: ${GREEN}signup_started_total${NC}"
echo -e "   - Payment required: ${GREEN}signup_payment_required_total${NC}"
echo -e "   - Payment completed: ${GREEN}signup_payment_completed_total${NC}"
echo -e "   - Conversion rate: ${GREEN}signup_payment_completed / signup_payment_required${NC}"
echo ""
echo -e "${GREEN}Payment flow is now ENABLED at 100%!${NC}"
echo -e "${YELLOW}All new signups will require payment with 7-day free trial.${NC}"
echo ""
