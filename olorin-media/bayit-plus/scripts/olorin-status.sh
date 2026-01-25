#!/usr/bin/env bash
# =============================================================================
# Olorin Platform Status Checker
# =============================================================================
#
# Purpose: Check status of Bayit+ platform services
#
# Usage:
#   olorin-status.sh [platform]
#
# Examples:
#   olorin-status.sh bayit
#   olorin-status.sh backend
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

# Platform
PLATFORM="${1:-bayit}"

# Configuration from environment
readonly BACKEND_PORT="${BACKEND_PORT:-8090}"
readonly WEB_PORT="${WEB_PORT:-3200}"
readonly MOBILE_PORT="${MOBILE_PORT:-19006}"
readonly TV_PORT="${TV_PORT:-3201}"
readonly PARTNER_PORT="${PARTNER_PORT:-3202}"

# Headers
print_header() {
    echo ""
    echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║  $1${NC}"
    echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# Check if port is in use
check_port() {
    local port="$1"
    lsof -i ":$port" -sTCP:LISTEN -t >/dev/null 2>&1
}

# Get process info for port
get_process_info() {
    local port="$1"
    local pid

    pid=$(lsof -i ":$port" -sTCP:LISTEN -t 2>/dev/null | head -1)

    if [ -n "$pid" ]; then
        ps -p "$pid" -o comm= 2>/dev/null | head -1
    else
        echo "N/A"
    fi
}

# Service status display
show_service_status() {
    local service_name="$1"
    local port="$2"
    local url="${3:-}"

    if check_port "$port"; then
        local process
        process=$(get_process_info "$port")
        echo -e "  ${GREEN}●${NC} $service_name"
        echo -e "    ${CYAN}Port:${NC} $port"
        echo -e "    ${CYAN}Process:${NC} $process"
        if [ -n "$url" ]; then
            echo -e "    ${CYAN}URL:${NC} $url"
        fi
    else
        echo -e "  ${RED}○${NC} $service_name"
        echo -e "    ${YELLOW}Not running${NC} (Port $port)"
    fi
    echo ""
}

# Main status check
case "$PLATFORM" in
    bayit|all)
        print_header "Bayit+ Platform Status"

        # Backend
        echo -e "${BLUE}Backend Services:${NC}"
        show_service_status "FastAPI Backend" "$BACKEND_PORT" "http://localhost:$BACKEND_PORT"

        # Frontend services
        echo -e "${BLUE}Frontend Services:${NC}"
        show_service_status "Web App" "$WEB_PORT" "http://localhost:$WEB_PORT"
        show_service_status "Mobile App" "$MOBILE_PORT" "http://localhost:$MOBILE_PORT"
        show_service_status "TV App" "$TV_PORT" "http://localhost:$TV_PORT"
        show_service_status "Partner Portal" "$PARTNER_PORT" "http://localhost:$PARTNER_PORT"

        # Additional checks
        echo -e "${BLUE}System Status:${NC}"

        # Git status
        if git rev-parse --git-dir > /dev/null 2>&1; then
            branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
            echo -e "  ${GREEN}●${NC} Git Repository"
            echo -e "    ${CYAN}Branch:${NC} $branch"

            if git diff-index --quiet HEAD -- 2>/dev/null; then
                echo -e "    ${CYAN}Status:${NC} Clean working tree"
            else
                echo -e "    ${YELLOW}Status:${NC} Uncommitted changes"
            fi
        else
            echo -e "  ${RED}○${NC} Not a git repository"
        fi
        echo ""

        # Node.js version
        if command -v node &> /dev/null; then
            echo -e "  ${GREEN}●${NC} Node.js"
            echo -e "    ${CYAN}Version:${NC} $(node --version)"
        else
            echo -e "  ${RED}○${NC} Node.js not installed"
        fi
        echo ""

        # Python/Poetry version
        if command -v poetry &> /dev/null; then
            echo -e "  ${GREEN}●${NC} Poetry"
            echo -e "    ${CYAN}Version:${NC} $(poetry --version 2>/dev/null | cut -d' ' -f3)"
        else
            echo -e "  ${YELLOW}⚠${NC} Poetry not installed"
        fi
        echo ""

        # Turbo version
        if command -v turbo &> /dev/null; then
            echo -e "  ${GREEN}●${NC} Turbo"
            echo -e "    ${CYAN}Version:${NC} $(turbo --version)"
        else
            echo -e "  ${YELLOW}⚠${NC} Turbo not installed"
        fi
        echo ""
        ;;

    backend)
        print_header "Backend Status"
        show_service_status "FastAPI Backend" "$BACKEND_PORT" "http://localhost:$BACKEND_PORT"

        # Check backend health endpoint
        if check_port "$BACKEND_PORT"; then
            echo -e "${BLUE}Health Check:${NC}"
            if curl -s "http://localhost:$BACKEND_PORT/health" > /dev/null 2>&1; then
                echo -e "  ${GREEN}●${NC} Backend is healthy"
            else
                echo -e "  ${YELLOW}⚠${NC} Backend not responding to health check"
            fi
            echo ""
        fi
        ;;

    web)
        print_header "Web App Status"
        show_service_status "Web App" "$WEB_PORT" "http://localhost:$WEB_PORT"
        ;;

    mobile)
        print_header "Mobile App Status"
        show_service_status "Mobile App" "$MOBILE_PORT" "http://localhost:$MOBILE_PORT"
        ;;

    tv)
        print_header "TV App Status"
        show_service_status "TV App" "$TV_PORT" "http://localhost:$TV_PORT"
        ;;

    partner)
        print_header "Partner Portal Status"
        show_service_status "Partner Portal" "$PARTNER_PORT" "http://localhost:$PARTNER_PORT"
        ;;

    *)
        echo -e "${RED}✖${NC} Unknown platform: $PLATFORM"
        echo ""
        echo "Available platforms: bayit, backend, web, mobile, tv, partner"
        exit 1
        ;;
esac

# Summary
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
