#!/bin/bash
# Comprehensive validation script for fraud platform directory structure
# Validates path resolution, directory structure, and checks for hardcoded paths

set -e

echo "=========================================="
echo "Olorin Fraud Platform Structure Validation"
echo "=========================================="
echo ""

VALIDATION_FAILED=0

# Check root marker exists
echo "1. Checking root marker..."
if [ ! -f ".olorin-root" ]; then
    echo "   ❌ FAIL: Missing .olorin-root marker file"
    VALIDATION_FAILED=1
else
    echo "   ✅ PASS: Root marker exists"
fi

# Check fraud directories exist
echo ""
echo "2. Checking fraud directories..."
for dir in specs tests scripts lib; do
    if [ ! -d "fraud/$dir" ]; then
        echo "   ❌ FAIL: Missing directory: fraud/$dir"
        VALIDATION_FAILED=1
    else
        echo "   ✅ PASS: fraud/$dir exists"
    fi
done

# Check subtree exists
echo ""
echo "3. Checking olorin-fraud subtree..."
if [ ! -d "olorin-fraud/backend" ]; then
    echo "   ❌ FAIL: Missing olorin-fraud/backend"
    VALIDATION_FAILED=1
elif [ ! -d "olorin-fraud/frontend" ]; then
    echo "   ❌ FAIL: Missing olorin-fraud/frontend"
    VALIDATION_FAILED=1
else
    echo "   ✅ PASS: Subtree directories exist"
fi

# Check path resolution utilities exist
echo ""
echo "4. Checking path resolution utilities..."
if [ ! -f "scripts/common/paths.sh" ]; then
    echo "   ❌ FAIL: Missing scripts/common/paths.sh"
    VALIDATION_FAILED=1
else
    echo "   ✅ PASS: Shell paths utility exists"
fi

if [ ! -f "fraud/lib/paths.py" ]; then
    echo "   ❌ FAIL: Missing fraud/lib/paths.py"
    VALIDATION_FAILED=1
else
    echo "   ✅ PASS: Python paths utility exists"
fi

# Test shell path resolution
echo ""
echo "5. Testing shell path resolution..."
if source scripts/common/paths.sh 2>/dev/null; then
    if [ -z "$OLORIN_ROOT" ] || [ ! -d "$OLORIN_ROOT" ]; then
        echo "   ❌ FAIL: Shell path resolution failed (OLORIN_ROOT not set)"
        VALIDATION_FAILED=1
    else
        echo "   ✅ PASS: Shell paths resolved"
        echo "      OLORIN_ROOT=$OLORIN_ROOT"
        echo "      FRAUD_BACKEND=$FRAUD_BACKEND"
    fi
else
    echo "   ❌ FAIL: Could not source paths.sh"
    VALIDATION_FAILED=1
fi

# Test Python path resolution
echo ""
echo "6. Testing Python path resolution..."
if python3 -c "
import sys
sys.path.insert(0, 'fraud/lib')
from paths import OLORIN_ROOT, FRAUD_BACKEND
print(f'   ✅ PASS: Python paths resolved')
print(f'      OLORIN_ROOT={OLORIN_ROOT}')
print(f'      FRAUD_BACKEND={FRAUD_BACKEND}')
" 2>/dev/null; then
    true  # Success message printed by Python
else
    echo "   ❌ FAIL: Python path resolution failed"
    VALIDATION_FAILED=1
fi

# Check for remaining hardcoded paths in critical files
echo ""
echo "7. Checking for hardcoded paths in critical files..."
HARDCODED_FOUND=0

# Check cloudbuild.yaml
if grep -q "olorin-server" cloudbuild.yaml 2>/dev/null; then
    echo "   ❌ FAIL: cloudbuild.yaml still references olorin-server"
    HARDCODED_FOUND=1
    VALIDATION_FAILED=1
else
    echo "   ✅ PASS: cloudbuild.yaml paths correct"
fi

# Check firebase.json
if grep -E "olorin-front[^e]|olorin-server" firebase.json 2>/dev/null; then
    echo "   ❌ FAIL: firebase.json still references old paths"
    HARDCODED_FOUND=1
    VALIDATION_FAILED=1
else
    echo "   ✅ PASS: firebase.json paths correct"
fi

# Check development scripts
for script in scripts/development/start_olorin.sh \
              scripts/development/run-server.sh \
              scripts/development/run-frontend.sh; do
    if [ -f "$script" ]; then
        if grep -q "olorin-server\|olorin-front" "$script" 2>/dev/null; then
            # Allow if it's sourcing paths.sh (updated scripts)
            if ! grep -q "source.*paths.sh" "$script"; then
                echo "   ⚠️  WARN: $script may have hardcoded paths"
                HARDCODED_FOUND=1
            fi
        fi
    fi
done

if [ $HARDCODED_FOUND -eq 0 ]; then
    echo "   ✅ PASS: No hardcoded paths in critical files"
fi

# Check .gitattributes exists
echo ""
echo "8. Checking .gitattributes..."
if [ ! -f ".gitattributes" ]; then
    echo "   ❌ FAIL: Missing .gitattributes file"
    VALIDATION_FAILED=1
else
    echo "   ✅ PASS: .gitattributes exists"
fi

# Check documentation
echo ""
echo "9. Checking documentation..."
if [ ! -f "MONOREPO_STRUCTURE.md" ]; then
    echo "   ❌ FAIL: Missing MONOREPO_STRUCTURE.md"
    VALIDATION_FAILED=1
else
    echo "   ✅ PASS: MONOREPO_STRUCTURE.md exists"
fi

if [ ! -f "fraud/README.md" ]; then
    echo "   ❌ FAIL: Missing fraud/README.md"
    VALIDATION_FAILED=1
else
    echo "   ✅ PASS: fraud/README.md exists"
fi

# Final result
echo ""
echo "=========================================="
if [ $VALIDATION_FAILED -eq 0 ]; then
    echo "✅ ALL VALIDATIONS PASSED"
    echo "=========================================="
    exit 0
else
    echo "❌ VALIDATION FAILED"
    echo "=========================================="
    exit 1
fi
