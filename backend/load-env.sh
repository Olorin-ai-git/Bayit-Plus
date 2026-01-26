#!/bin/bash
# ============================================
# Bayit+ Environment Loader
# ============================================
# Sources base Olorin platform configuration and merges with Bayit+ config
# Usage: source ./load-env.sh

set -a  # Automatically export all variables

# Step 1: Load base Olorin platform configuration
OLORIN_INFRA_ENV="../../../olorin-infra/.env"
if [ -f "$OLORIN_INFRA_ENV" ]; then
    echo "Loading base Olorin platform config from olorin-infra/.env..."
    source "$OLORIN_INFRA_ENV"
else
    echo "WARNING: Base platform config not found at $OLORIN_INFRA_ENV"
    echo "Falling back to local config only"
fi

# Step 2: Load Bayit+ specific configuration (overrides base if same variable)
BAYIT_ENV="$(dirname "$0")/.env"
if [ -f "$BAYIT_ENV" ]; then
    echo "Loading Bayit+ specific config from backend/.env..."
    source "$BAYIT_ENV"
else
    echo "ERROR: Bayit+ configuration not found at $BAYIT_ENV"
    exit 1
fi

set +a  # Stop auto-exporting

echo "✓ Environment loaded: Base platform + Bayit+ specific"
echo "  - Shared credentials from olorin-infra"
echo "  - Bayit+ specific overrides applied"
