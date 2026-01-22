#!/bin/bash

# detect-stylesheets.sh
#
# Detects StyleSheet.create() usage in non-legacy files
# Enforces TailwindCSS-only styling requirement
#
# Usage: ./scripts/detect-stylesheets.sh

set -e

echo "🔍 Detecting StyleSheet.create() usage..."
echo ""

VIOLATIONS=0

while IFS=: read -r file line content; do
  # Skip legacy files (*.legacy.tsx, *.legacy.ts)
  if echo "$file" | grep -q "\.legacy\."; then
    continue
  fi

  # Skip migration-exception comments
  if echo "$content" | grep -q "// migration-exception"; then
    continue
  fi

  echo "❌ $file:$line"
  echo "   StyleSheet.create() found in non-legacy file"
  echo "   Line: $(echo "$content" | sed 's/^[[:space:]]*//')"
  echo ""
  VIOLATIONS=$((VIOLATIONS + 1))
done < <(grep -rn "StyleSheet\.create" src/ --include="*.tsx" --include="*.ts" 2>/dev/null || true)

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "StyleSheet Detection Results"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Violations: $VIOLATIONS"
echo ""

if [ "$VIOLATIONS" -gt 0 ]; then
  echo "❌ StyleSheet.create() detection FAILED"
  echo ""
  echo "All styling must use TailwindCSS className only"
  echo ""
  echo "If this is a legacy file, rename it to *.legacy.tsx"
  echo "If this is an exception, add '// migration-exception' comment"
  echo ""
  exit 1
else
  echo "✅ No StyleSheet.create() usage found"
  exit 0
fi
