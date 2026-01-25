#!/bin/bash

# ============================================
# Bayit+ Cloud Run Secrets Setup
# ============================================
# This script creates all required secrets in Google Secret Manager
# for Cloud Run deployment.
#
# IMPORTANT: This script reads values from backend/.env file
# Make sure your .env file has all required values set!
#
# Usage:
#   ./scripts/setup-cloud-secrets.sh
#
# ============================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Project ID
PROJECT_ID="bayit-plus"

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}Bayit+ Cloud Run Secrets Setup${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""

# Check if .env file exists
if [ ! -f "backend/.env" ]; then
    echo -e "${RED}ERROR: backend/.env file not found!${NC}"
    echo "Please create backend/.env with all required values first."
    echo "See backend/.env.example for reference."
    exit 1
fi

# Load .env file
echo -e "${YELLOW}Loading environment variables from backend/.env...${NC}"
set -a
source backend/.env
set +a

# Function to create or update a secret
create_or_update_secret() {
    local SECRET_NAME=$1
    local SECRET_VALUE=$2

    if [ -z "$SECRET_VALUE" ]; then
        echo -e "${RED}WARNING: ${SECRET_NAME} is empty! Skipping...${NC}"
        return
    fi

    echo -e "${YELLOW}Creating/updating secret: ${SECRET_NAME}${NC}"

    # Check if secret exists
    if gcloud secrets describe "${SECRET_NAME}" --project="${PROJECT_ID}" &>/dev/null; then
        echo "  Secret exists, adding new version..."
        echo -n "${SECRET_VALUE}" | gcloud secrets versions add "${SECRET_NAME}" \
            --project="${PROJECT_ID}" \
            --data-file=-
    else
        echo "  Creating new secret..."
        echo -n "${SECRET_VALUE}" | gcloud secrets create "${SECRET_NAME}" \
            --project="${PROJECT_ID}" \
            --data-file=- \
            --replication-policy="automatic"
    fi

    echo -e "${GREEN}✓ ${SECRET_NAME} configured${NC}"
}

echo ""
echo -e "${GREEN}Creating secrets in project: ${PROJECT_ID}${NC}"
echo ""

# Critical secrets
echo -e "${YELLOW}=== Critical Secrets ===${NC}"
create_or_update_secret "bayit-backend-secret-key" "${SECRET_KEY}"
create_or_update_secret "bayit-mongodb-uri" "${MONGODB_URI}"
create_or_update_secret "csrf-enabled" "${CSRF_ENABLED:-false}"

# Frontend URLs
echo ""
echo -e "${YELLOW}=== Frontend URLs ===${NC}"
create_or_update_secret "bayit-frontend-url" "${FRONTEND_URL}"
create_or_update_secret "bayit-frontend-web-url" "${FRONTEND_WEB_URL}"
create_or_update_secret "bayit-backend-cors-origins" "${BACKEND_CORS_ORIGINS}"

# AI Services (Platform-specific keys)
echo ""
echo -e "${YELLOW}=== AI Services ===${NC}"
create_or_update_secret "bayit-anthropic-api-key" "${ANTHROPIC_API_KEY}"
create_or_update_secret "bayit-openai-api-key" "${OPENAI_API_KEY}"
create_or_update_secret "bayit-elevenlabs-api-key" "${ELEVENLABS_API_KEY}"

# Storage
echo ""
echo -e "${YELLOW}=== Storage ===${NC}"
create_or_update_secret "bayit-gcs-bucket-name" "${GCS_BUCKET_NAME}"

# Content APIs
echo ""
echo -e "${YELLOW}=== Content APIs ===${NC}"
create_or_update_secret "bayit-tmdb-api-key" "${TMDB_API_KEY}"

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}✓ All secrets created successfully!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Verify secrets in Google Cloud Console:"
echo "   https://console.cloud.google.com/security/secret-manager?project=${PROJECT_ID}"
echo ""
echo "2. Grant Cloud Run service account access to secrets:"
echo "   gcloud projects add-iam-policy-binding ${PROJECT_ID} \\"
echo "     --member='serviceAccount:624470113582-compute@developer.gserviceaccount.com' \\"
echo "     --role='roles/secretmanager.secretAccessor'"
echo ""
echo "3. Deploy to Cloud Run:"
echo "   gcloud builds submit --config=cloudbuild.yaml"
echo ""
