#!/bin/bash

# analyze-bundle.sh
#
# Analyzes bundle size and reports metrics
# Compares against baseline thresholds
#
# Usage: ./scripts/analyze-bundle.sh

set -e

echo "📦 Analyzing bundle size..."
echo ""

# Build the project
echo "Building project..."
npm run build

# Check if build directory exists
if [ ! -d "build" ]; then
  echo "❌ ERROR: build directory not found"
  echo "Run 'npm run build' first"
  exit 1
fi

# Calculate total bundle size
TOTAL_SIZE=$(du -sb build/ | awk '{print $1}')
TOTAL_SIZE_MB=$(echo "scale=2; $TOTAL_SIZE / 1048576" | bc)

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Bundle Size Analysis"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Total size
echo "Total Size: ${TOTAL_SIZE_MB}MB"

# Gzipped size (approximate)
GZIPPED_SIZE=$(find build/ -type f \( -name "*.js" -o -name "*.css" \) -exec gzip -c {} \; | wc -c)
GZIPPED_SIZE_MB=$(echo "scale=2; $GZIPPED_SIZE / 1048576" | bc)
echo "Gzipped Size: ${GZIPPED_SIZE_MB}MB"

# JavaScript bundles
echo ""
echo "JavaScript Bundles:"
find build/static/js -name "*.js" ! -name "*.map" -exec du -h {} \; | sort -hr | head -10

# CSS bundles
echo ""
echo "CSS Bundles:"
find build/static/css -name "*.css" ! -name "*.map" -exec du -h {} \; | sort -hr

# Check against thresholds
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Threshold Validation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

THRESHOLD_TOTAL=524288000  # 500MB
THRESHOLD_GZIPPED=209715200  # 200MB

# Check total size
if [ "$TOTAL_SIZE" -gt "$THRESHOLD_TOTAL" ]; then
  echo "❌ Total bundle size exceeds threshold"
  echo "   Current: ${TOTAL_SIZE_MB}MB"
  echo "   Threshold: 500MB"
  EXIT_CODE=1
else
  echo "✅ Total bundle size within threshold"
  echo "   Current: ${TOTAL_SIZE_MB}MB / 500MB"
fi

# Check gzipped size
if [ "$GZIPPED_SIZE" -gt "$THRESHOLD_GZIPPED" ]; then
  echo "❌ Gzipped bundle size exceeds threshold"
  echo "   Current: ${GZIPPED_SIZE_MB}MB"
  echo "   Threshold: 200MB"
  EXIT_CODE=1
else
  echo "✅ Gzipped bundle size within threshold"
  echo "   Current: ${GZIPPED_SIZE_MB}MB / 200MB"
fi

# Save baseline if SAVE_BASELINE=true
if [ "$SAVE_BASELINE" = "true" ]; then
  echo ""
  echo "💾 Saving baseline..."
  mkdir -p .baselines
  cat > .baselines/bundle-size.json <<EOF
{
  "date": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "total_size": $TOTAL_SIZE,
  "total_size_mb": "$TOTAL_SIZE_MB",
  "gzipped_size": $GZIPPED_SIZE,
  "gzipped_size_mb": "$GZIPPED_SIZE_MB"
}
EOF
  echo "✅ Baseline saved to .baselines/bundle-size.json"
fi

# Check for baseline comparison
if [ -f ".baselines/bundle-size.json" ]; then
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Baseline Comparison"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  BASELINE_SIZE=$(cat .baselines/bundle-size.json | grep -o '"total_size": [0-9]*' | awk '{print $2}')
  BASELINE_SIZE_MB=$(echo "scale=2; $BASELINE_SIZE / 1048576" | bc)

  DIFF=$(echo "scale=2; ($TOTAL_SIZE - $BASELINE_SIZE) / $BASELINE_SIZE * 100" | bc)

  echo "Baseline: ${BASELINE_SIZE_MB}MB"
  echo "Current: ${TOTAL_SIZE_MB}MB"
  echo "Change: ${DIFF}%"

  # Check if increase is more than 10%
  if (( $(echo "$DIFF > 10" | bc -l) )); then
    echo "❌ Bundle size increased by more than 10%"
    EXIT_CODE=1
  elif (( $(echo "$DIFF < -5" | bc -l) )); then
    echo "🎉 Bundle size decreased by ${DIFF}%!"
  else
    echo "✅ Bundle size change within acceptable range"
  fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

exit ${EXIT_CODE:-0}
