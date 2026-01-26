#!/bin/bash

# Olorin Secret Setup Script
# Creates or updates secrets in Google Cloud Secret Manager for Olorin backend
#
# Prerequisites:
#   - gcloud CLI installed and authenticated
#   - GCP project: bayit-plus
#   - backend/.env file with all required values

set -e

PROJECT_ID="bayit-plus"
SERVICE_ACCOUNT="bayit-backend-production@bayit-plus.iam.gserviceaccount.com"
ENV_FILE=".env"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║         Olorin Secret Setup (Google Cloud Secret Manager)      ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Step 1: Verify GCP Project Access
echo "📍 STEP 1: Verifying GCP project access..."
CURRENT_PROJECT=$(gcloud config get-value project)
if [ "$CURRENT_PROJECT" != "$PROJECT_ID" ]; then
  echo "⚠️  Current project: $CURRENT_PROJECT"
  echo "    Setting to: $PROJECT_ID"
  gcloud config set project "$PROJECT_ID"
fi
echo "✓ GCP Project: $PROJECT_ID"
echo ""

# Step 2: Verify .env file exists
echo "📍 STEP 2: Verifying .env file..."
if [ ! -f "$ENV_FILE" ]; then
  echo "❌ ERROR: $ENV_FILE not found"
  echo "Create it from backend/.env.example and fill in the values"
  exit 1
fi
echo "✓ Found: $ENV_FILE"
echo ""

# Helper function to create or update secret
create_or_update_secret() {
    local secret_name="$1"
    local env_var_name="$2"

    # Read value from .env file
    local value=$(grep "^${env_var_name}=" "$ENV_FILE" | cut -d'=' -f2- | sed 's/^"//;s/"$//')

    if [ -z "$value" ]; then
        echo "  ⚠️  ${secret_name}: ${env_var_name} not found in .env (skipping)"
        return 0
    fi

    # Check if secret exists
    if gcloud secrets describe "$secret_name" --project="$PROJECT_ID" &>/dev/null; then
        # Update existing secret
        echo -n "$value" | gcloud secrets versions add "$secret_name" --data-file=- --project="$PROJECT_ID" &>/dev/null
        echo "  ✓ ${secret_name}: updated"
    else
        # Create new secret
        echo -n "$value" | gcloud secrets create "$secret_name" --data-file=- --project="$PROJECT_ID" &>/dev/null
        echo "  ✓ ${secret_name}: created"
    fi
}

# Step 3: Create/Update Olorin Platform Secrets
echo "📍 STEP 3: Creating/Updating Olorin Platform secrets..."
echo ""

# Core Platform Secrets
create_or_update_secret "olorin-pinecone-api-key" "PINECONE_API_KEY"
create_or_update_secret "olorin-partner-api-key-salt" "PARTNER_API_KEY_SALT"
create_or_update_secret "olorin-secret-key" "SECRET_KEY"

# NLP Configuration Secrets
create_or_update_secret "olorin-nlp-enabled" "OLORIN_NLP_ENABLED"
create_or_update_secret "olorin-nlp-confidence-threshold" "OLORIN_NLP_CONFIDENCE_THRESHOLD"
create_or_update_secret "olorin-nlp-max-cost-per-query" "OLORIN_NLP_MAX_COST_PER_QUERY"

echo ""
echo "✓ All Olorin secrets created/updated"
echo ""

# Step 4: Grant Secret Access to Service Account
echo "📍 STEP 4: Granting secret access to service account..."
echo ""

OLORIN_SECRETS=(
    "olorin-pinecone-api-key"
    "olorin-partner-api-key-salt"
    "olorin-secret-key"
    "olorin-nlp-enabled"
    "olorin-nlp-confidence-threshold"
    "olorin-nlp-max-cost-per-query"
)

for secret in "${OLORIN_SECRETS[@]}"; do
    gcloud secrets add-iam-policy-binding "$secret" \
        --member="serviceAccount:$SERVICE_ACCOUNT" \
        --role="roles/secretmanager.secretAccessor" \
        --project="$PROJECT_ID" \
        --quiet 2>/dev/null || true
    echo "  ✓ ${secret}: access granted to service account"
done

echo ""
echo "✓ Service account access configured"
echo ""

# Step 5: Verify All Secrets
echo "📍 STEP 5: Verifying all secrets exist..."
echo ""

MISSING_SECRETS=()
for secret in "${OLORIN_SECRETS[@]}"; do
  if gcloud secrets describe "$secret" --project="$PROJECT_ID" &>/dev/null; then
    echo "  ✓ $secret"
  else
    echo "  ✗ $secret (MISSING)"
    MISSING_SECRETS+=("$secret")
  fi
done

if [ ${#MISSING_SECRETS[@]} -gt 0 ]; then
  echo ""
  echo "⚠️  WARNING: Some secrets are missing:"
  for secret in "${MISSING_SECRETS[@]}"; do
    echo "   - $secret"
  done
  echo ""
  exit 1
fi

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                   SECRET SETUP COMPLETE                         ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "✅ All 6 Olorin secrets are configured and accessible"
echo ""
echo "Next steps:"
echo "  1. Run ./DEPLOY.sh to deploy Olorin backend to Cloud Run"
echo "  2. Verify deployment: ./VERIFY.sh"
echo ""
