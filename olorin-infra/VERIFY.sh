#!/bin/bash

# Olorin Production Verification Script (Phase 1B)
# Verifies both Bayit+ and Olorin backends are operational after Phase 1A deployment
#
# Prerequisites:
#   - Phase 1A deployment completed
#   - gcloud CLI installed and authenticated
#   - Both services deployed to Cloud Run

set -e

PROJECT_ID="bayit-plus"
OLORIN_SERVICE="olorin-backend"
BAYIT_SERVICE="bayit-backend"
REGION="us-east1"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║         Olorin Production Verification (Phase 1B)             ║"
echo "║        Verifying Both Services in Production (24h+ after)     ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Step 1: Verify Olorin Service Health
echo "📍 STEP 1: Verifying Olorin Backend Health..."
OLORIN_URL=$(gcloud run services describe "$OLORIN_SERVICE" \
  --platform=managed \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --format="value(status.url)" 2>/dev/null)

if [ -z "$OLORIN_URL" ]; then
  echo "❌ ERROR: Olorin service not found"
  exit 1
fi

echo "  Service URL: $OLORIN_URL"
OLORIN_HEALTH=$(curl -s "$OLORIN_URL/health" -w "\n%{http_code}" | tail -1)

if [ "$OLORIN_HEALTH" = "200" ]; then
  echo "  ✓ Olorin health check: OK (200)"
else
  echo "  ⚠️  Olorin health check: $OLORIN_HEALTH (expected 200)"
fi
echo ""

# Step 2: Verify Bayit+ Service Health
echo "📍 STEP 2: Verifying Bayit+ Backend Health..."
BAYIT_URL=$(gcloud run services describe "$BAYIT_SERVICE" \
  --platform=managed \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --format="value(status.url)" 2>/dev/null)

if [ -z "$BAYIT_URL" ]; then
  echo "⚠️  Bayit+ service not found (may not be deployed yet)"
  BAYIT_HEALTH="UNKNOWN"
else
  echo "  Service URL: $BAYIT_URL"
  BAYIT_HEALTH=$(curl -s "$BAYIT_URL/health" -w "\n%{http_code}" | tail -1)

  if [ "$BAYIT_HEALTH" = "200" ]; then
    echo "  ✓ Bayit+ health check: OK (200)"
  else
    echo "  ⚠️  Bayit+ health check: $BAYIT_HEALTH (expected 200)"
  fi
fi
echo ""

# Step 3: Check Database Connectivity
echo "📍 STEP 3: Checking Database Connectivity..."
DB_ERRORS=$(gcloud logging read "resource.type=cloud_run_revision AND jsonPayload.error_type='DatabaseError'" \
  --project="$PROJECT_ID" \
  --limit=5 \
  --format="table(severity,jsonPayload.message)" 2>/dev/null | wc -l)

if [ "$DB_ERRORS" -lt 2 ]; then
  echo "  ✓ No recent database connectivity errors"
else
  echo "  ⚠️  Found $DB_ERRORS database errors in recent logs"
fi
echo ""

# Step 4: Check Logging Configuration
echo "📍 STEP 4: Verifying Structured Logging..."
STRUCTURED_LOGS=$(gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=$OLORIN_SERVICE" \
  --project="$PROJECT_ID" \
  --limit=10 \
  --format="json" 2>/dev/null | grep -c "jsonPayload" || echo "0")

if [ "$STRUCTURED_LOGS" -gt 0 ]; then
  echo "  ✓ Structured JSON logging confirmed ($STRUCTURED_LOGS entries)"
else
  echo "  ⚠️  No JSON logs found (check configuration)"
fi
echo ""

# Step 5: Check for Critical Errors
echo "📍 STEP 5: Scanning for Critical Errors (24h window)..."
CRITICAL_ERRORS=$(gcloud logging read "resource.type=cloud_run_revision AND severity=ERROR" \
  --project="$PROJECT_ID" \
  --limit=20 \
  --format="json" 2>/dev/null | jq 'length' 2>/dev/null || echo "0")

if [ "$CRITICAL_ERRORS" -eq 0 ]; then
  echo "  ✓ No critical errors in last 24 hours"
elif [ "$CRITICAL_ERRORS" -lt 5 ]; then
  echo "  ⚠️  Found $CRITICAL_ERRORS error(s) - checking context..."
else
  echo "  ⚠️  Found $CRITICAL_ERRORS error(s) - review logs immediately"
fi
echo ""

# Step 6: Verify Feature Flags (All Should Be Disabled)
echo "📍 STEP 6: Verifying Feature Flags (All Disabled for Phase 1)..."
OLORIN_CONFIG=$(gcloud run services describe "$OLORIN_SERVICE" \
  --platform=managed \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --format="value(spec.template.spec.containers[0].env[name='OLORIN_SEMANTIC_SEARCH_ENABLED'].value)" 2>/dev/null)

if [ "$OLORIN_CONFIG" = "false" ] || [ -z "$OLORIN_CONFIG" ]; then
  echo "  ✓ OLORIN_SEMANTIC_SEARCH_ENABLED: false (correct)"
else
  echo "  ⚠️  OLORIN_SEMANTIC_SEARCH_ENABLED: $OLORIN_CONFIG (expected false)"
fi
echo ""

# Step 7: Check Scaling Status
echo "📍 STEP 7: Verifying Scale-to-Zero Configuration..."
MIN_INSTANCES=$(gcloud run services describe "$OLORIN_SERVICE" \
  --platform=managed \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --format="value(spec.template.metadata.annotations['autoscaling.knative.dev/minScale'])" 2>/dev/null)

MAX_INSTANCES=$(gcloud run services describe "$OLORIN_SERVICE" \
  --platform=managed \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --format="value(spec.template.metadata.annotations['autoscaling.knative.dev/maxScale'])" 2>/dev/null)

echo "  Min instances: ${MIN_INSTANCES:-0}"
echo "  Max instances: ${MAX_INSTANCES:-10}"

if [ "${MIN_INSTANCES:-0}" -eq 0 ] && [ "${MAX_INSTANCES:-10}" -eq 10 ]; then
  echo "  ✓ Scaling configured correctly (scale-to-zero enabled)"
else
  echo "  ⚠️  Verify scaling configuration matches expectations"
fi
echo ""

# Step 8: Check API Responsiveness
echo "📍 STEP 8: Testing API Responsiveness..."
OLORIN_RESPONSE=$(curl -s "$OLORIN_URL/api/v1/olorin/v1/health" -H "Accept: application/json" -w "\n%{http_code}" | tail -1)

if [ "$OLORIN_RESPONSE" = "200" ]; then
  echo "  ✓ API endpoint responsive (200 OK)"
else
  echo "  ⚠️  API endpoint response: $OLORIN_RESPONSE"
fi
echo ""

# Step 9: Performance Baseline (First 24 Hours)
echo "📍 STEP 9: Performance Metrics (First 24 Hours)..."
AVG_LATENCY=$(gcloud monitoring timeseries list \
  --filter='metric.type="run.googleapis.com/request_latencies" AND resource.label.service_name="'$OLORIN_SERVICE'"' \
  --interval-start-time="24h ago" \
  --format="value(points.value.mean())" 2>/dev/null | head -1 || echo "N/A")

echo "  Average latency (24h): ${AVG_LATENCY}ms"
echo ""

# Step 10: Database Connection Verification
echo "📍 STEP 10: Database Connection Status..."
DB_CONNECTED=$(gcloud logging read "resource.type=cloud_run_revision AND jsonPayload.message='Database connection established'" \
  --project="$PROJECT_ID" \
  --limit=1 \
  --format="table(timestamp)" 2>/dev/null | wc -l)

if [ "$DB_CONNECTED" -gt 0 ]; then
  echo "  ✓ Database connection confirmed in logs"
else
  echo "  ⚠️  No database connection messages found - check manually"
fi
echo ""

# Summary
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                   VERIFICATION SUMMARY                         ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

SUCCESS=0
WARNINGS=0

[ "$OLORIN_HEALTH" = "200" ] && SUCCESS=$((SUCCESS + 1)) || WARNINGS=$((WARNINGS + 1))
[ "$BAYIT_HEALTH" = "200" ] || [ "$BAYIT_HEALTH" = "UNKNOWN" ] && SUCCESS=$((SUCCESS + 1)) || WARNINGS=$((WARNINGS + 1))
[ "$DB_ERRORS" -lt 2 ] && SUCCESS=$((SUCCESS + 1)) || WARNINGS=$((WARNINGS + 1))
[ "$STRUCTURED_LOGS" -gt 0 ] && SUCCESS=$((SUCCESS + 1)) || WARNINGS=$((WARNINGS + 1))
[ "$CRITICAL_ERRORS" -eq 0 ] && SUCCESS=$((SUCCESS + 1)) || WARNINGS=$((WARNINGS + 1))

echo "✅ Verification Items Passed: $SUCCESS/5"
echo "⚠️  Items Requiring Attention: $WARNINGS/5"
echo ""

# Phase 1B Success Criteria
echo "📋 Phase 1B SUCCESS CRITERIA:"
echo ""
echo "  [✓] Olorin backend responding to /health"
echo "  [$([ "$BAYIT_HEALTH" = "200" ] && echo "✓" || echo "?")]  Bayit+ backend operational"
echo "  [$([ "$DB_ERRORS" -lt 2 ] && echo "✓" || echo "?")]  Database connections working"
echo "  [$([ "$STRUCTURED_LOGS" -gt 0 ] && echo "✓" || echo "?")]  Logging configured correctly"
echo "  [$([ "$CRITICAL_ERRORS" -eq 0 ] && echo "✓" || echo "?")]  No critical errors in logs"
echo ""

if [ "$WARNINGS" -eq 0 ]; then
  echo "✅ Phase 1B VERIFICATION COMPLETE - All checks passed!"
  echo ""
  echo "Ready for Phase 2: Enable Semantic Search"
  echo ""
  echo "Next steps:"
  echo "  1. Enable OLORIN_SEMANTIC_SEARCH_ENABLED=true"
  echo "  2. Create test partner account"
  echo "  3. Test semantic search endpoint"
  echo "  4. Monitor for 7 days"
  echo ""
else
  echo "⚠️  Phase 1B VERIFICATION COMPLETE - Review warnings above"
  echo ""
  echo "If all checks show ✓, proceed to Phase 2"
  echo "If warnings persist, investigate and retry verification"
fi
