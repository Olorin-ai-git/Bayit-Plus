#!/bin/bash
# Olorin CVPlus - Cloud Run Deployment Script
# Deploys Python backend to Google Cloud Run

set -e

# Configuration
PROJECT_ID=${GCP_PROJECT_ID:-"olorin-production"}
REGION=${GCP_REGION:-"us-central1"}
SERVICE_NAME="cvplus-backend"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Olorin CVPlus - Cloud Run Deployment${NC}"
echo "=========================================="
echo "Project: ${PROJECT_ID}"
echo "Region: ${REGION}"
echo "Service: ${SERVICE_NAME}"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ gcloud CLI not found. Please install: https://cloud.google.com/sdk/docs/install${NC}"
    exit 1
fi

# Check if authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -n 1 &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not authenticated. Running gcloud auth login...${NC}"
    gcloud auth login
fi

# Set project
echo -e "${YELLOW}📋 Setting GCP project...${NC}"
gcloud config set project ${PROJECT_ID}

# Enable required APIs
echo -e "${YELLOW}🔧 Enabling required APIs...${NC}"
gcloud services enable run.googleapis.com containerregistry.googleapis.com cloudbuild.googleapis.com

# Build Docker image
echo -e "${YELLOW}🏗️  Building Docker image...${NC}"
docker build --platform linux/amd64 -t ${IMAGE_NAME}:latest .

# Tag with git commit SHA if available
if git rev-parse --short HEAD &> /dev/null; then
    GIT_SHA=$(git rev-parse --short HEAD)
    docker tag ${IMAGE_NAME}:latest ${IMAGE_NAME}:${GIT_SHA}
    echo -e "${GREEN}✅ Tagged image with git SHA: ${GIT_SHA}${NC}"
fi

# Push to Container Registry
echo -e "${YELLOW}📤 Pushing image to Container Registry...${NC}"
docker push ${IMAGE_NAME}:latest

if [ ! -z "${GIT_SHA}" ]; then
    docker push ${IMAGE_NAME}:${GIT_SHA}
fi

# Deploy to Cloud Run
echo -e "${YELLOW}🚀 Deploying to Cloud Run...${NC}"

gcloud run deploy ${SERVICE_NAME} \
  --image ${IMAGE_NAME}:latest \
  --platform managed \
  --region ${REGION} \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --timeout 300 \
  --set-env-vars="APP_ENV=production,PORT=8080" \
  --service-account=${SERVICE_NAME}@${PROJECT_ID}.iam.gserviceaccount.com

# Get service URL
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} \
  --platform managed \
  --region ${REGION} \
  --format 'value(status.url)')

echo ""
echo -e "${GREEN}✅ Deployment successful!${NC}"
echo "=========================================="
echo -e "Service URL: ${GREEN}${SERVICE_URL}${NC}"
echo -e "Health Check: ${GREEN}${SERVICE_URL}/health${NC}"
echo -e "API Docs: ${GREEN}${SERVICE_URL}/api/docs${NC}"
echo ""
echo -e "${YELLOW}📝 Next steps:${NC}"
echo "1. Configure environment variables via Google Secret Manager"
echo "2. Set up custom domain mapping"
echo "3. Configure Cloud CDN and Load Balancer"
echo "4. Enable monitoring and alerting"
echo ""
