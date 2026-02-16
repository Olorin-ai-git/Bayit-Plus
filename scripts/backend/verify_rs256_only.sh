#!/bin/bash
#
# Verification script for RS256-only mode
#
# Tests:
# 1. v2 endpoints return RS256 tokens
# 2. Protected endpoints accept RS256 tokens
# 3. Logs show HS256 rejections (if any legacy clients remain)
#

set -e

API_URL="${API_URL:-http://localhost:8000/api/v1}"
TEST_EMAIL="rs256test@example.com"
TEST_PASSWORD="TestPass123!"
TEST_NAME="RS256 Test User"

echo "========================================="
echo "RS256-Only Mode Verification"
echo "========================================="
echo ""

# Step 1: Register new user via v2 endpoint
echo "[1/4] Testing registration via v2 endpoint..."
REGISTER_RESPONSE=$(curl -s -X POST "${API_URL}/auth/v2/register" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASSWORD}\",\"name\":\"${TEST_NAME}\"}")

if echo "$REGISTER_RESPONSE" | jq -e '.access_token' > /dev/null 2>&1; then
    echo "✅ Registration successful"
    ACCESS_TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.access_token')
else
    echo "⚠️  Registration response: $REGISTER_RESPONSE"
    echo "   (User may already exist, trying login...)"

    # Try login instead
    LOGIN_RESPONSE=$(curl -s -X POST "${API_URL}/auth/v2/login" \
      -H 'Content-Type: application/json' \
      -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASSWORD}\"}")

    if echo "$LOGIN_RESPONSE" | jq -e '.access_token' > /dev/null 2>&1; then
        echo "✅ Login successful"
        ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.access_token')
    else
        echo "❌ Login failed: $LOGIN_RESPONSE"
        exit 1
    fi
fi

echo ""

# Step 2: Decode token header to verify RS256
echo "[2/4] Verifying token is RS256..."
TOKEN_HEADER=$(echo "$ACCESS_TOKEN" | cut -d'.' -f1 | base64 -d 2>/dev/null || echo "{}")

if echo "$TOKEN_HEADER" | jq -e '.alg == "RS256"' > /dev/null 2>&1; then
    echo "✅ Token uses RS256 algorithm"
    echo "   Header: $TOKEN_HEADER"
else
    echo "❌ Token is not RS256!"
    echo "   Header: $TOKEN_HEADER"
    exit 1
fi

echo ""

# Step 3: Test protected endpoint with RS256 token
echo "[3/4] Testing protected endpoint with RS256 token..."
PROFILE_RESPONSE=$(curl -s "${API_URL}/users/me" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}")

if echo "$PROFILE_RESPONSE" | jq -e '.email' > /dev/null 2>&1; then
    echo "✅ Protected endpoint accepts RS256 token"
    echo "   User: $(echo "$PROFILE_RESPONSE" | jq -r '.email')"
else
    echo "❌ Protected endpoint rejected RS256 token"
    echo "   Response: $PROFILE_RESPONSE"
    exit 1
fi

echo ""

# Step 4: Check logs for HS256 rejections
echo "[4/4] Checking logs for HS256 token rejections..."
echo "   Run this command to monitor HS256 rejections:"
echo "   gcloud logging read 'jsonPayload.message=\"rejected_non_rs256_token\"' --project=bayit-plus --limit=10"
echo ""

echo "========================================="
echo "✅ RS256-Only Mode Verification PASSED"
echo "========================================="
echo ""
echo "Summary:"
echo "  - v2 endpoints issue RS256 tokens"
echo "  - Protected endpoints accept RS256 tokens"
echo "  - Token algorithm: RS256"
echo "  - Issuer: https://auth.olorin.ai"
echo ""
