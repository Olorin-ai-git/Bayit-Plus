#!/bin/bash
# Comprehensive Librarian Audit Runner
# Runs AI agent with higher limits for full library coverage

set -e

# Configuration
API_URL="${API_URL:-http://localhost:8000}"
MAX_ITERATIONS="${MAX_ITERATIONS:-150}"
BUDGET_LIMIT="${BUDGET_LIMIT:-10.0}"
DRY_RUN="${DRY_RUN:-false}"

echo "╔═══════════════════════════════════════════════╗"
echo "║  Bayit+ Comprehensive Librarian Audit        ║"
echo "╚═══════════════════════════════════════════════╝"
echo ""
echo "Configuration:"
echo "  API URL: $API_URL"
echo "  Max Iterations: $MAX_ITERATIONS"
echo "  Budget Limit: \$$BUDGET_LIMIT"
echo "  Dry Run: $DRY_RUN"
echo ""

# Check if server is running
echo "⏳ Checking server health..."
if ! curl -sf "$API_URL/health" > /dev/null; then
    echo "❌ Server is not running at $API_URL"
    echo "   Start the server first:"
    echo "   cd backend && poetry run uvicorn app.main:app --reload"
    exit 1
fi
echo "✅ Server is healthy"
echo ""

# Get admin token from environment variables (secure)
echo "⏳ Getting admin authentication token..."

# Check for required environment variables
if [ -z "$ADMIN_EMAIL" ] || [ -z "$ADMIN_PASSWORD" ]; then
    echo "❌ Error: Admin credentials not found in environment variables"
    echo "   Please set ADMIN_EMAIL and ADMIN_PASSWORD environment variables:"
    echo "   export ADMIN_EMAIL='your-admin@example.com'"
    echo "   export ADMIN_PASSWORD='your-secure-password'"
    echo ""
    echo "   Alternatively, store in .env file and source it:"
    echo "   source backend/.env"
    exit 1
fi

# Create temp file for JSON payload to handle special characters in password
TMPFILE=$(mktemp)
cat > "$TMPFILE" << EOF
{"email":"$ADMIN_EMAIL","password":"$ADMIN_PASSWORD"}
EOF

TOKEN_RESPONSE=$(curl -s -X POST "$API_URL/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d @"$TMPFILE")
rm -f "$TMPFILE"

TOKEN=$(echo "$TOKEN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('access_token', ''))" 2>/dev/null || echo "")

if [ -z "$TOKEN" ]; then
    echo "❌ Authentication failed. Please check your credentials."
    exit 1
fi
echo "✅ Authenticated successfully"
echo ""

# Trigger comprehensive audit
echo "🤖 Starting comprehensive AI agent audit..."
echo "   This will take several minutes..."
echo ""

AUDIT_RESPONSE=$(curl -sf -X POST "$API_URL/api/v1/admin/librarian/run-audit" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"use_ai_agent\": true,
        \"dry_run\": $DRY_RUN,
        \"max_iterations\": $MAX_ITERATIONS,
        \"budget_limit_usd\": $BUDGET_LIMIT
    }" || echo "{}")

echo "$AUDIT_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(f\"✅ {data.get('message', 'Audit started')}\")"
echo ""

# Wait and monitor
echo "⏳ Monitoring audit progress..."
echo "   Check logs with: tail -f backend/.cursor/debug.log"
echo ""
echo "📊 To view results:"
echo "   curl -H 'Authorization: Bearer YOUR_TOKEN' $API_URL/api/v1/admin/librarian/status"
echo ""
echo "🎯 Tip: Run this script multiple times to cover your entire library!"
