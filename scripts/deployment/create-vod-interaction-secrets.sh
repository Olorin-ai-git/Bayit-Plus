#!/bin/bash
#
# Create VOD Avatar Interaction Secrets in Google Cloud Secret Manager
# This script creates all required secrets for the VOD interaction feature
#
# Usage: ./scripts/deployment/create-vod-interaction-secrets.sh
#

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🔐 Creating VOD Avatar Interaction Secrets${NC}"
echo "=============================================="
echo ""

if ! command -v gcloud &> /dev/null; then
  echo -e "${RED}❌ Error: gcloud CLI is not installed${NC}"
  exit 1
fi

PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
if [[ -z "$PROJECT_ID" ]]; then
  echo -e "${RED}❌ Error: No GCloud project set${NC}"
  echo "Run: gcloud config set project PROJECT_ID"
  exit 1
fi

echo -e "${GREEN}✓ Project: $PROJECT_ID${NC}"
echo ""

create_secret() {
  local secret_name=$1
  local default_value=$2
  local description=$3

  if gcloud secrets describe "$secret_name" &> /dev/null; then
    echo -e "  ${YELLOW}⊙${NC} $secret_name already exists (skipping)"
  else
    echo "$default_value" | gcloud secrets create "$secret_name" \
      --data-file=- \
      --replication-policy="automatic" \
      --labels="app=bayit-plus,feature=vod-interaction" 2>/dev/null
    echo -e "  ${GREEN}✓${NC} $secret_name created - $description"
  fi
}

echo -e "${BLUE}📝 Creating Character Animation Provider Secrets${NC}"
echo ""

create_secret "bayit-character-animation-provider" \
  "elevenlabs" \
  "Default provider: elevenlabs"

echo ""
echo -e "${BLUE}📝 Creating Creatify API Secrets${NC}"
echo ""

create_secret "bayit-creatify-api-url" \
  "https://api.creatify.ai" \
  "Creatify API base URL"

create_secret "bayit-creatify-api-id" \
  "YOUR_CREATIFY_API_ID_HERE" \
  "⚠️  REPLACE WITH REAL VALUE"

create_secret "bayit-creatify-api-key" \
  "YOUR_CREATIFY_API_KEY_HERE" \
  "⚠️  REPLACE WITH REAL VALUE"

echo ""
echo -e "${BLUE}📝 Creating Character Voice ID Secrets${NC}"
echo ""

create_secret "bayit-character-voice-moshe" \
  "ashjVK50jp28G73AUTnb" \
  "Moshe Rabbenu voice (wise, authoritative)"

create_secret "bayit-character-voice-david" \
  "ashjVK50jp28G73AUTnb" \
  "David HaMelech voice (strong, regal)"

create_secret "bayit-character-voice-miriam" \
  "ashjVK50jp28G73AUTnb" \
  "Miriam voice (warm, nurturing)"

create_secret "bayit-character-voice-esther" \
  "ashjVK50jp28G73AUTnb" \
  "Esther voice (graceful, confident)"

create_secret "bayit-character-voice-default" \
  "ashjVK50jp28G73AUTnb" \
  "Default voice for unmatched characters"

echo ""
echo -e "${GREEN}✅ VOD Interaction Secrets Created${NC}"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: Update the following secrets with real values:${NC}"
echo ""
echo "  1. Creatify API Credentials:"
echo "     gcloud secrets versions add bayit-creatify-api-id --data-file=-"
echo "     gcloud secrets versions add bayit-creatify-api-key --data-file=-"
echo ""
echo "  2. Character Voice IDs (if different from default):"
echo "     gcloud secrets versions add bayit-character-voice-moshe --data-file=-"
echo "     gcloud secrets versions add bayit-character-voice-david --data-file=-"
echo "     gcloud secrets versions add bayit-character-voice-miriam --data-file=-"
echo "     gcloud secrets versions add bayit-character-voice-esther --data-file=-"
echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo ""
echo "  1. Update secrets with real values (see above)"
echo "  2. Sync secrets to .env files:"
echo "     ./scripts/backend/sync-gcloud-secrets.sh"
echo "  3. Restart backend service:"
echo "     cd backend && poetry run uvicorn app.main:app --reload"
echo ""
