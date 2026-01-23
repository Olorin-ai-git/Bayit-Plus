#!/bin/bash
# Find all hardcoded paths in the Olorin monorepo
# Part of fraud platform reorganization

set -e

echo "=========================================="
echo "Hardcoded Path Inventory"
echo "=========================================="
echo ""

# Patterns to search for
PATTERNS=(
    "/Users/olorin/Documents/olorin"
    "/Users/gklainert"
    "olorin-server"
    "olorin-front"
)

TOTAL_COUNT=0
TOTAL_FILES=0

for pattern in "${PATTERNS[@]}"; do
    echo "=== Pattern: $pattern ==="

    # Count occurrences
    COUNT=$(grep -r "$pattern" \
        --exclude-dir=".git" \
        --exclude-dir="node_modules" \
        --exclude-dir=".turbo" \
        --exclude-dir="dist" \
        --exclude-dir="build" \
        --exclude-dir=".next" \
        --exclude-dir="coverage" \
        --exclude="*.lock" \
        --exclude="*.log" \
        --exclude="*.map" \
        --exclude="*.pyc" \
        . 2>/dev/null | grep -v "Binary file" | wc -l || echo "0")

    # Count files
    FILES=$(grep -rl "$pattern" \
        --exclude-dir=".git" \
        --exclude-dir="node_modules" \
        --exclude-dir=".turbo" \
        --exclude-dir="dist" \
        --exclude-dir="build" \
        --exclude-dir=".next" \
        --exclude-dir="coverage" \
        --exclude="*.lock" \
        --exclude="*.log" \
        --exclude="*.map" \
        --exclude="*.pyc" \
        . 2>/dev/null | wc -l || echo "0")

    echo "  Occurrences: $COUNT"
    echo "  Files: $FILES"
    echo ""

    # Show sample matches (first 5)
    echo "  Sample matches:"
    grep -rn "$pattern" \
        --exclude-dir=".git" \
        --exclude-dir="node_modules" \
        --exclude-dir=".turbo" \
        --exclude-dir="dist" \
        --exclude-dir="build" \
        --exclude-dir=".next" \
        --exclude-dir="coverage" \
        --exclude="*.lock" \
        --exclude="*.log" \
        --exclude="*.map" \
        --exclude="*.pyc" \
        . 2>/dev/null | grep -v "Binary file" | head -5 || echo "  (none found)"
    echo ""

    TOTAL_COUNT=$((TOTAL_COUNT + COUNT))
    TOTAL_FILES=$((TOTAL_FILES + FILES))
done

echo "=========================================="
echo "TOTAL: $TOTAL_COUNT occurrences across $TOTAL_FILES files"
echo "=========================================="
