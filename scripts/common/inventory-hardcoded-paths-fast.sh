#!/bin/bash
# Quick inventory of hardcoded paths (totals only)

set -e

echo "=========================================="
echo "Hardcoded Path Inventory (Quick)"
echo "=========================================="
echo ""

# Directories to focus on for fraud platform reorganization
TARGET_DIRS="olorin-fraud scripts deployment cloudbuild.yaml firebase.json"

# Patterns specific to fraud platform issues
PATTERNS=(
    "olorin-server"
    "olorin-front"
)

echo "Focusing on fraud platform directories: $TARGET_DIRS"
echo ""

TOTAL_COUNT=0

for pattern in "${PATTERNS[@]}"; do
    echo "=== Pattern: $pattern ==="

    COUNT=$(grep -r "$pattern" $TARGET_DIRS \
        --exclude-dir=".git" \
        --exclude-dir="node_modules" \
        --exclude-dir="__pycache__" \
        --exclude-dir="dist" \
        --exclude-dir="build" \
        --exclude="*.lock" \
        --exclude="*.pyc" \
        2>/dev/null | wc -l || echo "0")

    echo "  Occurrences: $COUNT"

    FILES=$(grep -rl "$pattern" $TARGET_DIRS \
        --exclude-dir=".git" \
        --exclude-dir="node_modules" \
        --exclude-dir="__pycache__" \
        --exclude-dir="dist" \
        --exclude-dir="build" \
        --exclude="*.lock" \
        --exclude="*.pyc" \
        2>/dev/null | wc -l || echo "0")

    echo "  Files: $FILES"
    echo ""

    TOTAL_COUNT=$((TOTAL_COUNT + COUNT))
done

echo "=========================================="
echo "TOTAL (fraud-specific): $TOTAL_COUNT occurrences"
echo "=========================================="
