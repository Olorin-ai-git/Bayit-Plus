# =============================================================================
# Shared helpers for the Bayit+ CI / tightening / smoke battery
# Source this file: . "$(dirname "$0")/lib/common.sh"
# No emojis anywhere (platform rule). Status markers are plain ASCII.
# =============================================================================

# Colors (disabled when not a TTY or NO_COLOR is set)
if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
  C_RED='\033[0;31m'; C_GREEN='\033[0;32m'; C_YELLOW='\033[1;33m'
  C_BLUE='\033[0;34m'; C_DIM='\033[2m'; C_RST='\033[0m'
else
  C_RED=''; C_GREEN=''; C_YELLOW=''; C_BLUE=''; C_DIM=''; C_RST=''
fi

# Phase counters
CI_PASSED=0
CI_FAILED=0
CI_SKIPPED=0
CI_FAILED_NAMES=""

# STRICT=1 -> a failed step makes the whole battery exit non-zero.
# STRICT=0 -> steps still report PASS/FAIL but the battery exits 0 (advisory).
STRICT="${STRICT:-1}"

# Resolve the repo root regardless of where the script was invoked from.
ci_repo_root() {
  git -C "$(dirname "${BASH_SOURCE[0]}")" rev-parse --show-toplevel 2>/dev/null \
    || cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd
}

print_header() {
  echo ""
  echo -e "${C_BLUE}============================================================${C_RST}"
  echo -e "${C_BLUE}  $1${C_RST}"
  echo -e "${C_BLUE}============================================================${C_RST}"
}

log_info()  { echo -e "${C_DIM}  $*${C_RST}"; }
log_warn()  { echo -e "${C_YELLOW}  WARN: $*${C_RST}"; }

have_cmd() { command -v "$1" >/dev/null 2>&1; }

# run_step NAME COMMAND...
# Runs a command, records PASS/FAIL. Honors STRICT only at battery exit.
run_step() {
  local name="$1"; shift
  echo ""
  echo -e "${C_YELLOW}> ${name}${C_RST}"
  echo -e "${C_DIM}  \$ $*${C_RST}"
  if "$@"; then
    echo -e "${C_GREEN}  PASS: ${name}${C_RST}"
    CI_PASSED=$((CI_PASSED + 1))
    return 0
  else
    echo -e "${C_RED}  FAIL: ${name}${C_RST}"
    CI_FAILED=$((CI_FAILED + 1))
    CI_FAILED_NAMES="${CI_FAILED_NAMES}\n    - ${name}"
    return 1
  fi
}

# run_step_shell NAME "shell string" — for pipelines / globs that need a shell.
run_step_shell() {
  local name="$1"; local cmd="$2"
  echo ""
  echo -e "${C_YELLOW}> ${name}${C_RST}"
  echo -e "${C_DIM}  \$ ${cmd}${C_RST}"
  if bash -c "${cmd}"; then
    echo -e "${C_GREEN}  PASS: ${name}${C_RST}"
    CI_PASSED=$((CI_PASSED + 1))
    return 0
  else
    echo -e "${C_RED}  FAIL: ${name}${C_RST}"
    CI_FAILED=$((CI_FAILED + 1))
    CI_FAILED_NAMES="${CI_FAILED_NAMES}\n    - ${name}"
    return 1
  fi
}

skip_step() {
  local name="$1"; local reason="$2"
  echo ""
  echo -e "${C_DIM}> SKIP: ${name} (${reason})${C_RST}"
  CI_SKIPPED=$((CI_SKIPPED + 1))
}

# Print a final summary and exit with the right code.
ci_summary_and_exit() {
  local title="${1:-Battery}"
  local total=$((CI_PASSED + CI_FAILED))
  print_header "${title} Summary"
  echo -e "  Total run : ${total}"
  echo -e "  ${C_GREEN}Passed    : ${CI_PASSED}${C_RST}"
  echo -e "  ${C_RED}Failed    : ${CI_FAILED}${C_RST}"
  echo -e "  ${C_DIM}Skipped   : ${CI_SKIPPED}${C_RST}"
  if [ "${CI_FAILED}" -gt 0 ]; then
    echo -e "${C_RED}  Failures:${C_RST}${CI_FAILED_NAMES}"
    if [ "${STRICT}" = "1" ]; then
      echo -e "${C_RED}  Result: FAIL${C_RST}"
      exit 1
    fi
    echo -e "${C_YELLOW}  Result: FAIL (advisory, STRICT=0 -> exit 0)${C_RST}"
    exit 0
  fi
  echo -e "${C_GREEN}  Result: PASS${C_RST}"
  exit 0
}
