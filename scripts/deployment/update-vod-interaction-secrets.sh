#!/bin/bash
#
# Update VOD Avatar Interaction Secrets with Real Values
# Interactive script to update secrets in Google Cloud Secret Manager
#
# Usage: ./scripts/deployment/update-vod-interaction-secrets.sh
#

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🔐 Update VOD Avatar Interaction Secrets${NC}"
echo "============================================"
echo ""

if ! command -v gcloud &> /dev/null; then
  echo -e "${RED}❌ Error: gcloud CLI is not installed${NC}"
  exit 1
fi

PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
if [[ -z "$PROJECT_ID" ]]; then
  echo -e "${RED}❌ Error: No GCloud project set${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Project: $PROJECT_ID${NC}"
echo ""

update_secret() {
  local secret_name=$1
  local prompt_text=$2
  local is_sensitive=${3:-true}

  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${YELLOW}$secret_name${NC}"
  echo ""

  current_value=$(gcloud secrets versions access latest --secret="$secret_name" 2>/dev/null || echo "")
  if [[ -n "$current_value" ]]; then
    if [[ "$is_sensitive" == "true" ]]; then
      echo "Current value: [HIDDEN]"
    else
      echo "Current value: $current_value"
    fi
  else
    echo "Current value: (not set)"
  fi

  echo ""
  echo -e "${prompt_text}"
  echo ""

  read -p "Enter new value (or press Enter to skip): " new_value

  if [[ -n "$new_value" ]]; then
    echo "$new_value" | gcloud secrets versions add "$secret_name" --data-file=- 2>/dev/null
    echo -e "${GREEN}✓${NC} Updated $secret_name"
  else
    echo -e "${YELLOW}⊙${NC} Skipped $secret_name"
  fi
}

echo -e "${BLUE}🎭 Character Animation Provider${NC}"
echo ""
echo "Select the provider for character animation:"
echo "  1. elevenlabs (default) - Integrated TTS + video generation"
echo "  2. creatify - Separate TTS + lip-sync animation"
echo ""
read -p "Select provider [1/2] (default: 1): " provider_choice

case "$provider_choice" in
  2)
    provider="creatify"
    ;;
  *)
    provider="elevenlabs"
    ;;
esac

echo "$provider" | gcloud secrets versions add "bayit-character-animation-provider" --data-file=- 2>/dev/null
echo -e "${GREEN}✓${NC} Set provider to: $provider"

if [[ "$provider" == "creatify" ]]; then
  echo ""
  echo -e "${YELLOW}⚠️  Creatify selected - you MUST provide API credentials${NC}"

  update_secret "bayit-creatify-api-id" \
    "Enter your Creatify API ID:" \
    true

  update_secret "bayit-creatify-api-key" \
    "Enter your Creatify API Key:" \
    true
fi

echo ""
echo -e "${BLUE}🎤 Character Voice Configuration${NC}"
echo ""
echo "Configure ElevenLabs voice IDs for each character."
echo "These voices will be used for character dialogue."
echo ""

read -p "Do you want to configure custom character voices? [y/N]: " configure_voices

if [[ "$configure_voices" =~ ^[Yy]$ ]]; then
  update_secret "bayit-character-voice-moshe" \
    "Enter ElevenLabs voice ID for Moshe Rabbenu (wise, authoritative):" \
    false

  update_secret "bayit-character-voice-david" \
    "Enter ElevenLabs voice ID for David HaMelech (strong, regal):" \
    false

  update_secret "bayit-character-voice-miriam" \
    "Enter ElevenLabs voice ID for Miriam (warm, nurturing):" \
    false

  update_secret "bayit-character-voice-esther" \
    "Enter ElevenLabs voice ID for Esther (graceful, confident):" \
    false

  update_secret "bayit-character-voice-default" \
    "Enter default ElevenLabs voice ID (fallback for unmatched characters):" \
    false
else
  echo -e "${YELLOW}⊙${NC} Using default voice IDs"
fi

echo ""
echo -e "${GREEN}✅ VOD Interaction Secrets Updated${NC}"
echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo ""
echo "  1. Sync secrets to .env files:"
echo "     cd /Users/olorin/Documents/Projects/olorin/olorin-media/bayit-plus"
echo "     ./scripts/backend/sync-gcloud-secrets.sh"
echo ""
echo "  2. Restart backend service:"
echo "     cd backend"
echo "     poetry run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
echo ""
echo "  3. Verify configuration:"
echo "     curl http://localhost:8000/health"
echo ""
