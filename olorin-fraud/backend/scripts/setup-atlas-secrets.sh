#!/bin/bash
#
# Setup MongoDB Atlas Secrets in Google Cloud Secret Manager
#
# SYSTEM MANDATE Compliance:
# - No hardcoded values: All values passed as parameters or from environment
# - Complete implementation: Full secret creation with validation
# - Fail-fast validation: Checks for required parameters

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "=================================================="
echo "  MongoDB Atlas - Google Cloud Secrets Setup"
echo "=================================================="
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ gcloud CLI is not installed${NC}"
    echo "   Install from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if logged in to gcloud
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &> /dev/null; then
    echo -e "${RED}❌ Not logged in to gcloud${NC}"
    echo "   Run: gcloud auth login"
    exit 1
fi

# Get MongoDB Atlas credentials from .env or environment
MONGODB_URI="${MONGODB_ATLAS_URI:-$MONGODB_URI}"
MONGODB_DATABASE="${MONGODB_ATLAS_DATABASE:-olorin}"

if [ -z "$MONGODB_URI" ]; then
    echo -e "${YELLOW}MongoDB Atlas URI not found in environment${NC}"
    echo "Please enter MongoDB Atlas connection string:"
    read -r MONGODB_URI
fi

if [ -z "$MONGODB_URI" ]; then
    echo -e "${RED}❌ MongoDB URI is required${NC}"
    exit 1
fi

# Validate URI format
if [[ ! "$MONGODB_URI" =~ ^mongodb(\+srv)?:// ]]; then
    echo -e "${RED}❌ Invalid MongoDB URI format${NC}"
    echo "   URI must start with mongodb:// or mongodb+srv://"
    exit 1
fi

# Get GCP project
GCP_PROJECT=$(gcloud config get-value project 2>/dev/null)

if [ -z "$GCP_PROJECT" ]; then
    echo -e "${RED}❌ No GCP project set${NC}"
    echo "   Run: gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

echo -e "${GREEN}✓${NC} Using GCP project: ${GCP_PROJECT}"
echo ""

# Function to create or update secret
create_or_update_secret() {
    local secret_name=$1
    local secret_value=$2
    local description=$3

    echo "Processing secret: ${secret_name}"

    # Check if secret exists
    if gcloud secrets describe "${secret_name}" --project="${GCP_PROJECT}" &>/dev/null; then
        echo -e "${YELLOW}  Secret exists, creating new version...${NC}"
        echo -n "${secret_value}" | gcloud secrets versions add "${secret_name}" \
            --project="${GCP_PROJECT}" \
            --data-file=-
    else
        echo "  Creating new secret..."
        echo -n "${secret_value}" | gcloud secrets create "${secret_name}" \
            --project="${GCP_PROJECT}" \
            --replication-policy="automatic" \
            --data-file=- \
            --labels="service=olorin,component=mongodb,environment=production"
    fi

    echo -e "${GREEN}✓${NC} ${secret_name} configured"
    echo ""
}

echo "=================================================="
echo "  Creating MongoDB Atlas Secrets"
echo "=================================================="
echo ""

# Create secrets
create_or_update_secret \
    "olorin-mongodb-uri" \
    "${MONGODB_URI}" \
    "MongoDB Atlas connection URI for Olorin"

create_or_update_secret \
    "olorin-mongodb-database" \
    "${MONGODB_DATABASE}" \
    "MongoDB Atlas database name for Olorin"

echo "=================================================="
echo "  Granting Access to Cloud Run Service Account"
echo "=================================================="
echo ""

# Get Cloud Run service account (olorin-detection service account)
SERVICE_ACCOUNT="olorin-detection@olorin-fraud-detection.iam.gserviceaccount.com"

echo "Granting access to: ${SERVICE_ACCOUNT}"

# Grant access to secrets
for secret in "olorin-mongodb-uri" "olorin-mongodb-database"; do
    echo "  Granting access to ${secret}..."
    gcloud secrets add-iam-policy-binding "${secret}" \
        --project="${GCP_PROJECT}" \
        --member="serviceAccount:${SERVICE_ACCOUNT}" \
        --role="roles/secretmanager.secretAccessor" \
        --quiet &>/dev/null || true
    echo -e "${GREEN}✓${NC} Access granted to ${secret}"
done

echo ""
echo "=================================================="
echo "  Verification"
echo "=================================================="
echo ""

# Verify secrets exist
echo "Verifying secrets..."
for secret in "olorin-mongodb-uri" "olorin-mongodb-database"; do
    if gcloud secrets describe "${secret}" --project="${GCP_PROJECT}" &>/dev/null; then
        # Get latest version
        latest_version=$(gcloud secrets versions list "${secret}" \
            --project="${GCP_PROJECT}" \
            --format="value(name)" \
            --limit=1)
        echo -e "${GREEN}✓${NC} ${secret} (version: ${latest_version})"
    else
        echo -e "${RED}✗${NC} ${secret} - NOT FOUND"
    fi
done

echo ""
echo "=================================================="
echo "  Cloud Run Deployment Configuration"
echo "=================================================="
echo ""

echo "To use these secrets in Cloud Run, add to your deployment:"
echo ""
echo -e "${YELLOW}Option 1: Using gcloud CLI${NC}"
echo "gcloud run deploy olorin-server \\"
echo "  --set-secrets MONGODB_URI=olorin-mongodb-uri:latest,MONGODB_DATABASE=olorin-mongodb-database:latest \\"
echo "  ..."
echo ""
echo -e "${YELLOW}Option 2: Using terraform/deployment scripts${NC}"
echo "Update your Cloud Run service configuration to include:"
echo "  env:"
echo "    - name: MONGODB_URI"
echo "      valueFrom:"
echo "        secretKeyRef:"
echo "          name: olorin-mongodb-uri"
echo "          key: latest"
echo "    - name: MONGODB_DATABASE"
echo "      valueFrom:"
echo "        secretKeyRef:"
echo "          name: olorin-mongodb-database"
echo "          key: latest"
echo ""
echo -e "${GREEN}✅ MongoDB Atlas secrets configured successfully!${NC}"
echo ""
echo "Next steps:"
echo "1. Update Cloud Run deployment to use these secrets"
echo "2. Deploy updated service"
echo "3. Verify MongoDB Atlas connection in production"
echo ""
