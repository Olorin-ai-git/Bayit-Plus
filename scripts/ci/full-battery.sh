#!/usr/bin/env bash
# =============================================================================
# Bayit+ full battery: the single entrypoint for codebase-wide tightening,
# the full test suite, and smoke tests. Used by developers, the SessionStart
# hook docs, and the full-battery GitHub Actions workflow.
#
# Phases (run all by default):
#   tighten   black/isort/mypy + lint + type-check + platform-rule checks
#   backend   pytest with coverage (MongoDB-backed)
#   web       jest unit/integration tests
#   e2e       Playwright end-to-end suite
#   smoke     backend boot + /health, web build sanity
#
# Usage:
#   scripts/ci/full-battery.sh                 # everything
#   scripts/ci/full-battery.sh tighten smoke   # selected phases
#   STRICT=0 scripts/ci/full-battery.sh        # advisory mode (always exit 0)
#   scripts/ci/full-battery.sh --list          # list phases
# Env:
#   COV_FAIL_UNDER  backend coverage gate (default 80)
#   WEB_COVERAGE=1  run web tests with --coverage
#   SMOKE_BUILD=1   include the (slow) web production build in smoke
# =============================================================================
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "${SCRIPT_DIR}/lib/common.sh"
ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "${ROOT}"

ALL_PHASES="tighten backend web e2e smoke"
COV_FAIL_UNDER="${COV_FAIL_UNDER:-80}"

if [ "${1:-}" = "--list" ]; then
  echo "Available phases: ${ALL_PHASES}"
  exit 0
fi

PHASES="$*"
[ -z "${PHASES}" ] && PHASES="${ALL_PHASES}"

has_phase() { case " ${PHASES} " in *" $1 "*) return 0 ;; *) return 1 ;; esac; }

phase_tighten() {
  # tighten.sh maintains its own counters; bridge its result into ours.
  if STRICT=1 "${SCRIPT_DIR}/tighten.sh"; then
    CI_PASSED=$((CI_PASSED + 1))
    echo -e "${C_GREEN}  PASS: tightening phase${C_RST}"
  else
    CI_FAILED=$((CI_FAILED + 1))
    CI_FAILED_NAMES="${CI_FAILED_NAMES}\n    - tightening phase"
    echo -e "${C_RED}  FAIL: tightening phase${C_RST}"
  fi
}

phase_backend() {
  print_header "Backend tests (pytest + coverage)"
  if ! have_cmd poetry; then
    skip_step "backend pytest" "poetry not installed"
    return
  fi
  export MONGODB_URI="${MONGODB_URI:-mongodb://localhost:27017}"
  export MONGODB_DB_NAME="${MONGODB_DB_NAME:-bayit_test}"
  export SECRET_KEY="${SECRET_KEY:-$(python3 -c 'import secrets; print(secrets.token_urlsafe(32))')}"
  export DEBUG="${DEBUG:-true}"
  export ENVIRONMENT="${ENVIRONMENT:-test}"
  ( cd backend
    run_step "pytest (cov-fail-under=${COV_FAIL_UNDER})" \
      poetry run pytest tests/ -m "not e2e and not google_api" \
        --cov=app --cov-report=term-missing \
        --cov-fail-under="${COV_FAIL_UNDER}" --tb=short -q
  )
}

phase_web() {
  print_header "Web tests (jest)"
  if [ ! -d node_modules ]; then
    skip_step "web jest" "node_modules missing (run npm install)"
    return
  fi
  if [ "${WEB_COVERAGE:-0}" = "1" ]; then
    run_step_shell "web jest --coverage" "cd web && CI=1 npm run test:coverage"
  else
    run_step_shell "web jest" "cd web && CI=1 npm test"
  fi
}

phase_e2e() {
  print_header "End-to-end tests (Playwright)"
  if [ ! -d web/node_modules ]; then
    skip_step "playwright e2e" "web node_modules missing"
    return
  fi
  if [ ! -d web/node_modules/@playwright ] && [ ! -d node_modules/@playwright ]; then
    skip_step "playwright e2e" "playwright not installed"
    return
  fi
  # Browsers must be present; CI installs them explicitly.
  run_step_shell "playwright e2e" \
    "cd web && npx playwright test --config=playwright.e2e.config.ts"
}

phase_smoke() {
  local args=()
  [ "${SMOKE_BUILD:-0}" = "1" ] && args+=("--with-build")
  if "${SCRIPT_DIR}/smoke-test.sh" "${args[@]}"; then
    CI_PASSED=$((CI_PASSED + 1))
    echo -e "${C_GREEN}  PASS: smoke phase${C_RST}"
  else
    CI_FAILED=$((CI_FAILED + 1))
    CI_FAILED_NAMES="${CI_FAILED_NAMES}\n    - smoke phase"
    echo -e "${C_RED}  FAIL: smoke phase${C_RST}"
  fi
}

print_header "Bayit+ Full Battery"
echo "  Phases : ${PHASES}"
echo "  Strict : ${STRICT}"
echo "  Root   : ${ROOT}"

has_phase tighten && phase_tighten
has_phase backend && phase_backend
has_phase web     && phase_web
has_phase e2e     && phase_e2e
has_phase smoke   && phase_smoke

ci_summary_and_exit "Full Battery"
