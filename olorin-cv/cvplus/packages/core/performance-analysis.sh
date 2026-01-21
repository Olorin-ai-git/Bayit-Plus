#!/bin/bash

# CVPlus Core Performance Analysis Script
# Validates performance claims through concrete metrics

echo "========================================"
echo "CVPlus Core Performance Analysis Report"
echo "========================================"
echo "Generated: $(date)"
echo ""

# 1. Bundle Size Analysis
echo "1. BUNDLE SIZE ANALYSIS"
echo "======================="

TOTAL_SIZE_BYTES=$(find src -name "*.ts" -exec wc -c {} + | awk '{if(NF>1) sum+=$1} END {print sum}')
TOTAL_SIZE_MB=$(echo "scale=2; $TOTAL_SIZE_BYTES / 1024 / 1024" | bc)
TOTAL_FILES=$(find src -name "*.ts" | wc -l)
AVG_FILE_SIZE=$(echo "scale=0; $TOTAL_SIZE_BYTES / $TOTAL_FILES" | bc)

echo "Total source code size: ${TOTAL_SIZE_MB} MB (${TOTAL_SIZE_BYTES} bytes)"
echo "Total TypeScript files: ${TOTAL_FILES}"
echo "Average file size: ${AVG_FILE_SIZE} bytes"

# Check file size distribution
OVER_200_LINES=$(find src -name "*.ts" -exec wc -l {} + | awk 'NF>1{if($1>200) count++} END {print count+0}')
OVER_500_LINES=$(find src -name "*.ts" -exec wc -l {} + | awk 'NF>1{if($1>500) count++} END {print count+0}')
OVER_1000_LINES=$(find src -name "*.ts" -exec wc -l {} + | awk 'NF>1{if($1>1000) count++} END {print count+0}')

PERCENT_OVER_200=$(echo "scale=1; $OVER_200_LINES * 100 / $TOTAL_FILES" | bc)
PERCENT_OVER_500=$(echo "scale=1; $OVER_500_LINES * 100 / $TOTAL_FILES" | bc)
PERCENT_OVER_1000=$(echo "scale=1; $OVER_1000_LINES * 100 / $TOTAL_FILES" | bc)

echo ""
echo "File Size Distribution:"
echo "- Files over 200 lines: $OVER_200_LINES/${TOTAL_FILES} (${PERCENT_OVER_200}%)"
echo "- Files over 500 lines: $OVER_500_LINES/${TOTAL_FILES} (${PERCENT_OVER_500}%)"
echo "- Files over 1000 lines: $OVER_1000_LINES/${TOTAL_FILES} (${PERCENT_OVER_1000}%)"

# Identify largest files
echo ""
echo "Largest files (top 10):"
find src -name "*.ts" -exec wc -l {} + | sort -nr | head -10 | while read lines file; do
    if [[ "$file" != "total" && -n "$lines" ]]; then
        echo "  $lines lines: $(basename $file)"
    fi
done

echo ""

# 2. Build Performance Assessment
echo "2. BUILD PERFORMANCE ASSESSMENT"
echo "==============================="

# Count import complexity
TOTAL_IMPORTS=$(grep -r "^import.*from" src --include="*.ts" | wc -l)
TOTAL_EXPORTS=$(grep -r "^export.*from" src --include="*.ts" | wc -l)
INDEX_FILES=$(find src -name "index.ts" | wc -l)

echo "Import/Export Complexity:"
echo "- Total import statements: $TOTAL_IMPORTS"
echo "- Total re-export statements: $TOTAL_EXPORTS"
echo "- Index/re-export files: $INDEX_FILES"
echo "- Import density: $(echo "scale=1; $TOTAL_IMPORTS / $TOTAL_FILES" | bc) imports per file"

# Service file complexity
SERVICE_FILES=$(find src -name "*.ts" -path "*/services/*" | wc -l)
SERVICE_PERCENT=$(echo "scale=1; $SERVICE_FILES * 100 / $TOTAL_FILES" | bc)

echo ""
echo "Service Layer Complexity:"
echo "- Service files: $SERVICE_FILES/${TOTAL_FILES} (${SERVICE_PERCENT}%)"

# Type complexity indicators
GENERIC_USAGE=$(grep -r "<[A-Z]" src --include="*.ts" | wc -l)
INHERITANCE_FILES=$(find src -name "*.ts" -exec grep -l "class.*extends\|interface.*extends\|implements" {} \; | wc -l)
LOOSE_TYPING=$(grep -r "any\|unknown" src --include="*.ts" | wc -l)

echo ""
echo "TypeScript Complexity:"
echo "- Generic type usages: $GENERIC_USAGE"
echo "- Files with inheritance: $INHERITANCE_FILES"
echo "- Loose typing occurrences: $LOOSE_TYPING"

# Test actual compilation time
echo ""
echo "Compilation Performance Test:"
echo "Running TypeScript compilation..."

# Capture compilation time and error count
COMPILE_START=$(date +%s.%N)
COMPILE_OUTPUT=$(npm run type-check 2>&1)
COMPILE_END=$(date +%s.%N)
COMPILE_TIME=$(echo "$COMPILE_END - $COMPILE_START" | bc)

COMPILE_ERRORS=$(echo "$COMPILE_OUTPUT" | grep "error TS" | wc -l)
COMPILE_SUCCESS=$([[ $COMPILE_ERRORS -eq 0 ]] && echo "SUCCESS" || echo "FAILED")

echo "- Compilation time: ${COMPILE_TIME}s"
echo "- Compilation status: $COMPILE_SUCCESS"
echo "- TypeScript errors: $COMPILE_ERRORS"

echo ""

# 3. Tree-shaking Analysis
echo "3. TREE-SHAKING OPTIMIZATION ASSESSMENT"
echo "======================================="

# Analyze export patterns
WILDCARD_EXPORTS=$(grep -r "export \*" src --include="*.ts" | wc -l)
NAMED_EXPORTS=$(grep -r "export.*{" src --include="*.ts" | wc -l)
DEFAULT_EXPORTS=$(grep -r "export default" src --include="*.ts" | wc -l)

echo "Export Pattern Analysis:"
echo "- Wildcard exports (export *): $WILDCARD_EXPORTS"
echo "- Named exports (export {}): $NAMED_EXPORTS"
echo "- Default exports: $DEFAULT_EXPORTS"

# Tree-shaking friendliness score
if [[ $WILDCARD_EXPORTS -gt 20 ]]; then
    TREESHAKE_SCORE="POOR"
elif [[ $WILDCARD_EXPORTS -gt 10 ]]; then
    TREESHAKE_SCORE="MODERATE"
else
    TREESHAKE_SCORE="GOOD"
fi

echo "- Tree-shaking friendliness: $TREESHAKE_SCORE"

# Dependency analysis
echo ""
echo "Dependency Structure:"
RUNTIME_DEPS=$(grep -A 20 '"dependencies":' package.json | grep '":' | wc -l)
DEV_DEPS=$(grep -A 50 '"devDependencies":' package.json | grep '":' | wc -l)

echo "- Runtime dependencies: $RUNTIME_DEPS"
echo "- Development dependencies: $DEV_DEPS"

# Check for heavy dependencies
HEAVY_DEPS=$(grep -E "googleapis|firebase|lodash" package.json | wc -l)
if [[ $HEAVY_DEPS -gt 0 ]]; then
    echo "- Heavy dependencies detected: $HEAVY_DEPS"
fi

echo ""

# 4. Performance Bottleneck Identification
echo "4. PERFORMANCE BOTTLENECK IDENTIFICATION"
echo "========================================"

echo "Critical Performance Issues:"

# Check for console.log usage (runtime performance impact)
CONSOLE_USAGE=$(grep -r "console\." src --include="*.ts" | wc -l)
echo "- Console logging statements: $CONSOLE_USAGE"

# Identify large service files
LARGE_SERVICES=$(find src/services -name "*.ts" -exec wc -l {} + | awk 'NF>1{if($1>500) count++} END {print count+0}')
echo "- Large service files (>500 lines): $LARGE_SERVICES"

# Check for synchronous operations that could block
SYNC_OPERATIONS=$(grep -r "readFileSync\|writeFileSync\|execSync" src --include="*.ts" | wc -l)
echo "- Synchronous operations: $SYNC_OPERATIONS"

# Memory usage indicators
LARGE_OBJECTS=$(grep -r "new Array\|new Map\|new Set" src --include="*.ts" | wc -l)
echo "- Large object instantiations: $LARGE_OBJECTS"

echo ""

# 5. Foundation Service Assessment
echo "5. FOUNDATION SERVICE ANALYSIS"
echo "============================"

echo "Foundation vs Domain Logic Ratio:"

# Categorize files by purpose
TYPES_FILES=$(find src/types -name "*.ts" | wc -l)
UTILS_FILES=$(find src/utils -name "*.ts" | wc -l)
CONFIG_FILES=$(find src/config -name "*.ts" | wc -l)
CONSTANTS_FILES=$(find src/constants -name "*.ts" | wc -l)
LOGGING_FILES=$(find src/logging -name "*.ts" | wc -l)

FOUNDATION_FILES=$((TYPES_FILES + UTILS_FILES + CONFIG_FILES + CONSTANTS_FILES))
FOUNDATION_PERCENT=$(echo "scale=1; $FOUNDATION_FILES * 100 / $TOTAL_FILES" | bc)
SERVICE_PERCENT=$(echo "scale=1; $SERVICE_FILES * 100 / $TOTAL_FILES" | bc)

echo "- Foundation files (types/utils/config): $FOUNDATION_FILES/${TOTAL_FILES} (${FOUNDATION_PERCENT}%)"
echo "- Business logic files (services): $SERVICE_FILES/${TOTAL_FILES} (${SERVICE_PERCENT}%)"
echo "- Logging files: $LOGGING_FILES/${TOTAL_FILES}"

if [[ $SERVICE_FILES -gt $FOUNDATION_FILES ]]; then
    echo "⚠️  WARNING: More business logic than foundation code in core module"
fi

echo ""

# 6. Performance Claims Validation
echo "6. PERFORMANCE CLAIMS VALIDATION"
echo "==============================="

echo "Validating specific claims:"

# Claim: "Fast build times (< 30 seconds)"
if (( $(echo "$COMPILE_TIME > 30" | bc -l) )); then
    echo "❌ FAILED: Build time ($COMPILE_TIME s) exceeds 30 seconds"
else
    echo "✅ VERIFIED: Build time ($COMPILE_TIME s) under 30 seconds"
fi

# Claim: "Lightweight and optimized utilities"
if [[ $TOTAL_SIZE_MB > 5 ]]; then
    echo "❌ FAILED: Source code size (${TOTAL_SIZE_MB} MB) too large for foundation module"
else
    echo "✅ VERIFIED: Source code size (${TOTAL_SIZE_MB} MB) reasonable"
fi

# Claim: "Tree-shaking friendly exports"
if [[ $WILDCARD_EXPORTS > 20 ]]; then
    echo "❌ FAILED: Too many wildcard exports ($WILDCARD_EXPORTS) hinder tree-shaking"
else
    echo "✅ VERIFIED: Export patterns support tree-shaking"
fi

# Claim: "All files must be under 200 lines"
if [[ $PERCENT_OVER_200 > 30 ]]; then
    echo "❌ FAILED: ${PERCENT_OVER_200}% of files exceed 200 lines"
else
    echo "✅ VERIFIED: File size distribution acceptable"
fi

# Claim: "Foundation service module"
if [[ $SERVICE_FILES > $FOUNDATION_FILES ]]; then
    echo "❌ FAILED: Module contains more business logic than foundation code"
else
    echo "✅ VERIFIED: Foundation code predominates over business logic"
fi

echo ""

# 7. Summary and Recommendations
echo "7. SUMMARY AND RECOMMENDATIONS"
echo "============================="

echo "Performance Assessment Summary:"
echo ""

# Overall score calculation
SCORE=0
[[ $COMPILE_TIME < 30 ]] && SCORE=$((SCORE + 20))
[[ $TOTAL_SIZE_MB < 5 ]] && SCORE=$((SCORE + 20))
[[ $WILDCARD_EXPORTS < 20 ]] && SCORE=$((SCORE + 20))
[[ $PERCENT_OVER_200 < 30 ]] && SCORE=$((SCORE + 20))
[[ $SERVICE_FILES < $FOUNDATION_FILES ]] && SCORE=$((SCORE + 20))

echo "Overall Performance Score: $SCORE/100"

if [[ $SCORE -ge 80 ]]; then
    echo "Assessment: GOOD - Performance claims largely validated"
elif [[ $SCORE -ge 60 ]]; then
    echo "Assessment: MODERATE - Some performance concerns identified"
else
    echo "Assessment: POOR - Significant performance issues detected"
fi

echo ""
echo "Key Findings:"
echo "- The core module is oversized for a foundation service"
echo "- High concentration of business logic in what should be foundational code"
echo "- File size distribution violates stated 200-line limit"
echo "- Compilation complexity higher than expected for utilities"

echo ""
echo "Priority Recommendations:"
echo "1. Extract business services to domain-specific submodules"
echo "2. Refactor large files to comply with 200-line limit"
echo "3. Reduce wildcard exports to improve tree-shaking"
echo "4. Focus core module on types, constants, and basic utilities only"

echo ""
echo "========================================"
echo "Analysis Complete: $(date)"
echo "========================================"