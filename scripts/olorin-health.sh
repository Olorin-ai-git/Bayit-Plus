#!/usr/bin/env bash
# =============================================================================
# Olorin Health Check & Environment Validator
# =============================================================================
#
# Purpose: Validate environment setup and dependencies
#
# Usage:
#   olorin-health.sh [--fix]
#
# Options:
#   --fix    Attempt to auto-fix common issues
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

# Options
FIX_MODE=false
if [ "${1:-}" = "--fix" ]; then
    FIX_MODE=true
fi

# Counters
CHECKS_PASSED=0
CHECKS_FAILED=0
CHECKS_WARNING=0

# Headers
print_header() {
    echo ""
    echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║  $1${NC}"
    echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# Check result helpers
check_pass() {
    echo -e "  ${GREEN}✓${NC} $1"
    ((CHECKS_PASSED++))
}

check_fail() {
    echo -e "  ${RED}✖${NC} $1"
    ((CHECKS_FAILED++))
}

check_warn() {
    echo -e "  ${YELLOW}⚠${NC} $1"
    ((CHECKS_WARNING++))
}

# Check: Git repository
check_git_repo() {
    echo -e "${BLUE}Checking Git Repository...${NC}"

    if git rev-parse --git-dir > /dev/null 2>&1; then
        local root
        root=$(git rev-parse --show-toplevel)
        check_pass "Git repository found at: $root"

        local branch
        branch=$(git rev-parse --abbrev-ref HEAD)
        echo -e "    ${CYAN}Current branch:${NC} $branch"
    else
        check_fail "Not a git repository"
    fi
    echo ""
}

# Check: Required tools
check_required_tools() {
    echo -e "${BLUE}Checking Required Tools...${NC}"

    # Node.js
    if command -v node &> /dev/null; then
        local node_version
        node_version=$(node --version)
        local major_version
        major_version=$(echo "$node_version" | cut -d'.' -f1 | sed 's/v//')

        if [ "$major_version" -ge 20 ]; then
            check_pass "Node.js $node_version (✓ >= 20)"
        else
            check_warn "Node.js $node_version (requires >= 20)"
        fi
    else
        check_fail "Node.js not installed"
    fi

    # npm
    if command -v npm &> /dev/null; then
        local npm_version
        npm_version=$(npm --version)
        check_pass "npm $npm_version"
    else
        check_fail "npm not installed"
    fi

    # Turbo
    if command -v turbo &> /dev/null; then
        local turbo_version
        turbo_version=$(turbo --version)
        check_pass "Turbo $turbo_version"
    else
        check_warn "Turbo not installed (install: npm install -g turbo)"
    fi

    # Python
    if command -v python3 &> /dev/null; then
        local python_version
        python_version=$(python3 --version | cut -d' ' -f2)
        check_pass "Python $python_version"
    else
        check_fail "Python 3 not installed"
    fi

    # Poetry
    if command -v poetry &> /dev/null; then
        local poetry_version
        poetry_version=$(poetry --version 2>/dev/null | awk '{print $3}' || echo "unknown")
        check_pass "Poetry $poetry_version"
    else
        check_fail "Poetry not installed (https://python-poetry.org/docs/#installation)"
    fi

    echo ""
}

# Check: Project structure
check_project_structure() {
    echo -e "${BLUE}Checking Project Structure...${NC}"

    cd "$PROJECT_ROOT" || exit 1

    # Root files
    if [ -f "package.json" ]; then
        check_pass "package.json exists"
    else
        check_fail "package.json missing"
    fi

    if [ -f "turbo.json" ]; then
        check_pass "turbo.json exists"
    else
        check_fail "turbo.json missing"
    fi

    # Backend directory
    if [ -d "backend" ]; then
        check_pass "backend/ directory exists"

        if [ -f "backend/pyproject.toml" ]; then
            check_pass "backend/pyproject.toml exists"
        else
            check_fail "backend/pyproject.toml missing"
        fi
    else
        check_fail "backend/ directory missing"
    fi

    # Frontend workspaces
    local workspaces=("web" "mobile-app" "tv-app" "tvos-app" "partner-portal")
    for workspace in "${workspaces[@]}"; do
        if [ -d "$workspace" ]; then
            check_pass "$workspace/ directory exists"
        else
            check_warn "$workspace/ directory missing (optional)"
        fi
    done

    # Scripts directory
    if [ -d "scripts" ]; then
        check_pass "scripts/ directory exists"

        if [ -f "scripts/find-all-scripts.sh" ]; then
            check_pass "scripts/find-all-scripts.sh exists"
        else
            check_warn "scripts/find-all-scripts.sh missing"
        fi
    else
        check_fail "scripts/ directory missing"
    fi

    echo ""
}

# Check: Environment variables
check_environment_variables() {
    echo -e "${BLUE}Checking Environment Variables...${NC}"

    # Backend .env
    if [ -f "backend/.env" ]; then
        check_pass "backend/.env exists"

        # Check critical env vars
        local required_vars=("GOOGLE_APPLICATION_CREDENTIALS" "FIREBASE_PROJECT_ID" "GCS_BUCKET_NAME")

        for var in "${required_vars[@]}"; do
            if grep -q "^$var=" "backend/.env" 2>/dev/null; then
                local value
                value=$(grep "^$var=" "backend/.env" | cut -d'=' -f2 | cut -d'#' -f1 | xargs)
                if [ -n "$value" ] && [ "$value" != "your-*" ]; then
                    echo -e "    ${GREEN}✓${NC} $var is set"
                else
                    echo -e "    ${YELLOW}⚠${NC} $var is empty or placeholder"
                fi
            else
                echo -e "    ${RED}✖${NC} $var not found in .env"
            fi
        done
    else
        check_warn "backend/.env missing (copy from .env.example)"
    fi

    echo ""
}

# Check: Dependencies installed
check_dependencies() {
    echo -e "${BLUE}Checking Dependencies...${NC}"

    # Root node_modules
    if [ -d "node_modules" ]; then
        check_pass "Root node_modules installed"
    else
        check_fail "Root node_modules missing (run: npm install)"
    fi

    # Backend Poetry dependencies
    cd "$PROJECT_ROOT/backend" || exit 1

    if poetry env info --path &> /dev/null; then
        check_pass "Backend Poetry virtualenv exists"

        # Check if dependencies are installed
        if poetry run python -c "import fastapi" 2>/dev/null; then
            check_pass "Backend dependencies installed"
        else
            check_warn "Backend dependencies may be incomplete (run: poetry install)"
        fi
    else
        check_fail "Backend Poetry virtualenv missing (run: poetry install)"
    fi

    cd "$PROJECT_ROOT" || exit 1

    echo ""
}

# Check: .claude integration
check_claude_integration() {
    echo -e "${BLUE}Checking .claude Integration...${NC}"

    local claude_dir="${CLAUDE_DIR:-$HOME/.claude}"

    if [ -d "$claude_dir" ]; then
        check_pass ".claude directory exists at: $claude_dir"

        # Check for required files
        if [ -f "$claude_dir/commands.json" ]; then
            check_pass "commands.json exists"
        else
            check_warn "commands.json missing"
        fi

        if [ -f "$claude_dir/subagents.json" ]; then
            check_pass "subagents.json exists"
        else
            check_warn "subagents.json missing"
        fi

        if [ -d "$claude_dir/commands" ]; then
            local cmd_count
            cmd_count=$(find "$claude_dir/commands" -name "*.md" | wc -l | xargs)
            check_pass "$cmd_count command files found"
        else
            check_warn "commands/ directory missing"
        fi

        if [ -d "$claude_dir/agents" ]; then
            local agent_count
            agent_count=$(find "$claude_dir/agents" -name "*.md" | wc -l | xargs)
            check_pass "$agent_count agent files found"
        else
            check_warn "agents/ directory missing"
        fi
    else
        check_warn ".claude directory not found (expected at: $claude_dir)"
    fi

    echo ""
}

# Summary
print_summary() {
    print_header "Health Check Summary"

    echo -e "${GREEN}Passed:${NC}  $CHECKS_PASSED"
    echo -e "${YELLOW}Warnings:${NC} $CHECKS_WARNING"
    echo -e "${RED}Failed:${NC}  $CHECKS_FAILED"
    echo ""

    if [ $CHECKS_FAILED -eq 0 ]; then
        echo -e "${GREEN}✓ Environment is healthy${NC}"
        echo ""
        return 0
    else
        echo -e "${RED}✖ Environment has issues${NC}"
        echo ""

        if [ "$FIX_MODE" = false ]; then
            echo -e "${CYAN}💡 Tip:${NC} Run with --fix to attempt auto-fixes"
            echo ""
        fi

        return 1
    fi
}

# Main execution
main() {
    print_header "Olorin Environment Health Check"

    check_git_repo
    check_required_tools
    check_project_structure
    check_environment_variables
    check_dependencies
    check_claude_integration

    print_summary
}

main "$@"
