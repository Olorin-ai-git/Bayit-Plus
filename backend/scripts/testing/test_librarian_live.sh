#!/bin/bash
# Test script for Librarian AI Agent (running server required)

BASE_URL="http://localhost:8001"

echo "================================"
echo "Librarian AI Agent - Live Test"
echo "================================"
echo ""

# Test 1: Health check
echo "1. Testing server health..."
HEALTH=$(curl -s ${BASE_URL}/health)
echo "   Response: $HEALTH"
echo ""

# Test 2: Check if librarian endpoints exist in OpenAPI
echo "2. Checking Librarian API endpoints..."
ENDPOINTS=$(curl -s ${BASE_URL}/api/v1/openapi.json | grep -c "librarian")
echo "   Found $ENDPOINTS Librarian endpoints in OpenAPI spec"
echo ""

# Test 3: Test authentication requirement
echo "3. Testing authentication (should require admin)..."
STATUS=$(curl -s ${BASE_URL}/api/v1/admin/librarian/status)
echo "   Response: $STATUS"
if [[ $STATUS == *"Not authenticated"* ]]; then
    echo "   ✅ Authentication is properly enforced"
else
    echo "   ⚠️  Unexpected response"
fi
echo ""

# Test 4: Show available endpoints
echo "4. Available Librarian endpoints:"
curl -s ${BASE_URL}/api/v1/openapi.json | python3 -c "
import sys, json
spec = json.load(sys.stdin)
for path, methods in spec['paths'].items():
    if 'librarian' in path:
        for method, details in methods.items():
            print(f'   {method.upper():6} {path}')
            print(f'          {details.get(\"summary\", \"\")}')
"
echo ""

echo "================================"
echo "✅ Librarian AI Agent is running!"
echo "================================"
echo ""
echo "To test with authentication:"
echo "1. Get an admin token:"
echo "   curl -X POST ${BASE_URL}/api/v1/auth/login \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"email\":\"admin@example.com\",\"password\":\"your-password\"}'"
echo ""
echo "2. Use the token to trigger an audit:"
echo "   curl -X POST ${BASE_URL}/api/v1/admin/librarian/run-audit \\"
echo "     -H 'Authorization: Bearer YOUR_TOKEN' \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"audit_type\":\"manual\",\"dry_run\":true}'"
echo ""
