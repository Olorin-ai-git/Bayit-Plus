#!/bin/bash
# Upload LOG_LEVEL secret to Google Cloud Secret Manager

set -e

PROJECT_ID="bayit-plus"
SECRET_NAME="bayit-log-level"
LOG_LEVEL="${1:-INFO}"  # Default to INFO if not provided

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Uploading LOG_LEVEL Secret to GCP Secret Manager             ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Validate log level
case "$LOG_LEVEL" in
    DEBUG|INFO|WARNING|ERROR|CRITICAL)
        echo -e "${YELLOW}Setting LOG_LEVEL to: ${LOG_LEVEL}${NC}"
        ;;
    *)
        echo -e "${YELLOW}Invalid log level: ${LOG_LEVEL}${NC}"
        echo -e "${YELLOW}Valid values: DEBUG, INFO, WARNING, ERROR, CRITICAL${NC}"
        echo -e "${YELLOW}Defaulting to: INFO${NC}"
        LOG_LEVEL="INFO"
        ;;
esac

# Check if secret exists
if gcloud secrets describe "$SECRET_NAME" --project="$PROJECT_ID" &>/dev/null; then
    # Secret exists, add new version
    echo "$LOG_LEVEL" | gcloud secrets versions add "$SECRET_NAME" \
        --project="$PROJECT_ID" \
        --data-file=- 2>/dev/null
    echo -e "${GREEN}✓ Updated existing secret: ${SECRET_NAME}${NC}"
else
    # Secret doesn't exist, create it
    echo "$LOG_LEVEL" | gcloud secrets create "$SECRET_NAME" \
        --project="$PROJECT_ID" \
        --replication-policy="automatic" \
        --data-file=- \
        --labels="category=configuration" 2>/dev/null
    echo -e "${GREEN}✓ Created new secret: ${SECRET_NAME}${NC}"
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  LOG_LEVEL Secret Upload Complete                             ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Current LOG_LEVEL: ${LOG_LEVEL}${NC}"
echo ""
echo -e "${YELLOW}To change the log level:${NC}"
echo -e "  ./upload_log_level_secret.sh DEBUG    # For development"
echo -e "  ./upload_log_level_secret.sh INFO     # For production (default)"
echo -e "  ./upload_log_level_secret.sh WARNING  # Warnings only"
echo -e "  ./upload_log_level_secret.sh ERROR    # Errors only"
echo ""
echo -e "${YELLOW}To retrieve updated secrets for local .env:${NC}"
echo -e "  ./retrieve_secrets.sh > .env"
echo ""
