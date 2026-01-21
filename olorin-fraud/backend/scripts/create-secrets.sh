#!/bin/bash
# Upload secrets from .env to Google Cloud Secret Manager
# Usage: ./scripts/create-secrets.sh

set -euo pipefail

# Configuration
PROJECT_ID="olorin-fraud-detection"
ENV_FILE="/Users/olorin/Documents/olorin/olorin-server/.env"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔐 Uploading secrets to Google Cloud Secret Manager${NC}"
echo "Project: $PROJECT_ID"
echo "Reading from: $ENV_FILE"
echo ""

# Check if .env file exists
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}❌ Error: .env file not found at $ENV_FILE${NC}"
    exit 1
fi

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ Error: gcloud CLI not found. Please install it first.${NC}"
    exit 1
fi

# Set project
gcloud config set project "$PROJECT_ID" --quiet

# Counter for created/updated secrets
created_count=0
updated_count=0
skipped_count=0

# Read from .env and create secrets for sensitive values
while IFS='=' read -r key value; do
  # Skip comments and empty lines
  [[ "$key" =~ ^#.*$ ]] && continue
  [[ -z "$key" ]] && continue

  # Remove leading/trailing whitespace
  key=$(echo "$key" | xargs)
  value=$(echo "$value" | xargs)

  # Remove quotes from value if present
  value="${value%\"}"
  value="${value#\"}"
  value="${value%\'}"
  value="${value#\'}"

  # Only create secrets for sensitive keys
  if [[ "$key" =~ (PASSWORD|SECRET|KEY|TOKEN|PRIVATE|CREDENTIALS) ]]; then
    # Skip if value is empty or placeholder
    if [[ -z "$value" ]] || [[ "$value" =~ (your-|YOUR_|CHANGE_ME|PLACEHOLDER) ]]; then
      echo -e "${YELLOW}⏭️  Skipping $key (empty or placeholder value)${NC}"
      ((skipped_count++))
      continue
    fi

    echo -n "Processing $key... "

    # Try to create secret (will fail if exists)
    if echo -n "$value" | gcloud secrets create "$key" \
      --data-file=- \
      --replication-policy="automatic" \
      --project="$PROJECT_ID" 2>/dev/null; then
      echo -e "${GREEN}✅ Created${NC}"
      ((created_count++))
    else
      # Secret exists, add new version
      if echo -n "$value" | gcloud secrets versions add "$key" \
        --data-file=- \
        --project="$PROJECT_ID" 2>/dev/null; then
        echo -e "${GREEN}✅ Updated${NC}"
        ((updated_count++))
      else
        echo -e "${RED}❌ Failed${NC}"
      fi
    fi
  fi
done < "$ENV_FILE"

echo ""
echo -e "${GREEN}🎉 Secret upload complete!${NC}"
echo "Created: $created_count secrets"
echo "Updated: $updated_count secrets"
echo "Skipped: $skipped_count secrets"
echo ""
echo "Verify secrets:"
echo "  gcloud secrets list --project=$PROJECT_ID"
echo ""
echo "Grant service account access:"
echo "  gcloud projects add-iam-policy-binding $PROJECT_ID \\"
echo "    --member='serviceAccount:olorin-detection@olorin-fraud-detection.iam.gserviceaccount.com' \\"
echo "    --role='roles/secretmanager.secretAccessor'"
