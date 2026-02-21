#!/bin/bash

# ============================================
# Bayit+ WebSocket Gateway Deployment Script
# ============================================
# Deploys the Bayit+ WebSocket Gateway to Google Cloud Run via Cloud Build.
# Uses bayit-ws-gateway/cloudbuild-ws-gateway.yaml for Docker build and deployment.
#
# The gateway handles all WebSocket connections (chat, dubbing, trivia, chess, DM,
# watch parties) on a separate Cloud Run service with 3600s timeout.
#
# Usage:
#   ./scripts/deployment/deploy_ws_gateway.sh [environment] [region] [project]
#
# Examples:
#   ./scripts/deployment/deploy_ws_gateway.sh production us-east1 bayit-plus
#   ./scripts/deployment/deploy_ws_gateway.sh staging us-central1
#   ./scripts/deployment/deploy_ws_gateway.sh  # Uses defaults
#
# Prerequisites:
#   - Redis (Memorystore) provisioned (run provision-ws-gateway-infra.sh first)
#   - VPC connector attached
#   - bayit-redis-url secret in Secret Manager
#
# ============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
ENVIRONMENT="${1:-production}"
REGION="${2:-us-east1}"
PROJECT_ID="${3:-bayit-plus}"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
GATEWAY_DIR="$PROJECT_ROOT/bayit-ws-gateway"
VPC_CONNECTOR="bayit-vpc-connector"

SERVICE_NAME="bayit-ws-gateway"
if [ "$ENVIRONMENT" != "production" ]; then
    SERVICE_NAME="bayit-ws-gateway-${ENVIRONMENT}"
fi

# Validate inputs
if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}Error: Project ID not provided and gcloud default not set${NC}"
    echo ""
    echo "Usage:"
    echo "  ./scripts/deployment/deploy_ws_gateway.sh [environment] [region] [project]"
    exit 1
fi

echo -e "${BLUE}======================================================${NC}"
echo -e "${BLUE}   Bayit+ WebSocket Gateway Deployment${NC}"
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

if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Error: gcloud CLI not found${NC}"
    echo "Please install Google Cloud SDK: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

if [ ! -d "$GATEWAY_DIR" ]; then
    echo -e "${RED}Error: Gateway directory not found at $GATEWAY_DIR${NC}"
    exit 1
fi

if [ ! -f "$GATEWAY_DIR/cloudbuild-ws-gateway.yaml" ]; then
    echo -e "${RED}Error: cloudbuild-ws-gateway.yaml not found${NC}"
    exit 1
fi

# Verify Redis secret exists
if ! gcloud secrets describe bayit-redis-url --project="$PROJECT_ID" &>/dev/null; then
    echo -e "${RED}Error: bayit-redis-url secret not found in Secret Manager${NC}"
    echo "Run ./scripts/provision-ws-gateway-infra.sh first"
    exit 1
fi

# Verify VPC connector exists
if ! gcloud compute networks vpc-access connectors describe "$VPC_CONNECTOR" --region="$REGION" --project="$PROJECT_ID" &>/dev/null; then
    echo -e "${RED}Error: VPC connector '$VPC_CONNECTOR' not found${NC}"
    echo "Run ./scripts/provision-ws-gateway-infra.sh first"
    exit 1
fi

echo -e "${GREEN}All CLI tools available${NC}"
echo -e "${GREEN}Gateway directory found${NC}"
echo -e "${GREEN}Redis secret verified${NC}"
echo -e "${GREEN}VPC connector verified${NC}"
echo ""

# ===== SET GCP PROJECT =====
echo -e "${BLUE}Setting GCP project to ${PROJECT_ID}${NC}"
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
echo "Config: bayit-ws-gateway/cloudbuild-ws-gateway.yaml"
echo ""

gcloud builds submit \
    --config=bayit-ws-gateway/cloudbuild-ws-gateway.yaml \
    --substitutions=_BUILD_ID="$BUILD_ID" \
    --project="$PROJECT_ID" || {
    echo -e "${RED}Cloud Build failed${NC}"
    exit 1
}

echo ""
echo -e "${GREEN}Cloud Build successful${NC}"
echo ""

# ===== ATTACH VPC CONNECTOR =====
echo -e "${BLUE}======================================================${NC}"
echo "Attaching VPC connector for Redis access..."
echo -e "${BLUE}======================================================${NC}"
echo ""

gcloud run services update "$SERVICE_NAME" \
    --region="$REGION" \
    --vpc-connector="$VPC_CONNECTOR" \
    --vpc-egress=private-ranges-only \
    --project="$PROJECT_ID" || {
    echo -e "${YELLOW}Warning: VPC connector attachment failed (may already be attached)${NC}"
}

echo ""

# ===== HEALTH CHECK =====
echo -e "${BLUE}======================================================${NC}"
echo "Running health check..."
echo -e "${BLUE}======================================================${NC}"
echo ""

SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" --region="$REGION" --project="$PROJECT_ID" --format='value(status.url)' 2>/dev/null || echo "")

if [ -n "$SERVICE_URL" ]; then
    HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "${SERVICE_URL}/health" 2>/dev/null || echo "000")
    if [ "$HEALTH_RESPONSE" = "200" ]; then
        echo -e "${GREEN}Health check passed (HTTP 200)${NC}"
    else
        echo -e "${YELLOW}Health check returned HTTP $HEALTH_RESPONSE (service may still be starting)${NC}"
    fi
else
    echo -e "${YELLOW}Could not determine service URL${NC}"
fi

echo ""

# ===== VERIFY REDIS CONNECTIVITY =====
echo -e "${BLUE}======================================================${NC}"
echo "Checking Redis connectivity in logs..."
echo -e "${BLUE}======================================================${NC}"
echo ""

sleep 5  # Give the service a moment to start

REDIS_LOGS=$(gcloud logging read \
    "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${SERVICE_NAME}\" AND (jsonPayload.message=~\"Redis\" OR textPayload=~\"Redis\")" \
    --project="$PROJECT_ID" --limit=5 --format='value(jsonPayload.message,textPayload)' 2>/dev/null || echo "")

if echo "$REDIS_LOGS" | grep -qi "initialized\|connected"; then
    echo -e "${GREEN}Redis connection confirmed in logs${NC}"
elif [ -z "$REDIS_LOGS" ]; then
    echo -e "${YELLOW}No Redis logs found yet (service may still be starting)${NC}"
else
    echo -e "${YELLOW}Redis logs:${NC}"
    echo "$REDIS_LOGS"
fi

echo ""

# ===== DEPLOYMENT SUMMARY =====
echo -e "${BLUE}======================================================${NC}"
echo -e "${BLUE}   Deployment Complete${NC}"
echo -e "${BLUE}======================================================${NC}"
echo ""

echo -e "${GREEN}Service: $SERVICE_NAME${NC}"
echo -e "${GREEN}Region: $REGION${NC}"
echo -e "${GREEN}URL: ${SERVICE_URL:-unknown}${NC}"
echo -e "${GREEN}Image: gcr.io/$PROJECT_ID/bayit-ws-gateway:$BUILD_ID${NC}"
echo -e "${GREEN}VPC: $VPC_CONNECTOR${NC}"
echo ""

echo "Next steps:"
echo "  1. Check health: curl ${SERVICE_URL:-<service-url>}/health"
echo "  2. View logs: gcloud run services logs read $SERVICE_NAME --region=$REGION"
echo "  3. DNS: Map ws.bayit.tv to this service"
echo "  4. Monitor: https://console.cloud.google.com/run?project=$PROJECT_ID"
echo ""
