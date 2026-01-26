#!/bin/bash
################################################################################
# Setup Cloud Scheduler for Library Integrity Check
#
# This script creates a Cloud Scheduler job that triggers the library integrity
# Cloud Run Job weekly (every Sunday at 2 AM UTC).
#
# Prerequisites:
#   - Cloud Run Job must be deployed first (run deploy-job.sh)
#   - gcloud CLI authenticated with proper permissions
#
# Usage:
#   ./setup-scheduler.sh
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
REGION="${GCP_REGION:-us-central1}"
JOB_NAME="library-integrity-check"
SCHEDULER_JOB_NAME="library-integrity-weekly-check"
SERVICE_ACCOUNT="${CLOUD_RUN_SERVICE_ACCOUNT:-bayit-plus-cloud-run@${PROJECT_ID}.iam.gserviceaccount.com}"

# Schedule: Every Sunday at 2:00 AM UTC
SCHEDULE="0 2 * * 0"
TIMEZONE="UTC"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       Setup Cloud Scheduler for Library Integrity Check           ║${NC}"
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
echo -e "${BLUE}🔧 Enabling Cloud Scheduler API...${NC}"
gcloud services enable cloudscheduler.googleapis.com --quiet

# Check if Cloud Run Job exists
echo -e "${BLUE}🔍 Checking if Cloud Run Job exists...${NC}"
if ! gcloud run jobs describe "${JOB_NAME}" --region="${REGION}" &> /dev/null; then
    echo -e "${RED}❌ Cloud Run Job '${JOB_NAME}' does not exist${NC}"
    echo -e "${YELLOW}Run deploy-job.sh first to create the Cloud Run Job${NC}"
    exit 1
fi

# Get Cloud Run Job details
JOB_URI=$(gcloud run jobs describe "${JOB_NAME}" --region="${REGION}" --format="value(status.uri)")

# Delete existing scheduler job if it exists
if gcloud scheduler jobs describe "${SCHEDULER_JOB_NAME}" --location="${REGION}" &> /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Existing scheduler job found. Deleting...${NC}"
    gcloud scheduler jobs delete "${SCHEDULER_JOB_NAME}" \
      --location="${REGION}" \
      --quiet
fi

# Create Cloud Scheduler job
echo -e "${BLUE}⏰ Creating Cloud Scheduler job...${NC}"
gcloud scheduler jobs create http "${SCHEDULER_JOB_NAME}" \
  --location="${REGION}" \
  --schedule="${SCHEDULE}" \
  --time-zone="${TIMEZONE}" \
  --uri="https://${REGION}-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/${PROJECT_ID}/jobs/${JOB_NAME}:run" \
  --http-method=POST \
  --oauth-service-account-email="${SERVICE_ACCOUNT}" \
  --description="Weekly library integrity verification for Bayit+ media library" \
  --quiet

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Cloud Scheduler job creation failed${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Cloud Scheduler job created successfully!${NC}"
echo ""
echo -e "${BLUE}Scheduler Details:${NC}"
echo -e "  Name: ${SCHEDULER_JOB_NAME}"
echo -e "  Schedule: ${SCHEDULE} (${TIMEZONE})"
echo -e "  Description: Every Sunday at 2:00 AM UTC"
echo -e "  Target: Cloud Run Job '${JOB_NAME}'"
echo -e "  Region: ${REGION}"
echo ""

# Test the scheduler (optional - run immediately)
echo -e "${YELLOW}To test the scheduler by running it immediately:${NC}"
echo -e "  gcloud scheduler jobs run ${SCHEDULER_JOB_NAME} --location=${REGION}"
echo ""
echo -e "${YELLOW}To view scheduler job details:${NC}"
echo -e "  gcloud scheduler jobs describe ${SCHEDULER_JOB_NAME} --location=${REGION}"
echo ""
echo -e "${YELLOW}To view scheduler job logs:${NC}"
echo -e "  gcloud logging read \"resource.type=cloud_scheduler_job AND resource.labels.job_id=${SCHEDULER_JOB_NAME}\" --limit=50"
echo ""
echo -e "${GREEN}Setup complete! Library integrity checks will run weekly on Sundays at 2 AM UTC.${NC}"
