#!/bin/bash

# Pre-commit hook for specification integrity verification
# Install with: ln -sf ../../scripts/verification/pre-commit-hook.sh .git/hooks/pre-commit

set -euo pipefail

PROJECT_ROOT="$(git rev-parse --show-toplevel)"
VERIFICATION_SCRIPT="$PROJECT_ROOT/scripts/verification/verify-integrity.sh"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo_info() { echo -e "${BLUE}[PRE-COMMIT]${NC} $1"; }
echo_success() { echo -e "${GREEN}[PRE-COMMIT]${NC} $1"; }
echo_warning() { echo -e "${YELLOW}[PRE-COMMIT]${NC} $1"; }
echo_error() { echo -e "${RED}[PRE-COMMIT]${NC} $1"; }

# Check if this is a specification-related commit
check_spec_changes() {
    local changed_files
    changed_files=$(git diff --cached --name-only)

    # Check if any specification-related files are changed
    if echo "$changed_files" | grep -qE '^(specs/|packages/.*\.(ts|js|yaml|yml)|functions/.*\.(ts|js)|frontend/.*\.(ts|tsx|js|jsx))'; then
        return 0  # Spec-related changes detected
    else
        return 1  # No spec-related changes
    fi
}

# Run quick verification
run_verification() {
    echo_info "Running specification integrity verification..."

    if [ ! -f "$VERIFICATION_SCRIPT" ]; then
        echo_warning "Verification script not found at $VERIFICATION_SCRIPT"
        echo_warning "Skipping integrity verification"
        return 0
    fi

    # Run quick verification without cache for fresh results
    if "$VERIFICATION_SCRIPT" run quick false > /dev/null 2>&1; then
        echo_success "Specification integrity verification passed"
        return 0
    else
        echo_error "Specification integrity verification failed!"
        echo_error "Run './scripts/verification/verify-integrity.sh run' for details"
        return 1
    fi
}

# Main execution
main() {
    echo_info "Checking for specification changes..."

    if check_spec_changes; then
        echo_info "Specification-related changes detected"

        # Allow bypassing with SKIP_INTEGRITY_CHECK environment variable
        if [ "${SKIP_INTEGRITY_CHECK:-}" = "true" ]; then
            echo_warning "Skipping integrity verification (SKIP_INTEGRITY_CHECK=true)"
            return 0
        fi

        # Run verification
        if ! run_verification; then
            echo ""
            echo_error "Commit blocked due to specification integrity issues"
            echo_error "To bypass: SKIP_INTEGRITY_CHECK=true git commit"
            echo_error "To debug: ./scripts/verification/verify-integrity.sh run"
            echo ""
            exit 1
        fi
    else
        echo_info "No specification changes detected, skipping verification"
    fi

    echo_success "Pre-commit checks passed"
}

# Run main function
main "$@"