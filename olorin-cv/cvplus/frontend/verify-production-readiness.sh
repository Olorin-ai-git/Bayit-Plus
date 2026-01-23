#!/bin/bash

# CVPlus Production Readiness Verification
# Validates all Phase 1-7 implementations

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASSED=0
FAILED=0
WARNINGS=0

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}CVPlus Production Readiness Check${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# Helper functions
pass() {
    echo -e "${GREEN}✅ PASS${NC}: $1"
    PASSED=$((PASSED + 1))
}

fail() {
    echo -e "${RED}❌ FAIL${NC}: $1"
    FAILED=$((FAILED + 1))
}

warn() {
    echo -e "${YELLOW}⚠️  WARN${NC}: $1"
    WARNINGS=$((WARNINGS + 1))
}

section() {
    echo ""
    echo -e "${BLUE}## $1${NC}"
    echo ""
}

# Phase 1 Verifications
section "Phase 1: Critical Bug Fixes"

# 1.2: Touch target sizes (Glass components)
if grep -q "min-h-\[44px\]" src/components/glass/index.tsx; then
    pass "Touch targets: 44px minimum enforced in GlassButton"
else
    fail "Touch targets: 44px minimum not found"
fi

# Phase 2 Verifications
section "Phase 2: Mobile & Accessibility"

# 2.1: GlassInput component
if [ -f "src/components/glass/index.tsx" ] && grep -q "export function GlassInput" src/components/glass/index.tsx; then
    pass "GlassInput component exists"
else
    fail "GlassInput component not found"
fi

# 2.2: File upload accessibility
if grep -q "aria-describedby" src/pages/UploadPage.tsx; then
    pass "File upload has ARIA labels"
else
    fail "File upload missing ARIA labels"
fi

# 2.3: Responsive breakpoints
if grep -q "sm:" src/pages/UploadPage.tsx && grep -q "lg:" src/pages/UploadPage.tsx; then
    pass "Responsive breakpoints implemented"
else
    fail "Responsive breakpoints missing"
fi

# 2.4: Mobile navigation
if grep -q "mobileMenuOpen" src/components/Header.tsx; then
    pass "Mobile navigation menu implemented"
else
    fail "Mobile navigation menu not found"
fi

# Phase 3 Verifications
section "Phase 3: Internationalization"

# 3.1: i18n framework
if [ -f "src/i18n/config.ts" ] && [ -f "src/i18n/locales/en.json" ] && [ -f "src/i18n/locales/he.json" ]; then
    pass "i18n framework configured with en/he translations"
else
    fail "i18n framework not properly configured"
fi

# 3.2: Translation usage
if grep -q "useTranslation" src/pages/UploadPage.tsx && grep -q "useTranslation" src/components/Header.tsx; then
    pass "Pages use translation hooks"
else
    fail "Translation hooks not implemented"
fi

# 3.3: RTL support
if grep -q "me-" src/pages/SharePage.tsx || grep -q "ms-" src/pages/SharePage.tsx; then
    pass "RTL support with logical CSS properties"
else
    warn "RTL logical properties not detected (may still be correct)"
fi

# Phase 4 Verifications
section "Phase 4: Audio Optimization"

# 4.3: Performance optimization
if [ -f "src/components/audio/useWaveform.ts" ]; then
    if grep -q "setupCanvasDPI" src/components/audio/useWaveform.ts && grep -q "FRAME_INTERVAL_MS" src/components/audio/useWaveform.ts; then
        pass "Audio waveform optimized (DPI scaling + frame throttling)"
    else
        fail "Audio waveform optimization incomplete"
    fi
else
    warn "Audio waveform component not found (may be optional)"
fi

# Phase 5 Verifications
section "Phase 5: Accessibility Focus Indicators"

if grep -q "focus:ring-2" src/components/glass/index.tsx && grep -q "focus:ring-blue-400" src/components/glass/index.tsx; then
    pass "Focus indicators on Glass components"
else
    fail "Focus indicators missing on Glass components"
fi

if grep -q "focus:ring" src/components/Header.tsx; then
    pass "Focus indicators on navigation links"
else
    fail "Focus indicators missing on navigation"
fi

# Phase 6 Verifications
section "Phase 6: Content Security Policy"

if [ -f "index.html" ]; then
    if grep -q "Content-Security-Policy" index.html && ! grep -q "unsafe-eval" index.html; then
        pass "CSP implemented without unsafe-eval"
    else
        fail "CSP missing or contains unsafe-eval"
    fi
else
    fail "index.html not found"
fi

# Phase 7 Verifications
section "Phase 7: Automated Rollback"

if [ -f "scripts/automated-rollback-trigger.sh" ] && [ -x "scripts/automated-rollback-trigger.sh" ]; then
    pass "Automated rollback script exists and is executable"
else
    fail "Automated rollback script missing or not executable"
fi

if [ -f "scripts/ROLLBACK_README.md" ]; then
    pass "Rollback documentation exists"
else
    warn "Rollback documentation missing"
fi

# Build Verification
section "Build & Bundle Verification"

if [ -d "dist" ] && [ -f "dist/index.html" ]; then
    pass "Production build exists"

    # Check bundle sizes
    BUNDLE_SIZE=$(du -sb dist/ | cut -f1)
    BUNDLE_SIZE_MB=$((BUNDLE_SIZE / 1024 / 1024))

    if [ "$BUNDLE_SIZE_MB" -lt 10 ]; then
        pass "Bundle size: ${BUNDLE_SIZE_MB}MB (under 10MB)"
    else
        warn "Bundle size: ${BUNDLE_SIZE_MB}MB (exceeds 10MB)"
    fi
else
    fail "Production build not found. Run: npm run build"
fi

# Final Summary
section "Verification Summary"

echo ""
echo -e "${GREEN}Passed:${NC} $PASSED"
echo -e "${RED}Failed:${NC} $FAILED"
echo -e "${YELLOW}Warnings:${NC} $WARNINGS"
echo ""

if [ "$FAILED" -eq 0 ]; then
    echo -e "${GREEN}🎉 Production Readiness: VERIFIED${NC}"
    echo -e "${GREEN}All critical checks passed. Ready for deployment.${NC}"
    exit 0
else
    echo -e "${RED}❌ Production Readiness: FAILED${NC}"
    echo -e "${RED}$FAILED critical checks failed. Please fix before deployment.${NC}"
    exit 1
fi
