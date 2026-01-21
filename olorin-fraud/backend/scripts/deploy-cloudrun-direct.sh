#!/bin/bash
# Manual deployment script for Olorin Backend to Google Cloud Run
# Usage: ./scripts/deploy-cloudrun-direct.sh [staging|production]

set -euo pipefail

# Configuration
PROJECT_ID="olorin-fraud-detection"
REGION="us-east1"
ARTIFACT_REGISTRY="us-east1-docker.pkg.dev"
SERVICE_ACCOUNT="olorin-detection@olorin-fraud-detection.iam.gserviceaccount.com"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse environment argument
ENVIRONMENT="${1:-staging}"
if [[ ! "$ENVIRONMENT" =~ ^(staging|production)$ ]]; then
    echo -e "${RED}❌ Invalid environment: $ENVIRONMENT${NC}"
    echo "Usage: $0 [staging|production]"
    exit 1
fi

echo -e "${GREEN}🚀 Deploying Olorin Backend to Cloud Run${NC}"
echo "Environment: $ENVIRONMENT"
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo ""

# Change to olorin-server directory
cd "$(dirname "$0")/.." || exit 1

# Authenticate with service account key
echo -e "${YELLOW}🔐 Authenticating with Google Cloud...${NC}"
if [ -f "$HOME/.gcp/olorin-fraud-detection-key.json" ]; then
    gcloud auth activate-service-account \
        --key-file="$HOME/.gcp/olorin-fraud-detection-key.json" \
        --project="$PROJECT_ID"
elif [ -f "/Users/olorin/Documents/olorin/olorin-server/olorin-fraud-detection-dc83c2976247.json" ]; then
    echo -e "${YELLOW}⚠️  Using key from project directory (should be moved to ~/.gcp/)${NC}"
    gcloud auth activate-service-account \
        --key-file="/Users/olorin/Documents/olorin/olorin-server/olorin-fraud-detection-dc83c2976247.json" \
        --project="$PROJECT_ID"
else
    echo -e "${RED}❌ Service account key not found${NC}"
    echo "Expected locations:"
    echo "  - $HOME/.gcp/olorin-fraud-detection-key.json"
    echo "  - /Users/olorin/Documents/olorin/olorin-server/olorin-fraud-detection-dc83c2976247.json"
    exit 1
fi

# Set project
gcloud config set project "$PROJECT_ID" --quiet

# Build Docker image
echo -e "${YELLOW}🏗️  Building Docker image...${NC}"
IMAGE_TAG="$ARTIFACT_REGISTRY/$PROJECT_ID/olorin/backend:$(date +%Y%m%d-%H%M%S)"
IMAGE_LATEST="$ARTIFACT_REGISTRY/$PROJECT_ID/olorin/backend:latest"

docker build \
    -t "$IMAGE_TAG" \
    -t "$IMAGE_LATEST" \
    -f Dockerfile.cloudrun \
    --build-arg APP_ENV="$ENVIRONMENT" \
    .

# Push to Artifact Registry
echo -e "${YELLOW}📤 Pushing image to Artifact Registry...${NC}"
gcloud auth configure-docker "$ARTIFACT_REGISTRY" --quiet
docker push "$IMAGE_TAG"
docker push "$IMAGE_LATEST"

echo -e "${GREEN}✅ Image pushed successfully${NC}"
echo "Image: $IMAGE_TAG"
echo ""

# Set environment-specific configuration
if [ "$ENVIRONMENT" = "production" ]; then
    MIN_INSTANCES=1
    MAX_INSTANCES=10
    MEMORY="4Gi"
    CPU=2
else
    MIN_INSTANCES=0
    MAX_INSTANCES=5
    MEMORY="2Gi"
    CPU=1
fi

# Check if environment variable files exist
if [ ! -f "cloudrun-env-vars.$ENVIRONMENT.txt" ]; then
    echo -e "${RED}❌ Environment variables file not found: cloudrun-env-vars.$ENVIRONMENT.txt${NC}"
    exit 1
fi

if [ ! -f "cloudrun-secrets.txt" ]; then
    echo -e "${RED}❌ Secrets file not found: cloudrun-secrets.txt${NC}"
    exit 1
fi

# Deploy to Cloud Run
echo -e "${YELLOW}🚀 Deploying to Cloud Run ($ENVIRONMENT)...${NC}"
gcloud run deploy "olorin-backend-$ENVIRONMENT" \
    --image="$IMAGE_TAG" \
    --region="$REGION" \
    --platform=managed \
    --port=8090 \
    --memory="$MEMORY" \
    --cpu="$CPU" \
    --min-instances="$MIN_INSTANCES" \
    --max-instances="$MAX_INSTANCES" \
    --concurrency=80 \
    --timeout=300s \
    --service-account="$SERVICE_ACCOUNT" \
    --ingress=all \
    --allow-unauthenticated \
    --execution-environment=gen2 \
    --cpu-throttling=false \
    --set-env-vars="$(cat cloudrun-env-vars.$ENVIRONMENT.txt)" \
    --set-secrets="$(cat cloudrun-secrets.txt)" \
    --project="$PROJECT_ID" \
    --quiet

# Get service URL
SERVICE_URL=$(gcloud run services describe "olorin-backend-$ENVIRONMENT" \
    --region="$REGION" \
    --format='value(status.url)' \
    --project="$PROJECT_ID")

# Verify health
echo -e "${YELLOW}🏥 Verifying health...${NC}"
for i in {1..12}; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$SERVICE_URL/health" || echo "000")
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✅ Health check passed (HTTP $HTTP_CODE)${NC}"
        break
    fi
    echo "⏳ Waiting... Attempt $i/12 (HTTP $HTTP_CODE)"
    sleep 10
done

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Service URL:${NC} $SERVICE_URL"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Test the service:"
echo "   curl $SERVICE_URL/health"
echo ""
echo "2. View logs:"
echo "   gcloud run services logs read olorin-backend-$ENVIRONMENT --region=$REGION --project=$PROJECT_ID --follow"
echo ""
echo "3. Monitor metrics:"
echo "   https://console.cloud.google.com/run/detail/$REGION/olorin-backend-$ENVIRONMENT/metrics?project=$PROJECT_ID"
echo ""
echo "4. Run smoke tests:"
echo "   ./scripts/test-deployment.sh $SERVICE_URL"
