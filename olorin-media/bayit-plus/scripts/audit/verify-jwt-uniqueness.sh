#!/bin/bash
set -euo pipefail

# ============================================
# JWT Secret Uniqueness Verification Script
# ============================================
# Verifies that JWT secrets are unique across all Olorin platforms
# to prevent cross-platform authentication attacks.
#
# Usage: ./scripts/audit/verify-jwt-uniqueness.sh
# Requires: gcloud CLI with authenticated access to Secret Manager
# ============================================

echo "🔍 Auditing JWT Secret Uniqueness Across Olorin Platforms..."
echo ""

# Platform secret names
BAYIT_SECRET="bayit-secret-key"
FRAUD_SECRET="fraud-jwt-secret"
CVPLUS_SECRET="cvplus-jwt-secret"
STATION_SECRET="station-jwt-secret"

# Array to store secrets
declare -A secrets
declare -A hashes

# Function to fetch and hash a secret
fetch_secret() {
    local secret_name=$1
    local platform=$2

    echo "  → Fetching ${platform} secret: ${secret_name}"

    if secret_value=$(gcloud secrets versions access latest --secret="${secret_name}" 2>/dev/null); then
        # Hash the secret value (SHA-256, first 16 chars for display)
        secret_hash=$(echo -n "$secret_value" | sha256sum | cut -d' ' -f1)
        secrets["$platform"]="$secret_value"
        hashes["$platform"]="$secret_hash"
        echo "    ✓ ${platform} JWT Hash: ${secret_hash:0:16}..."
    else
        echo "    ⚠️  ${platform} JWT secret not found in Secret Manager"
        secrets["$platform"]="NOT_FOUND"
        hashes["$platform"]="NOT_FOUND"
    fi
}

# Fetch all platform secrets
echo "📦 Fetching Secrets from Google Cloud Secret Manager:"
echo ""

fetch_secret "$BAYIT_SECRET" "Bayit+"
fetch_secret "$FRAUD_SECRET" "Fraud"
fetch_secret "$CVPLUS_SECRET" "CVPlus"
fetch_secret "$STATION_SECRET" "Station AI"

echo ""
echo "🔬 Analyzing Secret Uniqueness:"
echo ""

# Check for duplicates
duplicates_found=false
declare -A seen_hashes

for platform in "${!hashes[@]}"; do
    hash="${hashes[$platform]}"

    # Skip if secret not found
    if [ "$hash" == "NOT_FOUND" ]; then
        continue
    fi

    # Check if we've seen this hash before
    if [ -n "${seen_hashes[$hash]+x}" ]; then
        echo "  ❌ CRITICAL: Duplicate JWT secret detected!"
        echo "     Platforms: ${seen_hashes[$hash]} ↔ ${platform}"
        echo "     Hash: ${hash:0:32}..."
        duplicates_found=true
    else
        seen_hashes[$hash]="$platform"
        echo "  ✓ ${platform}: Unique secret"
    fi
done

echo ""

# Summary
if $duplicates_found; then
    echo "❌ SECURITY FAILURE: Duplicate JWT secrets detected across platforms!"
    echo ""
    echo "REQUIRED ACTIONS:"
    echo "  1. Generate new unique secrets for affected platforms"
    echo "  2. Update secrets in Google Cloud Secret Manager"
    echo "  3. Deploy with zero-downtime rotation using SECRET_KEY_OLD"
    echo "  4. Remove old secrets after 7 days (token expiry)"
    echo ""
    exit 1
else
    echo "✅ SUCCESS: All JWT secrets are unique across platforms"
    echo ""
    echo "Platforms verified:"
    for platform in "${!hashes[@]}"; do
        if [ "${hashes[$platform]}" != "NOT_FOUND" ]; then
            echo "  • ${platform}"
        fi
    done
    echo ""
    echo "Security Status: COMPLIANT ✓"
    exit 0
fi
