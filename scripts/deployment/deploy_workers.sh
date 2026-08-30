#!/bin/bash

# ============================================
# Bayit+ Workers Service Deployment Script
# ============================================
# Deploys the Bayit+ Workers service and cron job image to Google Cloud Run.
#
# Workers: Always-on service running background tasks (podcast translation,
#   session monitoring, recording scheduler, audit recovery).
# Jobs: Periodic tasks triggered by Cloud Scheduler (upload cleanup,
#   cost rollup, EPG sync).
#
# Usage:
#   ./scripts/deployment/deploy_workers.sh [environment] [region] [project]
#   ./scripts/deployment/deploy_workers.sh --jobs-only  # Rebuild jobs image only
#
# ============================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

JOBS_ONLY=false
if [ "$1" = "--jobs-only" ]; then
    JOBS_ONLY=true
    shift
fi

ENVIRONMENT="${1:-production}"
REGION="${2:-us-east1}"
PROJECT_ID="${3:-bayit-plus}"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

SERVICE_NAME="bayit-workers"
if [ "$ENVIRONMENT" != "production" ]; then
    SERVICE_NAME="bayit-workers-${ENVIRONMENT}"
fi

if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}Error: Project ID not provided${NC}"
    echo "Usage: ./scripts/deployment/deploy_workers.sh [--jobs-only] [environment] [region] [project]"
    exit 1
fi

echo -e "${BLUE}======================================================${NC}"
echo -e "${BLUE}   Bayit+ Workers Deployment${NC}"
echo -e "${BLUE}======================================================${NC}"
echo ""
echo -e "${YELLOW}Environment: ${ENVIRONMENT}${NC}"
echo -e "${YELLOW}Region: ${REGION}${NC}"
echo -e "${YELLOW}Project: ${PROJECT_ID}${NC}"
echo -e "${YELLOW}Jobs only: ${JOBS_ONLY}${NC}"
echo ""

if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Error: gcloud CLI not found${NC}"
    exit 1
fi

gcloud config set project "${PROJECT_ID}"
cd "$PROJECT_ROOT"
BUILD_ID=$(date +%s)

# Deploy workers service (always-on background tasks)
if [ "$JOBS_ONLY" = false ]; then
    echo -e "${BLUE}Deploying workers service...${NC}"
    echo "Config: bayit-workers/cloudbuild-workers.yaml"
    echo ""

    if [ ! -f "$PROJECT_ROOT/bayit-workers/cloudbuild-workers.yaml" ]; then
        echo -e "${RED}Error: cloudbuild-workers.yaml not found${NC}"
        exit 1
    fi

    gcloud builds submit \
        --config=bayit-workers/cloudbuild-workers.yaml \
        --substitutions=_BUILD_ID="$BUILD_ID" \
        --project="$PROJECT_ID" || {
        echo -e "${RED}Workers service deployment failed${NC}"
        exit 1
    }

    echo -e "${GREEN}Workers service deployed${NC}"
    echo ""
fi

# Deploy jobs image (used by Cloud Run Jobs / Cloud Scheduler)
echo -e "${BLUE}Building jobs image...${NC}"
echo "Config: bayit-workers/cloudbuild-jobs.yaml"
echo ""

if [ ! -f "$PROJECT_ROOT/bayit-workers/cloudbuild-jobs.yaml" ]; then
    echo -e "${RED}Error: cloudbuild-jobs.yaml not found${NC}"
    exit 1
fi

gcloud builds submit \
    --config=bayit-workers/cloudbuild-jobs.yaml \
    --substitutions=_BUILD_ID="$BUILD_ID" \
    --project="$PROJECT_ID" || {
    echo -e "${RED}Jobs image build failed${NC}"
    exit 1
}

echo -e "${GREEN}Jobs image built and pushed${NC}"
echo ""

COST_ROLLUP_ROUTING_SECRETS="TWOGATES_ROUTING_ENABLED=bayit-twogates-routing-enabled:latest"
COST_ROLLUP_ROUTING_SECRETS="${COST_ROLLUP_ROUTING_SECRETS},TWOGATES_PROXY_URL=bayit-twogates-proxy-url:latest"
COST_ROLLUP_ROUTING_SECRETS="${COST_ROLLUP_ROUTING_SECRETS},TWOGATES_PROXY_CREDENTIAL=bayit-twogates-proxy-credential:latest"
COST_ROLLUP_ROUTING_SECRETS="${COST_ROLLUP_ROUTING_SECRETS},TWOGATES_CA_CERT_PEM=bayit-twogates-ca-cert-pem:latest"
COST_ROLLUP_ROUTING_SECRETS="${COST_ROLLUP_ROUTING_SECRETS},TWOGATES_TASK_CLASS=bayit-twogates-task-class:latest"
COST_ROLLUP_ROUTING_SECRETS="${COST_ROLLUP_ROUTING_SECRETS},TWOGATES_CONNECT_TIMEOUT_SECONDS=bayit-twogates-connect-timeout-seconds:latest"
COST_ROLLUP_ROUTING_SECRETS="${COST_ROLLUP_ROUTING_SECRETS},TWOGATES_REQUEST_TIMEOUT_SECONDS=bayit-twogates-request-timeout-seconds:latest"
COST_ROLLUP_ROUTING_SECRETS="${COST_ROLLUP_ROUTING_SECRETS},TWOGATES_PROVIDER_MAX_ATTEMPTS=bayit-twogates-provider-max-attempts:latest"
COST_ROLLUP_ROUTING_SECRETS="${COST_ROLLUP_ROUTING_SECRETS},TWOGATES_MAX_CONNECTIONS=bayit-twogates-max-connections:latest"
COST_ROLLUP_ROUTING_SECRETS="${COST_ROLLUP_ROUTING_SECRETS},TWOGATES_MAX_KEEPALIVE_CONNECTIONS=bayit-twogates-max-keepalive-connections:latest"
COST_ROLLUP_ROUTING_SECRETS="${COST_ROLLUP_ROUTING_SECRETS},TWOGATES_KEEPALIVE_EXPIRY_SECONDS=bayit-twogates-keepalive-expiry-seconds:latest"

# Update Cloud Run Jobs to use new image
echo -e "${BLUE}Updating Cloud Run Jobs with new image...${NC}"
for JOB in cleanup-upload-sessions cleanup-failed-uploads cost-rollup youtube-epg-sync; do
    if gcloud run jobs describe "$JOB" --region="$REGION" --project="$PROJECT_ID" &>/dev/null; then
        if [ "$JOB" = "cost-rollup" ]; then
            gcloud run jobs update "$JOB" \
                --region="$REGION" \
                --project="$PROJECT_ID" \
                --image="gcr.io/$PROJECT_ID/bayit-jobs:$BUILD_ID" \
                --update-secrets="${COST_ROLLUP_ROUTING_SECRETS}" \
                --quiet
        else
            gcloud run jobs update "$JOB" \
                --region="$REGION" \
                --project="$PROJECT_ID" \
                --image="gcr.io/$PROJECT_ID/bayit-jobs:$BUILD_ID" \
                --quiet
        fi
        echo -e "  ${GREEN}Updated $JOB${NC}"
    else
        echo -e "  ${YELLOW}Job $JOB not found (run setup-cron-jobs.sh first)${NC}"
    fi
done
echo ""

echo -e "${BLUE}======================================================${NC}"
echo -e "${BLUE}   Deployment Complete${NC}"
echo -e "${BLUE}======================================================${NC}"
echo ""

if [ "$JOBS_ONLY" = false ]; then
    SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" --region="$REGION" --project="$PROJECT_ID" --format='value(status.url)' 2>/dev/null || echo "unknown")
    echo -e "${GREEN}Workers Service: $SERVICE_NAME${NC}"
    echo -e "${GREEN}Workers URL: $SERVICE_URL${NC}"
fi

echo -e "${GREEN}Jobs Image: gcr.io/$PROJECT_ID/bayit-jobs:$BUILD_ID${NC}"
echo ""
echo "Next steps:"
if [ "$JOBS_ONLY" = false ]; then
    echo "  1. Check workers health: curl <service-url>/health"
fi
echo "  2. Test a job: gcloud run jobs execute cost-rollup --region=$REGION"
echo "  3. Check scheduler: gcloud scheduler jobs list --location=$REGION"
echo ""
