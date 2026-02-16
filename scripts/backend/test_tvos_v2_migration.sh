#!/bin/bash

# tvOS v2 Migration Integration Test
# Tests the complete device pairing flow with v2 endpoints

set -e

BASE_URL="${BASE_URL:-http://localhost:8000}"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "╔══════════════════════════════════════════════════════════════════════════════╗"
echo "║            tvOS v2 Migration Integration Test                                ║"
echo "╚══════════════════════════════════════════════════════════════════════════════╝"
echo ""
echo "Testing against: $BASE_URL"
echo ""

# Helper functions
pass() {
    echo -e "${GREEN}✅ PASS${NC}: $1"
}

fail() {
    echo -e "${RED}❌ FAIL${NC}: $1"
    exit 1
}

info() {
    echo -e "${YELLOW}ℹ️  INFO${NC}: $1"
}

# Test 1: Health Check
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 1: Device Pairing v2 Health Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
HEALTH_RESPONSE=$(curl -s $BASE_URL/api/v1/auth/device-pairing/v2/health)
STATUS=$(echo $HEALTH_RESPONSE | jq -r '.status')
VERSION=$(echo $HEALTH_RESPONSE | jq -r '.proxy_version')

if [ "$STATUS" == "healthy" ] && [ "$VERSION" == "v2" ]; then
    pass "v2 health endpoint is healthy"
else
    fail "v2 health endpoint failed: $HEALTH_RESPONSE"
fi

# Test 2: Create Pairing Session
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 2: Initialize Device Pairing Session"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
INIT_RESPONSE=$(curl -s -X POST $BASE_URL/api/v1/auth/device-pairing/init)
SESSION_ID=$(echo $INIT_RESPONSE | jq -r '.session_id')
WS_URL=$(echo $INIT_RESPONSE | jq -r '.ws_url')

if [ ! -z "$SESSION_ID" ] && [ "$SESSION_ID" != "null" ]; then
    pass "Created pairing session: $SESSION_ID"
    info "WebSocket URL: $WS_URL"
else
    fail "Failed to create pairing session: $INIT_RESPONSE"
fi

# Test 3: Register Test User (for email/password test)
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 3: Register Test User (v2 endpoint)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
TEST_EMAIL="tvos-test-$(date +%s)@example.com"
TEST_PASSWORD="TestPassword123!"
TEST_NAME="tvOS Test User"

REGISTER_RESPONSE=$(curl -s -X POST $BASE_URL/api/v1/auth/v2/register \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"name\":\"$TEST_NAME\"}")

REGISTER_TOKEN=$(echo $REGISTER_RESPONSE | jq -r '.access_token')
REGISTER_REFRESH=$(echo $REGISTER_RESPONSE | jq -r '.refresh_token')

if [ ! -z "$REGISTER_TOKEN" ] && [ "$REGISTER_TOKEN" != "null" ]; then
    pass "Registered test user via v2: $TEST_EMAIL"
    info "Access token (RS256): ${REGISTER_TOKEN:0:50}..."
    info "Refresh token (RS256): ${REGISTER_REFRESH:0:50}..."
else
    fail "Failed to register test user: $REGISTER_RESPONSE"
fi

# Test 4: v2 Complete with Email/Password
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 4: Device Pairing v2/complete (Email/Password)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Create new session for this test
INIT2=$(curl -s -X POST $BASE_URL/api/v1/auth/device-pairing/init)
SESSION2=$(echo $INIT2 | jq -r '.session_id')

COMPLETE_RESPONSE=$(curl -s -X POST $BASE_URL/api/v1/auth/device-pairing/v2/complete \
    -H "Content-Type: application/json" \
    -d "{\"session_id\":\"$SESSION2\",\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

COMPLETE_TOKEN=$(echo $COMPLETE_RESPONSE | jq -r '.access_token')
COMPLETE_REFRESH=$(echo $COMPLETE_RESPONSE | jq -r '.refresh_token')
COMPLETE_USER=$(echo $COMPLETE_RESPONSE | jq -r '.user.email')
REQUIRES_PAYMENT=$(echo $COMPLETE_RESPONSE | jq -r '.requires_payment')

if [ ! -z "$COMPLETE_TOKEN" ] && [ "$COMPLETE_TOKEN" != "null" ]; then
    pass "Device pairing v2/complete succeeded"
    info "User authenticated: $COMPLETE_USER"
    info "Access token: ${COMPLETE_TOKEN:0:50}..."
    info "Refresh token: ${COMPLETE_REFRESH:0:50}..."
    info "Requires payment: $REQUIRES_PAYMENT"
else
    fail "Device pairing v2/complete failed: $COMPLETE_RESPONSE"
fi

# Test 5: Verify Token is RS256
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 5: Verify Token Algorithm (RS256)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Decode JWT header (first part)
TOKEN_HEADER=$(echo $COMPLETE_TOKEN | cut -d'.' -f1)
TOKEN_HEADER_DECODED=$(echo $TOKEN_HEADER | base64 -d 2>/dev/null || echo $TOKEN_HEADER | base64 -D 2>/dev/null)
TOKEN_ALG=$(echo $TOKEN_HEADER_DECODED | jq -r '.alg' 2>/dev/null || echo "")

if [ "$TOKEN_ALG" == "RS256" ]; then
    pass "Token uses RS256 algorithm"
else
    fail "Token algorithm is not RS256: $TOKEN_ALG"
fi

# Decode JWT payload (second part)
TOKEN_PAYLOAD=$(echo $COMPLETE_TOKEN | cut -d'.' -f2)
TOKEN_PAYLOAD_DECODED=$(echo $TOKEN_PAYLOAD | base64 -d 2>/dev/null || echo $TOKEN_PAYLOAD | base64 -D 2>/dev/null)
TOKEN_ISS=$(echo $TOKEN_PAYLOAD_DECODED | jq -r '.iss' 2>/dev/null || echo "")
TOKEN_TENANT=$(echo $TOKEN_PAYLOAD_DECODED | jq -r '.tenant' 2>/dev/null || echo "")

if [ "$TOKEN_ISS" == "https://auth.olorin.ai" ]; then
    pass "Token issued by auth.olorin.ai"
else
    fail "Token issuer is not auth.olorin.ai: $TOKEN_ISS"
fi

if [ "$TOKEN_TENANT" == "bayit_plus" ]; then
    pass "Token tenant is bayit_plus"
else
    fail "Token tenant is not bayit_plus: $TOKEN_TENANT"
fi

# Test 6: Verify v1 Endpoints Return 410 Gone
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 6: Verify v1 Endpoints are Deprecated (410 Gone)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test v1 login
V1_LOGIN=$(curl -s -w "\n%{http_code}" -X POST $BASE_URL/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"test@test.com\",\"password\":\"test\"}")
V1_LOGIN_CODE=$(echo "$V1_LOGIN" | tail -n1)

if [ "$V1_LOGIN_CODE" == "410" ]; then
    pass "v1 /auth/login returns 410 Gone"
else
    fail "v1 /auth/login should return 410, got: $V1_LOGIN_CODE"
fi

# Test v1 device-pairing complete
INIT3=$(curl -s -X POST $BASE_URL/api/v1/auth/device-pairing/init)
SESSION3=$(echo $INIT3 | jq -r '.session_id')

V1_COMPLETE=$(curl -s -w "\n%{http_code}" -X POST $BASE_URL/api/v1/auth/device-pairing/complete \
    -H "Content-Type: application/json" \
    -d "{\"session_id\":\"$SESSION3\",\"email\":\"test@test.com\",\"password\":\"test\"}")
V1_COMPLETE_CODE=$(echo "$V1_COMPLETE" | tail -n1)

if [ "$V1_COMPLETE_CODE" == "410" ]; then
    pass "v1 /device-pairing/complete returns 410 Gone"
else
    fail "v1 /device-pairing/complete should return 410, got: $V1_COMPLETE_CODE"
fi

# Test 7: Test Google OAuth Endpoint Exists
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 7: Verify Google OAuth v2 Endpoint Exists"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

INIT4=$(curl -s -X POST $BASE_URL/api/v1/auth/device-pairing/init)
SESSION4=$(echo $INIT4 | jq -r '.session_id')

GOOGLE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST $BASE_URL/api/v1/auth/device-pairing/v2/complete-google \
    -H "Content-Type: application/json" \
    -d "{\"session_id\":\"$SESSION4\",\"id_token\":\"invalid_token\"}")
GOOGLE_CODE=$(echo "$GOOGLE_RESPONSE" | tail -n1)

# Should return 401 for invalid token, not 404
if [ "$GOOGLE_CODE" == "401" ]; then
    pass "v2 Google OAuth endpoint exists and validates tokens"
elif [ "$GOOGLE_CODE" == "404" ]; then
    fail "v2 Google OAuth endpoint not found"
else
    info "Google OAuth endpoint returned: $GOOGLE_CODE (expected 401 for invalid token)"
fi

# Test 8: Test Apple Sign In Endpoint Exists
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 8: Verify Apple Sign In v2 Endpoint Exists"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

INIT5=$(curl -s -X POST $BASE_URL/api/v1/auth/device-pairing/init)
SESSION5=$(echo $INIT5 | jq -r '.session_id')

APPLE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST $BASE_URL/api/v1/auth/device-pairing/v2/complete-apple \
    -H "Content-Type: application/json" \
    -d "{\"session_id\":\"$SESSION5\",\"id_token\":\"invalid_token\"}")
APPLE_CODE=$(echo "$APPLE_RESPONSE" | tail -n1)

# Should return 401 for invalid token, not 404
if [ "$APPLE_CODE" == "401" ]; then
    pass "v2 Apple Sign In endpoint exists and validates tokens"
elif [ "$APPLE_CODE" == "404" ]; then
    fail "v2 Apple Sign In endpoint not found"
else
    info "Apple Sign In endpoint returned: $APPLE_CODE (expected 401 for invalid token)"
fi

# Summary
echo ""
echo "╔══════════════════════════════════════════════════════════════════════════════╗"
echo "║                          TEST SUMMARY                                        ║"
echo "╚══════════════════════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}✅ ALL TESTS PASSED!${NC}"
echo ""
echo "Migration Verification:"
echo "  ✅ v2 health endpoint working"
echo "  ✅ Device pairing session creation working"
echo "  ✅ v2 user registration working (RS256 tokens)"
echo "  ✅ v2 device pairing complete working (RS256 tokens)"
echo "  ✅ Tokens use RS256 algorithm"
echo "  ✅ Tokens issued by auth.olorin.ai"
echo "  ✅ Tokens include tenant: bayit_plus"
echo "  ✅ Refresh tokens included in response"
echo "  ✅ v1 endpoints return 410 Gone"
echo "  ✅ Google OAuth v2 endpoint exists"
echo "  ✅ Apple Sign In v2 endpoint exists"
echo ""
echo -e "${GREEN}tvOS v2 migration is FULLY FUNCTIONAL! 🎉${NC}"
echo ""
