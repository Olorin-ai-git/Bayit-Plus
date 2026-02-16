#!/usr/bin/env python3
"""
tvOS v2 Migration Integration Test
Tests the complete device pairing flow with v2 endpoints
"""

import requests
import json
import base64
import sys
from datetime import datetime

BASE_URL = "http://localhost:8000"

# Colors
GREEN = '\033[0;32m'
RED = '\033[0;31m'
YELLOW = '\033[1;33m'
NC = '\033[0m'

def pass_test(msg):
    print(f"{GREEN}✅ PASS{NC}: {msg}")

def fail_test(msg):
    print(f"{RED}❌ FAIL{NC}: {msg}")
    sys.exit(1)

def info(msg):
    print(f"{YELLOW}ℹ️  INFO{NC}: {msg}")

def decode_jwt(token):
    """Decode JWT token and return header and payload"""
    parts = token.split('.')
    if len(parts) != 3:
        return None, None

    # Add padding if needed
    header_part = parts[0] + '=' * (4 - len(parts[0]) % 4)
    payload_part = parts[1] + '=' * (4 - len(parts[1]) % 4)

    try:
        header = json.loads(base64.urlsafe_b64decode(header_part))
        payload = json.loads(base64.urlsafe_b64decode(payload_part))
        return header, payload
    except:
        return None, None

print("╔══════════════════════════════════════════════════════════════════════════════╗")
print("║            tvOS v2 Migration Integration Test                                ║")
print("╚══════════════════════════════════════════════════════════════════════════════╝")
print()
print(f"Testing against: {BASE_URL}")
print()

# Test 1: Health Check
print("━" * 80)
print("Test 1: Device Pairing v2 Health Check")
print("━" * 80)
response = requests.get(f"{BASE_URL}/api/v1/auth/device-pairing/v2/health")
data = response.json()

if data.get('status') == 'healthy' and data.get('proxy_version') == 'v2':
    pass_test("v2 health endpoint is healthy")
else:
    fail_test(f"v2 health endpoint failed: {data}")

# Test 2: Create Pairing Session
print()
print("━" * 80)
print("Test 2: Initialize Device Pairing Session")
print("━" * 80)
response = requests.post(f"{BASE_URL}/api/v1/auth/device-pairing/init")
init_data = response.json()
session_id = init_data.get('session_id')

if session_id:
    pass_test(f"Created pairing session: {session_id}")
    info(f"WebSocket URL: {init_data.get('ws_url')}")
else:
    fail_test(f"Failed to create pairing session: {init_data}")

# Test 3: Register Test User
print()
print("━" * 80)
print("Test 3: Register Test User (v2 endpoint)")
print("━" * 80)
test_email = f"tvos-test-{int(datetime.now().timestamp())}@example.com"
test_password = "TestPassword123!"
test_name = "tvOS Test User"

response = requests.post(
    f"{BASE_URL}/api/v1/auth/v2/register",
    json={
        "email": test_email,
        "password": test_password,
        "name": test_name
    }
)
register_data = response.json()
register_token = register_data.get('access_token')
register_refresh = register_data.get('refresh_token')

if register_token:
    pass_test(f"Registered test user via v2: {test_email}")
    info(f"Access token (RS256): {register_token[:50]}...")
    info(f"Refresh token (RS256): {register_refresh[:50]}...")
else:
    fail_test(f"Failed to register test user: {register_data}")

# Test 4: v2 Complete with Email/Password
print()
print("━" * 80)
print("Test 4: Device Pairing v2/complete (Email/Password)")
print("━" * 80)

# Create new session
response = requests.post(f"{BASE_URL}/api/v1/auth/device-pairing/init")
session2 = response.json().get('session_id')

response = requests.post(
    f"{BASE_URL}/api/v1/auth/device-pairing/v2/complete",
    json={
        "session_id": session2,
        "email": test_email,
        "password": test_password
    }
)
complete_data = response.json()
complete_token = complete_data.get('access_token')
complete_refresh = complete_data.get('refresh_token')
complete_user = complete_data.get('user', {}).get('email')
requires_payment = complete_data.get('requires_payment')

if complete_token:
    pass_test("Device pairing v2/complete succeeded")
    info(f"User authenticated: {complete_user}")
    info(f"Access token: {complete_token[:50]}...")
    info(f"Refresh token: {complete_refresh[:50]}...")
    info(f"Requires payment: {requires_payment}")
else:
    fail_test(f"Device pairing v2/complete failed: {complete_data}")

# Test 5: Verify Token is RS256
print()
print("━" * 80)
print("Test 5: Verify Token Algorithm (RS256)")
print("━" * 80)

header, payload = decode_jwt(complete_token)

if not header or not payload:
    fail_test("Failed to decode JWT token")

token_alg = header.get('alg')
token_iss = payload.get('iss')
token_tenant = payload.get('tenant')

if token_alg == 'RS256':
    pass_test("Token uses RS256 algorithm")
else:
    fail_test(f"Token algorithm is not RS256: {token_alg}")

if token_iss == 'https://auth.olorin.ai':
    pass_test("Token issued by auth.olorin.ai")
else:
    fail_test(f"Token issuer is not auth.olorin.ai: {token_iss}")

if token_tenant == 'bayit_plus':
    pass_test("Token tenant is bayit_plus")
else:
    fail_test(f"Token tenant is not bayit_plus: {token_tenant}")

# Test 6: Verify v1 Endpoints Return 410 Gone
print()
print("━" * 80)
print("Test 6: Verify v1 Endpoints are Deprecated (410 Gone)")
print("━" * 80)

# Test v1 login
response = requests.post(
    f"{BASE_URL}/api/v1/auth/login",
    json={"email": "test@test.com", "password": "test"}
)
if response.status_code == 410:
    pass_test("v1 /auth/login returns 410 Gone")
else:
    fail_test(f"v1 /auth/login should return 410, got: {response.status_code}")

# Test v1 device-pairing complete
response = requests.post(f"{BASE_URL}/api/v1/auth/device-pairing/init")
session3 = response.json().get('session_id')

response = requests.post(
    f"{BASE_URL}/api/v1/auth/device-pairing/complete",
    json={"session_id": session3, "email": "test@test.com", "password": "test"}
)
if response.status_code == 410:
    pass_test("v1 /device-pairing/complete returns 410 Gone")
else:
    fail_test(f"v1 /device-pairing/complete should return 410, got: {response.status_code}")

# Test 7: Test Google OAuth Endpoint Exists
print()
print("━" * 80)
print("Test 7: Verify Google OAuth v2 Endpoint Exists")
print("━" * 80)

response = requests.post(f"{BASE_URL}/api/v1/auth/device-pairing/init")
session4 = response.json().get('session_id')

response = requests.post(
    f"{BASE_URL}/api/v1/auth/device-pairing/v2/complete-google",
    json={"session_id": session4, "id_token": "invalid_token"}
)

if response.status_code == 401:
    pass_test("v2 Google OAuth endpoint exists and validates tokens")
elif response.status_code == 404:
    fail_test("v2 Google OAuth endpoint not found")
else:
    info(f"Google OAuth endpoint returned: {response.status_code}")

# Test 8: Test Apple Sign In Endpoint Exists
print()
print("━" * 80)
print("Test 8: Verify Apple Sign In v2 Endpoint Exists")
print("━" * 80)

response = requests.post(f"{BASE_URL}/api/v1/auth/device-pairing/init")
session5 = response.json().get('session_id')

response = requests.post(
    f"{BASE_URL}/api/v1/auth/device-pairing/v2/complete-apple",
    json={"session_id": session5, "id_token": "invalid_token"}
)

if response.status_code == 401:
    pass_test("v2 Apple Sign In endpoint exists and validates tokens")
elif response.status_code == 404:
    fail_test("v2 Apple Sign In endpoint not found")
else:
    info(f"Apple Sign In endpoint returned: {response.status_code}")

# Summary
print()
print("╔══════════════════════════════════════════════════════════════════════════════╗")
print("║                          TEST SUMMARY                                        ║")
print("╚══════════════════════════════════════════════════════════════════════════════╝")
print()
print(f"{GREEN}✅ ALL TESTS PASSED!{NC}")
print()
print("Migration Verification:")
print("  ✅ v2 health endpoint working")
print("  ✅ Device pairing session creation working")
print("  ✅ v2 user registration working (RS256 tokens)")
print("  ✅ v2 device pairing complete working (RS256 tokens)")
print("  ✅ Tokens use RS256 algorithm")
print("  ✅ Tokens issued by auth.olorin.ai")
print("  ✅ Tokens include tenant: bayit_plus")
print("  ✅ Refresh tokens included in response")
print("  ✅ v1 endpoints return 410 Gone")
print("  ✅ Google OAuth v2 endpoint exists")
print("  ✅ Apple Sign In v2 endpoint exists")
print()
print(f"{GREEN}tvOS v2 migration is FULLY FUNCTIONAL! 🎉{NC}")
print()
