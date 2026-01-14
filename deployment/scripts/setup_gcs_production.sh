#!/bin/bash

# ==============================================================================
# GCS Production Setup for Bayit+ Backend
# ==============================================================================
# This script sets up Google Cloud Storage authentication and permissions
# for production deployment on Cloud Run.
#
# Prerequisites:
#   - gcloud CLI installed and authenticated
#   - Appropriate permissions in the bayit-plus GCP project
# ==============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="bayit-plus"
PROJECT_NUMBER="624470113582"
# Use existing default compute service account
SERVICE_ACCOUNT_EMAIL="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
GCS_BUCKET_NAME="bayit-plus-media-new"
REGION="us-east1"

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}Bayit+ GCS Production Setup${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""
echo -e "${YELLOW}Project:${NC} ${PROJECT_ID}"
echo -e "${YELLOW}Service Account:${NC} ${SERVICE_ACCOUNT_EMAIL}"
echo -e "${YELLOW}GCS Bucket:${NC} ${GCS_BUCKET_NAME}"
echo -e "${YELLOW}Region:${NC} ${REGION}"
echo ""

# Set project
echo -e "${BLUE}Step 1: Setting GCP project...${NC}"
gcloud config set project ${PROJECT_ID}

# Verify service account exists
echo -e "${BLUE}Step 2: Verifying service account...${NC}"
if gcloud iam service-accounts describe ${SERVICE_ACCOUNT_EMAIL} &>/dev/null; then
    echo -e "${GREEN}✓ Using existing compute service account${NC}"
    echo -e "  ${SERVICE_ACCOUNT_EMAIL}"
else
    echo -e "${RED}✗ Service account not found: ${SERVICE_ACCOUNT_EMAIL}${NC}"
    echo -e "${RED}This should be the default compute service account for the project.${NC}"
    exit 1
fi

# Grant GCS permissions
echo -e "${BLUE}Step 3: Granting GCS permissions...${NC}"

echo "  → Storage Object Admin (full GCS access)"
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
    --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
    --role="roles/storage.objectAdmin" \
    --condition=None \
    --quiet

echo "  → Storage Admin (bucket management)"
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
    --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
    --role="roles/storage.admin" \
    --condition=None \
    --quiet

# Grant Secret Manager access
echo -e "${BLUE}Step 4: Granting Secret Manager access...${NC}"
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
    --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
    --role="roles/secretmanager.secretAccessor" \
    --condition=None \
    --quiet

# Grant Cloud Run permissions
echo -e "${BLUE}Step 5: Granting Cloud Run permissions...${NC}"
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
    --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
    --role="roles/run.invoker" \
    --condition=None \
    --quiet

# Check/Create GCS bucket
echo -e "${BLUE}Step 6: Checking GCS bucket...${NC}"
if gsutil ls -b gs://${GCS_BUCKET_NAME} &>/dev/null; then
    echo -e "${GREEN}✓ Bucket already exists${NC}"
else
    echo -e "${YELLOW}Creating GCS bucket...${NC}"
    gsutil mb -p ${PROJECT_ID} -c STANDARD -l ${REGION} gs://${GCS_BUCKET_NAME}
    echo -e "${GREEN}✓ Bucket created${NC}"
fi

# Set bucket permissions
echo -e "${BLUE}Step 7: Setting bucket permissions...${NC}"
gsutil iam ch serviceAccount:${SERVICE_ACCOUNT_EMAIL}:objectAdmin gs://${GCS_BUCKET_NAME}

# Enable CORS for bucket
echo -e "${BLUE}Step 8: Configuring CORS...${NC}"
cat > /tmp/cors-config.json <<EOF
[
  {
    "origin": ["https://bayit.tv", "https://www.bayit.tv", "http://localhost:3000"],
    "method": ["GET", "HEAD", "PUT", "POST", "DELETE"],
    "responseHeader": ["Content-Type", "Access-Control-Allow-Origin"],
    "maxAgeSeconds": 3600
  }
]
EOF
gsutil cors set /tmp/cors-config.json gs://${GCS_BUCKET_NAME}
rm /tmp/cors-config.json
echo -e "${GREEN}✓ CORS configured${NC}"

# Make bucket publicly readable (for public content)
echo -e "${BLUE}Step 9: Setting public access...${NC}"
gsutil iam ch allUsers:objectViewer gs://${GCS_BUCKET_NAME}
echo -e "${GREEN}✓ Public read access enabled${NC}"

# Enable uniform bucket-level access
echo -e "${BLUE}Step 10: Enabling uniform bucket-level access...${NC}"
gsutil uniformbucketlevelaccess set on gs://${GCS_BUCKET_NAME}
echo -e "${GREEN}✓ Uniform bucket-level access enabled${NC}"

# Create/Update Secret Manager secret for bucket name
echo -e "${BLUE}Step 11: Updating Secret Manager...${NC}"
if gcloud secrets describe gcs-bucket-name &>/dev/null; then
    echo "  → Updating existing secret"
    echo -n "${GCS_BUCKET_NAME}" | gcloud secrets versions add gcs-bucket-name --data-file=-
else
    echo "  → Creating new secret"
    echo -n "${GCS_BUCKET_NAME}" | gcloud secrets create gcs-bucket-name --data-file=- --replication-policy="automatic"
fi
echo -e "${GREEN}✓ Secret updated${NC}"

# Verify setup
echo -e "${BLUE}Step 12: Verifying setup...${NC}"
echo ""
echo -e "${YELLOW}Service Account Roles:${NC}"
gcloud projects get-iam-policy ${PROJECT_ID} \
    --flatten="bindings[].members" \
    --format="table(bindings.role)" \
    --filter="bindings.members:serviceAccount:${SERVICE_ACCOUNT_EMAIL}"
echo ""
echo -e "${YELLOW}Bucket Details:${NC}"
gsutil ls -L -b gs://${GCS_BUCKET_NAME} | head -20
echo ""

# Summary
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}✓ GCS Production Setup Complete!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Deploy backend to Cloud Run (will automatically use service account)"
echo "   ${BLUE}gcloud builds submit --config=backend/cloudbuild.yaml${NC}"
echo ""
echo "2. Verify Cloud Run service is using correct service account:"
echo "   ${BLUE}gcloud run services describe bayit-plus-backend --region=${REGION} --format='value(spec.serviceAccountName)'${NC}"
echo ""
echo "3. Test GCS access from Cloud Run:"
echo "   ${BLUE}curl https://bayit-plus-backend-<hash>.a.run.app/api/v1/health${NC}"
echo ""
echo -e "${GREEN}Service Account Email:${NC} ${SERVICE_ACCOUNT_EMAIL}"
echo -e "${GREEN}GCS Bucket:${NC} gs://${GCS_BUCKET_NAME}"
echo ""
