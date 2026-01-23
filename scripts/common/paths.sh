#!/bin/bash
# Standard path resolution for all Olorin scripts with fail-fast validation
# Part of fraud platform reorganization
# Security: Prevents path traversal (CWE-59, CWE-61) via marker-based detection

# SECURITY: Reliable root detection using marker file
get_olorin_root() {
    # Try from current working directory first
    local current_dir="$(pwd)"

    # Search upward for .olorin-root marker
    while [[ "$current_dir" != "/" ]]; do
        if [[ -f "$current_dir/.olorin-root" ]]; then
            echo "$current_dir"
            return 0
        fi
        current_dir="$(dirname "$current_dir")"
    done

    # Try from script location as fallback
    if [[ -n "${BASH_SOURCE[0]}" ]]; then
        current_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
        if [[ -f "$current_dir/.olorin-root" ]]; then
            echo "$current_dir"
            return 0
        fi
    fi

    echo "ERROR: .olorin-root marker not found. Are you in the Olorin monorepo?" >&2
    return 1
}

# Get and validate root
OLORIN_ROOT="${OLORIN_ROOT:-$(get_olorin_root)}"
if [[ -z "$OLORIN_ROOT" ]] || [[ ! -d "$OLORIN_ROOT" ]]; then
    echo "FATAL: Could not resolve OLORIN_ROOT" >&2
    exit 1
fi

# Validate critical directories exist
if [[ ! -d "$OLORIN_ROOT/olorin-fraud" ]]; then
    echo "FATAL: $OLORIN_ROOT/olorin-fraud not found" >&2
    echo "Current OLORIN_ROOT: $OLORIN_ROOT" >&2
    exit 1
fi

# Export validated paths
export OLORIN_ROOT
export FRAUD_ROOT="$OLORIN_ROOT/olorin-fraud"
export FRAUD_BACKEND="$FRAUD_ROOT/backend"
export FRAUD_FRONTEND="$FRAUD_ROOT/frontend"
export FRAUD_SPECS="$OLORIN_ROOT/fraud/specs"
export FRAUD_TESTS="$OLORIN_ROOT/fraud/tests"
export FRAUD_SCRIPTS="$OLORIN_ROOT/fraud/scripts"

# Media platform paths
export MEDIA_ROOT="$OLORIN_ROOT/olorin-media"
export BAYIT_PLUS_ROOT="$MEDIA_ROOT/bayit-plus"

# CV platform paths
export CV_ROOT="$OLORIN_ROOT/olorin-cv"
export CVPLUS_ROOT="$CV_ROOT/cvplus"

# Portals
export PORTALS_ROOT="$OLORIN_ROOT/olorin-portals"

# Add CI/CD validation
if [[ -n "$CI" ]]; then
    echo "CI Mode: Validating paths..."
    for path in "$FRAUD_BACKEND" "$FRAUD_FRONTEND" "$FRAUD_SPECS" "$FRAUD_TESTS"; do
        if [[ ! -d "$path" ]]; then
            echo "FATAL: Required path missing: $path" >&2
            exit 1
        fi
    done
    echo "✅ All required paths validated"
fi

# Success indicator
if [[ -z "$CI" ]]; then
    echo "✅ Olorin paths initialized (OLORIN_ROOT: $OLORIN_ROOT)"
fi
