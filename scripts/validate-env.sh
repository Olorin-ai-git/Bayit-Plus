#!/usr/bin/env bash
# =============================================================================
# Environment Variables Validation Script
# =============================================================================
#
# Purpose: Validate environment variables against .env.schema.json
#
# Usage:
#   ./validate-env.sh [--service <service>] [--strict]
#
# Options:
#   --service <name>    Validate specific service only (backend, web, partner-portal, cli)
#   --strict            Fail on warnings (default: only fail on errors)
#   --help              Show this help
#
# Examples:
#   ./validate-env.sh                      # Validate all services
#   ./validate-env.sh --service backend    # Validate backend only
#   ./validate-env.sh --strict             # Strict mode (fail on warnings)
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
SERVICE=""
STRICT_MODE=false

# Counters
ERRORS=0
WARNINGS=0
PASSED=0

# Headers
print_header() {
    echo ""
    echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║  $1${NC}"
    echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# Results
check_pass() {
    echo -e "  ${GREEN}✓${NC} $1"
    ((PASSED++))
}

check_warn() {
    echo -e "  ${YELLOW}⚠${NC} $1"
    ((WARNINGS++))
}

check_error() {
    echo -e "  ${RED}✖${NC} $1"
    ((ERRORS++))
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        --service)
            SERVICE="$2"
            shift 2
            ;;
        --strict)
            STRICT_MODE=true
            shift
            ;;
        --help|-h)
            sed -n '2,/^$/p' "$0" | sed 's/^# //'
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Run: $0 --help"
            exit 1
            ;;
    esac
done

# Check if file exists
check_file_exists() {
    local file="$1"
    if [ ! -f "$file" ]; then
        return 1
    fi
    return 0
}

# Read env file
read_env_file() {
    local file="$1"

    if [ ! -f "$file" ]; then
        return
    fi

    # Read non-comment lines
    grep -v "^#" "$file" | grep -v "^$" || true
}

# Check if variable is set
check_var_set() {
    local var_name="$1"
    local env_content="$2"

    if echo "$env_content" | grep -q "^$var_name="; then
        return 0
    fi
    return 1
}

# Get variable value
get_var_value() {
    local var_name="$1"
    local env_content="$2"

    echo "$env_content" | grep "^$var_name=" | cut -d'=' -f2- | xargs
}

# Check if value is placeholder
is_placeholder() {
    local value="$1"

    # Common placeholder patterns
    if [[ "$value" =~ ^YOUR_.*_HERE$ ]] || \
       [[ "$value" =~ ^your-.*-here$ ]] || \
       [[ "$value" == "..." ]] || \
       [[ "$value" == "" ]]; then
        return 0
    fi

    return 1
}

# Validate backend
validate_backend() {
    print_header "Backend Environment Variables"

    local env_file="$PROJECT_ROOT/backend/.env"
    local example_file="$PROJECT_ROOT/backend/.env.example"

    # Check if env file exists
    if ! check_file_exists "$env_file"; then
        check_error "backend/.env not found (copy from backend/.env.example)"
        return
    fi

    check_pass "backend/.env exists"

    # Read env file
    local env_content
    env_content=$(read_env_file "$env_file")

    # Required variables
    local required_vars=(
        "SECRET_KEY"
        "DEBUG"
        "MONGODB_URI"
        "MONGODB_DB_NAME"
        "GCP_PROJECT_ID"
        "FRONTEND_URL"
        "FRONTEND_WEB_URL"
        "BACKEND_CORS_ORIGINS"
        "ANTHROPIC_API_KEY"
        "OPENAI_API_KEY"
        "ELEVENLABS_API_KEY"
    )

    for var in "${required_vars[@]}"; do
        if check_var_set "$var" "$env_content"; then
            local value
            value=$(get_var_value "$var" "$env_content")

            # Check if value is placeholder
            if is_placeholder "$value"; then
                check_error "$var is set to placeholder value"
            else
                check_pass "$var is set"
            fi
        else
            check_error "$var is not set (REQUIRED)"
        fi
    done

    # Check SECRET_KEY length
    if check_var_set "SECRET_KEY" "$env_content"; then
        local secret_key
        secret_key=$(get_var_value "SECRET_KEY" "$env_content")

        if [ ${#secret_key} -lt 32 ]; then
            check_error "SECRET_KEY is too short (minimum 32 characters, got ${#secret_key})"
        elif [[ "$secret_key" =~ ^YOUR_.*_HERE$ ]]; then
            check_error "SECRET_KEY is a placeholder (generate with: python -c \"import secrets; print(secrets.token_urlsafe(32))\")"
        else
            check_pass "SECRET_KEY length is valid (${#secret_key} characters)"
        fi
    fi

    # Check DEBUG value
    if check_var_set "DEBUG" "$env_content"; then
        local debug_value
        debug_value=$(get_var_value "DEBUG" "$env_content")

        if [[ "$debug_value" == "true" ]]; then
            check_warn "DEBUG is true (should be false in production)"
        elif [[ "$debug_value" == "false" ]]; then
            check_pass "DEBUG is false (production-ready)"
        else
            check_error "DEBUG has invalid value '$debug_value' (must be 'true' or 'false')"
        fi
    fi

    # Check MONGODB_URI format
    if check_var_set "MONGODB_URI" "$env_content"; then
        local mongo_uri
        mongo_uri=$(get_var_value "MONGODB_URI" "$env_content")

        if [[ "$mongo_uri" =~ ^mongodb(\+srv)?:// ]]; then
            check_pass "MONGODB_URI has valid format"

            # Warn if using localhost in production-like setup
            if [[ "$mongo_uri" =~ localhost ]] && [[ "$(get_var_value "DEBUG" "$env_content")" == "false" ]]; then
                check_warn "MONGODB_URI uses localhost with DEBUG=false (production should use remote MongoDB)"
            fi
        else
            check_error "MONGODB_URI has invalid format (must start with mongodb:// or mongodb+srv://)"
        fi
    fi

    # Check API keys format
    if check_var_set "ANTHROPIC_API_KEY" "$env_content"; then
        local api_key
        api_key=$(get_var_value "ANTHROPIC_API_KEY" "$env_content")

        if [[ "$api_key" =~ ^sk-ant- ]]; then
            check_pass "ANTHROPIC_API_KEY has valid format"
        elif ! is_placeholder "$api_key"; then
            check_warn "ANTHROPIC_API_KEY doesn't start with 'sk-ant-' (may be invalid)"
        fi
    fi

    if check_var_set "OPENAI_API_KEY" "$env_content"; then
        local api_key
        api_key=$(get_var_value "OPENAI_API_KEY" "$env_content")

        if [[ "$api_key" =~ ^sk- ]]; then
            check_pass "OPENAI_API_KEY has valid format"
        elif ! is_placeholder "$api_key"; then
            check_warn "OPENAI_API_KEY doesn't start with 'sk-' (may be invalid)"
        fi
    fi

    echo ""
}

# Validate web
validate_web() {
    print_header "Web Application Environment Variables"

    local env_file="$PROJECT_ROOT/web/.env"

    # Check if env file exists
    if ! check_file_exists "$env_file"; then
        check_warn "web/.env not found (optional, defaults will be used)"
        return
    fi

    check_pass "web/.env exists"

    # Read env file
    local env_content
    env_content=$(read_env_file "$env_file")

    # Required variables
    if check_var_set "VITE_API_URL" "$env_content"; then
        local api_url
        api_url=$(get_var_value "VITE_API_URL" "$env_content")

        if [[ "$api_url" =~ ^https?:// ]]; then
            check_pass "VITE_API_URL has valid format"
        else
            check_error "VITE_API_URL has invalid format (must start with http:// or https://)"
        fi
    else
        check_error "VITE_API_URL is not set (REQUIRED)"
    fi

    # Check app mode
    if check_var_set "VITE_APP_MODE" "$env_content"; then
        local app_mode
        app_mode=$(get_var_value "VITE_APP_MODE" "$env_content")

        if [[ "$app_mode" == "demo" ]]; then
            check_warn "VITE_APP_MODE is 'demo' (uses mock data)"
        elif [[ "$app_mode" == "production" ]]; then
            check_pass "VITE_APP_MODE is 'production'"
        else
            check_error "VITE_APP_MODE has invalid value '$app_mode' (must be 'demo' or 'production')"
        fi
    fi

    echo ""
}

# Validate partner portal
validate_partner_portal() {
    print_header "Partner Portal Environment Variables"

    local env_file="$PROJECT_ROOT/partner-portal/.env"

    # Check if env file exists
    if ! check_file_exists "$env_file"; then
        check_warn "partner-portal/.env not found (optional)"
        return
    fi

    check_pass "partner-portal/.env exists"

    # Read env file
    local env_content
    env_content=$(read_env_file "$env_file")

    # Required variables
    local required_vars=(
        "VITE_B2B_API_BASE_URL"
        "VITE_B2B_DOCS_URL"
    )

    for var in "${required_vars[@]}"; do
        if check_var_set "$var" "$env_content"; then
            local value
            value=$(get_var_value "$var" "$env_content")

            if [[ "$value" =~ ^https?:// ]]; then
                check_pass "$var has valid URL format"
            else
                check_error "$var has invalid format (must be a valid URL)"
            fi
        else
            check_error "$var is not set (REQUIRED)"
        fi
    done

    echo ""
}

# Validate CLI
validate_cli() {
    print_header "CLI Environment Variables"

    # CLI variables are optional system env vars

    # Check OLORIN_PLATFORM
    if [ -n "${OLORIN_PLATFORM:-}" ]; then
        if [[ "$OLORIN_PLATFORM" =~ ^(bayit|cvplus|fraud|portals)$ ]]; then
            check_pass "OLORIN_PLATFORM='$OLORIN_PLATFORM' (valid)"
        else
            check_warn "OLORIN_PLATFORM='$OLORIN_PLATFORM' (unknown platform)"
        fi
    else
        check_pass "OLORIN_PLATFORM not set (defaults to 'bayit')"
    fi

    # Check port variables
    local port_vars=("BACKEND_PORT" "WEB_PORT" "MOBILE_PORT" "TV_PORT" "TVOS_PORT" "PARTNER_PORT")

    for var in "${port_vars[@]}"; do
        if [ -n "${!var:-}" ]; then
            local port="${!var}"

            if [[ "$port" =~ ^[0-9]+$ ]] && [ "$port" -ge 1024 ] && [ "$port" -le 65535 ]; then
                check_pass "$var=$port (valid port range)"
            else
                check_error "$var=$port (must be 1024-65535)"
            fi
        fi
    done

    # Check CLAUDE_DIR
    if [ -n "${CLAUDE_DIR:-}" ]; then
        if [ -d "$CLAUDE_DIR" ]; then
            check_pass "CLAUDE_DIR='$CLAUDE_DIR' (directory exists)"
        else
            check_warn "CLAUDE_DIR='$CLAUDE_DIR' (directory does not exist)"
        fi
    else
        local default_claude_dir="$HOME/.claude"
        if [ -d "$default_claude_dir" ]; then
            check_pass "CLAUDE_DIR not set (using default: $default_claude_dir)"
        else
            check_warn "CLAUDE_DIR not set and default directory not found ($default_claude_dir)"
        fi
    fi

    echo ""
}

# Summary
print_summary() {
    print_header "Validation Summary"

    echo -e "${GREEN}Passed:${NC}   $PASSED"
    echo -e "${YELLOW}Warnings:${NC} $WARNINGS"
    echo -e "${RED}Errors:${NC}   $ERRORS"
    echo ""

    if [ $ERRORS -gt 0 ]; then
        echo -e "${RED}✖ Validation failed with $ERRORS error(s)${NC}"
        echo ""

        echo -e "${CYAN}💡 Tips:${NC}"
        echo "  • Copy .env.example files: cp backend/.env.example backend/.env"
        echo "  • Check required variables: cat backend/.env.example | grep REQUIRED"
        echo "  • Generate SECRET_KEY: python -c \"import secrets; print(secrets.token_urlsafe(32))\""
        echo "  • See full documentation: docs/ENVIRONMENT_VARIABLES.md"
        echo ""

        return 1
    elif [ $WARNINGS -gt 0 ]; then
        if [ "$STRICT_MODE" = true ]; then
            echo -e "${YELLOW}⚠ Validation failed in strict mode with $WARNINGS warning(s)${NC}"
            echo ""
            return 1
        else
            echo -e "${YELLOW}⚠ Validation passed with $WARNINGS warning(s)${NC}"
            echo ""
            echo -e "${CYAN}💡 Tip:${NC} Run with --strict to fail on warnings"
            echo ""
            return 0
        fi
    else
        echo -e "${GREEN}✓ All environment variables are valid${NC}"
        echo ""
        return 0
    fi
}

# Main execution
main() {
    cd "$PROJECT_ROOT" || exit 1

    print_header "Environment Variables Validation"

    echo -e "${CYAN}Schema:${NC}  .env.schema.json"
    echo -e "${CYAN}Docs:${NC}    docs/ENVIRONMENT_VARIABLES.md"
    echo -e "${CYAN}Mode:${NC}    $([ "$STRICT_MODE" = true ] && echo "Strict (fail on warnings)" || echo "Normal (warnings allowed)")"

    if [ -n "$SERVICE" ]; then
        echo -e "${CYAN}Service:${NC} $SERVICE only"
    else
        echo -e "${CYAN}Service:${NC} All services"
    fi

    # Validate services
    if [ -z "$SERVICE" ] || [ "$SERVICE" = "backend" ]; then
        validate_backend
    fi

    if [ -z "$SERVICE" ] || [ "$SERVICE" = "web" ]; then
        validate_web
    fi

    if [ -z "$SERVICE" ] || [ "$SERVICE" = "partner-portal" ]; then
        validate_partner_portal
    fi

    if [ -z "$SERVICE" ] || [ "$SERVICE" = "cli" ]; then
        validate_cli
    fi

    # Print summary
    print_summary
}

main "$@"
