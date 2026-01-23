#!/bin/bash

###############################################################################
# Olorin Ecosystem - Development Servers Stop Script
#
# This script stops all running Olorin development servers by killing processes
# on known ports and cleaning up PID tracking.
#
# Usage:
#   ./scripts/dev-servers-stop.sh [OPTIONS]
#
# Options:
#   --force          Force kill all processes (SIGKILL instead of SIGTERM)
#   --ports          Kill by ports instead of PIDs
#   --all            Kill everything on all Olorin ports (nuclear option)
#   --verbose        Enable verbose logging
#
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$ROOT_DIR/logs"

# Options
FORCE=false
BY_PORTS=false
KILL_ALL=false
VERBOSE=false

# All Olorin ports
FRONTEND_PORTS=(3000 3001 3002 3003 3004 3005 3006 3007 3008 3009 3100 3200 3201 3211 3301 3302 3303 3304 3305)
BACKEND_PORTS=(5001 8000 8001 8080 8090 8180)
ALL_PORTS=("${FRONTEND_PORTS[@]}" "${BACKEND_PORTS[@]}")

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --force)
      FORCE=true
      shift
      ;;
    --ports)
      BY_PORTS=true
      shift
      ;;
    --all)
      KILL_ALL=true
      BY_PORTS=true
      shift
      ;;
    --verbose)
      VERBOSE=true
      shift
      ;;
    -h|--help)
      head -n 20 "$0" | tail -n 18
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

###############################################################################
# Helper Functions
###############################################################################

log() {
  local message="$1"
  echo -e "${CYAN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $message"
}

log_success() {
  local message="$1"
  echo -e "${GREEN}✓${NC} $message"
}

log_error() {
  local message="$1"
  echo -e "${RED}✗${NC} $message"
}

log_warning() {
  local message="$1"
  echo -e "${YELLOW}⚠${NC} $message"
}

log_info() {
  local message="$1"
  echo -e "${BLUE}ℹ${NC} $message"
}

# Check if port is in use
is_port_in_use() {
  local port=$1
  lsof -ti:$port > /dev/null 2>&1
}

# Get process info for port
get_port_info() {
  local port=$1
  lsof -ti:$port 2>/dev/null | while read pid; do
    local cmd=$(ps -p $pid -o comm= 2>/dev/null || echo "unknown")
    echo "$pid ($cmd)"
  done
}

# Kill process on port
kill_port() {
  local port=$1

  if ! is_port_in_use $port; then
    if [ "$VERBOSE" = true ]; then
      log_info "Port $port is not in use"
    fi
    return 0
  fi

  local pids=$(lsof -ti:$port 2>/dev/null)

  if [ -z "$pids" ]; then
    return 0
  fi

  log "Killing processes on port $port..."

  if [ "$VERBOSE" = true ]; then
    for pid in $pids; do
      local cmd=$(ps -p $pid -o comm= 2>/dev/null || echo "unknown")
      log_info "  PID: $pid ($cmd)"
    done
  fi

  if [ "$FORCE" = true ]; then
    echo "$pids" | xargs kill -9 2>/dev/null || true
  else
    echo "$pids" | xargs kill -15 2>/dev/null || true
    sleep 1
    # Force kill if still running
    if is_port_in_use $port; then
      echo "$pids" | xargs kill -9 2>/dev/null || true
    fi
  fi

  sleep 0.5

  if is_port_in_use $port; then
    log_error "Failed to kill process on port $port"
    return 1
  else
    log_success "Killed processes on port $port"
  fi

  return 0
}

# Kill process by PID
kill_pid() {
  local pid=$1
  local name=$2

  if ! ps -p $pid > /dev/null 2>&1; then
    if [ "$VERBOSE" = true ]; then
      log_info "$name (PID: $pid) is not running"
    fi
    return 0
  fi

  log "Stopping $name (PID: $pid)..."

  if [ "$FORCE" = true ]; then
    kill -9 $pid 2>/dev/null || true
  else
    kill -15 $pid 2>/dev/null || true
    sleep 1
    # Force kill if still running
    if ps -p $pid > /dev/null 2>&1; then
      kill -9 $pid 2>/dev/null || true
    fi
  fi

  sleep 0.5

  if ps -p $pid > /dev/null 2>&1; then
    log_error "Failed to kill $name (PID: $pid)"
    return 1
  else
    log_success "Stopped $name"
  fi

  return 0
}

###############################################################################
# Main Script
###############################################################################

echo ""
log "${PURPLE}╔════════════════════════════════════════════════════════════╗${NC}"
log "${PURPLE}║   Olorin Ecosystem - Development Servers Stop             ║${NC}"
log "${PURPLE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

KILLED_COUNT=0
FAILED_COUNT=0

###############################################################################
# Method 1: Kill by PIDs (from tracking file)
###############################################################################

if [ "$BY_PORTS" = false ] && [ -f "$LOG_DIR/dev-servers.pids" ]; then
  log "${PURPLE}━━━ Stopping tracked services ━━━${NC}"

  while IFS=: read -r pid port name; do
    if kill_pid "$pid" "$name"; then
      ((KILLED_COUNT++))
    else
      ((FAILED_COUNT++))
    fi
  done < "$LOG_DIR/dev-servers.pids"

  # Clean up PID file
  rm -f "$LOG_DIR/dev-servers.pids"

  echo ""
fi

###############################################################################
# Method 2: Kill by ports (brute force)
###############################################################################

if [ "$BY_PORTS" = true ] || [ "$KILL_ALL" = true ]; then
  log "${PURPLE}━━━ Killing processes by port ━━━${NC}"

  for port in "${ALL_PORTS[@]}"; do
    if is_port_in_use $port; then
      if [ "$VERBOSE" = true ]; then
        local info=$(get_port_info $port)
        log_info "Port $port in use by: $info"
      fi

      if kill_port $port; then
        ((KILLED_COUNT++))
      else
        ((FAILED_COUNT++))
      fi
    fi
  done

  echo ""
fi

###############################################################################
# Method 3: Nuclear option - kill all node/python processes
###############################################################################

if [ "$KILL_ALL" = true ]; then
  log_warning "${PURPLE}━━━ Nuclear option: Killing all dev processes ━━━${NC}"

  # Kill all node processes
  if pgrep -f "node.*vite\|webpack-dev-server\|react-scripts" > /dev/null; then
    log "Killing all Node.js dev servers..."
    pkill -9 -f "node.*vite\|webpack-dev-server\|react-scripts" 2>/dev/null || true
    log_success "Killed Node.js dev servers"
    ((KILLED_COUNT++))
  fi

  # Kill all python uvicorn processes
  if pgrep -f "uvicorn" > /dev/null; then
    log "Killing all Python uvicorn servers..."
    pkill -9 -f "uvicorn" 2>/dev/null || true
    log_success "Killed Python uvicorn servers"
    ((KILLED_COUNT++))
  fi

  echo ""
fi

###############################################################################
# Verify all ports are clear
###############################################################################

log "${PURPLE}━━━ Verifying ports are clear ━━━${NC}"

STILL_IN_USE=()

for port in "${ALL_PORTS[@]}"; do
  if is_port_in_use $port; then
    STILL_IN_USE+=($port)
    log_warning "Port $port is still in use"
    if [ "$VERBOSE" = true ]; then
      local info=$(get_port_info $port)
      log_info "  $info"
    fi
  fi
done

echo ""

###############################################################################
# Summary
###############################################################################

log "${PURPLE}╔════════════════════════════════════════════════════════════╗${NC}"
log "${PURPLE}║   Stop Summary                                             ║${NC}"
log "${PURPLE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

log_success "Stopped services: $KILLED_COUNT"

if [ $FAILED_COUNT -gt 0 ]; then
  log_error "Failed to stop: $FAILED_COUNT"
fi

if [ ${#STILL_IN_USE[@]} -gt 0 ]; then
  log_warning "Ports still in use: ${STILL_IN_USE[@]}"
  echo ""
  log_info "Try running with --all to force kill everything"
  exit 1
else
  log_success "All ports are clear"
fi

echo ""

# Exit with error if any failures
if [ $FAILED_COUNT -gt 0 ] || [ ${#STILL_IN_USE[@]} -gt 0 ]; then
  exit 1
fi

exit 0
