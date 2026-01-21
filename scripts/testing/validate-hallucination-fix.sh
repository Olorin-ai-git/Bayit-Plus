#!/bin/bash

# Script to validate that fabricated metrics have been eliminated from the codebase
# This ensures the AI hallucination fix is complete

echo "🔍 Validating AI hallucination fix..."
echo "Searching for remaining fabricated metric patterns..."

# Define patterns that indicate fabricated metrics (excluding test files and documentation that explains the issue)
FABRICATED_PATTERNS=(
    "team of [0-9]+ developers"
    "worth \\\$[0-9]+[KM]"
    "[0-9]+M\+ customer"
    "\\\$[0-9]+M annually"
    "[0-9]+% accuracy rate"
    "[0-9]+M\+ daily transactions"
    "Led cross-functional team of [0-9]+"
    "Spearheaded [0-9]+ high-priority.*worth"
    "achieve [0-9]+% improvement"
    "[0-9]+ weeks? ahead of schedule"
    "[0-9]+% cost savings"
)

# Directories to check (excluding test files and fix documentation)
SEARCH_DIRS=(
    "functions/src/services"
    "functions/src/functions"
    "frontend/src/services"
)

FOUND_ISSUES=0
TOTAL_CHECKS=0

echo ""
echo "🔍 Searching in production code directories..."

for pattern in "${FABRICATED_PATTERNS[@]}"; do
    echo "  Checking pattern: $pattern"
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    for dir in "${SEARCH_DIRS[@]}"; do
        if [ -d "$dir" ]; then
            # Search for the pattern, excluding test files and the fix documentation
            MATCHES=$(grep -r "$pattern" "$dir" --include="*.ts" --include="*.js" \
                     --exclude="*test*" --exclude="*spec*" \
                     --exclude="test-recommendation-hallucination-fix.ts" \
                     2>/dev/null || true)
            
            if [ ! -z "$MATCHES" ]; then
                echo "    ❌ Found in $dir:"
                echo "$MATCHES" | sed 's/^/      /'
                FOUND_ISSUES=$((FOUND_ISSUES + 1))
            fi
        fi
    done
done

echo ""
echo "🔍 Checking for positive placeholder patterns..."

# Check that placeholders are being used correctly
PLACEHOLDER_PATTERNS=(
    "\[INSERT TEAM SIZE\]"
    "\[ADD PERCENTAGE\]"
    "\[INSERT BUDGET\]"
    "\[ADD SPECIFIC"
    "\[INSERT VALUE\]"
)

PLACEHOLDER_FOUND=0

for pattern in "${PLACEHOLDER_PATTERNS[@]}"; do
    for dir in "${SEARCH_DIRS[@]}"; do
        if [ -d "$dir" ]; then
            MATCHES=$(grep -r "$pattern" "$dir" --include="*.ts" --include="*.js" 2>/dev/null || true)
            if [ ! -z "$MATCHES" ]; then
                PLACEHOLDER_FOUND=$((PLACEHOLDER_FOUND + 1))
                echo "  ✅ Found placeholder usage: $pattern"
                break
            fi
        fi
    done
done

echo ""
echo "📊 VALIDATION RESULTS:"
echo "========================"
echo "Fabricated patterns checked: $TOTAL_CHECKS"
echo "Fabricated patterns found: $FOUND_ISSUES"
echo "Placeholder patterns found: $PLACEHOLDER_FOUND"

if [ $FOUND_ISSUES -eq 0 ]; then
    echo ""
    echo "🎉 SUCCESS: No fabricated metrics found in production code!"
    echo "✅ AI hallucination fix appears to be complete"
    
    if [ $PLACEHOLDER_FOUND -gt 0 ]; then
        echo "✅ Proper placeholder usage detected"
    else
        echo "⚠️  Warning: No placeholder patterns found - verify implementation"
    fi
    
    exit 0
else
    echo ""
    echo "❌ FAILURE: Found $FOUND_ISSUES instances of potential fabricated metrics"
    echo "❌ Additional fixes may be needed"
    exit 1
fi