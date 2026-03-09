#!/bin/bash
# Promote iOS and tvOS builds - bump versions, archive, and upload to App Store Connect

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

NEW_VERSION="${1:-}"

if [ -z "$NEW_VERSION" ]; then
  # Read current version and auto-bump patch
  CURRENT_VERSION=$(plutil -extract CFBundleShortVersionString raw -o - "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/BayitPlusApp/Info.plist")
  IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"
  NEW_VERSION="${MAJOR}.${MINOR}.$((PATCH + 1))"
  echo -e "${BLUE}No version specified, auto-bumping: $CURRENT_VERSION -> $NEW_VERSION${NC}"
fi

# Validate semver format
if ! [[ "$NEW_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo -e "${RED}ERROR: Invalid version format '$NEW_VERSION'. Expected X.Y.Z${NC}"
  exit 1
fi

echo -e "${BLUE}Promoting iOS + tvOS Builds to version $NEW_VERSION${NC}"
echo ""

# Set correct GCP project for Bayit+
echo -e "${BLUE}Setting GCP project to bayit-plus${NC}"
gcloud config set project bayit-plus

# Get current directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Run iOS promotion
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}         iOS Build Promotion${NC}"
echo -e "${BLUE}========================================${NC}"
"$SCRIPT_DIR/promote-ios.sh" "$NEW_VERSION"

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}         tvOS Build Promotion${NC}"
echo -e "${BLUE}========================================${NC}"
"$SCRIPT_DIR/promote-tvos.sh" "$NEW_VERSION"

echo ""
echo -e "${GREEN}All platforms promoted successfully!${NC}"
echo -e "${BLUE}iOS and tvOS builds are now processing in App Store Connect${NC}"
