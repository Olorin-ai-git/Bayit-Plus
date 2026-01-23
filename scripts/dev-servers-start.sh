#!/bin/bash

###############################################################################
# Olorin Ecosystem - Development Servers Startup Script
#
# This script starts all Olorin development servers with proper port allocation
# and automatic port conflict resolution.
#
# Usage:
#   ./scripts/dev-servers-start.sh [OPTIONS]
#
# Options:
#   --fraud          Start only Fraud Detection services
#   --cv             Start only CVPlus services
#   --media          Start only Media services (Bayit+, Israeli Radio)
#   --portals        Start only Portal services
#   --all            Start all services (default)
#   --kill-first     Kill existing processes on ports before starting
#   --verbose        Enable verbose logging
#
# Port Allocation:
#   Fraud Detection:  3000-3009 (frontend microservices), 8090 (backend)
#   CVPlus:           3100 (frontend), 8180 (backend)
#   Bayit+:           3200 (web), 8000 (backend)
#   Israeli Radio:    3201 (frontend), 8001 (backend)
#   Portals:          3301-3305 (fraud, streaming, radio, omen, main)
#
###############################################################################

set -e  # Exit on error

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

# Log file
LOG_DIR="$ROOT_DIR/logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/dev-servers-$(date +%Y%m%d-%H%M%S).log"

# Options
KILL_FIRST=false
VERBOSE=false
START_FRAUD=false
START_CV=false
START_MEDIA=false
START_PORTALS=false
START_ALL=true

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --fraud)
      START_FRAUD=true
      START_ALL=false
      shift
      ;;
    --cv)
      START_CV=true
      START_ALL=false
      shift
      ;;
    --media)
      START_MEDIA=true
      START_ALL=false
      shift
      ;;
    --portals)
      START_PORTALS=true
      START_ALL=false
      shift
      ;;
    --all)
      START_ALL=true
      shift
      ;;
    --kill-first)
      KILL_FIRST=true
      shift
      ;;
    --verbose)
      VERBOSE=true
      shift
      ;;
    -h|--help)
      head -n 30 "$0" | tail -n 28
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

# If --all is set, enable all services
if [ "$START_ALL" = true ]; then
  START_FRAUD=true
  START_CV=true
  START_MEDIA=true
  START_PORTALS=true
fi

###############################################################################
# Helper Functions
###############################################################################

log() {
  local message="$1"
  echo -e "${CYAN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $message" | tee -a "$LOG_FILE"
}

log_success() {
  local message="$1"
  echo -e "${GREEN}✓${NC} $message" | tee -a "$LOG_FILE"
}

log_error() {
  local message="$1"
  echo -e "${RED}✗${NC} $message" | tee -a "$LOG_FILE"
}

log_warning() {
  local message="$1"
  echo -e "${YELLOW}⚠${NC} $message" | tee -a "$LOG_FILE"
}

log_info() {
  local message="$1"
  echo -e "${BLUE}ℹ${NC} $message" | tee -a "$LOG_FILE"
}

# Check if port is in use
is_port_in_use() {
  local port=$1
  lsof -ti:$port > /dev/null 2>&1
}

# Kill process on port
kill_port() {
  local port=$1
  local process_name=$2

  if is_port_in_use $port; then
    log_warning "Port $port is in use by $process_name. Killing process..."
    lsof -ti:$port | xargs kill -9 2>/dev/null || true
    sleep 1

    if is_port_in_use $port; then
      log_error "Failed to kill process on port $port"
      return 1
    else
      log_success "Killed process on port $port"
    fi
  fi
  return 0
}

# Start a service in the background
start_service() {
  local service_name=$1
  local port=$2
  local directory=$3
  local command=$4

  log "Starting $service_name on port $port..."

  # Check if port is in use
  if is_port_in_use $port; then
    if [ "$KILL_FIRST" = true ]; then
      kill_port $port "$service_name"
    else
      log_error "$service_name: Port $port is already in use. Use --kill-first to force kill."
      return 1
    fi
  fi

  # Check if directory exists
  if [ ! -d "$directory" ]; then
    log_error "$service_name: Directory not found: $directory"
    return 1
  fi

  # Start service
  cd "$directory"

  if [ "$VERBOSE" = true ]; then
    log_info "Running: cd $directory && $command"
    eval "$command" > "$LOG_DIR/${service_name}.log" 2>&1 &
  else
    eval "$command" > "$LOG_DIR/${service_name}.log" 2>&1 &
  fi

  local pid=$!

  # Wait a moment to check if process started successfully
  sleep 2

  if ps -p $pid > /dev/null; then
    log_success "$service_name started (PID: $pid, Port: $port)"
    echo "$pid:$port:$service_name" >> "$LOG_DIR/dev-servers.pids"
    return 0
  else
    log_error "$service_name failed to start. Check $LOG_DIR/${service_name}.log"
    return 1
  fi
}

###############################################################################
# Main Script
###############################################################################

echo ""
log "${PURPLE}╔════════════════════════════════════════════════════════════╗${NC}"
log "${PURPLE}║   Olorin Ecosystem - Development Servers Startup          ║${NC}"
log "${PURPLE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Clean up old PID file
rm -f "$LOG_DIR/dev-servers.pids"

# Track failures
FAILED_SERVICES=()

###############################################################################
# Olorin Fraud Detection (10 microservices + backend)
###############################################################################

if [ "$START_FRAUD" = true ]; then
  log "${PURPLE}━━━ Olorin Fraud Detection ━━━${NC}"

  # Backend
  start_service "fraud-backend" 8090 "$ROOT_DIR/olorin-fraud/backend" \
    "poetry run python -m app.local_server" || FAILED_SERVICES+=("fraud-backend")

  # Frontend microservices
  cd "$ROOT_DIR/olorin-fraud/frontend"

  start_service "fraud-shell" 3000 "$ROOT_DIR/olorin-fraud/frontend" \
    "npm run start:shell" || FAILED_SERVICES+=("fraud-shell")

  start_service "fraud-investigation" 3001 "$ROOT_DIR/olorin-fraud/frontend" \
    "npm run start:investigation" || FAILED_SERVICES+=("fraud-investigation")

  start_service "fraud-analytics" 3002 "$ROOT_DIR/olorin-fraud/frontend" \
    "npm run start:agent-analytics" || FAILED_SERVICES+=("fraud-analytics")

  start_service "fraud-rag" 3003 "$ROOT_DIR/olorin-fraud/frontend" \
    "npm run start:rag-intelligence" || FAILED_SERVICES+=("fraud-rag")

  start_service "fraud-visualization" 3004 "$ROOT_DIR/olorin-fraud/frontend" \
    "npm run start:visualization" || FAILED_SERVICES+=("fraud-visualization")

  start_service "fraud-reporting" 3005 "$ROOT_DIR/olorin-fraud/frontend" \
    "npm run start:reporting" || FAILED_SERVICES+=("fraud-reporting")

  start_service "fraud-core-ui" 3006 "$ROOT_DIR/olorin-fraud/frontend" \
    "npm run start:core-ui" || FAILED_SERVICES+=("fraud-core-ui")

  start_service "fraud-design-system" 3007 "$ROOT_DIR/olorin-fraud/frontend" \
    "npm run start:design-system" || FAILED_SERVICES+=("fraud-design-system")

  start_service "fraud-investigations-mgmt" 3008 "$ROOT_DIR/olorin-fraud/frontend" \
    "npm run start:investigations-management" || FAILED_SERVICES+=("fraud-investigations-mgmt")

  start_service "fraud-financial" 3009 "$ROOT_DIR/olorin-fraud/frontend" \
    "npm run start:financial-analysis" || FAILED_SERVICES+=("fraud-financial")

  echo ""
fi

###############################################################################
# Olorin CVPlus
###############################################################################

if [ "$START_CV" = true ]; then
  log "${PURPLE}━━━ Olorin CVPlus ━━━${NC}"

  # Backend
  start_service "cvplus-backend" 8180 "$ROOT_DIR/olorin-cv/cvplus/python-backend" \
    "poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port 8180" || FAILED_SERVICES+=("cvplus-backend")

  # Frontend
  start_service "cvplus-frontend" 3100 "$ROOT_DIR/olorin-cv/cvplus/frontend" \
    "npm run dev" || FAILED_SERVICES+=("cvplus-frontend")

  echo ""
fi

###############################################################################
# Olorin Media (Bayit+ and Israeli Radio Manager)
###############################################################################

if [ "$START_MEDIA" = true ]; then
  log "${PURPLE}━━━ Olorin Media ━━━${NC}"

  # Bayit+ Backend
  start_service "bayit-backend" 8000 "$ROOT_DIR/olorin-media/bayit-plus/backend" \
    "poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000" || FAILED_SERVICES+=("bayit-backend")

  # Bayit+ Web
  start_service "bayit-web" 3200 "$ROOT_DIR/olorin-media/bayit-plus/web" \
    "npm run dev" || FAILED_SERVICES+=("bayit-web")

  # Israeli Radio Backend (if exists)
  if [ -d "$ROOT_DIR/olorin-media/israeli-radio-manager/backend" ]; then
    start_service "radio-backend" 8001 "$ROOT_DIR/olorin-media/israeli-radio-manager/backend" \
      "poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port 8001" || FAILED_SERVICES+=("radio-backend")
  fi

  # Israeli Radio Frontend (if exists)
  if [ -d "$ROOT_DIR/olorin-media/israeli-radio-manager/frontend" ]; then
    start_service "radio-frontend" 3201 "$ROOT_DIR/olorin-media/israeli-radio-manager/frontend" \
      "npm run dev" || FAILED_SERVICES+=("radio-frontend")
  fi

  echo ""
fi

###############################################################################
# Olorin Portals
###############################################################################

if [ "$START_PORTALS" = true ]; then
  log "${PURPLE}━━━ Olorin Portals ━━━${NC}"

  start_service "portal-fraud" 3301 "$ROOT_DIR/olorin-portals/packages/portal-fraud" \
    "npm start" || FAILED_SERVICES+=("portal-fraud")

  start_service "portal-streaming" 3302 "$ROOT_DIR/olorin-portals/packages/portal-streaming" \
    "npm start" || FAILED_SERVICES+=("portal-streaming")

  start_service "portal-station" 3303 "$ROOT_DIR/olorin-portals/packages/portal-station" \
    "npm start" || FAILED_SERVICES+=("portal-station")

  start_service "portal-omen" 3304 "$ROOT_DIR/olorin-portals/packages/portal-omen" \
    "npm start" || FAILED_SERVICES+=("portal-omen")

  start_service "portal-main" 3305 "$ROOT_DIR/olorin-portals/packages/portal-main" \
    "npm start" || FAILED_SERVICES+=("portal-main")

  echo ""
fi

###############################################################################
# Summary
###############################################################################

echo ""
log "${PURPLE}╔════════════════════════════════════════════════════════════╗${NC}"
log "${PURPLE}║   Startup Summary                                          ║${NC}"
log "${PURPLE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ -f "$LOG_DIR/dev-servers.pids" ]; then
  RUNNING_COUNT=$(wc -l < "$LOG_DIR/dev-servers.pids" | tr -d ' ')
  log_success "Running services: $RUNNING_COUNT"
  echo ""

  log_info "Service Details:"
  while IFS=: read -r pid port name; do
    echo "  • $name (PID: $pid, Port: $port)"
  done < "$LOG_DIR/dev-servers.pids"
  echo ""
fi

if [ ${#FAILED_SERVICES[@]} -gt 0 ]; then
  log_error "Failed services: ${#FAILED_SERVICES[@]}"
  for service in "${FAILED_SERVICES[@]}"; do
    echo "  • $service"
  done
  echo ""
fi

log_info "Log files: $LOG_DIR"
log_info "PID tracking: $LOG_DIR/dev-servers.pids"
echo ""

log_warning "To stop all services, run: ./scripts/dev-servers-stop.sh"
echo ""

# Exit with error if any service failed
if [ ${#FAILED_SERVICES[@]} -gt 0 ]; then
  exit 1
fi

exit 0
