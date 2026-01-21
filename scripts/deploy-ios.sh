#!/bin/bash
# Deploy iOS App to TestFlight or App Store
#
# Usage:
#   ./scripts/deploy-ios.sh                    # Deploy to TestFlight (default)
#   ./scripts/deploy-ios.sh testflight         # Deploy to TestFlight
#   ./scripts/deploy-ios.sh production         # Deploy to App Store
#   ./scripts/deploy-ios.sh testflight 42      # Deploy with specific build number

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Arguments
ENVIRONMENT="${1:-testflight}"
BUILD_NUMBER="${2:-}"

# Validate environment
if [[ "$ENVIRONMENT" != "testflight" && "$ENVIRONMENT" != "production" ]]; then
    echo -e "${YELLOW}Invalid environment: $ENVIRONMENT${NC}"
    echo "Usage: $0 [testflight|production] [build_number]"
    exit 1
fi

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  iOS Deployment - ${ENVIRONMENT^^}${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check gh CLI
if ! command -v gh &> /dev/null; then
    echo "Error: gh CLI not installed"
    exit 1
fi

# Build the workflow command
CMD="gh workflow run ios-build.yml -f environment=$ENVIRONMENT"
if [[ -n "$BUILD_NUMBER" ]]; then
    CMD="$CMD -f build_number=$BUILD_NUMBER"
fi

echo -e "Environment: ${GREEN}$ENVIRONMENT${NC}"
if [[ -n "$BUILD_NUMBER" ]]; then
    echo -e "Build Number: ${GREEN}$BUILD_NUMBER${NC}"
else
    echo -e "Build Number: ${GREEN}auto (timestamp)${NC}"
fi
echo ""

# Confirm production deployments
if [[ "$ENVIRONMENT" == "production" ]]; then
    echo -e "${YELLOW}⚠️  You are about to deploy to PRODUCTION (App Store)${NC}"
    read -p "Are you sure? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled."
        exit 0
    fi
fi

# Trigger the workflow
echo "Triggering build..."
$CMD

# Wait for workflow to start
sleep 3

# Get the run ID
RUN_ID=$(gh run list --workflow=ios-build.yml --limit=1 --json databaseId -q '.[0].databaseId')

echo ""
echo -e "${GREEN}Build started!${NC}"
echo -e "Run ID: ${BLUE}$RUN_ID${NC}"
echo ""
echo "Watch progress:"
echo "  gh run watch $RUN_ID"
echo ""
echo "Open in browser:"
echo "  gh run view $RUN_ID --web"
echo ""

# Ask if user wants to watch
read -p "Watch build progress? (Y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Nn]$ ]]; then
    echo "You can check status later with: gh run view $RUN_ID"
else
    gh run watch $RUN_ID
fi
