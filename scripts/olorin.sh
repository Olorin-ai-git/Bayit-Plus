#!/usr/bin/env bash
# =============================================================================
# Olorin CLI Router - Fast path for common commands
# =============================================================================
#
# Purpose: Unified CLI entry point for Olorin ecosystem
#
# Usage:
#   olorin <command> [platform] [options]
#
# Examples:
#   olorin start bayit
#   olorin stop bayit
#   olorin status
#   olorin script backup
#   olorin --help
#
# =============================================================================

set -euo pipefail

# Colors
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly CYAN='\033[0;36m'
readonly NC='\033[0m'

# Get project root
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Default platform
readonly DEFAULT_PLATFORM="${OLORIN_PLATFORM:-bayit}"

# Command
COMMAND="${1:-help}"
shift || true

# Platform (if specified)
PLATFORM="${1:-$DEFAULT_PLATFORM}"

# Logging helper
log_info() {
    echo -e "${BLUE}ℹ${NC} $*"
}

log_success() {
    echo -e "${GREEN}✓${NC} $*"
}

log_error() {
    echo -e "${RED}✖${NC} $*" >&2
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $*"
}

# Check if running from project root
check_project_root() {
    if [ ! -f "$PROJECT_ROOT/package.json" ]; then
        log_error "Must run from Bayit+ project root"
        log_info "Current directory: $(pwd)"
        log_info "Expected root: $PROJECT_ROOT"
        exit 1
    fi
}

# Check if Turbo is available
check_turbo() {
    if ! command -v turbo &> /dev/null; then
        log_error "Turbo is not installed"
        log_info "Install with: npm install -g turbo"
        exit 1
    fi
}

# Execute Turbo command
run_turbo() {
    local task="$1"
    shift

    cd "$PROJECT_ROOT" || exit 1

    log_info "Running Turbo task: $task"

    if [ $# -gt 0 ]; then
        turbo run "$task" "$@"
    else
        turbo run "$task"
    fi
}

# Execute backend command with Poetry
run_backend() {
    local cmd="$1"
    shift

    cd "$PROJECT_ROOT/backend" || exit 1

    if ! command -v poetry &> /dev/null; then
        log_error "Poetry is not installed"
        log_info "Install from: https://python-poetry.org/docs/#installation"
        exit 1
    fi

    log_info "Running backend command: $cmd"
    poetry run "$cmd" "$@"
}

# Main command router
case "$COMMAND" in
    # Fast path: Delegate to Turbo (zero overhead)
    start)
        check_project_root
        check_turbo

        case "$PLATFORM" in
            bayit)
                log_info "Starting Bayit+ platform..."
                run_turbo dev
                ;;
            backend)
                log_info "Starting backend only..."
                run_backend uvicorn app.main:app --reload --port "${BACKEND_PORT:-8090}"
                ;;
            web)
                log_info "Starting web app..."
                run_turbo dev --filter=@olorin/bayit-web
                ;;
            mobile)
                log_info "Starting mobile app..."
                run_turbo dev --filter=@olorin/bayit-mobile
                ;;
            tv)
                log_info "Starting TV app..."
                run_turbo dev --filter=@olorin/bayit-tv-android
                ;;
            tvos)
                log_info "Starting tvOS app..."
                run_turbo dev --filter=@olorin/bayit-tv-apple
                ;;
            partner)
                log_info "Starting partner portal..."
                run_turbo dev --filter=@olorin/partner-portal
                ;;
            *)
                log_error "Unknown platform: $PLATFORM"
                log_info "Available platforms: bayit, backend, web, mobile, tv, tvos, partner"
                exit 1
                ;;
        esac
        ;;

    stop)
        log_warning "Stopping all services..."
        pkill -f "turbo run dev" || true
        pkill -f "uvicorn app.main:app" || true
        pkill -f "vite" || true
        pkill -f "webpack" || true
        log_success "All services stopped"
        ;;

    build)
        check_project_root
        check_turbo

        if [ "$PLATFORM" = "bayit" ] || [ "$PLATFORM" = "all" ]; then
            log_info "Building all platforms..."
            run_turbo build
        else
            log_info "Building $PLATFORM..."
            run_turbo build --filter="@olorin/bayit-$PLATFORM"
        fi
        ;;

    test)
        check_project_root
        check_turbo

        if [ "$PLATFORM" = "bayit" ] || [ "$PLATFORM" = "all" ]; then
            log_info "Running all tests..."
            run_turbo test
        else
            log_info "Running tests for $PLATFORM..."
            run_turbo test --filter="@olorin/bayit-$PLATFORM"
        fi
        ;;

    lint)
        check_project_root
        check_turbo

        log_info "Running linters..."
        run_turbo lint
        ;;

    # Script discovery: Use existing utility
    script)
        exec "$SCRIPT_DIR/find-all-scripts.sh" "$@"
        ;;

    # Status check: Fast native implementation
    status)
        exec "$SCRIPT_DIR/olorin-status.sh" "$PLATFORM" "$@"
        ;;

    # Health check: Environment validation
    health)
        exec "$SCRIPT_DIR/olorin-health.sh" "$@"
        ;;

    # Complex workflows: Delegate to TypeScript CLI (Phase 2+)
    agent|skill|deploy|config)
        log_error "Command '$COMMAND' not yet implemented"
        log_info "This will be added in Phase 2 (TypeScript CLI)"
        log_info "Expected: Week 2 of implementation"
        exit 1
        ;;

    # Help and discovery
    --help|-h|help)
        exec "$SCRIPT_DIR/olorin-help.sh"
        ;;

    --version|-v)
        echo "Olorin CLI v1.0.0 (Phase 1 - Bash Router)"
        echo "Platform: Bayit+ Media"
        exit 0
        ;;

    *)
        log_error "Unknown command: $COMMAND"
        echo ""
        log_info "Run: olorin --help"
        exit 1
        ;;
esac
