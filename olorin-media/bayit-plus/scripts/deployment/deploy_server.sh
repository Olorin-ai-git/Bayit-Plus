#!/bin/bash

# ============================================
# Bayit+ Backend Server Deployment Script
# ============================================
# Deploys the Bayit+ backend to Google Cloud Run with intelligent
# Audible OAuth integration detection.
#
# Features:
# - Auto-detects Audible OAuth secrets in Cloud Secret Manager
# - Enables/disables Audible feature based on secret presence
# - No manual flags required - fully automatic
# - Graceful degradation if secrets missing
#
# Usage:
#   ./scripts/deployment/deploy_server.sh [environment] [region] [project]
#
# Examples:
#   ./scripts/deployment/deploy_server.sh production us-east1 bayit-plus
#   ./scripts/deployment/deploy_server.sh staging us-central1
#   ./scripts/deployment/deploy_server.sh  # Uses defaults
#
# ============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT="${1:-production}"
REGION="${2:-us-east1}"
PROJECT_ID="${3:-$(gcloud config get-value project 2>/dev/null)}"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"

# Service name based on environment
SERVICE_NAME="bayit-plus-backend"
if [ "$ENVIRONMENT" != "production" ]; then
    SERVICE_NAME="${SERVICE_NAME}-${ENVIRONMENT}"
fi

# Validate inputs
if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}❌ Error: Project ID not provided and gcloud default not set${NC}"
    echo ""
    echo "Usage:"
    echo "  ./scripts/deployment/deploy_server.sh [environment] [region] [project]"
    echo ""
    echo "Example:"
    echo "  ./scripts/deployment/deploy_server.sh production us-east1 bayit-plus"
    exit 1
fi

echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   Bayit+ Backend Server Deployment${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Environment: ${ENVIRONMENT}${NC}"
echo -e "${YELLOW}Region: ${REGION}${NC}"
echo -e "${YELLOW}Project: ${PROJECT_ID}${NC}"
echo -e "${YELLOW}Service: ${SERVICE_NAME}${NC}"
echo ""

# ===== PRE-DEPLOYMENT CHECKS =====
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo "Pre-deployment checks..."
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ Error: gcloud CLI not found${NC}"
    echo "Please install Google Cloud SDK: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if Poetry is installed
if ! command -v poetry &> /dev/null; then
    echo -e "${RED}❌ Error: poetry not found${NC}"
    echo "Please install Poetry: https://python-poetry.org/docs/#installation"
    exit 1
fi

# Check if backend directory exists
if [ ! -d "$BACKEND_DIR" ]; then
    echo -e "${RED}❌ Error: Backend directory not found at $BACKEND_DIR${NC}"
    exit 1
fi

echo -e "${GREEN}✓ All CLI tools available${NC}"
echo -e "${GREEN}✓ Backend directory found${NC}"
echo ""

# ===== AUDIBLE CONFIGURATION AUTO-DETECTION =====
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo "Auto-detecting Audible OAuth configuration..."
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

audible_client_id_exists=false
audible_client_secret_exists=false
audible_redirect_uri_exists=false

# Check if each secret exists in Cloud Secret Manager
if gcloud secrets describe bayit-audible-client-id --project="$PROJECT_ID" &>/dev/null 2>&1; then
    audible_client_id_exists=true
    echo -e "${GREEN}✓${NC} bayit-audible-client-id exists"
else
    echo -e "${YELLOW}✗${NC} bayit-audible-client-id not found"
fi

if gcloud secrets describe bayit-audible-client-secret --project="$PROJECT_ID" &>/dev/null 2>&1; then
    audible_client_secret_exists=true
    echo -e "${GREEN}✓${NC} bayit-audible-client-secret exists"
else
    echo -e "${YELLOW}✗${NC} bayit-audible-client-secret not found"
fi

if gcloud secrets describe bayit-audible-redirect-uri --project="$PROJECT_ID" &>/dev/null 2>&1; then
    audible_redirect_uri_exists=true
    echo -e "${GREEN}✓${NC} bayit-audible-redirect-uri exists"
else
    echo -e "${YELLOW}✗${NC} bayit-audible-redirect-uri not found"
fi

echo ""

# Determine if Audible should be enabled
if [ "$audible_client_id_exists" = true ] && \
   [ "$audible_client_secret_exists" = true ] && \
   [ "$audible_redirect_uri_exists" = true ]; then
    AUDIBLE_ENABLED="true"
    echo -e "${GREEN}✓ Audible Integration: ENABLED${NC}"
    echo "  All OAuth credentials found - feature will be active"
else
    AUDIBLE_ENABLED="false"
    echo -e "${YELLOW}⚠ Audible Integration: DISABLED${NC}"
    echo "  One or more credentials missing - feature will be inactive"
fi

echo ""

# ===== BUILD DOCKER IMAGE =====
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo "Building Docker image..."
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

cd "$PROJECT_ROOT"

IMAGE_NAME="gcr.io/$PROJECT_ID/bayit-backend"
BUILD_ID=$(date +%s)
IMAGE_TAG="$IMAGE_NAME:$BUILD_ID"

echo "Building image: $IMAGE_TAG"
echo ""

gcloud builds submit \
    --tag="$IMAGE_TAG" \
    --tag="$IMAGE_NAME:latest" \
    --config=cloudbuild.yaml \
    --project="$PROJECT_ID" || {
    echo -e "${RED}❌ Docker image build failed${NC}"
    exit 1
}

echo -e "${GREEN}✓ Docker image built successfully${NC}"
echo ""

# ===== CLOUD RUN DEPLOYMENT =====
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo "Deploying to Cloud Run..."
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Base deployment command
DEPLOY_CMD="gcloud run deploy $SERVICE_NAME \
    --image=$IMAGE_TAG \
    --region=$REGION \
    --platform=managed \
    --allow-unauthenticated \
    --port=8080 \
    --memory=2Gi \
    --cpu=2 \
    --timeout=300 \
    --min-instances=1 \
    --max-instances=10 \
    --cpu-boost \
    --project=$PROJECT_ID"

# Add Audible environment variable
DEPLOY_CMD="$DEPLOY_CMD \
    --set-env-vars=AUDIBLE_INTEGRATION_ENABLED=$AUDIBLE_ENABLED"

# Add Audible secrets ONLY if all are present
if [ "$AUDIBLE_ENABLED" = "true" ]; then
    DEPLOY_CMD="$DEPLOY_CMD \
        --update-secrets=AUDIBLE_CLIENT_ID=bayit-audible-client-id:latest \
        --update-secrets=AUDIBLE_CLIENT_SECRET=bayit-audible-client-secret:latest \
        --update-secrets=AUDIBLE_REDIRECT_URI=bayit-audible-redirect-uri:latest"
    echo "Including Audible secrets in deployment..."
else
    echo "Skipping Audible secrets (not all present)..."
fi

echo ""
echo "Deploying service: $SERVICE_NAME"
echo "Region: $REGION"
echo "Audible Integration: $AUDIBLE_ENABLED"
echo ""

# Execute deployment
if eval "$DEPLOY_CMD --quiet"; then
    echo -e "${GREEN}✓ Cloud Run deployment successful${NC}"
else
    echo -e "${RED}❌ Cloud Run deployment failed${NC}"
    exit 1
fi

echo ""

# ===== DEPLOYMENT SUMMARY =====
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   Deployment Complete${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Get the service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --project=$PROJECT_ID --format='value(status.url)' 2>/dev/null || echo "unknown")

echo -e "${GREEN}Service: $SERVICE_NAME${NC}"
echo -e "${GREEN}Region: $REGION${NC}"
echo -e "${GREEN}URL: $SERVICE_URL${NC}"
echo -e "${GREEN}Image: $IMAGE_TAG${NC}"
echo -e "${GREEN}Audible Integration: $AUDIBLE_ENABLED${NC}"
echo ""

echo "Next steps:"
echo "  1. Monitor the service:"
echo "     gcloud run services describe $SERVICE_NAME --region=$REGION"
echo ""
echo "  2. View logs:"
echo "     gcloud run services describe $SERVICE_NAME --region=$REGION"
echo ""
echo "  3. Check backend health:"
echo "     curl $SERVICE_URL/health"
echo ""

if [ "$AUDIBLE_ENABLED" = "true" ]; then
    echo "  ✓ Audible OAuth integration is ACTIVE"
    echo "    Users can connect their Audible accounts"
else
    echo "  ⚠ Audible OAuth integration is DISABLED"
    echo "    To enable, create Audible secrets:"
    echo "    ./scripts/deployment/.gcloud-secrets.sh $PROJECT_ID"
fi

echo ""
