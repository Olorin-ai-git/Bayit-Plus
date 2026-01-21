#!/bin/bash
# Rollback script for Olorin Backend Cloud Run deployment
# Usage: ./scripts/rollback-cloudrun.sh [staging|production] [revision]

set -euo pipefail

# Configuration
PROJECT_ID="olorin-fraud-detection"
REGION="us-east1"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
ENVIRONMENT="${1:-}"
REVISION="${2:-}"

if [ -z "$ENVIRONMENT" ] || [[ ! "$ENVIRONMENT" =~ ^(staging|production)$ ]]; then
    echo -e "${RED}❌ Invalid or missing environment${NC}"
    echo "Usage: $0 [staging|production] [revision]"
    echo ""
    echo "Examples:"
    echo "  $0 production                  # List revisions and prompt for selection"
    echo "  $0 production olorin-backend-production-00042-baf  # Rollback to specific revision"
    exit 1
fi

SERVICE_NAME="olorin-backend-$ENVIRONMENT"

echo -e "${GREEN}🔄 Rolling back $SERVICE_NAME...${NC}"
echo ""

# Authenticate with service account key
echo -e "${YELLOW}🔐 Authenticating with Google Cloud...${NC}"
if [ -f "$HOME/.gcp/olorin-fraud-detection-key.json" ]; then
    gcloud auth activate-service-account \
        --key-file="$HOME/.gcp/olorin-fraud-detection-key.json" \
        --project="$PROJECT_ID" --quiet
elif [ -f "/Users/olorin/Documents/olorin/olorin-server/olorin-fraud-detection-dc83c2976247.json" ]; then
    echo -e "${YELLOW}⚠️  Using key from project directory (should be moved to ~/.gcp/)${NC}"
    gcloud auth activate-service-account \
        --key-file="/Users/olorin/Documents/olorin/olorin-server/olorin-fraud-detection-dc83c2976247.json" \
        --project="$PROJECT_ID" --quiet
else
    echo -e "${RED}❌ Service account key not found${NC}"
    exit 1
fi

# Set project
gcloud config set project "$PROJECT_ID" --quiet

# List recent revisions
echo -e "${BLUE}📋 Recent revisions for $SERVICE_NAME:${NC}"
echo ""
gcloud run revisions list \
    --service="$SERVICE_NAME" \
    --region="$REGION" \
    --project="$PROJECT_ID" \
    --limit=10 \
    --format="table(name,status,traffic_percent,creation_timestamp)"

echo ""

# If no revision specified, prompt for it
if [ -z "$REVISION" ]; then
    echo -e "${YELLOW}Enter revision name to rollback to (or 'cancel' to exit):${NC}"
    read -r REVISION

    if [ "$REVISION" = "cancel" ] || [ -z "$REVISION" ]; then
        echo -e "${YELLOW}⏹️  Rollback cancelled${NC}"
        exit 0
    fi
fi

# Verify revision exists
if ! gcloud run revisions describe "$REVISION" \
    --region="$REGION" \
    --project="$PROJECT_ID" &> /dev/null; then
    echo -e "${RED}❌ Revision not found: $REVISION${NC}"
    exit 1
fi

# Show what we're rolling back to
echo ""
echo -e "${BLUE}📝 Rollback details:${NC}"
gcloud run revisions describe "$REVISION" \
    --region="$REGION" \
    --project="$PROJECT_ID" \
    --format="table(metadata.name,metadata.creationTimestamp,spec.containers[0].image)"

echo ""
echo -e "${YELLOW}⚠️  WARNING: This will route 100% traffic to revision: $REVISION${NC}"
echo -e "${YELLOW}Are you sure you want to proceed? (yes/no):${NC}"
read -r CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo -e "${YELLOW}⏹️  Rollback cancelled${NC}"
    exit 0
fi

# Perform rollback
echo ""
echo -e "${YELLOW}⏪ Rolling back to revision: $REVISION${NC}"
gcloud run services update-traffic "$SERVICE_NAME" \
    --to-revisions="$REVISION=100" \
    --region="$REGION" \
    --project="$PROJECT_ID"

# Get service URL
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
    --region="$REGION" \
    --format='value(status.url)' \
    --project="$PROJECT_ID")

# Verify health
echo ""
echo -e "${YELLOW}🏥 Verifying health after rollback...${NC}"
for i in {1..6}; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$SERVICE_URL/health" || echo "000")
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✅ Health check passed (HTTP $HTTP_CODE)${NC}"
        break
    fi
    echo "⏳ Waiting... Attempt $i/6 (HTTP $HTTP_CODE)"
    sleep 5
done

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Rollback completed successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Current revision:${NC} $REVISION"
echo -e "${BLUE}Service URL:${NC} $SERVICE_URL"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Test the service:"
echo "   curl $SERVICE_URL/health"
echo ""
echo "2. View active revision:"
echo "   gcloud run services describe $SERVICE_NAME --region=$REGION --project=$PROJECT_ID"
echo ""
echo "3. View logs:"
echo "   gcloud run services logs read $SERVICE_NAME --region=$REGION --project=$PROJECT_ID --follow"
