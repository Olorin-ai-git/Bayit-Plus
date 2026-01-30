#!/bin/bash
set -euo pipefail

# ============================================
# Audit Unmapped GCloud Secrets
# ============================================
#
# Read-only script that lists Google Cloud secrets NOT present
# in the secrets manifest (scripts/config/secrets-manifest.json).
#
# Use this to find:
#   - Secrets that should be added to the manifest
#   - Duplicate/obsolete secrets that can be cleaned up
#   - Cross-platform secrets (olorin-*, cvplus-*, station-ai-*)
#
# This script does NOT modify or delete anything.
#
# Usage:
#   ./scripts/audit-unmapped-secrets.sh [--project PROJECT_ID]

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MANIFEST_FILE="$SCRIPT_DIR/config/secrets-manifest.json"
PROJECT_ID=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        --project)
            PROJECT_ID="$2"
            shift 2
            ;;
        --project=*)
            PROJECT_ID="${1#*=}"
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [--project PROJECT_ID]"
            echo ""
            echo "Lists GCloud secrets not in the manifest. Read-only, no modifications."
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown argument: $1${NC}"
            exit 1
            ;;
    esac
done

# Resolve project ID
if [ -z "$PROJECT_ID" ]; then
    PROJECT_ID=$(gcloud config get-value project 2>/dev/null || true)
fi

if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}Error: Project ID not specified${NC}"
    exit 1
fi

# Validate dependencies
if ! command -v jq &>/dev/null; then
    echo -e "${RED}Error: jq is required${NC}"
    exit 1
fi

if [ ! -f "$MANIFEST_FILE" ]; then
    echo -e "${RED}Error: Manifest not found at $MANIFEST_FILE${NC}"
    exit 1
fi

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}Audit Unmapped GCloud Secrets${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""
echo -e "Project:  ${GREEN}${PROJECT_ID}${NC}"
echo -e "Manifest: ${GREEN}${MANIFEST_FILE}${NC}"
echo ""

# Fetch all GCloud secret names
echo -e "${BLUE}Fetching secret list from Google Cloud...${NC}"
ALL_SECRETS=$(gcloud secrets list --project="$PROJECT_ID" --format="value(name)" 2>/dev/null | sort)

if [ -z "$ALL_SECRETS" ]; then
    echo -e "${RED}No secrets found in project $PROJECT_ID${NC}"
    exit 1
fi

TOTAL_GCLOUD=$(echo "$ALL_SECRETS" | wc -l | tr -d ' ')
echo -e "${GREEN}Found ${TOTAL_GCLOUD} secrets in GCloud${NC}"
echo ""

# Extract all mapped secret names from manifest (across all platforms)
MAPPED_SECRETS=$(jq -r '.platforms | to_entries[] | .value.secrets | keys[]' "$MANIFEST_FILE" | sort -u)
MAPPED_COUNT=$(echo "$MAPPED_SECRETS" | wc -l | tr -d ' ')

# Extract ignored duplicates from manifest
IGNORED_SECRETS=$(jq -r '.ignored_duplicates | keys[] | select(. != "_comment")' "$MANIFEST_FILE" 2>/dev/null | sort -u)
IGNORED_COUNT=$(echo "$IGNORED_SECRETS" | grep -c . 2>/dev/null || echo 0)

echo -e "Mapped in manifest:       ${GREEN}${MAPPED_COUNT}${NC}"
echo -e "Documented as ignored:    ${YELLOW}${IGNORED_COUNT}${NC}"
echo ""

# Categorize each GCloud secret
UNMAPPED=()
MAPPED_LIST=()
IGNORED_LIST=()

while IFS= read -r secret; do
    [ -z "$secret" ] && continue

    if echo "$MAPPED_SECRETS" | grep -qx "$secret"; then
        MAPPED_LIST+=("$secret")
    elif echo "$IGNORED_SECRETS" | grep -qx "$secret"; then
        IGNORED_LIST+=("$secret")
    else
        UNMAPPED+=("$secret")
    fi
done <<< "$ALL_SECRETS"

# Report
echo -e "${GREEN}Mapped (in manifest):     ${#MAPPED_LIST[@]}${NC}"
echo -e "${YELLOW}Ignored (documented):     ${#IGNORED_LIST[@]}${NC}"
echo -e "${RED}Unmapped (unknown):       ${#UNMAPPED[@]}${NC}"
echo ""

if [ ${#UNMAPPED[@]} -gt 0 ]; then
    echo -e "${RED}--- Unmapped Secrets ---${NC}"
    echo -e "${CYAN}These GCloud secrets are NOT in the manifest or ignored_duplicates.${NC}"
    echo -e "${CYAN}Action: Add to manifest secrets, or add to ignored_duplicates with reason.${NC}"
    echo ""

    # Sub-categorize unmapped secrets
    BAYIT_UNMAPPED=()
    OLORIN_UNMAPPED=()
    CVPLUS_UNMAPPED=()
    STATION_AI_UNMAPPED=()
    REACT_UNMAPPED=()
    OTHER_UNMAPPED=()

    for secret in "${UNMAPPED[@]}"; do
        case "$secret" in
            bayit-*|BAYIT_*)    BAYIT_UNMAPPED+=("$secret") ;;
            olorin-*|OLORIN_*)  OLORIN_UNMAPPED+=("$secret") ;;
            cvplus-*|CVPLUS_*)  CVPLUS_UNMAPPED+=("$secret") ;;
            station-ai-*|STATION_AI_*) STATION_AI_UNMAPPED+=("$secret") ;;
            REACT_APP_*|VITE_*) REACT_UNMAPPED+=("$secret") ;;
            *)                  OTHER_UNMAPPED+=("$secret") ;;
        esac
    done

    if [ ${#BAYIT_UNMAPPED[@]} -gt 0 ]; then
        echo -e "  ${YELLOW}Bayit+ (${#BAYIT_UNMAPPED[@]}):${NC} - likely should be in backend manifest"
        for s in "${BAYIT_UNMAPPED[@]}"; do
            echo -e "    - $s"
        done
        echo ""
    fi

    if [ ${#REACT_UNMAPPED[@]} -gt 0 ]; then
        echo -e "  ${YELLOW}Web/Frontend (${#REACT_UNMAPPED[@]}):${NC} - likely should be in web manifest"
        for s in "${REACT_UNMAPPED[@]}"; do
            echo -e "    - $s"
        done
        echo ""
    fi

    if [ ${#OLORIN_UNMAPPED[@]} -gt 0 ]; then
        echo -e "  ${CYAN}Olorin (${#OLORIN_UNMAPPED[@]}):${NC} - cross-platform, add to ignored_duplicates"
        for s in "${OLORIN_UNMAPPED[@]}"; do
            echo -e "    - $s"
        done
        echo ""
    fi

    if [ ${#CVPLUS_UNMAPPED[@]} -gt 0 ]; then
        echo -e "  ${CYAN}CVPlus (${#CVPLUS_UNMAPPED[@]}):${NC} - cross-platform, add to ignored_duplicates"
        for s in "${CVPLUS_UNMAPPED[@]}"; do
            echo -e "    - $s"
        done
        echo ""
    fi

    if [ ${#STATION_AI_UNMAPPED[@]} -gt 0 ]; then
        echo -e "  ${CYAN}Station AI (${#STATION_AI_UNMAPPED[@]}):${NC} - cross-platform, add to ignored_duplicates"
        for s in "${STATION_AI_UNMAPPED[@]}"; do
            echo -e "    - $s"
        done
        echo ""
    fi

    if [ ${#OTHER_UNMAPPED[@]} -gt 0 ]; then
        echo -e "  ${RED}Other (${#OTHER_UNMAPPED[@]}):${NC} - investigate and categorize"
        for s in "${OTHER_UNMAPPED[@]}"; do
            echo -e "    - $s"
        done
        echo ""
    fi
else
    echo -e "${GREEN}All GCloud secrets are accounted for in the manifest.${NC}"
fi

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}Audit complete (read-only, no changes made)${NC}"
echo -e "${BLUE}============================================${NC}"
