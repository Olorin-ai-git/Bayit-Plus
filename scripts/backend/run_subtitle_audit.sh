#!/bin/bash
# Focused Subtitle Audit Runner
# AI agent optimized for subtitle acquisition with quota management

set -e

# Configuration
API_URL="${API_URL:-http://localhost:8000}"
MAX_ITERATIONS="${MAX_ITERATIONS:-100}"
BUDGET_LIMIT="${BUDGET_LIMIT:-5.0}"
DRY_RUN="${DRY_RUN:-false}"

echo "╔═══════════════════════════════════════════════╗"
echo "║  Bayit+ Subtitle Acquisition Audit           ║"
echo "╚═══════════════════════════════════════════════╝"
echo ""
echo "Configuration:"
echo "  API URL: $API_URL"
echo "  Max Iterations: $MAX_ITERATIONS"
echo "  Budget Limit: \$$BUDGET_LIMIT"
echo "  Subtitle Quota: 20 downloads/day (OpenSubtitles)"
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

TOKEN_RESPONSE=$(curl -sf -X POST "$API_URL/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" || echo "{}")

TOKEN=$(echo "$TOKEN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('access_token', ''))" 2>/dev/null || echo "")

if [ -z "$TOKEN" ]; then
    echo "❌ Authentication failed"
    exit 1
fi
echo "✅ Authenticated"
echo ""

# Trigger subtitle-focused audit
echo "🎬 Starting subtitle acquisition audit..."
echo ""
echo "📋 Agent instructions:"
echo "   - Focus ONLY on finding content missing subtitles (EN/HE/ES)"
echo "   - Use batch_download_subtitles tool efficiently"
echo "   - Scan embedded subtitles first (free)"
echo "   - Use OpenSubtitles quota strategically (20/day limit)"
echo "   - Prioritize most recent content"
echo ""

AUDIT_RESPONSE=$(curl -sf -X POST "$API_URL/api/v1/admin/librarian/run-audit" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -H "Accept-Language: en" \
    -d "{
        \"use_ai_agent\": true,
        \"dry_run\": $DRY_RUN,
        \"max_iterations\": $MAX_ITERATIONS,
        \"budget_limit_usd\": $BUDGET_LIMIT
    }" || echo "{}")

echo "$AUDIT_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(f\"✅ {data.get('message', 'Audit started')}\")"
echo ""
echo "💡 Strategy:"
echo "   Day 1: Scan 100+ items, extract embedded subs, download 20 from OpenSubtitles"
echo "   Day 2: Continue with next batch, download 20 more"
echo "   Day 3-N: Repeat until all content has required subtitles"
echo ""
echo "🔄 Run this script DAILY to acquire 20 more subtitles each day!"
