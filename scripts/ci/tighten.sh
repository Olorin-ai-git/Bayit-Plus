#!/usr/bin/env bash
# =============================================================================
# Bayit+ tightening gate: static quality checks that need no running services.
#   - Backend: black --check, isort --check, mypy (advisory)
#   - JS/TS:   turbo lint, turbo type-check
#   - Platform rules: no emojis, no stray console.log in web/src, secret scan
#   - File-size guard for the design-system packages
# Tolerant of missing toolchains (skips with a warning) so it runs anywhere.
# Usage: scripts/ci/tighten.sh [--backend-only|--js-only|--rules-only]
# =============================================================================
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "${SCRIPT_DIR}/lib/common.sh"
ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "${ROOT}"

WHAT="${1:-all}"

run_backend() {
  print_header "Backend tightening (black / isort / mypy)"
  if ! have_cmd poetry; then
    skip_step "backend formatting/types" "poetry not installed"
    return
  fi
  ( cd backend
    run_step "black --check"      poetry run black --check app tests
    run_step "isort --check-only" poetry run isort --check-only app tests
    run_step "mypy (advisory)"    poetry run mypy app --ignore-missing-imports || true
  )
}

run_js() {
  print_header "JS/TS tightening (lint / type-check)"
  if [ ! -d node_modules ]; then
    skip_step "lint + type-check" "node_modules missing (run npm install)"
    return
  fi
  run_step "turbo lint"       npm run lint
  run_step "turbo type-check" npm run type-check
}

run_rules() {
  print_header "Platform rule checks"

  # Rule: no emojis anywhere in source (CLAUDE.md). Implemented in Python so the
  # full Unicode range (incl. astral plane) is matchable.
  if have_cmd python3; then
    run_step "no emojis in source" python3 "${SCRIPT_DIR}/lib/check_no_emoji.py"
  else
    skip_step "no emojis in source" "python3 not installed"
  fi

  # Rule: no stray console.log in web/src (non-test). Scoped logger only.
  # Excludes markdown and comment lines (// , * , /*) so JSDoc/examples don't trip it.
  run_step_shell "no console.log in web/src" \
    "! git grep -nP 'console\\.log' -- 'web/src/**' \
        ':(exclude)web/src/**/*.test.*' ':(exclude)web/src/**/*.spec.*' \
        ':(exclude)web/src/**/__tests__/**' ':(exclude)web/src/**/*.md' \
      | grep -vP ':[0-9]+:\\s*(//|\\*|/\\*)' | grep . "

  # Secret scan (advisory unless gitleaks present). The repo ships .gitleaks.toml.
  if have_cmd gitleaks; then
    run_step "gitleaks (no leaks)" gitleaks detect --no-banner --redact -c .gitleaks.toml
  else
    skip_step "gitleaks secret scan" "gitleaks not installed (dedicated security-scan.yml covers CI)"
  fi

  # Note: the glass-components 200-line file-size guard is owned by the
  # dedicated pr-validation.yml job and is intentionally not duplicated here.
}

case "${WHAT}" in
  --backend-only) run_backend ;;
  --js-only)      run_js ;;
  --rules-only)   run_rules ;;
  all|*)          run_backend; run_js; run_rules ;;
esac

ci_summary_and_exit "Tightening"
