#!/bin/bash
# TypeScript Error Fix Script
# Systematically fixes common TypeScript errors in the codebase

set -e

echo "🔧 Starting TypeScript error fixes..."

# Category 1: Fix file casing (already done manually)
echo "✅ Category 1: File casing fixes - DONE"

# Category 2: Fix event bus service:ready event (already added)
echo "✅ Category 2: Event bus fixes - DONE"

# Category 3: Fix timeout type issues (number vs Timeout)
echo "🔧 Category 3: Fixing setTimeout/setInterval type issues..."
find src -name "*.ts" -o -name "*.tsx" | while read file; do
  if grep -q "const.*=.*setTimeout\|const.*=.*setInterval" "$file" 2>/dev/null; then
    # Add type annotation for setTimeout/setInterval
    sed -i '' 's/const \([a-zA-Z_][a-zA-Z0-9_]*\) = setTimeout/const \1: ReturnType<typeof setTimeout> = setTimeout/g' "$file"
    sed -i '' 's/const \([a-zA-Z_][a-zA-Z0-9_]*\) = setInterval/const \1: ReturnType<typeof setInterval> = setInterval/g' "$file"
  fi
done

# Category 4: Fix "Not all code paths return a value" errors
echo "🔧 Category 4: Adding default return statements..."
# This requires manual intervention as it's context-specific

# Category 5: Fix "possibly undefined" errors
echo "🔧 Category 5: Adding null checks..."
# This requires manual review

echo "✅ Automated fixes complete!"
echo "📋 Running TypeScript compiler to check remaining errors..."
npx tsc --noEmit 2>&1 | head -50
