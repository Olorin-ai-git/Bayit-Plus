#!/bin/bash
set -euo pipefail

# ============================================
# Manifest-Based Secrets Sync from Google Cloud
# ============================================
#
# Syncs secrets from Google Cloud Secret Manager to .env files
# using an explicit JSON manifest (scripts/config/secrets-manifest.json).
#
# Google Cloud Secret Manager is the SINGLE SOURCE OF TRUTH.
#
# Key features:
#   - Explicit mapping: no name-guessing normalization
#   - Platform isolation: only Bayit+ secrets in backend .env
#   - Validation: required vars checked before overwriting
#   - Diff output: shows added/removed/changed keys (no values)
#   - Atomic write: writes to .env.new, validates, then moves
#   - Backup: timestamped backup of existing .env
#
# Usage:
#   ./scripts/sync-gcloud-secrets.sh [--dry-run] [--force] [--project PROJECT_ID]
#
# Examples:
#   ./scripts/sync-gcloud-secrets.sh                            # Sync backend
#   ./scripts/sync-gcloud-secrets.sh --dry-run                  # Preview changes
#   ./scripts/sync-gcloud-secrets.sh --project bayit-plus       # Explicit project
#   ./scripts/sync-gcloud-secrets.sh --force                    # Skip validation

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Script paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MANIFEST_FILE="$SCRIPT_DIR/config/secrets-manifest.json"

# Defaults
TARGET="backend"
DRY_RUN=false
FORCE=false
PROJECT_ID=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        backend)
            TARGET="$1"
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        --project)
            PROJECT_ID="$2"
            shift 2
            ;;
        --project=*)
            PROJECT_ID="${1#*=}"
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [backend] [--dry-run] [--force] [--project PROJECT_ID]"
            echo ""
            echo "Options:"
            echo "  backend           Target platform (default: backend)"
            echo "  --dry-run         Preview changes without writing"
            echo "  --force           Write .env even if validation fails"
            echo "  --project ID      Google Cloud project ID"
            echo "  -h, --help        Show this help"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown argument: $1${NC}"
            echo "Use --help for usage information."
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
    echo "Use --project PROJECT_ID or: gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

# Validate dependencies
if ! command -v jq &>/dev/null; then
    echo -e "${RED}Error: jq is required but not installed${NC}"
    echo "Install with: brew install jq (macOS) or apt-get install jq (Linux)"
    exit 1
fi

if ! command -v gcloud &>/dev/null; then
    echo -e "${RED}Error: gcloud CLI is required but not installed${NC}"
    exit 1
fi

# Validate manifest exists
if [ ! -f "$MANIFEST_FILE" ]; then
    echo -e "${RED}Error: Manifest not found at $MANIFEST_FILE${NC}"
    echo "The manifest file scripts/config/secrets-manifest.json is required."
    exit 1
fi

# Validate manifest is valid JSON
if ! jq empty "$MANIFEST_FILE" 2>/dev/null; then
    echo -e "${RED}Error: Manifest is not valid JSON${NC}"
    exit 1
fi

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}Manifest-Based Secrets Sync${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""
echo -e "Project:  ${GREEN}${PROJECT_ID}${NC}"
echo -e "Target:   ${GREEN}${TARGET}${NC}"
echo -e "Manifest: ${GREEN}${MANIFEST_FILE}${NC}"
if $DRY_RUN; then
    echo -e "Mode:     ${YELLOW}DRY RUN (no files will be written)${NC}"
fi
if $FORCE; then
    echo -e "Force:    ${YELLOW}ON (validation failures will not block write)${NC}"
fi
echo ""

# Function to fetch a single secret value from GCloud
get_secret_value() {
    local secret_name="$1"
    gcloud secrets versions access latest \
        --secret="$secret_name" \
        --project="$PROJECT_ID" 2>/dev/null
}

# Function to extract current env var keys from an existing .env file
get_existing_keys() {
    local env_file="$1"
    if [ -f "$env_file" ]; then
        grep -E '^[A-Za-z_][A-Za-z0-9_]*=' "$env_file" | cut -d'=' -f1 | sort
    fi
}

# Function to show diff between old and new .env (keys only, no values)
show_key_diff() {
    local old_file="$1"
    local new_file="$2"
    local platform="$3"

    local old_keys new_keys

    old_keys=$(get_existing_keys "$old_file" 2>/dev/null || true)
    new_keys=$(get_existing_keys "$new_file" 2>/dev/null || true)

    if [ -z "$old_keys" ] && [ -z "$new_keys" ]; then
        echo -e "${YELLOW}  No keys in either file${NC}"
        return
    fi

    local added removed unchanged changed_count
    added=$(comm -13 <(echo "$old_keys") <(echo "$new_keys") 2>/dev/null || true)
    removed=$(comm -23 <(echo "$old_keys") <(echo "$new_keys") 2>/dev/null || true)
    unchanged=$(comm -12 <(echo "$old_keys") <(echo "$new_keys") 2>/dev/null || true)

    local added_count removed_count unchanged_count
    added_count=$(echo "$added" | grep -c . 2>/dev/null || echo 0)
    removed_count=$(echo "$removed" | grep -c . 2>/dev/null || echo 0)
    unchanged_count=$(echo "$unchanged" | grep -c . 2>/dev/null || echo 0)

    echo -e "${CYAN}  Key diff for ${platform}:${NC}"
    echo -e "    Unchanged: ${unchanged_count}"

    if [ -n "$added" ] && [ "$added_count" -gt 0 ]; then
        echo -e "    ${GREEN}Added ($added_count):${NC}"
        echo "$added" | while read -r key; do
            [ -n "$key" ] && echo -e "      ${GREEN}+ ${key}${NC}"
        done
    fi

    if [ -n "$removed" ] && [ "$removed_count" -gt 0 ]; then
        echo -e "    ${RED}Removed ($removed_count):${NC}"
        echo "$removed" | while read -r key; do
            [ -n "$key" ] && echo -e "      ${RED}- ${key}${NC}"
        done
    fi

    echo ""
}

# Function to sync a single platform
sync_platform() {
    local platform="$1"
    local target_file
    target_file="$REPO_ROOT/$(jq -r ".platforms.${platform}.target_file" "$MANIFEST_FILE")"
    local new_file="${target_file}.new"

    echo -e "${BLUE}--- Syncing ${platform} ---${NC}"
    echo ""

    # Get secret mappings as tab-separated pairs: gcloud_name\tenv_var
    local secret_pairs
    secret_pairs=$(jq -r ".platforms.${platform}.secrets | to_entries[] | \"\(.key)\t\(.value)\"" "$MANIFEST_FILE")

    local total_count
    total_count=$(echo "$secret_pairs" | wc -l | tr -d ' ')
    echo -e "  Secrets in manifest: ${total_count}"

    # Create backup of existing .env
    if [ -f "$target_file" ]; then
        local backup_file="${target_file}.backup.$(date +%Y%m%d_%H%M%S)"
        if ! $DRY_RUN; then
            cp "$target_file" "$backup_file"
            echo -e "  ${GREEN}Backup:${NC} $backup_file"
        else
            echo -e "  ${YELLOW}Backup:${NC} would create $backup_file"
        fi
    fi
    echo ""

    # Write header to .env.new
    cat > "$new_file" << EOF
# ============================================
# $(echo "$platform" | tr '[:lower:]' '[:upper:]') ENVIRONMENT VARIABLES
# ============================================
#
# NEVER EDIT THIS FILE DIRECTLY
# This file is GENERATED from Google Cloud Secret Manager
# using the manifest at scripts/config/secrets-manifest.json
#
# To update configuration:
# 1. Update secrets in Google Cloud Secret Manager
# 2. Run: ./scripts/sync-gcloud-secrets.sh ${platform}
# 3. Restart the ${platform} service
#
# Generated: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
# Project: $PROJECT_ID
# Manifest version: $(jq -r '.version' "$MANIFEST_FILE")
# ============================================

EOF

    # Fetch and write each secret
    local success_count=0
    local fail_count=0
    local progress=0

    while IFS=$'\t' read -r gcloud_name env_var; do
        [ -z "$gcloud_name" ] && continue
        progress=$((progress + 1))

        local value
        value=$(get_secret_value "$gcloud_name" 2>/dev/null) || true

        if [ -n "$value" ]; then
            echo "${env_var}=${value}" >> "$new_file"
            success_count=$((success_count + 1))

            # Show progress every 20 secrets
            if [ $((success_count % 20)) -eq 0 ]; then
                echo -e "  ${GREEN}Fetched ${success_count}/${total_count}...${NC}"
            fi
        else
            echo -e "  ${YELLOW}Failed:${NC} ${gcloud_name} -> ${env_var} (not found or access denied)"
            fail_count=$((fail_count + 1))
        fi
    done <<< "$secret_pairs"

    echo ""
    echo -e "  ${GREEN}Fetched: ${success_count}${NC} / ${YELLOW}Failed: ${fail_count}${NC} / Total: ${total_count}"
    echo ""

    # Validate required vars
    local required_vars
    required_vars=$(jq -r ".platforms.${platform}.required_vars[]" "$MANIFEST_FILE" 2>/dev/null || true)

    local missing_required=()
    if [ -n "$required_vars" ]; then
        while IFS= read -r var; do
            [ -z "$var" ] && continue
            if ! grep -q "^${var}=" "$new_file"; then
                missing_required+=("$var")
            else
                # Check if value is empty
                local val
                val=$(grep "^${var}=" "$new_file" | cut -d'=' -f2-)
                if [ -z "$val" ]; then
                    missing_required+=("$var (empty)")
                fi
            fi
        done <<< "$required_vars"
    fi

    local validation_passed=true
    if [ ${#missing_required[@]} -gt 0 ]; then
        validation_passed=false
        echo -e "  ${RED}VALIDATION FAILED - Missing required vars:${NC}"
        for var in "${missing_required[@]}"; do
            echo -e "    ${RED}- ${var}${NC}"
        done
        echo ""
    else
        echo -e "  ${GREEN}Validation passed: all required vars present${NC}"
    fi

    # Check for duplicate env var keys
    local dup_keys
    dup_keys=$(grep -E '^[A-Za-z_][A-Za-z0-9_]*=' "$new_file" | cut -d'=' -f1 | sort | uniq -d)
    if [ -n "$dup_keys" ]; then
        echo -e "  ${RED}WARNING: Duplicate env var keys found:${NC}"
        echo "$dup_keys" | while read -r key; do
            [ -n "$key" ] && echo -e "    ${RED}- ${key}${NC}"
        done
        echo ""
    fi

    # Show diff
    if [ -f "$target_file" ]; then
        show_key_diff "$target_file" "$new_file" "$platform"
    else
        local new_count
        new_count=$(grep -cE '^[A-Za-z_]' "$new_file" || echo 0)
        echo -e "  ${CYAN}New .env file with ${new_count} variables${NC}"
        echo ""
    fi

    # Apply or discard
    if $DRY_RUN; then
        echo -e "  ${YELLOW}DRY RUN: .env.new written for inspection at:${NC}"
        echo -e "    $new_file"
        echo -e "  ${YELLOW}No changes applied to ${target_file}${NC}"
    elif ! $validation_passed && ! $FORCE; then
        echo -e "  ${RED}ABORTED: Validation failed. Use --force to override.${NC}"
        echo -e "  ${YELLOW}New file preserved at: ${new_file}${NC}"
        echo -e "  ${YELLOW}Original .env unchanged.${NC}"
        return 1
    else
        if ! $validation_passed && $FORCE; then
            echo -e "  ${YELLOW}WARNING: Writing despite validation failure (--force)${NC}"
        fi
        mv "$new_file" "$target_file"
        echo -e "  ${GREEN}Written: ${target_file}${NC}"
    fi
    echo ""
}

# Execute sync based on target
EXIT_CODE=0

sync_platform "backend" || EXIT_CODE=$?

echo -e "${BLUE}============================================${NC}"
if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}Sync complete${NC}"
else
    echo -e "${YELLOW}Sync completed with warnings${NC}"
fi
echo -e "${BLUE}============================================${NC}"
echo ""

if ! $DRY_RUN && [ $EXIT_CODE -eq 0 ]; then
    echo -e "${BLUE}Next steps:${NC}"
    echo ""
    echo -e "  1. Verify backend .env:"
    echo -e "     ${GREEN}wc -l backend/.env${NC}"
    echo -e "     ${GREEN}grep -c '=' backend/.env${NC}"
    echo ""
    echo -e "  2. Restart backend:"
    echo -e "     ${GREEN}cd backend && poetry run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload${NC}"
    echo ""
fi

exit $EXIT_CODE
