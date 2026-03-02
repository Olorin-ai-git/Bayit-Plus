#!/bin/bash

# ============================================
# Bayit+ Media Pipeline Service Deployment Script
# ============================================
# Deploys the Bayit+ Media Pipeline service to Google Cloud Run via Cloud Build.
# Uses bayit-media-pipeline/cloudbuild-media.yaml for Docker build and deployment.
#
# Usage:
#   ./scripts/deployment/deploy_media.sh [environment] [region] [project]
#
# ============================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ENVIRONMENT="${1:-production}"
REGION="${2:-us-east1}"
PROJECT_ID="${3:-bayit-plus}"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

SERVICE_NAME="bayit-media-pipeline"
if [ "$ENVIRONMENT" != "production" ]; then
    SERVICE_NAME="bayit-media-pipeline-${ENVIRONMENT}"
fi

if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}Error: Project ID not provided${NC}"
    echo "Usage: ./scripts/deployment/deploy_media.sh [environment] [region] [project]"
    exit 1
fi

echo -e "${BLUE}======================================================${NC}"
echo -e "${BLUE}   Bayit+ Media Pipeline Service Deployment${NC}"
echo -e "${BLUE}======================================================${NC}"
echo ""
echo -e "${YELLOW}Environment: ${ENVIRONMENT}${NC}"
echo -e "${YELLOW}Region: ${REGION}${NC}"
echo -e "${YELLOW}Project: ${PROJECT_ID}${NC}"
echo -e "${YELLOW}Service: ${SERVICE_NAME}${NC}"
echo ""

if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Error: gcloud CLI not found${NC}"
    exit 1
fi

if [ ! -f "$PROJECT_ROOT/bayit-media-pipeline/cloudbuild-media.yaml" ]; then
    echo -e "${RED}Error: cloudbuild-media.yaml not found${NC}"
    exit 1
fi

gcloud config set project "${PROJECT_ID}"

cd "$PROJECT_ROOT"
BUILD_ID=$(date +%s)

echo "Build ID: $BUILD_ID"
echo "Config: bayit-media-pipeline/cloudbuild-media.yaml"
echo ""

gcloud builds submit \
    --config=bayit-media-pipeline/cloudbuild-media.yaml \
    --substitutions=_BUILD_ID="$BUILD_ID" \
    --project="$PROJECT_ID" || {
    echo -e "${RED}Deployment failed${NC}"
    exit 1
}

echo ""
echo -e "${GREEN}Deployment successful${NC}"
echo ""

SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" --region="$REGION" --project="$PROJECT_ID" --format='value(status.url)' 2>/dev/null || echo "unknown")

echo -e "${GREEN}Service: $SERVICE_NAME${NC}"
echo -e "${GREEN}Region: $REGION${NC}"
echo -e "${GREEN}URL: $SERVICE_URL${NC}"
echo -e "${GREEN}Image: gcr.io/$PROJECT_ID/bayit-media-pipeline:$BUILD_ID${NC}"
echo ""
echo "Next steps:"
echo "  1. Check health: curl $SERVICE_URL/health"
echo "  2. View logs: gcloud run services logs read $SERVICE_NAME --region=$REGION"
echo ""
