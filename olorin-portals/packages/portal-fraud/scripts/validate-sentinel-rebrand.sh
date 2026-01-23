#!/bin/bash

echo "🔍 Validating Sentinel Rebrand..."

ERRORS=0

# Check for old terminology in i18n files
echo ""
echo "1. Checking for old terminology in i18n files..."
OLD_TERMS=("POC Program" "6 specialized agents" "Olorin.AI Fraud Detection")
for term in "${OLD_TERMS[@]}"; do
  if grep -r "$term" src/i18n/ 2>/dev/null; then
    echo "❌ Found old terminology: $term"
    ERRORS=$((ERRORS + 1))
  fi
done

if [ $ERRORS -eq 0 ]; then
  echo "✅ No old terminology found in i18n files"
fi

# Check Sentinel colors defined in Tailwind config
echo ""
echo "2. Checking Sentinel color tokens in shared Tailwind config..."
TAILWIND_CONFIG="../shared/tailwind.config.base.js"
if [ ! -f "$TAILWIND_CONFIG" ]; then
  echo "❌ Tailwind config not found at $TAILWIND_CONFIG"
  ERRORS=$((ERRORS + 1))
else
  if ! grep -q "accent-sentinel-cyan" "$TAILWIND_CONFIG"; then
    echo "❌ Sentinel cyan color not defined in Tailwind config"
    ERRORS=$((ERRORS + 1))
  fi
  if ! grep -q "accent-sentinel-red" "$TAILWIND_CONFIG"; then
    echo "❌ Sentinel red color not defined in Tailwind config"
    ERRORS=$((ERRORS + 1))
  fi
  if ! grep -q "bg-sentinel-void" "$TAILWIND_CONFIG"; then
    echo "❌ Sentinel void background not defined in Tailwind config"
    ERRORS=$((ERRORS + 1))
  fi
  if ! grep -q "sentinel-display" "$TAILWIND_CONFIG"; then
    echo "❌ Sentinel display font not defined in Tailwind config"
    ERRORS=$((ERRORS + 1))
  fi
  if [ $ERRORS -eq 0 ]; then
    echo "✅ All Sentinel color tokens and fonts defined in Tailwind config"
  fi
fi

# Check Orbitron font loaded in index.html
echo ""
echo "3. Checking Orbitron font in index.html..."
if ! grep -q "Orbitron" public/index.html; then
  echo "❌ Orbitron font not loaded in index.html"
  ERRORS=$((ERRORS + 1))
else
  echo "✅ Orbitron font loaded in index.html"
fi

# Check manifest updated with Sentinel branding
echo ""
echo "4. Checking PWA manifest..."
if ! grep -q "Olorin-Sentinel" public/manifest.json; then
  echo "❌ PWA manifest not updated with Sentinel branding"
  ERRORS=$((ERRORS + 1))
else
  echo "✅ PWA manifest updated with Sentinel branding"
fi

# Check branding types updated
echo ""
echo "5. Checking branding types..."
BRANDING_TYPES="../shared/src/types/branding.types.ts"
if [ ! -f "$BRANDING_TYPES" ]; then
  echo "❌ Branding types file not found at $BRANDING_TYPES"
  ERRORS=$((ERRORS + 1))
else
  if ! grep -q "OLORIN-SENTINEL" "$BRANDING_TYPES"; then
    echo "❌ Branding types not updated with OLORIN-SENTINEL"
    ERRORS=$((ERRORS + 1))
  fi
  if ! grep -q "cyber-guardian" "$BRANDING_TYPES"; then
    echo "❌ cyber-guardian theme not defined in branding types"
    ERRORS=$((ERRORS + 1))
  fi
  if [ $ERRORS -eq 0 ]; then
    echo "✅ Branding types updated correctly"
  fi
fi

# Check sentinel-theme.css exists
echo ""
echo "6. Checking sentinel-theme.css..."
if [ ! -f "src/styles/sentinel-theme.css" ]; then
  echo "❌ sentinel-theme.css not found"
  ERRORS=$((ERRORS + 1))
else
  if ! grep -q "sentinel-heading" src/styles/sentinel-theme.css; then
    echo "❌ sentinel-heading classes not defined in sentinel-theme.css"
    ERRORS=$((ERRORS + 1))
  fi
  if ! grep -q "sentinel-glitch" src/styles/sentinel-theme.css; then
    echo "❌ sentinel-glitch animation not defined in sentinel-theme.css"
    ERRORS=$((ERRORS + 1))
  fi
  if [ $ERRORS -eq 0 ]; then
    echo "✅ sentinel-theme.css exists with required classes"
  fi
fi

# Check new components exist
echo ""
echo "7. Checking new Sentinel components..."
COMPONENTS=(
  "src/components/ParticleEffect.tsx"
  "src/components/CountUpMetric.tsx"
  "src/components/NetworkGraph.tsx"
  "src/components/index.ts"
)

for component in "${COMPONENTS[@]}"; do
  if [ ! -f "$component" ]; then
    echo "❌ Component not found: $component"
    ERRORS=$((ERRORS + 1))
  fi
done

if [ $ERRORS -eq 0 ]; then
  echo "✅ All Sentinel components exist"
fi

# Check HomePage uses Sentinel theme
echo ""
echo "8. Checking HomePage uses Sentinel theme..."
if ! grep -q "ParticleEffect" src/pages/HomePage.tsx; then
  echo "❌ HomePage does not import ParticleEffect"
  ERRORS=$((ERRORS + 1))
fi
if ! grep -q "CountUpMetric" src/pages/HomePage.tsx; then
  echo "❌ HomePage does not import CountUpMetric"
  ERRORS=$((ERRORS + 1))
fi
if ! grep -q "sentinel-heading" src/pages/HomePage.tsx; then
  echo "❌ HomePage does not use sentinel-heading classes"
  ERRORS=$((ERRORS + 1))
fi
if ! grep -q "sentinel-cyan" src/pages/HomePage.tsx; then
  echo "❌ HomePage does not use sentinel-cyan variant"
  ERRORS=$((ERRORS + 1))
fi

if [ $ERRORS -eq 0 ]; then
  echo "✅ HomePage uses Sentinel theme correctly"
fi

# Check AgentsPage uses Sentinel theme
echo ""
echo "9. Checking AgentsPage uses Sentinel theme..."
if ! grep -q "ParticleEffect" src/pages/AgentsPage.tsx; then
  echo "❌ AgentsPage does not import ParticleEffect"
  ERRORS=$((ERRORS + 1))
fi
if ! grep -q "sentinel-heading" src/pages/AgentsPage.tsx; then
  echo "❌ AgentsPage does not use sentinel-heading classes"
  ERRORS=$((ERRORS + 1))
fi
if ! grep -q "theme=\"sentinel\"" src/pages/AgentsPage.tsx; then
  echo "❌ AgentsPage does not use sentinel theme prop"
  ERRORS=$((ERRORS + 1))
fi

if [ $ERRORS -eq 0 ]; then
  echo "✅ AgentsPage uses Sentinel theme correctly"
fi

# Check GlassButton has sentinel variants
echo ""
echo "10. Checking GlassButton has Sentinel variants..."
GLASS_BUTTON="../shared/src/components/ui/GlassButton.tsx"
if [ ! -f "$GLASS_BUTTON" ]; then
  echo "❌ GlassButton component not found at $GLASS_BUTTON"
  ERRORS=$((ERRORS + 1))
else
  if ! grep -q "sentinel-cyan" "$GLASS_BUTTON"; then
    echo "❌ GlassButton does not have sentinel-cyan variant"
    ERRORS=$((ERRORS + 1))
  fi
  if ! grep -q "sentinel-red" "$GLASS_BUTTON"; then
    echo "❌ GlassButton does not have sentinel-red variant"
    ERRORS=$((ERRORS + 1))
  fi
  if [ $ERRORS -eq 0 ]; then
    echo "✅ GlassButton has Sentinel variants"
  fi
fi

# Check GlassCard has sentinel theme
echo ""
echo "11. Checking GlassCard has Sentinel theme..."
GLASS_CARD="../shared/src/components/ui/GlassCard.tsx"
if [ ! -f "$GLASS_CARD" ]; then
  echo "❌ GlassCard component not found at $GLASS_CARD"
  ERRORS=$((ERRORS + 1))
else
  if ! grep -q "theme.*sentinel" "$GLASS_CARD"; then
    echo "❌ GlassCard does not have sentinel theme option"
    ERRORS=$((ERRORS + 1))
  fi
  if ! grep -q "glowColor" "$GLASS_CARD"; then
    echo "❌ GlassCard does not have glowColor prop"
    ERRORS=$((ERRORS + 1))
  fi
  if [ $ERRORS -eq 0 ]; then
    echo "✅ GlassCard has Sentinel theme support"
  fi
fi

# Final summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $ERRORS -eq 0 ]; then
  echo "🎉 Sentinel rebrand validation PASSED! All checks successful."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 0
else
  echo "❌ Sentinel rebrand validation FAILED with $ERRORS errors."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 1
fi
