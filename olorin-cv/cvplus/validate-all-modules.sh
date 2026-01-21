#!/bin/bash

# CVPlus Module Validation Script
# Validates all modules against the 5 critical architectural requirements

echo "🔍 CVPlus Module Requirements Validation"
echo "========================================"
echo ""

# Initialize counters
total_modules=0
valid_modules=0
invalid_modules=0
total_violations=0
critical_violations=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if module has proper structure
check_module_requirements() {
    local module_path=$1
    local module_name=$(basename "$module_path")
    local violations=0
    local critical=0

    echo -e "${BLUE}📦 Analyzing module: $module_name${NC}"

    # 1. Code Segregation Principle - Check for unnecessary files
    echo "  🔍 Code Segregation..."
    if [ -d "$module_path/node_modules" ]; then
        echo "    ❌ CRITICAL: Contains node_modules (should use workspace dependencies)"
        violations=$((violations + 1))
        critical=$((critical + 1))
    fi

    if [ -f "$module_path/.env" ] || [ -f "$module_path/.env.local" ]; then
        echo "    ⚠️  WARNING: Contains environment files (should be in root)"
        violations=$((violations + 1))
    fi

    # Check for test files mixed with src
    if [ -d "$module_path/src" ]; then
        test_in_src=$(find "$module_path/src" -name "*.test.*" -o -name "*.spec.*" | wc -l)
        if [ $test_in_src -gt 0 ]; then
            echo "    ⚠️  WARNING: Test files found in src/ (should be in tests/)"
            violations=$((violations + 1))
        fi
    fi

    # 2. Distribution Architecture - Check for dist/ folder
    echo "  🏗️  Distribution Architecture..."
    if [ ! -d "$module_path/dist" ]; then
        echo "    ❌ CRITICAL: Missing dist/ folder (required for production)"
        violations=$((violations + 1))
        critical=$((critical + 1))
    else
        # Check if dist has content
        dist_files=$(find "$module_path/dist" -name "*.js" -o -name "*.d.ts" | wc -l)
        if [ $dist_files -eq 0 ]; then
            echo "    ❌ CRITICAL: Empty dist/ folder (no compiled output)"
            violations=$((violations + 1))
            critical=$((critical + 1))
        else
            echo "    ✅ Has compiled distribution ($dist_files files)"
        fi
    fi

    # 3. Real Implementation Only - Check for mocks/stubs
    echo "  🎭 Mock/Stub Detection..."
    if [ -d "$module_path/src" ]; then
        mock_files=$(find "$module_path/src" -type f \( -name "*mock*" -o -name "*stub*" -o -name "*placeholder*" \) | grep -v test | wc -l)
        if [ $mock_files -gt 0 ]; then
            echo "    ❌ CRITICAL: Found $mock_files mock/stub files in production code"
            violations=$((violations + 1))
            critical=$((critical + 1))
        fi

        # Check for TODO/FIXME in production code
        todo_count=$(find "$module_path/src" -type f -name "*.ts" -o -name "*.js" | xargs grep -l "TODO\|FIXME\|XXX" | wc -l)
        if [ $todo_count -gt 0 ]; then
            echo "    ⚠️  WARNING: Found TODO/FIXME in $todo_count files"
            violations=$((violations + 1))
        fi
    fi

    # 4. Build and Test Standards
    echo "  🔨 Build & Test Standards..."
    if [ -f "$module_path/package.json" ]; then
        has_build=$(grep -q '"build"' "$module_path/package.json" && echo "yes" || echo "no")
        has_test=$(grep -q '"test"' "$module_path/package.json" && echo "yes" || echo "no")

        if [ "$has_build" = "no" ]; then
            echo "    ❌ CRITICAL: Missing build script in package.json"
            violations=$((violations + 1))
            critical=$((critical + 1))
        else
            echo "    ✅ Has build script"
        fi

        if [ "$has_test" = "no" ]; then
            echo "    ⚠️  WARNING: Missing test script in package.json"
            violations=$((violations + 1))
        else
            echo "    ✅ Has test script"
        fi

        # Check TypeScript configuration
        if [ -f "$module_path/tsconfig.json" ]; then
            echo "    ✅ Has TypeScript configuration"
        else
            echo "    ⚠️  WARNING: Missing tsconfig.json"
            violations=$((violations + 1))
        fi
    else
        echo "    ❌ CRITICAL: Missing package.json"
        violations=$((violations + 1))
        critical=$((critical + 1))
    fi

    # 5. Dependency Chain Integrity - Basic check
    echo "  🔗 Dependency Integrity..."
    if [ -f "$module_path/package.json" ]; then
        # Check for circular dependencies (basic check) - exclude "name" field
        self_ref=$(grep -E "(dependencies|devDependencies|peerDependencies|optionalDependencies)" "$module_path/package.json" -A 20 | grep -q "\"@cvplus/$module_name\"" && echo "yes" || echo "no")
        if [ "$self_ref" = "yes" ]; then
            echo "    ❌ CRITICAL: Self-referential dependency detected"
            violations=$((violations + 1))
            critical=$((critical + 1))
        fi

        # Check dependency count
        dep_count=$(grep -A 20 '"dependencies"' "$module_path/package.json" | grep '"' | wc -l)
        if [ $dep_count -gt 50 ]; then
            echo "    ⚠️  WARNING: High dependency count ($dep_count dependencies)"
            violations=$((violations + 1))
        fi
    fi

    # Summary for this module
    echo ""
    if [ $violations -eq 0 ]; then
        echo -e "  ${GREEN}✅ Module $module_name: COMPLIANT (0 violations)${NC}"
        valid_modules=$((valid_modules + 1))
    else
        echo -e "  ${RED}❌ Module $module_name: NON-COMPLIANT ($violations violations, $critical critical)${NC}"
        invalid_modules=$((invalid_modules + 1))
    fi

    total_violations=$((total_violations + violations))
    critical_violations=$((critical_violations + critical))

    echo ""
    echo "----------------------------------------"
    echo ""
}

# Process all modules
for module_dir in packages/*/; do
    if [ -d "$module_dir" ]; then
        total_modules=$((total_modules + 1))
        check_module_requirements "$module_dir"
    fi
done

# Final Summary
echo ""
echo "📊 VALIDATION SUMMARY"
echo "===================="
echo ""
echo "Total Modules Analyzed: $total_modules"
echo -e "Valid Modules: ${GREEN}$valid_modules ✅${NC}"
echo -e "Invalid Modules: ${RED}$invalid_modules ❌${NC}"
echo ""
echo "Total Violations: $total_violations"
echo -e "Critical Violations: ${RED}$critical_violations 🔴${NC}"
echo ""

# Calculate compliance percentage
if [ $total_modules -gt 0 ]; then
    compliance_percent=$((valid_modules * 100 / total_modules))
    echo -e "Overall Compliance: ${compliance_percent}%"

    if [ $compliance_percent -eq 100 ]; then
        echo -e "${GREEN}🎉 PERFECT COMPLIANCE! All modules meet architectural requirements.${NC}"
    elif [ $compliance_percent -ge 80 ]; then
        echo -e "${YELLOW}⚠️  GOOD COMPLIANCE. Address remaining violations for full compliance.${NC}"
    else
        echo -e "${RED}🚨 LOW COMPLIANCE. Significant architectural improvements needed.${NC}"
    fi
else
    echo "No modules found to validate."
fi

echo ""
echo "💡 RECOMMENDATIONS:"
echo "==================="

if [ $critical_violations -gt 0 ]; then
    echo "🔴 HIGH PRIORITY: Address $critical_violations critical violations"
    echo "   - Missing dist/ folders need immediate attention"
    echo "   - Remove any mock/stub code from production modules"
    echo "   - Ensure all modules have proper package.json and build scripts"
fi

if [ $total_violations -gt $critical_violations ]; then
    warning_violations=$((total_violations - critical_violations))
    echo "🟡 MEDIUM PRIORITY: Address $warning_violations warning violations"
    echo "   - Add missing test scripts and TypeScript configurations"
    echo "   - Move test files to proper test directories"
    echo "   - Clean up TODO/FIXME comments"
fi

if [ $valid_modules -eq $total_modules ]; then
    echo "✅ MAINTENANCE: Continue monitoring architectural compliance"
    echo "   - Regular validation as part of CI/CD pipeline"
    echo "   - Automated checks for new modules"
fi

echo ""
echo "🔗 For detailed analysis, use the CVPlus Unified Module Requirements System:"
echo "   cd src/unified-module-requirements"
echo "   npm run cli validate"
echo ""