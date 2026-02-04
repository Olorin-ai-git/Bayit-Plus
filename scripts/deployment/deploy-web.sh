#!/bin/bash

# ============================================
# Bayit+ Web Deployment Script
# ============================================
# Deploys the Bayit+ web application to Firebase Hosting
# Supports deploying to desktop web, mobile web, or both
#
# Usage:
#   ./scripts/deployment/deploy-web.sh [target] [environment]
#
# Targets:
#   all     - Deploy to both desktop and mobile (default)
#   desktop - Deploy to desktop web only (bayit-plus)
#   mobile  - Deploy to mobile web only (mobile-bayit)
#
# Environments:
#   production - Deploy to production Firebase Hosting
#   staging    - Deploy to preview channel (30-day expiry)
#
# Examples:
#   ./scripts/deployment/deploy-web.sh              # Deploy all to production
#   ./scripts/deployment/deploy-web.sh all staging  # Deploy all to staging
#   ./scripts/deployment/deploy-web.sh mobile       # Deploy mobile only
#   ./scripts/deployment/deploy-web.sh desktop staging
#
# ============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TARGET="${1:-all}"
ENVIRONMENT="${2:-production}"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WEB_DIR="$PROJECT_ROOT/web"

# Validate target
if [[ ! "$TARGET" =~ ^(all|desktop|mobile)$ ]]; then
    echo -e "${RED}Error: Invalid target '$TARGET'${NC}"
    echo "Valid targets: all, desktop, mobile"
    exit 1
fi

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(production|staging)$ ]]; then
    echo -e "${RED}Error: Invalid environment '$ENVIRONMENT'${NC}"
    echo "Valid environments: production, staging"
    exit 1
fi

echo -e "${BLUE}======================================================${NC}"
echo -e "${BLUE}   Bayit+ Web Deployment${NC}"
echo -e "${BLUE}======================================================${NC}"
echo ""
echo -e "${YELLOW}Target: ${TARGET}${NC}"
echo -e "${YELLOW}Environment: ${ENVIRONMENT}${NC}"
echo -e "${YELLOW}Project Root: ${PROJECT_ROOT}${NC}"
echo ""

# ===== PRE-DEPLOYMENT CHECKS =====
echo -e "${BLUE}======================================================${NC}"
echo "Pre-deployment checks..."
echo -e "${BLUE}======================================================${NC}"
echo ""

# Check if firebase-tools is installed
if ! command -v firebase &> /dev/null; then
    echo -e "${RED}Error: firebase-tools not found${NC}"
    echo "Please install: npm install -g firebase-tools"
    exit 1
fi

# Check if web directory exists
if [ ! -d "$WEB_DIR" ]; then
    echo -e "${RED}Error: Web directory not found at $WEB_DIR${NC}"
    exit 1
fi

# Check if logged into Firebase
if ! firebase projects:list &> /dev/null; then
    echo -e "${RED}Error: Not logged into Firebase${NC}"
    echo "Please run: firebase login"
    exit 1
fi

echo -e "${GREEN}All pre-deployment checks passed${NC}"
echo ""

# ===== BUILD WEB APPLICATION =====
echo -e "${BLUE}======================================================${NC}"
echo "Building web application..."
echo -e "${BLUE}======================================================${NC}"
echo ""

cd "$WEB_DIR"

# Install dependencies
echo "Installing dependencies..."
npm ci

# Build application
echo "Building production bundle..."
npm run build

BUILD_SIZE=$(du -sh dist 2>/dev/null | cut -f1 || echo "unknown")
echo -e "${GREEN}Build complete: $BUILD_SIZE${NC}"
echo ""

# ===== DEPLOY TO FIREBASE HOSTING =====
echo -e "${BLUE}======================================================${NC}"
echo "Deploying to Firebase Hosting..."
echo -e "${BLUE}======================================================${NC}"
echo ""

cd "$PROJECT_ROOT"

# Deploy function based on target and environment
deploy_desktop() {
    if [ "$ENVIRONMENT" = "production" ]; then
        echo "Deploying to desktop production (bayit-plus)..."
        firebase deploy --only hosting:bayit-plus
    else
        echo "Deploying to desktop staging channel..."
        firebase hosting:channel:deploy staging-desktop --only bayit-plus --expires 30d
    fi
}

deploy_mobile() {
    if [ "$ENVIRONMENT" = "production" ]; then
        echo "Deploying to mobile production (mobile-bayit)..."
        firebase deploy --only hosting:mobile-bayit
    else
        echo "Deploying to mobile staging channel..."
        firebase hosting:channel:deploy staging-mobile --only mobile-bayit --expires 30d
    fi
}

# Execute deployment based on target
case "$TARGET" in
    all)
        deploy_desktop
        echo ""
        deploy_mobile
        ;;
    desktop)
        deploy_desktop
        ;;
    mobile)
        deploy_mobile
        ;;
esac

# ===== DEPLOYMENT SUMMARY =====
echo ""
echo -e "${BLUE}======================================================${NC}"
echo -e "${BLUE}   Deployment Complete${NC}"
echo -e "${BLUE}======================================================${NC}"
echo ""

# Get URLs
if [ "$ENVIRONMENT" = "production" ]; then
    if [ "$TARGET" = "all" ] || [ "$TARGET" = "desktop" ]; then
        DESKTOP_URL=$(firebase hosting:sites:list --json 2>/dev/null | grep -o '"bayit-plus"[^}]*"defaultUrl":"[^"]*"' | grep -o 'https://[^"]*' | head -1 || echo "https://bayit-plus.web.app")
        echo -e "${GREEN}Desktop Web: ${DESKTOP_URL}${NC}"
    fi
    if [ "$TARGET" = "all" ] || [ "$TARGET" = "mobile" ]; then
        MOBILE_URL=$(firebase hosting:sites:list --json 2>/dev/null | grep -o '"mobile-bayit"[^}]*"defaultUrl":"[^"]*"' | grep -o 'https://[^"]*' | head -1 || echo "https://mobile-bayit.web.app")
        echo -e "${GREEN}Mobile Web: ${MOBILE_URL}${NC}"
    fi
else
    echo -e "${GREEN}Staging channels deployed (30-day expiry)${NC}"
    echo "Check Firebase Console for preview URLs"
fi

echo ""
echo "Next steps:"
echo "  1. Verify deployment: Open URLs in browser"
echo "  2. Test mobile: Open mobile URL on phone"
echo "  3. Monitor: https://console.firebase.google.com/project/bayit-plus/hosting"
echo ""
