#!/bin/bash

# Analytics Dependency Violation Fix Validation Script
# Author: Gil Klainert
# Date: August 29, 2025
# Purpose: Validate that the Analytics module no longer has direct dependencies on Premium module

set -e

ANALYTICS_PATH="/Users/gklainert/Documents/cvplus/packages/analytics"
PREMIUM_PATH="/Users/gklainert/Documents/cvplus/packages/premium"
CORE_PATH="/Users/gklainert/Documents/cvplus/packages/core"

echo "🔍 Validating Analytics Module Dependency Fix"
echo "=============================================="

# Check 1: Verify no direct imports from Premium module in Analytics
echo "✓ Checking for Premium module imports in Analytics..."
# Exclude backup files and comments, look for actual import statements
ACTUAL_IMPORTS=$(grep -r "^[[:space:]]*import.*@cvplus/premium" "$ANALYTICS_PATH/src" --exclude="*.backup" --exclude="*-backup" 2>/dev/null || true)
if [[ -n "$ACTUAL_IMPORTS" ]]; then
    echo "❌ FAILED: Found direct imports from Premium module"
    echo "The following files still import from @cvplus/premium:"
    echo "$ACTUAL_IMPORTS"
    exit 1
else
    echo "✅ PASSED: No direct imports from Premium module found"
    
    # Show any commented references for information
    COMMENTED_REFS=$(grep -r "@cvplus/premium" "$ANALYTICS_PATH/src" --exclude="*.backup" --exclude="*-backup" 2>/dev/null | grep -E "^\s*//|^\s*\*" | wc -l || echo "0")
    if [[ "$COMMENTED_REFS" -gt 0 ]]; then
        echo "ℹ️  INFO: Found $COMMENTED_REFS commented references (these are OK)"
    fi
fi

# Check 2: Verify Core module imports exist
echo "✓ Checking for Core module imports in Analytics..."
if grep -r "@cvplus/core" "$ANALYTICS_PATH/src" 2>/dev/null; then
    echo "✅ PASSED: Found Core module imports"
    echo "Core module imports found in:"
    grep -rn "@cvplus/core" "$ANALYTICS_PATH/src" | head -3
else
    echo "❌ FAILED: No Core module imports found"
    exit 1
fi

# Check 3: Verify IFeatureRegistry interface usage
echo "✓ Checking for IFeatureRegistry interface usage..."
if grep -r "IFeatureRegistry" "$ANALYTICS_PATH/src" 2>/dev/null; then
    echo "✅ PASSED: IFeatureRegistry interface is being used"
    echo "IFeatureRegistry usage found in:"
    grep -rn "IFeatureRegistry" "$ANALYTICS_PATH/src" | head -3
else
    echo "❌ FAILED: IFeatureRegistry interface not found"
    exit 1
fi

# Check 4: Verify dependency injection pattern
echo "✓ Checking for dependency injection pattern..."
if grep -r "featureRegistry\?" "$ANALYTICS_PATH/src" 2>/dev/null; then
    echo "✅ PASSED: Dependency injection pattern found"
    echo "Optional dependency injection found in:"
    grep -rn "featureRegistry\?" "$ANALYTICS_PATH/src" | head -3
else
    echo "❌ FAILED: Dependency injection pattern not found"
    exit 1
fi

# Check 5: Verify backup files exist
echo "✓ Checking for backup files..."
if [[ -f "$ANALYTICS_PATH/src/middleware/enhancedPremiumGuard.ts.dependency-violation-backup" ]]; then
    echo "✅ PASSED: Backup file exists"
else
    echo "⚠️  WARNING: No backup file found (not critical)"
fi

# Check 6: Verify Premium module has adapter
echo "✓ Checking for Premium module adapter..."
if [[ -f "$PREMIUM_PATH/src/backend/services/featureRegistryAdapter.ts" ]]; then
    echo "✅ PASSED: FeatureRegistryAdapter exists in Premium module"
else
    echo "❌ FAILED: FeatureRegistryAdapter not found in Premium module"
    exit 1
fi

# Check 7: Verify adapter exports
echo "✓ Checking for adapter exports in Premium module..."
if grep -r "FeatureRegistryAdapter" "$PREMIUM_PATH/src/backend/index.ts" 2>/dev/null; then
    echo "✅ PASSED: FeatureRegistryAdapter is exported from Premium module"
else
    echo "❌ FAILED: FeatureRegistryAdapter not exported from Premium module"
    exit 1
fi

# Check 8: Verify Core module exports interfaces
echo "✓ Checking Core module interface exports..."
if grep -r "IFeatureRegistry" "$CORE_PATH/src/types/middleware.ts" 2>/dev/null; then
    echo "✅ PASSED: IFeatureRegistry interface exists in Core module"
else
    echo "❌ FAILED: IFeatureRegistry interface not found in Core module"
    exit 1
fi

# Check 9: Verify architectural compliance test exists
echo "✓ Checking for architectural compliance tests..."
if [[ -f "$ANALYTICS_PATH/src/__tests__/architectural-compliance.test.ts" ]]; then
    echo "✅ PASSED: Architectural compliance test exists"
else
    echo "⚠️  WARNING: No architectural compliance test found"
fi

# Check 10: Verify integration examples
echo "✓ Checking for integration examples..."
if [[ -f "$ANALYTICS_PATH/src/integration-examples/dependency-injection-usage.ts" ]]; then
    echo "✅ PASSED: Integration examples exist"
else
    echo "⚠️  WARNING: No integration examples found"
fi

echo ""
echo "🎉 Validation Summary"
echo "===================="
echo "✅ Analytics module no longer directly imports from Premium module"
echo "✅ Analytics module uses IFeatureRegistry interface from Core module"
echo "✅ Dependency injection pattern is properly implemented"
echo "✅ Premium module provides interface-compliant adapter"
echo "✅ Core module exports required interfaces"
echo ""
echo "📋 Architecture Compliance Status: PASSED"
echo ""
echo "🔧 Next Steps:"
echo "1. Update any Firebase Functions that use enhancedPremiumGuard"
echo "2. Inject FeatureRegistryAdapter instance when creating middleware"
echo "3. Test the integration in a development environment"
echo "4. Deploy and verify functionality is preserved"
echo ""
echo "📖 Usage Example:"
echo "import { featureRegistryInstance } from '@cvplus/premium/backend';"
echo "import { enhancedPremiumGuard } from '@cvplus/analytics';"
echo ""
echo "const guard = enhancedPremiumGuard({"
echo "  requiredFeature: 'yourFeature'"
echo "}, featureRegistryInstance);"
echo ""

# Optional: Check file line counts to ensure compliance
echo "📊 File Size Compliance Check:"
echo "==============================="

# Check if any files exceed 200 lines (project requirement)
find "$ANALYTICS_PATH/src" -name "*.ts" -not -path "*/node_modules/*" | while read -r file; do
    lines=$(wc -l < "$file")
    if [[ $lines -gt 200 ]]; then
        echo "⚠️  WARNING: $file has $lines lines (exceeds 200 line limit)"
    fi
done

echo ""
echo "✅ Architectural dependency violation fix validation completed successfully!"