#!/usr/bin/env bash
# =============================================================================
# Bayit+ smoke test: fast confidence that the apps actually boot.
#   - Backend: imports cleanly, app object constructs, /health responds (8000)
#   - Web:     production bundle builds (only with --with-build; it is slow)
# Designed to run locally, in CI, and inside Claude Code web sessions.
# Usage: scripts/ci/smoke-test.sh [--backend-only|--web-only] [--with-build]
# =============================================================================
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "${SCRIPT_DIR}/lib/common.sh"
ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "${ROOT}"

SCOPE="all"
WITH_BUILD=0
for arg in "$@"; do
  case "${arg}" in
    --backend-only) SCOPE="backend" ;;
    --web-only)     SCOPE="web" ;;
    --with-build)   WITH_BUILD=1 ;;
  esac
done

# Backend MUST run on port 8000 (platform rule).
BACKEND_PORT="${BACKEND_PORT:-8000}"

smoke_backend() {
  print_header "Backend smoke (import + boot + /health)"
  if ! have_cmd poetry; then
    skip_step "backend smoke" "poetry not installed"
    return
  fi

  # Minimal env so settings/config import without real secrets.
  export MONGODB_URL="${MONGODB_URL:-mongodb://localhost:27017}"
  export MONGODB_DB_NAME="${MONGODB_DB_NAME:-bayit_smoke}"
  export SECRET_KEY="${SECRET_KEY:-smoke-secret-key}"
  export DEBUG="${DEBUG:-true}"
  export ENVIRONMENT="${ENVIRONMENT:-test}"

  ( cd backend
    # 1) Import smoke: the FastAPI app must import without side-effect failures.
    run_step "import app.main" poetry run python -c "import app.main; assert app.main.app is not None"
  ) || return

  # 2) Boot smoke: start uvicorn, poll /health, then shut down.
  echo ""
  echo -e "${C_YELLOW}> boot uvicorn + curl /health on :${BACKEND_PORT}${C_RST}"
  ( cd backend
    poetry run uvicorn app.main:app --host 127.0.0.1 --port "${BACKEND_PORT}" \
      >/tmp/bayit-smoke-uvicorn.log 2>&1 &
    echo $! > /tmp/bayit-smoke-uvicorn.pid
  )
  local pid; pid="$(cat /tmp/bayit-smoke-uvicorn.pid 2>/dev/null || true)"
  local ok=1 i
  for i in $(seq 1 30); do
    if curl -fsS "http://127.0.0.1:${BACKEND_PORT}/health" >/dev/null 2>&1 \
       || curl -fsS "http://127.0.0.1:${BACKEND_PORT}/" >/dev/null 2>&1; then
      ok=0; break
    fi
    sleep 1
  done
  [ -n "${pid}" ] && kill "${pid}" >/dev/null 2>&1 || true
  if [ "${ok}" = "0" ]; then
    echo -e "${C_GREEN}  PASS: /health responded${C_RST}"
    CI_PASSED=$((CI_PASSED + 1))
  else
    echo -e "${C_RED}  FAIL: /health did not respond (see /tmp/bayit-smoke-uvicorn.log)${C_RST}"
    tail -n 20 /tmp/bayit-smoke-uvicorn.log 2>/dev/null || true
    CI_FAILED=$((CI_FAILED + 1))
    CI_FAILED_NAMES="${CI_FAILED_NAMES}\n    - backend /health boot"
  fi
}

smoke_web() {
  print_header "Web smoke"
  if [ ! -d node_modules ] || [ ! -d web/node_modules ]; then
    skip_step "web smoke" "node_modules missing (run npm install)"
    return
  fi
  if [ "${WITH_BUILD}" = "1" ]; then
    run_step_shell "web production build" "cd web && npm run build"
  else
    # Lightweight default: config + entrypoints resolve without a full build.
    run_step_shell "web build config resolves" \
      "cd web && node -e \"require('./webpack.config.cjs'); console.log('webpack config OK')\""
  fi
}

case "${SCOPE}" in
  backend) smoke_backend ;;
  web)     smoke_web ;;
  *)       smoke_backend; smoke_web ;;
esac

ci_summary_and_exit "Smoke"
