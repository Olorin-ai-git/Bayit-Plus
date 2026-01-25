#!/bin/bash
set -e

# Record baseline production metrics
# Run this weekly or before major deployments to update baselines

echo "📊 Recording baseline production metrics..."

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
PRODUCTION_URL="${PRODUCTION_URL:-https://bayitplus.com}"
BASELINE_FILE="./scripts/deployment/BASELINE_METRICS.md"

# Collect metrics
echo -e "${YELLOW}Collecting metrics over 5 minutes...${NC}"

# API Latency (sample 10 requests)
LATENCY_SUM=0
for i in {1..10}; do
  LATENCY=$(curl -w "%{time_total}" -s -o /dev/null "$PRODUCTION_URL/health")
  LATENCY_MS=$(echo "$LATENCY * 1000" | bc)
  LATENCY_SUM=$(echo "$LATENCY_SUM + $LATENCY_MS" | bc)
  sleep 30
done
LATENCY_AVG=$(echo "$LATENCY_SUM / 10" | bc)

# Error count (last hour)
if command -v gcloud &> /dev/null; then
  ERROR_COUNT=$(gcloud logging read \
    "severity>=ERROR AND timestamp>\"$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ)\"" \
    --limit=1000 \
    --format=json 2>/dev/null | jq length || echo "0")
  
  ERROR_RATE_PER_5MIN=$((ERROR_COUNT / 12))
else
  ERROR_RATE_PER_5MIN="N/A"
fi

# Notification errors (last hour)
if command -v gcloud &> /dev/null; then
  NOTIF_ERRORS=$(gcloud logging read \
    "jsonPayload.message=~'notification' AND severity>=ERROR AND timestamp>\"$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ)\"" \
    --limit=1000 \
    --format=json 2>/dev/null | jq length || echo "0")
  
  NOTIF_ERROR_RATE_PER_5MIN=$((NOTIF_ERRORS / 12))
else
  NOTIF_ERROR_RATE_PER_5MIN="N/A"
fi

# Memory usage
if command -v gcloud &> /dev/null; then
  MEMORY_PERCENT=$(gcloud monitoring timeseries list \
    --filter='metric.type="run.googleapis.com/container/memory/utilizations"' \
    --format=json 2>/dev/null | jq '.[0].points[0].value.doubleValue * 100' || echo "N/A")
else
  MEMORY_PERCENT="N/A"
fi

# Generate baseline report
cat > "$BASELINE_FILE" << BASELINEOF
# Production Baseline Metrics

**Last Updated**: $(date +"%Y-%m-%d %H:%M:%S %Z")
**Collection Duration**: 5 minutes (10 samples)

## Current Baselines

| Metric | Baseline Value | Threshold | Notes |
|--------|----------------|-----------|-------|
| API Latency (avg) | ${LATENCY_AVG}ms | 2000ms | Measured over 10 requests |
| Error Rate (per 5min) | ${ERROR_RATE_PER_5MIN} | +5 from baseline | Calculated from 1hr window |
| Notification Errors (per 5min) | ${NOTIF_ERROR_RATE_PER_5MIN} | 10 | Calculated from 1hr window |
| Memory Usage | ${MEMORY_PERCENT}% | 90% | Current utilization |

## Measurement Details

### API Latency
- **Method**: 10 sequential requests to /health endpoint
- **Interval**: 30 seconds between requests
- **Calculation**: Average of all 10 measurements

### Error Rate
- **Window**: Last 1 hour of logs
- **Severity**: ERROR and above
- **Calculation**: Total errors / 12 (5-min periods)

### Notification Errors
- **Window**: Last 1 hour of logs
- **Filter**: Logs containing "notification"
- **Severity**: ERROR and above
- **Calculation**: Total errors / 12 (5-min periods)

### Memory Usage
- **Source**: Cloud Monitoring timeseries
- **Metric**: Container memory utilization
- **Value**: Most recent data point

## Historical Baselines

### $(date +"%Y-%m")
- API Latency: ${LATENCY_AVG}ms
- Error Rate: ${ERROR_RATE_PER_5MIN}/5min
- Notification Errors: ${NOTIF_ERROR_RATE_PER_5MIN}/5min
- Memory: ${MEMORY_PERCENT}%

## Recommendations

- **Update frequency**: Weekly or before major deployments
- **Review thresholds**: Monthly based on trends
- **Adjust for growth**: As traffic increases, baselines may rise
- **Seasonal patterns**: Consider time-of-day and day-of-week variations

## Next Baseline Update

**Scheduled**: $(date -d '+7 days' +"%Y-%m-%d")
**Command**: ./scripts/deployment/record-baseline.sh
BASELINEOF

echo -e "${GREEN}✅ Baseline metrics recorded${NC}"
echo ""
cat "$BASELINE_FILE"
echo ""
echo "Baseline saved to: $BASELINE_FILE"
