#!/bin/bash
# =============================================================================
# Bayit+ SessionStart hook
# Installs backend (Poetry) and JS (npm) dependencies so the full test/tighten/
# smoke battery can run inside Claude Code web sessions. Synchronous by design:
# guarantees deps are ready before the agent starts (no race on tests/linters).
# Idempotent and non-interactive.
# =============================================================================
set -euo pipefail

# Only do heavy installs in the remote (web) environment.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  echo "session-start: not a remote session, skipping dependency install"
  exit 0
fi

ROOT="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
cd "${ROOT}"

echo "session-start: installing JS workspace dependencies (npm install)"
if command -v npm >/dev/null 2>&1; then
  npm install --no-audit --no-fund || echo "session-start: npm install reported errors (continuing)"
else
  echo "session-start: npm not found, skipping JS deps"
fi

echo "session-start: installing backend dependencies (poetry install)"
if command -v poetry >/dev/null 2>&1; then
  ( cd backend && poetry install --no-interaction --no-root ) \
    || echo "session-start: poetry install reported errors (continuing)"
else
  echo "session-start: poetry not found, skipping backend deps"
fi

# Persist sensible defaults for the session so the battery can run.
if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  {
    echo 'export BACKEND_PORT="8000"'
    echo 'export MONGODB_DB_NAME="bayit_test"'
    echo 'export ENVIRONMENT="test"'
  } >> "${CLAUDE_ENV_FILE}"
fi

echo "session-start: done. Run 'scripts/ci/full-battery.sh' to exercise the codebase."
