#!/bin/bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
ENV_FILE="$REPO_ROOT/backend/.env"

echo "Secret Manager Validation"
echo "========================="
echo ""

# Read all environment variables from .env
missing_secrets=()
placeholder_secrets=()

while IFS='=' read -r key value; do
    # Skip comments and empty lines
    [[ "$key" =~ ^#.*$ ]] && continue
    [[ -z "$key" ]] && continue

    # Check if value is a placeholder
    if [[ "$value" == "<from-secret-manager:"* ]]; then
        secret_name=$(echo "$value" | sed 's/<from-secret-manager:\(.*\)>/\1/')

        # Verify secret exists in Secret Manager
        if ! gcloud secrets describe "$secret_name" >/dev/null 2>&1; then
            missing_secrets+=("$secret_name (referenced by $key)")
        else
            echo "✓ $secret_name"
        fi

        placeholder_secrets+=("$key")
    fi
done < "$ENV_FILE"

echo ""
echo "Validation Results:"
echo "==================="
echo "Total placeholder secrets in .env: ${#placeholder_secrets[@]}"
echo "Missing in Secret Manager: ${#missing_secrets[@]}"
echo ""

if [ ${#missing_secrets[@]} -gt 0 ]; then
    echo "❌ Missing secrets:"
    for secret in "${missing_secrets[@]}"; do
        echo "   - $secret"
    done
    exit 1
else
    echo "✅ All secrets validated successfully"
fi
