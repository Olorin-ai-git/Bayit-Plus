#!/bin/bash

# ============================================
# Google Cloud Secret Manager Configuration
# ============================================
# This script helps set up and verify Audible OAuth integration secrets
# in Google Cloud Secret Manager.
#
# Audible integration is OPTIONAL - all secrets are optional.
# If secrets are not present, the feature will be disabled automatically.
#
# Usage:
#   ./scripts/deployment/.gcloud-secrets.sh [PROJECT_ID]
#
# Example:
#   ./scripts/deployment/.gcloud-secrets.sh bayit-plus
#   ./scripts/deployment/.gcloud-secrets.sh  # Uses gcloud default project
#
# ============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project ID - from argument or gcloud default
PROJECT_ID="${1:-$(gcloud config get-value project 2>/dev/null)}"

if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}❌ Error: Project ID not provided and gcloud default not set${NC}"
    echo ""
    echo "Usage:"
    echo "  ./scripts/deployment/.gcloud-secrets.sh [PROJECT_ID]"
    echo ""
    echo "Example:"
    echo "  ./scripts/deployment/.gcloud-secrets.sh bayit-plus"
    exit 1
fi

echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   Google Cloud Secret Manager Configuration${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Project: ${PROJECT_ID}${NC}"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ Error: gcloud CLI not found${NC}"
    echo "Please install Google Cloud SDK: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# ===== REQUIRED SECRETS =====
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}REQUIRED SECRETS (Must be set up manually)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "These secrets are REQUIRED and must already exist in Google Secret Manager:"
echo ""
echo "  • bayit-backend-secret-key (SECRET_KEY)"
echo "  • bayit-mongodb-uri (MONGODB_URI)"
echo "  • bayit-backend-cors-origins (BACKEND_CORS_ORIGINS)"
echo "  • bayit-frontend-url (FRONTEND_URL)"
echo ""
echo "To create a required secret:"
echo -e "  ${YELLOW}echo 'YOUR_VALUE' | gcloud secrets create SECRET_NAME --data-file=-${NC}"
echo ""

# ===== OPTIONAL AUDIBLE SECRETS =====
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}OPTIONAL AUDIBLE INTEGRATION SECRETS${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "Audible integration is OPTIONAL. If secrets are not present,"
echo "the feature will be disabled automatically."
echo ""

# Check each Audible secret
client_id_exists=false
client_secret_exists=false
redirect_uri_exists=false

if gcloud secrets describe bayit-audible-client-id --project="$PROJECT_ID" &>/dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} bayit-audible-client-id (AUDIBLE_CLIENT_ID)"
    client_id_exists=true
else
    echo -e "${YELLOW}✗${NC} bayit-audible-client-id (AUDIBLE_CLIENT_ID)"
fi

if gcloud secrets describe bayit-audible-client-secret --project="$PROJECT_ID" &>/dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} bayit-audible-client-secret (AUDIBLE_CLIENT_SECRET)"
    client_secret_exists=true
else
    echo -e "${YELLOW}✗${NC} bayit-audible-client-secret (AUDIBLE_CLIENT_SECRET)"
fi

if gcloud secrets describe bayit-audible-redirect-uri --project="$PROJECT_ID" &>/dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} bayit-audible-redirect-uri (AUDIBLE_REDIRECT_URI)"
    redirect_uri_exists=true
else
    echo -e "${YELLOW}✗${NC} bayit-audible-redirect-uri (AUDIBLE_REDIRECT_URI)"
fi

echo ""

# Status summary
if [ "$client_id_exists" = true ] && [ "$client_secret_exists" = true ] && [ "$redirect_uri_exists" = true ]; then
    echo -e "${GREEN}✓ Audible Integration: ENABLED${NC}"
    echo "  All Audible OAuth credentials are configured."
    echo "  Feature will be automatically enabled on deployment."
    echo ""
    AUDIBLE_STATUS="enabled"
else
    echo -e "${YELLOW}⚠ Audible Integration: DISABLED${NC}"
    echo "  One or more Audible credentials are missing."
    echo "  Feature will be automatically disabled on deployment."
    echo ""
    AUDIBLE_STATUS="disabled"
fi

# ===== SETUP INSTRUCTIONS =====
if [ "$AUDIBLE_STATUS" = "disabled" ]; then
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}TO ENABLE AUDIBLE INTEGRATION${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo ""
    echo "1. Create Audible OAuth App:"
    echo "   Visit: https://developer.audible.com/"
    echo ""
    echo "2. Get your credentials:"
    echo "   • Client ID"
    echo "   • Client Secret"
    echo "   • Redirect URI (e.g., https://bayit.tv/api/v1/user/audible/oauth/callback)"
    echo ""
    echo "3. Create secrets in Google Cloud:"
    echo ""
    echo -e "   ${YELLOW}# Create Client ID${NC}"
    echo "   echo 'YOUR_CLIENT_ID' | \\"
    echo "     gcloud secrets create bayit-audible-client-id \\"
    echo "     --project=$PROJECT_ID --data-file=-"
    echo ""
    echo -e "   ${YELLOW}# Create Client Secret${NC}"
    echo "   echo 'YOUR_CLIENT_SECRET' | \\"
    echo "     gcloud secrets create bayit-audible-client-secret \\"
    echo "     --project=$PROJECT_ID --data-file=-"
    echo ""
    echo -e "   ${YELLOW}# Create Redirect URI${NC}"
    echo "   echo 'https://yourdomain.com/api/v1/user/audible/oauth/callback' | \\"
    echo "     gcloud secrets create bayit-audible-redirect-uri \\"
    echo "     --project=$PROJECT_ID --data-file=-"
    echo ""
    echo "4. Deploy backend with:"
    echo "   gcloud builds submit --config=cloudbuild.yaml"
    echo ""
fi

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}DEPLOYMENT NOTES${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "✓ Audible secrets are OPTIONAL"
echo "✓ Deployment will succeed whether or not credentials are present"
echo "✓ Feature is automatically enabled/disabled based on secret presence"
echo "✓ Configuration is validated at backend startup"
echo ""
echo "For more information, see:"
echo "  • docs/implementation/AUDIBLE_OAUTH_INTEGRATION.md"
echo "  • backend/.env.example (Audible section)"
echo ""
