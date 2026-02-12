#!/bin/bash

# ============================================
# Bayit+ Backend Server Deployment Script
# ============================================
# Deploys the Bayit+ backend to Google Cloud Run via Cloud Build.
# Uses cloudbuild.yaml which handles Docker build and Cloud Run deployment.
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
PROJECT_ID="${3:-bayit-plus}"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"

# Service name - uses bayit-backend-production (managed via cloudbuild.yaml)
SERVICE_NAME="bayit-backend-production"
if [ "$ENVIRONMENT" != "production" ]; then
    SERVICE_NAME="bayit-backend-${ENVIRONMENT}"
fi

# Validate inputs
if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}Error: Project ID not provided and gcloud default not set${NC}"
    echo ""
    echo "Usage:"
    echo "  ./scripts/deployment/deploy_server.sh [environment] [region] [project]"
    echo ""
    echo "Example:"
    echo "  ./scripts/deployment/deploy_server.sh production us-east1 bayit-plus"
    exit 1
fi

echo -e "${BLUE}======================================================${NC}"
echo -e "${BLUE}   Bayit+ Backend Server Deployment${NC}"
echo -e "${BLUE}======================================================${NC}"
echo ""
echo -e "${YELLOW}Environment: ${ENVIRONMENT}${NC}"
echo -e "${YELLOW}Region: ${REGION}${NC}"
echo -e "${YELLOW}Project: ${PROJECT_ID}${NC}"
echo -e "${YELLOW}Service: ${SERVICE_NAME}${NC}"
echo ""

# ===== PRE-DEPLOYMENT CHECKS =====
echo -e "${BLUE}======================================================${NC}"
echo "Pre-deployment checks..."
echo -e "${BLUE}======================================================${NC}"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Error: gcloud CLI not found${NC}"
    echo "Please install Google Cloud SDK: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if backend directory exists
if [ ! -d "$BACKEND_DIR" ]; then
    echo -e "${RED}Error: Backend directory not found at $BACKEND_DIR${NC}"
    exit 1
fi

echo -e "${GREEN}All CLI tools available${NC}"
echo -e "${GREEN}Backend directory found${NC}"
echo ""

# ===== SET GCP PROJECT =====
echo -e "${BLUE}📋 Setting GCP project to ${PROJECT_ID}${NC}"
gcloud config set project "${PROJECT_ID}"
echo ""

# ===== BUILD AND DEPLOY VIA CLOUD BUILD =====
echo -e "${BLUE}======================================================${NC}"
echo "Building and deploying via Cloud Build..."
echo -e "${BLUE}======================================================${NC}"
echo ""

cd "$PROJECT_ROOT"

BUILD_ID=$(date +%s)

echo "Build ID: $BUILD_ID"
echo "Config: cloudbuild.yaml"
echo ""

# Run Cloud Build which handles:
# 1. Docker image build
# 2. Push to Container Registry
# 3. Deploy to Cloud Run (bayit-backend-production)
gcloud builds submit \
    --config=cloudbuild.yaml \
    --substitutions=_BUILD_ID="$BUILD_ID" \
    --project="$PROJECT_ID" || {
    echo -e "${RED}Deployment failed${NC}"
    exit 1
}

echo ""
echo -e "${GREEN}Deployment successful${NC}"
echo ""

# ===== DEPLOYMENT SUMMARY =====
echo -e "${BLUE}======================================================${NC}"
echo -e "${BLUE}   Deployment Complete${NC}"
echo -e "${BLUE}======================================================${NC}"
echo ""

# Get the service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --project=$PROJECT_ID --format='value(status.url)' 2>/dev/null || echo "unknown")

echo -e "${GREEN}Service: $SERVICE_NAME${NC}"
echo -e "${GREEN}Region: $REGION${NC}"
echo -e "${GREEN}URL: $SERVICE_URL${NC}"
echo -e "${GREEN}Image: gcr.io/$PROJECT_ID/bayit-backend:$BUILD_ID${NC}"
echo ""

echo "Next steps:"
echo "  1. Check health: curl $SERVICE_URL/health"
echo "  2. View logs: gcloud run services logs read $SERVICE_NAME --region=$REGION"
echo "  3. Monitor: https://console.cloud.google.com/run?project=$PROJECT_ID"
echo ""
