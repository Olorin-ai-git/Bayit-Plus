#!/bin/bash
# =============================================================================
# Olorin Platform - Quick Deploy Script
# =============================================================================
# Quick deployment for developers - skips build, deploys existing latest image
# Usage: ./deployment/scripts/quick-deploy.sh [staging|production]
# =============================================================================

set -euo pipefail

# Default to staging
ENVIRONMENT="${1:-staging}"

echo "Quick deploying to: $ENVIRONMENT"
echo ""

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(staging|production)$ ]]; then
    echo "Error: Invalid environment. Use 'staging' or 'production'"
    exit 1
fi

# Production safety check
if [ "$ENVIRONMENT" = "production" ]; then
    echo "WARNING: You are deploying to PRODUCTION!"
    read -p "Are you sure? (yes/NO) " -r
    if [[ ! $REPLY =~ ^yes$ ]]; then
        echo "Cancelled."
        exit 0
    fi
fi

# Run deployment with skip-build
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bash "$SCRIPT_DIR/deploy_server.sh" \
    --environment "$ENVIRONMENT" \
    --skip-build \
    --skip-tests \
    --skip-quality \
    --force

echo ""
echo "Quick deploy to $ENVIRONMENT completed!"
