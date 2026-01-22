#!/bin/bash
#
# Google Cloud Secret Manager Setup for Centralized MongoDB
#
# This script creates/updates secrets in Google Cloud Secret Manager
# for all Olorin platforms to use the centralized MongoDB Atlas connection.
#
# Prerequisites:
# 1. gcloud CLI installed and authenticated
# 2. Appropriate IAM permissions to create/update secrets
# 3. Project ID configured (gcloud config set project YOUR_PROJECT_ID)
#
# Usage:
#   ./GOOGLE_CLOUD_SECRETS_SETUP.sh
#

set -e  # Exit on error

# MongoDB Atlas Connection Details
MONGODB_CLUSTER="cluster0.ydrvaft.mongodb.net"
MONGODB_USERNAME="admin_db_user"
MONGODB_PASSWORD="Jersey1973!"  # ⚠️ SECURITY: Rotate this password after setup!
MONGODB_CONNECTION_STRING="mongodb+srv://${MONGODB_USERNAME}:${MONGODB_PASSWORD}@${MONGODB_CLUSTER}/?retryWrites=true&w=majority&appName=Cluster0"

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  Olorin MongoDB Atlas - Google Cloud Secret Manager Setup${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Security warning
echo -e "${RED}⚠️  SECURITY WARNING${NC}"
echo -e "This script contains hardcoded credentials for demonstration purposes."
echo -e "In production, you should:"
echo -e "  1. Use environment variables or secure input"
echo -e "  2. Rotate the MongoDB password immediately after setup"
echo -e "  3. Enable audit logging on Secret Manager"
echo ""
read -p "Press Enter to continue..."
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}✗ gcloud CLI not found${NC}"
    echo "Please install gcloud: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Get current project
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}✗ No Google Cloud project configured${NC}"
    echo "Run: gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

echo -e "${GREEN}✓ Using Google Cloud project: ${PROJECT_ID}${NC}"
echo ""

# Function to create or update secret
create_or_update_secret() {
    local secret_name=$1
    local secret_value=$2
    local description=$3

    echo -n "  • ${secret_name}... "

    # Check if secret exists
    if gcloud secrets describe "$secret_name" --project="$PROJECT_ID" &>/dev/null; then
        # Secret exists, add new version
        echo "$secret_value" | gcloud secrets versions add "$secret_name" \
            --data-file=- \
            --project="$PROJECT_ID" &>/dev/null
        echo -e "${GREEN}updated${NC}"
    else
        # Secret doesn't exist, create it
        echo "$secret_value" | gcloud secrets create "$secret_name" \
            --replication-policy="automatic" \
            --data-file=- \
            --project="$PROJECT_ID" &>/dev/null
        echo -e "${GREEN}created${NC}"
    fi
}

# 1. Bayit+ Secrets
echo -e "${YELLOW}[1/3] Bayit+ (Streaming Platform)${NC}"
create_or_update_secret \
    "bayit-mongodb-url" \
    "$MONGODB_CONNECTION_STRING" \
    "Bayit+ MongoDB Atlas connection string"

create_or_update_secret \
    "bayit-mongodb-db-name" \
    "bayit_plus" \
    "Bayit+ MongoDB database name"

echo ""

# 2. Israeli Radio Manager Secrets
echo -e "${YELLOW}[2/3] Israeli Radio Manager${NC}"
create_or_update_secret \
    "israeli-radio-mongodb-url" \
    "$MONGODB_CONNECTION_STRING" \
    "Israeli Radio Manager MongoDB Atlas connection string"

create_or_update_secret \
    "israeli-radio-mongodb-db-name" \
    "israeli_radio" \
    "Israeli Radio Manager MongoDB database name"

echo ""

# 3. Olorin Fraud Detection Secrets
echo -e "${YELLOW}[3/3] Olorin Fraud Detection${NC}"
create_or_update_secret \
    "olorin-mongodb-url" \
    "$MONGODB_CONNECTION_STRING" \
    "Olorin Fraud Detection MongoDB Atlas connection string"

create_or_update_secret \
    "olorin-mongodb-db-name" \
    "olorin" \
    "Olorin Fraud Detection MongoDB database name"

echo ""

# Success message
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ All secrets created/updated successfully${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# List all MongoDB secrets
echo "Created secrets:"
echo ""
gcloud secrets list --project="$PROJECT_ID" --filter="name~mongodb" --format="table(name,createTime)"
echo ""

# IAM permissions reminder
echo -e "${YELLOW}📋 Next Steps:${NC}"
echo ""
echo "1. Grant Secret Manager access to your service accounts:"
echo "   gcloud secrets add-iam-policy-binding SECRET_NAME \\"
echo "     --member='serviceAccount:YOUR_SERVICE_ACCOUNT@YOUR_PROJECT.iam.gserviceaccount.com' \\"
echo "     --role='roles/secretmanager.secretAccessor'"
echo ""
echo "2. Update your app.yaml or Cloud Run configuration:"
echo "   env_variables:"
echo "     MONGODB_URI: \${SECRET:bayit-mongodb-url}"
echo "     MONGODB_DB_NAME: \${SECRET:bayit-mongodb-db-name}"
echo ""
echo "3. 🔐 ROTATE THE MONGODB PASSWORD:"
echo "   - Go to MongoDB Atlas → Database Access"
echo "   - Edit user: admin_db_user"
echo "   - Change password and update secrets above"
echo ""

# Security reminder
echo -e "${RED}⚠️  CRITICAL SECURITY REMINDER${NC}"
echo -e "The MongoDB password is currently: ${RED}Jersey1973!${NC}"
echo -e "This password was exposed in plain text and MUST be rotated immediately."
echo -e ""
echo -e "To rotate:"
echo -e "  1. Log in to MongoDB Atlas: https://cloud.mongodb.com"
echo -e "  2. Go to Database Access"
echo -e "  3. Edit user 'admin_db_user' → Change Password"
echo -e "  4. Re-run this script with the new password"
echo ""
