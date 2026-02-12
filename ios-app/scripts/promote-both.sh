#!/bin/bash
# Promote both iOS and tvOS builds - bump versions, archive, and upload to App Store Connect

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Promoting iOS + tvOS Builds${NC}"
echo ""

# Set correct GCP project for Bayit+
echo -e "${BLUE}📋 Setting GCP project to bayit-plus${NC}"
gcloud config set project bayit-plus

# Get current directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Run iOS promotion
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}         iOS Build Promotion${NC}"
echo -e "${BLUE}========================================${NC}"
"$SCRIPT_DIR/promote-ios.sh"

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}         tvOS Build Promotion${NC}"
echo -e "${BLUE}========================================${NC}"
"$SCRIPT_DIR/promote-tvos.sh"

echo ""
echo -e "${GREEN}🎉🎉🎉 Both platforms promoted successfully! 🎉🎉🎉${NC}"
echo -e "${BLUE}📱 iOS and 📺 tvOS builds are now processing in App Store Connect${NC}"
