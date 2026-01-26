#!/bin/bash

# MongoDB Environment Variables Export Script
# Exports MONGODB_URI and STATION_AI_MONGODB_URI from .env to environment
# Usage: source ./scripts/environment/export-mongodb-vars.sh

set -euo pipefail

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="$REPO_ROOT/backend/.env"

if [[ ! -f "$ENV_FILE" ]]; then
    echo "Error: .env file not found at $ENV_FILE"
    echo "Please create backend/.env with MONGODB_URI and optionally STATION_AI_MONGODB_URI"
    exit 1
fi

# Export Bayit+ MongoDB URI
MONGODB_URI=$(grep "^MONGODB_URI=" "$ENV_FILE" | cut -d'=' -f2-)
if [[ -z "$MONGODB_URI" ]]; then
    echo "Error: MONGODB_URI not set in $ENV_FILE"
    exit 1
fi

export MONGODB_URI="$MONGODB_URI"
echo "✓ Exported MONGODB_URI (Bayit+)"

# Export Bayit+ MongoDB DB Name
MONGODB_DB_NAME=$(grep "^MONGODB_DB_NAME=" "$ENV_FILE" | cut -d'=' -f2-)
if [[ -z "$MONGODB_DB_NAME" ]]; then
    MONGODB_DB_NAME="bayit_plus"
fi

export MONGODB_DB_NAME="$MONGODB_DB_NAME"
echo "✓ Exported MONGODB_DB_NAME=$MONGODB_DB_NAME"

# Export Station AI MongoDB URI (optional)
if grep -q "^STATION_AI_MONGODB_URI=" "$ENV_FILE"; then
    STATION_AI_MONGODB_URI=$(grep "^STATION_AI_MONGODB_URI=" "$ENV_FILE" | cut -d'=' -f2-)
    export STATION_AI_MONGODB_URI="$STATION_AI_MONGODB_URI"
    echo "✓ Exported STATION_AI_MONGODB_URI (Israeli Radio Manager)"

    # Export Station AI DB Name
    if grep -q "^STATION_AI_MONGODB_DB_NAME=" "$ENV_FILE"; then
        STATION_AI_MONGODB_DB_NAME=$(grep "^STATION_AI_MONGODB_DB_NAME=" "$ENV_FILE" | cut -d'=' -f2-)
    else
        STATION_AI_MONGODB_DB_NAME="station_ai"
    fi
    export STATION_AI_MONGODB_DB_NAME="$STATION_AI_MONGODB_DB_NAME"
    echo "✓ Exported STATION_AI_MONGODB_DB_NAME=$STATION_AI_MONGODB_DB_NAME"
else
    echo "ℹ Station AI MongoDB URI not configured (optional)"
fi

echo ""
echo "MongoDB environment variables exported:"
echo "  MONGODB_URI - Bayit+ streaming platform database"
echo "  MONGODB_DB_NAME - Bayit+ database name"
if [[ -v STATION_AI_MONGODB_URI ]]; then
    echo "  STATION_AI_MONGODB_URI - Israeli Radio Manager database"
    echo "  STATION_AI_MONGODB_DB_NAME - Station AI database name"
fi
