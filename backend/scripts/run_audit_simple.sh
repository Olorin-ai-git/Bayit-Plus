#!/bin/bash
# Simple Audit Runner (no authentication required for testing)
# Uses direct API call - you need to provide a valid admin token

set -e

API_URL="${API_URL:-http://localhost:8000}"
MAX_ITERATIONS="${1:-150}"
BUDGET_LIMIT="${2:-10.0}"
DRY_RUN="${3:-false}"

# Check if token is provided via environment
if [ -z "$ADMIN_TOKEN" ]; then
    echo "❌ Please set ADMIN_TOKEN environment variable"
    echo ""
    echo "Usage:"
    echo "  1. Get admin token:"
    echo "     TOKEN=\$(curl -X POST http://localhost:8000/api/v1/auth/login \\"
    echo "       -H 'Content-Type: application/json' \\"
    echo "       -d '{\"email\":\"admin@example.com\",\"password\":\"your-password\"}' | jq -r '.access_token')"
    echo ""
    echo "  2. Run this script:"
    echo "     ADMIN_TOKEN=\$TOKEN $0 [max_iterations] [budget_limit] [dry_run]"
    echo ""
    echo "  Examples:"
    echo "     ADMIN_TOKEN=\$TOKEN $0 150 10.0 false    # Comprehensive audit"
    echo "     ADMIN_TOKEN=\$TOKEN $0 100 5.0 true      # Test run (dry run)"
    echo "     ADMIN_TOKEN=\$TOKEN $0 200 20.0 false    # Extra large audit"
    exit 1
fi

echo "🤖 Starting AI Agent Audit"
echo "   Max Iterations: $MAX_ITERATIONS"
echo "   Budget Limit: \$$BUDGET_LIMIT"
echo "   Dry Run: $DRY_RUN"
echo ""

curl -X POST "$API_URL/api/v1/admin/librarian/run-audit" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"use_ai_agent\": true,
        \"dry_run\": $DRY_RUN,
        \"max_iterations\": $MAX_ITERATIONS,
        \"budget_limit_usd\": $BUDGET_LIMIT
    }" | python3 -m json.tool

echo ""
echo "✅ Audit triggered. Check status at:"
echo "   curl -H 'Authorization: Bearer \$ADMIN_TOKEN' $API_URL/api/v1/admin/librarian/status | jq"
