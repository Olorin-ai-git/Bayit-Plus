#!/bin/bash
# Setup iOS Build Secrets for GitHub Actions
# This script reads credentials from local files and sets them as GitHub repository secrets
#
# Prerequisites:
# - gh CLI installed and authenticated (gh auth login)
# - Access to the repository with admin permissions
# - Credentials files present in the expected locations
#
# Usage:
#   ./scripts/setup-ios-github-secrets.sh

set -euo pipefail

# Configuration
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CREDENTIALS_DIR="${REPO_ROOT}/credentials"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "iOS GitHub Secrets Setup"
echo "=========================================="
echo ""

# Check gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}Error: gh CLI is not installed${NC}"
    echo "Install it from: https://cli.github.com/"
    exit 1
fi

# Check gh CLI is authenticated
if ! gh auth status &> /dev/null; then
    echo -e "${RED}Error: gh CLI is not authenticated${NC}"
    echo "Run: gh auth login"
    exit 1
fi

# Get repository name
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || echo "")
if [ -z "$REPO" ]; then
    echo -e "${RED}Error: Not in a GitHub repository${NC}"
    exit 1
fi

echo "Repository: ${REPO}"
echo ""

# Function to set a secret from a file
set_secret_from_file() {
    local secret_name=$1
    local file_path=$2
    local description=$3

    if [ ! -f "$file_path" ]; then
        echo -e "${YELLOW}Warning: File not found: ${file_path}${NC}"
        echo "  Skipping: ${secret_name}"
        return 1
    fi

    echo -n "Setting ${secret_name}... "
    if base64 -i "$file_path" | gh secret set "$secret_name" --body - 2>/dev/null; then
        echo -e "${GREEN}Done${NC}"
        return 0
    else
        echo -e "${RED}Failed${NC}"
        return 1
    fi
}

# Function to set a secret from a value
set_secret_from_value() {
    local secret_name=$1
    local value=$2
    local description=$3

    if [ -z "$value" ]; then
        echo -e "${YELLOW}Warning: Empty value for ${secret_name}${NC}"
        return 1
    fi

    echo -n "Setting ${secret_name}... "
    if echo -n "$value" | gh secret set "$secret_name" --body - 2>/dev/null; then
        echo -e "${GREEN}Done${NC}"
        return 0
    else
        echo -e "${RED}Failed${NC}"
        return 1
    fi
}

echo "=========================================="
echo "Setting iOS Distribution Secrets"
echo "=========================================="
echo ""

# Note: Distribution certificate (.p12) needs to be exported from Keychain Access
# This script handles the provisioning profile and App Store Connect API key

# 1. Provisioning Profile
echo "1. iOS Provisioning Profile"
PROFILE_PATH="${CREDENTIALS_DIR}/provisioning-profiles/Bayit_Plus.mobileprovision"
set_secret_from_file "IOS_PROVISIONING_PROFILE" "$PROFILE_PATH" "iOS App Store Distribution Profile"
echo ""

# 2. App Store Connect API Key
echo "2. App Store Connect API Key"
API_KEY_PATH="${CREDENTIALS_DIR}/apple/AuthKey_LMYW5G8928.p8"
set_secret_from_file "APP_STORE_API_KEY" "$API_KEY_PATH" "App Store Connect API Key (.p8)"

# Set API Key ID and Issuer ID
set_secret_from_value "APP_STORE_API_KEY_ID" "LMYW5G8928" "App Store Connect API Key ID"
echo ""

# 3. Sentry DSN
echo "3. Sentry Error Tracking"
SENTRY_DSN="https://cf75c674a6980b83e7eed8ee5e227a2a@o4510740497367040.ingest.us.sentry.io/4510740503265280"
set_secret_from_value "SENTRY_DSN" "$SENTRY_DSN" "Sentry DSN for error tracking"
echo ""

# 4. Manual secrets notice
echo "=========================================="
echo "Manual Configuration Required"
echo "=========================================="
echo ""
echo -e "${YELLOW}The following secrets must be set manually:${NC}"
echo ""
echo "1. IOS_DISTRIBUTION_CERT_P12"
echo "   Export from Keychain Access:"
echo "   - Open Keychain Access"
echo "   - Find 'iPhone Distribution: YOUR_NAME' certificate"
echo "   - Right-click > Export"
echo "   - Save as .p12 with a password"
echo "   - Run: base64 -i certificate.p12 | pbcopy"
echo "   - Paste in GitHub: Settings > Secrets > New repository secret"
echo ""
echo "2. IOS_DISTRIBUTION_CERT_PASSWORD"
echo "   The password you used when exporting the .p12 certificate"
echo ""
echo "3. APP_STORE_API_ISSUER"
echo "   Find in App Store Connect > Users and Access > Keys"
echo "   The 'Issuer ID' is shown at the top of the page"
echo "   Example: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
echo ""

echo "=========================================="
echo "Verification"
echo "=========================================="
echo ""
echo "To verify secrets are set, run:"
echo "  gh secret list"
echo ""
echo "Expected secrets:"
echo "  - IOS_DISTRIBUTION_CERT_P12      (manual)"
echo "  - IOS_DISTRIBUTION_CERT_PASSWORD (manual)"
echo "  - IOS_PROVISIONING_PROFILE       (set above)"
echo "  - APP_STORE_API_KEY              (set above)"
echo "  - APP_STORE_API_KEY_ID           (set above)"
echo "  - APP_STORE_API_ISSUER           (manual)"
echo "  - SENTRY_DSN                     (set above)"
echo ""
