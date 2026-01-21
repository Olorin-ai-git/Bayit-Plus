#!/bin/bash

# CVPlus Core Module - Comprehensive Analysis Validation Script
# This script validates the critical findings from the comprehensive analysis report

echo "=== CVPlus Core Module Analysis Validation ==="
echo "Timestamp: $(date)"
echo

# Navigate to core module directory
cd /Users/gklainert/Documents/cvplus/packages/core

# 1. File Size Compliance Validation
echo "1. FILE SIZE COMPLIANCE VALIDATION"
echo "==================================="

violations_count=0
total_files=0
violations_file="file_violations.txt"
> "$violations_file"

# Find all TypeScript source files (excluding node_modules, dist, .git)
while IFS= read -r -d '' file; do
    if [[ "$file" == *"/node_modules/"* ]] || [[ "$file" == *"/dist/"* ]] || [[ "$file" == *"/.git/"* ]]; then
        continue
    fi
    
    line_count=$(wc -l < "$file" 2>/dev/null || echo 0)
    total_files=$((total_files + 1))
    
    if [ "$line_count" -gt 200 ]; then
        violations_count=$((violations_count + 1))
        echo "VIOLATION: $file ($line_count lines)" | tee -a "$violations_file"
    fi
done < <(find src -type f -name "*.ts" -print0)

echo
echo "SUMMARY: $violations_count files exceed 200 lines out of $total_files total files"
if [ "$total_files" -gt 0 ]; then
    violation_rate=$(echo "scale=2; $violations_count * 100 / $total_files" | bc -l 2>/dev/null || echo "calculation error")
    echo "Violation rate: $violation_rate%"
fi
echo

# 2. Service Scope Validation
echo "2. SERVICE SCOPE VALIDATION"
echo "=========================="

echo "Domain services found in core module that should be moved:"
find src/services -name "*.service.ts" -type f 2>/dev/null | while read service_file; do
    basename_file=$(basename "$service_file")
    case "$basename_file" in
        *cv-*.service.ts|*analysis*.service.ts|*processing*.service.ts)
            echo "→ SHOULD MOVE TO cv-processing: $service_file"
            ;;
        *multimedia*.service.ts|*video*.service.ts|*audio*.service.ts|*podcast*.service.ts)
            echo "→ SHOULD MOVE TO multimedia: $service_file"
            ;;
        *analytics*.service.ts|*tracking*.service.ts)
            echo "→ SHOULD MOVE TO analytics: $service_file"
            ;;
        *auth*.service.ts|*session*.service.ts)
            echo "→ SHOULD MOVE TO auth: $service_file"
            ;;
        *subscription*.service.ts|*premium*.service.ts|*billing*.service.ts)
            echo "→ SHOULD MOVE TO premium: $service_file"
            ;;
        *profile*.service.ts|*public*.service.ts)
            echo "→ SHOULD MOVE TO public-profiles: $service_file"
            ;;
        *recommendation*.service.ts)
            echo "→ SHOULD MOVE TO recommendations: $service_file"
            ;;
        *admin*.service.ts)
            echo "→ SHOULD MOVE TO admin: $service_file"
            ;;
        *timeline*.service.ts|*calendar*.service.ts)
            echo "→ SHOULD MOVE TO workflow: $service_file"
            ;;
        *)
            echo "→ CORE SERVICE (appropriate): $service_file"
            ;;
    esac
done

echo

# 3. Security Assessment Validation
echo "3. SECURITY ASSESSMENT VALIDATION"
echo "================================="

echo "a) Hardcoded secrets check:"
hardcoded_secrets=$(grep -r -E "(api[_-]?key|secret|token|password|auth[_-]?token).*[=:]\s*['\"][A-Za-z0-9+/=]{10,}['\"]" src --exclude-dir=node_modules --exclude="*.test.ts" --exclude="*-test.ts" --exclude="*-spec.ts" 2>/dev/null || true)

if [ -n "$hardcoded_secrets" ]; then
    echo "CRITICAL: Hardcoded secrets found:"
    echo "$hardcoded_secrets"
else
    echo "✓ No hardcoded secrets found in production code (test files excluded)"
fi

echo
echo "b) Test files with mock secrets (expected):"
test_secrets=$(grep -r -E "(api[_-]?key|secret|token|password).*[=:]\s*['\"][A-Za-z0-9+/=]{10,}['\"]" src --include="*.test.ts" --include="*-test.ts" --include="*-spec.ts" 2>/dev/null | wc -l || echo 0)
echo "Mock secrets in test files: $test_secrets (acceptable for testing)"

echo
echo "c) Error information leakage check:"
error_patterns=$(grep -r -E "(console\.error|console\.log|throw.*Error|error\.stack)" src --include="*.ts" --exclude="*.test.ts" 2>/dev/null | wc -l || echo 0)
echo "Error handling patterns found: $error_patterns (manual review needed for information leakage)"

echo

# 4. Architecture Compliance Validation
echo "4. ARCHITECTURE COMPLIANCE VALIDATION"
echo "====================================="

echo "a) Layer 1 dependency checks (checking for unauthorized Layer 2+ imports):"
unauthorized_imports=$(grep -r -E "import.*@cvplus/(auth|cv-processing|multimedia|analytics|premium|public-profiles|recommendations|admin|workflow)" src --include="*.ts" 2>/dev/null || true)

if [ -n "$unauthorized_imports" ]; then
    echo "VIOLATION: Unauthorized Layer 2+ dependencies found:"
    echo "$unauthorized_imports"
else
    echo "✓ No unauthorized Layer 2+ dependencies found"
fi

echo
echo "b) Allowed Layer 0 dependencies:"
allowed_imports=$(grep -r -E "import.*@cvplus/logging" src --include="*.ts" 2>/dev/null | wc -l || echo 0)
echo "Layer 0 (logging) imports found: $allowed_imports (expected and allowed)"

echo

# 5. Bundle Size and Performance Validation
echo "5. PERFORMANCE VALIDATION"
echo "========================"

if [ -d "dist" ]; then
    bundle_size=$(du -sh dist 2>/dev/null | cut -f1)
    echo "Current dist/ bundle size: $bundle_size"
    
    # Check if size exceeds typical limits
    bundle_size_mb=$(du -sm dist 2>/dev/null | cut -f1)
    if [ "$bundle_size_mb" -gt 10 ]; then
        echo "WARNING: Bundle size exceeds 10MB"
    fi
else
    echo "No dist/ directory found - run 'npm run build' to generate bundle"
fi

echo
echo "TypeScript files in src/:"
src_size=$(du -sh src 2>/dev/null | cut -f1)
echo "Source code size: $src_size"

# Count service files for scope analysis
service_count=$(find src/services -name "*.service.ts" 2>/dev/null | wc -l || echo 0)
echo "Total service files: $service_count"

echo
echo "=== VALIDATION COMPLETE ==="
echo "Check file_violations.txt for detailed file size violations"

# Final summary
echo
echo "CRITICAL ISSUES SUMMARY:"
echo "- File size violations: $violations_count files out of $total_files total"
echo "- Domain services in core: $service_count service files (check scope analysis above)"
if [ -n "$hardcoded_secrets" ]; then
    echo "- SECURITY CRITICAL: Hardcoded secrets found"
else
    echo "- Security: No hardcoded secrets in production code"
fi
if [ -n "$unauthorized_imports" ]; then
    echo "- ARCHITECTURE VIOLATION: Unauthorized dependencies found"
else
    echo "- Architecture: Layer compliance maintained"
fi