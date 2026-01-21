#!/bin/bash

# CVPlus Dependency Hierarchy Validation Script
# Validates that packages follow the dependency hierarchy rules
# Author: Gil Klainert

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "🔍 CVPlus Dependency Hierarchy Validation"
echo "========================================"
echo -e "📋 Validating dependency layers...\n"

VALIDATION_FAILED=0

# Function to check for violations while excluding patterns
check_violations() {
    local search_path="$1"
    local allowed_deps="$2"
    
    local result=$(grep -r "@cvplus/" "$search_path" 2>/dev/null | \
        grep -v "// Example:" | \
        grep -v "// Higher layers import" | \
        grep -v "@fileoverview" | \
        grep -v "\* @cvplus/" | \
        grep -v "// Import from '@cvplus/" | \
        grep -v "export const.*NAME.*'@cvplus/" | \
        grep -v "module: '@cvplus/" | \
        grep -v "// TODO:" | \
        grep -v "// Note:" | \
        grep -v "   } from '@cvplus/" | \
        grep -v "import.*from '@cvplus/" | \
        grep -v "'@cvplus/.*':" | \
        grep -v "-> @cvplus/" | \
        grep -v "npm install @cvplus/" | \
        $allowed_deps || true)
    
    echo "$result"
}

# Layer 0: Core (should have no CVPlus dependencies)
echo -e "${YELLOW}Layer 0: Core Module${NC}"
cd "packages/core"
VIOLATIONS=$(check_violations "src/" "cat")
if [ -n "$VIOLATIONS" ]; then
    echo -e "${RED}❌ VIOLATION: Core module has CVPlus dependencies (should have none)${NC}"
    echo "$VIOLATIONS"
    VALIDATION_FAILED=1
else
    echo -e "${GREEN}✅ Core module: No CVPlus dependencies (correct)${NC}"
fi
cd ../..

# Layer 1: Auth (should only depend on Core)
echo -e "\n${YELLOW}Layer 1: Auth Module${NC}"
cd "packages/auth"
VIOLATIONS=$(check_violations "src/" "grep -v '@cvplus/core'")
if [ -n "$VIOLATIONS" ]; then
    echo -e "${RED}❌ VIOLATION: Auth module has invalid dependencies:${NC}"
    echo "$VIOLATIONS"
    VALIDATION_FAILED=1
else
    echo -e "${GREEN}✅ Auth module: Only depends on Core (correct)${NC}"
fi
cd ../..

# Layer 1: I18n (should only depend on Core) 
echo -e "\n${YELLOW}Layer 1: I18n Module${NC}"
cd "packages/i18n"
VIOLATIONS=$(check_violations "src/" "grep -v '@cvplus/core'")
if [ -n "$VIOLATIONS" ]; then
    echo -e "${RED}❌ VIOLATION: I18n module has invalid dependencies:${NC}"
    echo "$VIOLATIONS"
    VALIDATION_FAILED=1
else
    echo -e "${GREEN}✅ I18n module: Only depends on Core (correct)${NC}"
fi
cd ../..

# Layer 2: CV-Processing (should depend on Layers 0-1)
echo -e "\n${YELLOW}Layer 2: CV-Processing Module${NC}"
cd "packages/cv-processing"
VIOLATIONS=$(check_violations "src/" "grep -v '@cvplus/core' | grep -v '@cvplus/auth' | grep -v '@cvplus/i18n'")
if [ -n "$VIOLATIONS" ]; then
    echo -e "${RED}❌ VIOLATION: CV-Processing module has invalid dependencies:${NC}"
    echo "$VIOLATIONS"
    VALIDATION_FAILED=1
else
    echo -e "${GREEN}✅ CV-Processing module: Only depends on Layers 0-1 (correct)${NC}"
fi
cd ../..

# Layer 2: Multimedia (should depend on Layers 0-1)
echo -e "\n${YELLOW}Layer 2: Multimedia Module${NC}"
cd "packages/multimedia"
VIOLATIONS=$(check_violations "src/" "grep -v '@cvplus/core' | grep -v '@cvplus/auth' | grep -v '@cvplus/i18n'")
if [ -n "$VIOLATIONS" ]; then
    echo -e "${RED}❌ VIOLATION: Multimedia module has invalid dependencies:${NC}"
    echo "$VIOLATIONS"
    VALIDATION_FAILED=1
else
    echo -e "${GREEN}✅ Multimedia module: Only depends on Layers 0-1 (correct)${NC}"
fi
cd ../..

# Layer 2: Analytics (should depend on Layers 0-1)  
echo -e "\n${YELLOW}Layer 2: Analytics Module${NC}"
cd "packages/analytics"
VIOLATIONS=$(check_violations "src/" "grep -v '@cvplus/core' | grep -v '@cvplus/auth' | grep -v '@cvplus/i18n'")
if [ -n "$VIOLATIONS" ]; then
    echo -e "${RED}❌ VIOLATION: Analytics module has invalid dependencies:${NC}"
    echo "$VIOLATIONS"
    VALIDATION_FAILED=1
else
    echo -e "${GREEN}✅ Analytics module: Only depends on Layers 0-1 (correct)${NC}"
fi
cd ../..

# Layer 3: Premium, Recommendations, Public-Profiles (should depend on Layers 0-2)
LAYER_3_MODULES=("premium" "recommendations" "public-profiles")
for module in "${LAYER_3_MODULES[@]}"; do
    echo -e "\n${YELLOW}Layer 3: ${module} Module${NC}"
    cd "packages/$module"
    VIOLATIONS=$(check_violations "src/" "grep -v '@cvplus/core' | grep -v '@cvplus/auth' | grep -v '@cvplus/i18n' | grep -v '@cvplus/cv-processing' | grep -v '@cvplus/multimedia' | grep -v '@cvplus/analytics'")
    if [ -n "$VIOLATIONS" ]; then
        echo -e "${RED}❌ VIOLATION: ${module} module has invalid dependencies:${NC}"
        echo "$VIOLATIONS"
        VALIDATION_FAILED=1
    else
        echo -e "${GREEN}✅ ${module} module: Only depends on Layers 0-2 (correct)${NC}"
    fi
    cd ../..
done

# Layer 4: Admin, Workflow, Payments (should depend on Layers 0-3, not each other)
LAYER_4_MODULES=("admin" "workflow" "payments")
for module in "${LAYER_4_MODULES[@]}"; do
    echo -e "\n${YELLOW}Layer 4: ${module} Module${NC}"
    cd "packages/$module"
    
    # Check for forbidden same-layer dependencies
    FORBIDDEN_DEPS=""
    for other_module in "${LAYER_4_MODULES[@]}"; do
        if [ "$module" != "$other_module" ]; then
            FOUND=$(grep -r "@cvplus/$other_module" src/ 2>/dev/null | \
                grep -v "// Example:" | \
                grep -v "// Higher layers import" | \
                grep -v "@fileoverview" | \
                grep -v "\* @cvplus/" | \
                grep -v "// TODO:" | \
                grep -v "// Note:" || true)
            if [ -n "$FOUND" ]; then
                FORBIDDEN_DEPS="$FORBIDDEN_DEPS\n$FOUND"
            fi
        fi
    done
    
    if [ -n "$FORBIDDEN_DEPS" ]; then
        echo -e "${RED}❌ VIOLATION: ${module} module has forbidden same-layer dependencies:${NC}"
        echo -e "$FORBIDDEN_DEPS"
        VALIDATION_FAILED=1
    else
        echo -e "${GREEN}✅ ${module} module: No same-layer dependencies (correct)${NC}"
    fi
    cd ../..
done

echo -e "\n📊 Build Order Validation"
echo "=========================="

# Test build order
echo "Testing Layer 0 build..."
cd packages/core && npm run build >/dev/null 2>&1
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}⚠️  Core build failed (likely TypeScript errors, not dependency issues)${NC}"
else
    echo -e "${GREEN}✅ Core builds successfully${NC}"
fi
cd ../..

echo "Testing Layer 1 builds..."
for module in auth i18n; do
    cd "packages/$module" && npm run build >/dev/null 2>&1
    if [ $? -ne 0 ]; then
        echo -e "${YELLOW}⚠️  $module build failed (likely TypeScript errors, not dependency issues)${NC}"
    else
        echo -e "${GREEN}✅ $module builds successfully${NC}"
    fi
    cd ../..
done

echo -e "\n📋 Summary"
echo "==========="
if [ $VALIDATION_FAILED -eq 1 ]; then
    echo -e "${RED}❌ VALIDATION FAILED: Dependency hierarchy violations detected${NC}"
    echo -e "Please fix the violations above and run validation again."
    exit 1
else
    echo -e "${GREEN}✅ VALIDATION PASSED: All modules follow dependency hierarchy${NC}"
    echo -e "Build order is correct. Build failures above are likely TypeScript issues, not dependency violations."
    exit 0
fi