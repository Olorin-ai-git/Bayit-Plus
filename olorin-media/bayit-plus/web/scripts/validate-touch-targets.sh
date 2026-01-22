#!/bin/bash

# validate-touch-targets.sh
#
# Validates that all interactive elements meet iOS/Android touch target minimums
#
# iOS HIG: 44x44pt minimum
# Android Material Design: 48x48dp minimum
#
# Usage: ./scripts/validate-touch-targets.sh

set -e

echo "🎯 Validating touch target sizes..."
echo ""

VIOLATIONS=0
CHECKED=0

# Check for width/height values less than 44
while IFS=: read -r file line content; do
  CHECKED=$((CHECKED + 1))

  # Skip if line has touch-target-exception comment
  if echo "$content" | grep -q "// touch-target-exception"; then
    continue
  fi

  # Extract the numeric value
  VALUE=$(echo "$content" | grep -oE "(width|height): [0-3][0-9]" | grep -oE "[0-9]+")

  if [ ! -z "$VALUE" ] && [ "$VALUE" -lt 44 ]; then
    echo "❌ $file:$line"
    echo "   Touch target too small: ${VALUE}px (minimum 44px required)"
    echo "   Line: $content"
    echo ""
    VIOLATIONS=$((VIOLATIONS + 1))
  fi
done < <(grep -rn "width: [0-3][0-9]\|height: [0-3][0-9]" src/ --include="*.tsx" --include="*.ts" 2>/dev/null || true)

# Check for Tailwind w-/h- classes less than 44px (w-10 = 40px, w-11 = 44px)
while IFS=: read -r file line content; do
  # Skip comments
  if echo "$content" | grep -q "^[[:space:]]*//"; then
    continue
  fi

  # Skip touch-target-exception
  if echo "$content" | grep -q "// touch-target-exception"; then
    continue
  fi

  # Check for w-[0-9] or h-[0-9] (w-1 through w-10, h-1 through h-10)
  if echo "$content" | grep -qE "className=.*[\"'\`].*\b[wh]-([0-9]|10)\b"; then
    echo "⚠️  $file:$line"
    echo "   Potentially small touch target detected (w-1 to w-10 = 4px to 40px)"
    echo "   Use w-11 or higher (44px+) for interactive elements"
    echo "   Line: $(echo "$content" | sed 's/^[[:space:]]*//')"
    echo ""
    VIOLATIONS=$((VIOLATIONS + 1))
  fi
done < <(grep -rn "className=" src/ --include="*.tsx" | grep -E "[wh]-([0-9]|10)\b" || true)

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Touch Target Validation Results"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Checked: $CHECKED potential violations"
echo "Violations: $VIOLATIONS"
echo ""

if [ "$VIOLATIONS" -gt 0 ]; then
  echo "❌ Touch target validation FAILED"
  echo ""
  echo "iOS HIG requires minimum 44x44pt touch targets"
  echo "Android Material Design requires minimum 48x48dp"
  echo ""
  echo "Fix violations or add '// touch-target-exception' comment if intentional"
  echo ""
  exit 1
else
  echo "✅ All touch targets meet minimum size requirements"
  exit 0
fi
