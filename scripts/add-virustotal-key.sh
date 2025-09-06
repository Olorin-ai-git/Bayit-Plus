#!/bin/bash

# Script to add VirusTotal API key to Firebase Secrets

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔧 VirusTotal API Key Configuration Script${NC}"
echo -e "${YELLOW}===========================================${NC}"

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo -e "${RED}❌ Firebase CLI is not installed${NC}"
    echo "Please install it with: npm install -g firebase-tools"
    exit 1
fi

# Get current Firebase project
CURRENT_PROJECT=$(firebase use 2>/dev/null | grep "Active Project:" | sed 's/Active Project: //' | cut -d' ' -f1)

if [ -z "$CURRENT_PROJECT" ]; then
    echo -e "${RED}❌ No Firebase project selected${NC}"
    echo "Please select a project with: firebase use <project-id>"
    exit 1
fi

echo -e "${GREEN}✓ Using Firebase project: ${CURRENT_PROJECT}${NC}"

# Check if API key is provided as argument
if [ -n "$1" ]; then
    API_KEY="$1"
    echo -e "${YELLOW}Using provided API key${NC}"
else
    # Prompt for API key
    echo -e "${YELLOW}Please enter your VirusTotal API key:${NC}"
    read -s API_KEY
    echo
fi

# Validate API key format (basic check)
if [ ${#API_KEY} -lt 32 ]; then
    echo -e "${RED}❌ Invalid API key format (too short)${NC}"
    exit 1
fi

# Add to Firebase Secrets
echo -e "${YELLOW}Adding VirusTotal API key to Firebase Secrets...${NC}"

if echo "$API_KEY" | firebase functions:secrets:set VIRUSTOTAL_API_KEY; then
    echo -e "${GREEN}✅ VirusTotal API key successfully added to Firebase Secrets!${NC}"
    echo
    echo -e "${GREEN}Next steps:${NC}"
    echo "1. The key is now available to your Firebase Functions"
    echo "2. You may need to redeploy functions that use this secret"
    echo "3. Test the integration with: poetry run python scripts/testing/test_virustotal_integration.py"
else
    echo -e "${RED}❌ Failed to add API key to Firebase Secrets${NC}"
    echo "Please check your Firebase configuration and try again"
    exit 1
fi

echo
echo -e "${YELLOW}To verify the secret was added:${NC}"
echo "firebase functions:secrets:get VIRUSTOTAL_API_KEY"