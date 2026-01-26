#!/bin/bash
################################################################################
# Deploy Library Integrity Check as Cloud Run Job
#
# This script creates a Cloud Run Job that can be triggered by Cloud Scheduler
# to run weekly integrity checks on the Bayit+ media library.
#
# Usage:
#   ./deploy-job.sh [--live] [--verify-hashes] [--verify-streaming]
#
# Options:
#   --live                Enable live mode (updates database)
#   --verify-hashes       Enable hash verification (EXPENSIVE)
#   --verify-streaming    Enable streaming validation (adds time)
################################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="${GCP_PROJECT_ID:-bayit-plus}"
REGION="${GCP_REGION:-us-east1}"
JOB_NAME="library-integrity-check"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${JOB_NAME}"
SERVICE_ACCOUNT="${CLOUD_RUN_SERVICE_ACCOUNT:-bayit-plus-cloud-run@${PROJECT_ID}.iam.gserviceaccount.com}"

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# Parse arguments
DRY_RUN="--dry-run"
VERIFY_HASHES=""
VERIFY_STREAMING=""

for arg in "$@"; do
  case $arg in
    --live)
      DRY_RUN="--live"
      shift
      ;;
    --verify-hashes)
      VERIFY_HASHES="--verify-hashes"
      shift
      ;;
    --verify-streaming)
      VERIFY_STREAMING="--verify-streaming"
      shift
      ;;
  esac
done

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       Deploy Library Integrity Check Cloud Run Job                ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ gcloud CLI is not installed${NC}"
    echo -e "${YELLOW}Install: https://cloud.google.com/sdk/docs/install${NC}"
    exit 1
fi

# Check if authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not authenticated with gcloud${NC}"
    echo -e "${YELLOW}Run: gcloud auth login${NC}"
    exit 1
fi

# Set project
echo -e "${BLUE}📋 Setting GCP project: ${PROJECT_ID}${NC}"
gcloud config set project "${PROJECT_ID}"

# Enable required APIs
echo -e "${BLUE}🔧 Enabling required GCP APIs...${NC}"
gcloud services enable \
  run.googleapis.com \
  containerregistry.googleapis.com \
  cloudscheduler.googleapis.com \
  cloudbuild.googleapis.com \
  --quiet

# Build and push Docker image using Cloud Build
echo -e "${BLUE}🐳 Building Docker image with Cloud Build...${NC}"
cd "${PROJECT_ROOT}"

# Create temporary cloudbuild.yaml
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
cat > /tmp/cloudbuild-library-integrity.yaml <<EOF_BUILD
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-f'
      - 'infrastructure/scheduled-jobs/library-integrity/Dockerfile'
      - '-t'
      - '${IMAGE_NAME}:latest'
      - '-t'
      - '${IMAGE_NAME}:${TIMESTAMP}'
      - '.'
images:
  - '${IMAGE_NAME}:latest'
  - '${IMAGE_NAME}:${TIMESTAMP}'
timeout: 3600s
EOF_BUILD

gcloud builds submit \
  --config=/tmp/cloudbuild-library-integrity.yaml \
  .

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Cloud Build failed${NC}"
    rm -f /tmp/cloudbuild-library-integrity.yaml
    exit 1
fi

rm -f /tmp/cloudbuild-library-integrity.yaml

# Load environment variables from olorin-infra
if [ -f "/Users/olorin/Documents/olorin/olorin-infra/.env" ]; then
    source /Users/olorin/Documents/olorin/olorin-infra/.env
fi

# Create or update Cloud Run Job
echo -e "${BLUE}☁️  Creating/updating Cloud Run Job...${NC}"

# Build command arguments
CMD_ARGS="${DRY_RUN} ${VERIFY_HASHES} ${VERIFY_STREAMING} --batch-size 100 --concurrency 20"

gcloud run jobs deploy "${JOB_NAME}" \
  --image="${IMAGE_NAME}:latest" \
  --region="${REGION}" \
  --service-account="${SERVICE_ACCOUNT}" \
  --memory=2Gi \
  --cpu=2 \
  --max-retries=0 \
  --task-timeout=1h \
  --set-env-vars="DEBUG=false" \
  --set-env-vars="LOG_LEVEL=INFO" \
  --set-env-vars="MONGODB_URI=${MONGODB_URI}" \
  --set-env-vars="SECRET_KEY=${SECRET_KEY}" \
  --set-env-vars="GCP_PROJECT_ID=${GCP_PROJECT_ID}" \
  --set-env-vars="GCS_BUCKET_NAME=${GCS_BUCKET_NAME:-bayit-plus-media-new}" \
  --args="${CMD_ARGS}" \
  --quiet

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Cloud Run Job deployment failed${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Cloud Run Job deployed successfully!${NC}"
echo ""
echo -e "${BLUE}Job Details:${NC}"
echo -e "  Name: ${JOB_NAME}"
echo -e "  Region: ${REGION}"
echo -e "  Image: ${IMAGE_NAME}:latest"
echo -e "  Mode: ${DRY_RUN}"
echo -e "  Batch size: 100"
echo -e "  Concurrency: 20"
echo ""

# Test the job (optional)
echo -e "${YELLOW}To test the job manually:${NC}"
echo -e "  gcloud run jobs execute ${JOB_NAME} --region=${REGION}"
echo ""
echo -e "${YELLOW}To view job executions:${NC}"
echo -e "  gcloud run jobs executions list --job=${JOB_NAME} --region=${REGION}"
echo ""
echo -e "${YELLOW}To view logs:${NC}"
echo -e "  gcloud run jobs executions describe <execution-id> --region=${REGION}"
echo ""
echo -e "${GREEN}Next step: Run setup-scheduler.sh to schedule weekly execution${NC}"
