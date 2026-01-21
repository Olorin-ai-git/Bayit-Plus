#!/bin/bash
# =============================================================================
# Olorin Platform - Full Stack Deployment Orchestrator
# =============================================================================
# Usage: ./deployment/scripts/deploy_all.sh [options]
#
# Options:
#   --environment <env>  Set deployment environment (staging|production)
#   --skip-backend       Skip backend deployment
#   --skip-frontend      Skip frontend deployment
#   --skip-tests         Skip test suite execution
#   --skip-quality       Skip quality checks (tox)
#   --skip-build         Skip Docker build (deploy existing image)
#   --skip-secrets-check Skip GCP Secret Manager verification
#   --dry-run            Show what would be done without executing
#   --parallel           Run independent deployments in parallel
#   --force              Skip confirmation prompts
#   -h, --help           Show this help message
#
# Environment Variables:
#   OLORIN_PROJECT_ID    GCP Project ID (default: olorin-fraud-detection)
#   OLORIN_REGION        GCP Region (default: us-east1)
#
# =============================================================================

set -euo pipefail

# =============================================================================
# Configuration
# =============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FRONTEND_ROOT="${PROJECT_ROOT}/../olorin-front"

# Default values (can be overridden by environment or flags)
ENVIRONMENT="${OLORIN_ENVIRONMENT:-staging}"
PROJECT_ID="${OLORIN_PROJECT_ID:-olorin-fraud-detection}"
REGION="${OLORIN_REGION:-us-east1}"

# Feature flags
SKIP_BACKEND=false
SKIP_FRONTEND=false
SKIP_TESTS=false
SKIP_QUALITY=false
SKIP_BUILD=false
SKIP_SECRETS_CHECK=false
DRY_RUN=false
PARALLEL=false
FORCE=false

# =============================================================================
# Required Secrets Definition (same as deploy_server.sh)
# =============================================================================
CORE_SECRETS=(
    "MONGODB_URI:olorin-mongodb-uri"
    "MONGODB_DATABASE:olorin-mongodb-database"
    "JWT_SECRET_KEY:JWT_SECRET_KEY"
    "ANTHROPIC_API_KEY:ANTHROPIC_API_KEY"
    "OPENAI_API_KEY:OPENAI_API_KEY"
)

DATABASE_SECRETS=(
    "DATABASE_PASSWORD:DATABASE_PASSWORD"
    "POSTGRES_PASSWORD:POSTGRES_PASSWORD"
    "SNOWFLAKE_PASSWORD:SNOWFLAKE_PASSWORD"
    "SNOWFLAKE_ACCOUNT:SNOWFLAKE_ACCOUNT"
    "SNOWFLAKE_PRIVATE_KEY:SNOWFLAKE_PRIVATE_KEY"
)

OBSERVABILITY_SECRETS=(
    "LANGFUSE_SECRET_KEY:LANGFUSE_SECRET_KEY"
    "LANGFUSE_PUBLIC_KEY:LANGFUSE_PUBLIC_KEY"
    "SPLUNK_PASSWORD:SPLUNK_PASSWORD"
    "SPLUNK_TOKEN:SPLUNK_TOKEN"
)

CACHE_SECRETS=(
    "REDIS_PASSWORD:REDIS_PASSWORD"
)

B2B_SECRETS=(
    "OLORIN_B2B_JWT_SECRET:OLORIN_B2B_JWT_SECRET"
    "OLORIN_B2B_API_KEY_SALT:OLORIN_B2B_API_KEY_SALT"
    "OLORIN_B2B_STRIPE_SECRET_KEY:OLORIN_B2B_STRIPE_SECRET_KEY"
    "OLORIN_B2B_STRIPE_WEBHOOK_SECRET:OLORIN_B2B_STRIPE_WEBHOOK_SECRET"
    "BAYIT_PLUS_INTERNAL_API_KEY:BAYIT_PLUS_INTERNAL_API_KEY"
)

API_SECRETS=(
    "OLORIN_API_KEY:OLORIN_API_KEY"
)

# Timestamps
START_TIME=$(date +%s)
DEPLOYMENT_ID="deploy-$(date +%Y%m%d-%H%M%S)"

# =============================================================================
# Colors and Formatting
# =============================================================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# =============================================================================
# Logging Functions
# =============================================================================
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "\n${MAGENTA}${BOLD}=== $1 ===${NC}\n"
}

log_substep() {
    echo -e "${CYAN}  -> $1${NC}"
}

# =============================================================================
# Helper Functions
# =============================================================================
show_help() {
    head -35 "$0" | tail -30
    exit 0
}

check_prerequisites() {
    log_step "Checking Prerequisites"

    local missing=()

    # Required tools
    command -v gcloud >/dev/null 2>&1 || missing+=("gcloud")
    command -v docker >/dev/null 2>&1 || missing+=("docker")
    command -v poetry >/dev/null 2>&1 || missing+=("poetry")

    if [ ${#missing[@]} -gt 0 ]; then
        log_error "Missing required tools: ${missing[*]}"
        log_info "Please install missing tools and try again."
        exit 1
    fi

    # Check gcloud authentication
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null | grep -q .; then
        log_error "Not authenticated with gcloud. Run: gcloud auth login"
        exit 1
    fi

    # Check project configuration
    local current_project
    current_project=$(gcloud config get-value project 2>/dev/null)
    if [ "$current_project" != "$PROJECT_ID" ]; then
        log_warning "Current gcloud project ($current_project) differs from target ($PROJECT_ID)"
        if [ "$FORCE" = false ]; then
            read -p "Switch to $PROJECT_ID? (y/N) " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                gcloud config set project "$PROJECT_ID"
            else
                exit 1
            fi
        else
            gcloud config set project "$PROJECT_ID"
        fi
    fi

    log_success "All prerequisites satisfied"
}

validate_environment() {
    log_step "Validating Environment: $ENVIRONMENT"

    case "$ENVIRONMENT" in
        staging|production)
            log_info "Deploying to: $ENVIRONMENT"
            ;;
        *)
            log_error "Invalid environment: $ENVIRONMENT. Must be 'staging' or 'production'"
            exit 1
            ;;
    esac

    # Check for environment-specific config files
    local env_vars_file="$PROJECT_ROOT/cloudrun-env-vars.${ENVIRONMENT}.txt"
    local secrets_file="$PROJECT_ROOT/cloudrun-secrets.txt"

    if [ ! -f "$env_vars_file" ]; then
        log_error "Missing environment config: $env_vars_file"
        exit 1
    fi

    if [ ! -f "$secrets_file" ]; then
        log_error "Missing secrets config: $secrets_file"
        exit 1
    fi

    log_success "Environment configuration validated"
}

# =============================================================================
# Secrets Verification
# =============================================================================
check_secret_exists() {
    local secret_name="$1"
    gcloud secrets describe "$secret_name" --project="$PROJECT_ID" &>/dev/null
}

verify_secrets() {
    if [ "$SKIP_SECRETS_CHECK" = true ]; then
        log_warning "Skipping secrets verification (--skip-secrets-check)"
        return 0
    fi

    log_step "Verifying Required Secrets in GCP Secret Manager"

    local missing_secrets=()
    local all_secrets_count=0
    local verified_count=0

    # Check all secret categories
    for secret_pair in "${CORE_SECRETS[@]}"; do
        local secret_name="${secret_pair##*:}"
        ((all_secrets_count++))
        if check_secret_exists "$secret_name"; then
            ((verified_count++))
            echo -e "  ${GREEN}✓${NC} $secret_name"
        else
            echo -e "  ${RED}✗${NC} $secret_name (REQUIRED)"
            missing_secrets+=("$secret_name")
        fi
    done

    for secret_pair in "${DATABASE_SECRETS[@]}" "${OBSERVABILITY_SECRETS[@]}" "${CACHE_SECRETS[@]}" "${API_SECRETS[@]}"; do
        local secret_name="${secret_pair##*:}"
        ((all_secrets_count++))
        if check_secret_exists "$secret_name"; then
            ((verified_count++))
            echo -e "  ${GREEN}✓${NC} $secret_name"
        else
            echo -e "  ${YELLOW}○${NC} $secret_name (optional)"
        fi
    done

    # Check B2B secrets (required only if B2B enabled)
    local b2b_enabled=false
    if [ -f "$PROJECT_ROOT/cloudrun-env-vars.${ENVIRONMENT}.txt" ]; then
        if grep -q "OLORIN_B2B_ENABLED=true" "$PROJECT_ROOT/cloudrun-env-vars.${ENVIRONMENT}.txt"; then
            b2b_enabled=true
        fi
    fi

    for secret_pair in "${B2B_SECRETS[@]}"; do
        local secret_name="${secret_pair##*:}"
        ((all_secrets_count++))
        if check_secret_exists "$secret_name"; then
            ((verified_count++))
            echo -e "  ${GREEN}✓${NC} $secret_name"
        else
            if [ "$b2b_enabled" = true ]; then
                echo -e "  ${RED}✗${NC} $secret_name (REQUIRED - B2B enabled)"
                missing_secrets+=("$secret_name")
            else
                echo -e "  ${YELLOW}○${NC} $secret_name (B2B disabled)"
            fi
        fi
    done

    echo ""
    log_info "Verified: $verified_count / $all_secrets_count secrets"

    if [ ${#missing_secrets[@]} -gt 0 ]; then
        log_error "Missing required secrets: ${missing_secrets[*]}"
        echo ""
        log_info "To create missing secrets, run:"
        echo "  ./deployment/scripts/setup_gcp_secrets.sh --env-file .env"
        echo ""

        if [ "$FORCE" = false ]; then
            log_error "Aborting deployment due to missing required secrets"
            exit 1
        else
            log_warning "Continuing despite missing secrets (--force)"
        fi
    else
        log_success "All required secrets verified"
    fi
}

confirm_deployment() {
    if [ "$FORCE" = true ] || [ "$DRY_RUN" = true ]; then
        return 0
    fi

    echo ""
    echo -e "${BOLD}Deployment Summary:${NC}"
    echo "  Environment:    $ENVIRONMENT"
    echo "  Project ID:     $PROJECT_ID"
    echo "  Region:         $REGION"
    echo "  Deployment ID:  $DEPLOYMENT_ID"
    echo ""
    echo "  Components:"
    [ "$SKIP_BACKEND" = false ] && echo "    - Backend (Cloud Run)"
    [ "$SKIP_FRONTEND" = false ] && echo "    - Frontend (Firebase Hosting)"
    echo ""

    if [ "$ENVIRONMENT" = "production" ]; then
        echo -e "${RED}${BOLD}WARNING: You are deploying to PRODUCTION!${NC}"
    fi

    read -p "Proceed with deployment? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Deployment cancelled"
        exit 0
    fi
}

run_tests() {
    if [ "$SKIP_TESTS" = true ]; then
        log_warning "Skipping tests (--skip-tests)"
        return 0
    fi

    log_step "Running Test Suite"

    cd "$PROJECT_ROOT"

    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] Would run: poetry run pytest"
        return 0
    fi

    log_substep "Running pytest..."
    if ! poetry run pytest --tb=short -q; then
        log_error "Tests failed! Aborting deployment."
        exit 1
    fi

    log_success "All tests passed"
}

run_quality_checks() {
    if [ "$SKIP_QUALITY" = true ]; then
        log_warning "Skipping quality checks (--skip-quality)"
        return 0
    fi

    log_step "Running Quality Checks"

    cd "$PROJECT_ROOT"

    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] Would run: poetry run tox"
        return 0
    fi

    log_substep "Running tox (black, isort, mypy, pylint)..."
    if ! poetry run tox -e lint 2>/dev/null || ! poetry run black --check app/ 2>/dev/null; then
        log_warning "Some quality checks failed, but continuing..."
    fi

    log_success "Quality checks completed"
}

deploy_backend() {
    if [ "$SKIP_BACKEND" = true ]; then
        log_warning "Skipping backend deployment (--skip-backend)"
        return 0
    fi

    log_step "Deploying Backend to Cloud Run"

    cd "$PROJECT_ROOT"

    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] Would run: $SCRIPT_DIR/deploy_server.sh --environment $ENVIRONMENT"
        return 0
    fi

    # Use the dedicated server deployment script
    if [ -f "$SCRIPT_DIR/deploy_server.sh" ]; then
        local server_opts="--environment $ENVIRONMENT"
        [ "$SKIP_BUILD" = true ] && server_opts="$server_opts --skip-build"
        [ "$SKIP_TESTS" = true ] && server_opts="$server_opts --skip-tests"
        [ "$SKIP_QUALITY" = true ] && server_opts="$server_opts --skip-quality"

        bash "$SCRIPT_DIR/deploy_server.sh" $server_opts
    else
        # Fallback to existing deployment script
        bash "$PROJECT_ROOT/scripts/deploy-cloudrun-direct.sh" "$ENVIRONMENT"
    fi

    log_success "Backend deployed successfully"
}

deploy_frontend() {
    if [ "$SKIP_FRONTEND" = true ]; then
        log_warning "Skipping frontend deployment (--skip-frontend)"
        return 0
    fi

    log_step "Deploying Frontend"

    if [ ! -d "$FRONTEND_ROOT" ]; then
        log_warning "Frontend directory not found: $FRONTEND_ROOT"
        log_info "Skipping frontend deployment"
        return 0
    fi

    cd "$FRONTEND_ROOT"

    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] Would run frontend build and deploy"
        return 0
    fi

    # Check for deployment script
    if [ -f "$FRONTEND_ROOT/deployment/scripts/deploy-web.sh" ]; then
        bash "$FRONTEND_ROOT/deployment/scripts/deploy-web.sh" --environment "$ENVIRONMENT"
    elif [ -f "$FRONTEND_ROOT/package.json" ]; then
        log_substep "Installing dependencies..."
        npm ci

        log_substep "Building production bundle..."
        npm run build

        log_substep "Deploying to Firebase..."
        npm run deploy 2>/dev/null || firebase deploy --only hosting
    else
        log_warning "No frontend deployment mechanism found"
    fi

    log_success "Frontend deployed successfully"
}

generate_report() {
    local end_time=$(date +%s)
    local duration=$((end_time - START_TIME))

    log_step "Deployment Report"

    echo ""
    echo -e "${BOLD}Deployment Completed${NC}"
    echo "================================"
    echo "  Deployment ID:  $DEPLOYMENT_ID"
    echo "  Environment:    $ENVIRONMENT"
    echo "  Duration:       ${duration}s"
    echo "  Status:         SUCCESS"
    echo ""
    echo "Services:"

    if [ "$SKIP_BACKEND" = false ]; then
        local service_url
        service_url=$(gcloud run services describe "olorin-backend-${ENVIRONMENT}" \
            --region "$REGION" \
            --format="value(status.url)" 2>/dev/null || echo "N/A")
        echo "  Backend:  $service_url"
    fi

    if [ "$SKIP_FRONTEND" = false ] && [ -d "$FRONTEND_ROOT" ]; then
        echo "  Frontend: https://fraud.olorin.ai (or configured domain)"
    fi

    echo ""
    echo "Monitoring:"
    echo "  Cloud Run:    https://console.cloud.google.com/run?project=$PROJECT_ID"
    echo "  Cloud Build:  https://console.cloud.google.com/cloud-build/builds?project=$PROJECT_ID"
    echo "  Logs:         https://console.cloud.google.com/logs?project=$PROJECT_ID"
    echo ""
}

# =============================================================================
# Main Execution
# =============================================================================
main() {
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --environment)
                ENVIRONMENT="$2"
                shift 2
                ;;
            --skip-backend)
                SKIP_BACKEND=true
                shift
                ;;
            --skip-frontend)
                SKIP_FRONTEND=true
                shift
                ;;
            --skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            --skip-quality)
                SKIP_QUALITY=true
                shift
                ;;
            --skip-build)
                SKIP_BUILD=true
                shift
                ;;
            --skip-secrets-check)
                SKIP_SECRETS_CHECK=true
                shift
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --parallel)
                PARALLEL=true
                shift
                ;;
            --force)
                FORCE=true
                shift
                ;;
            -h|--help)
                show_help
                ;;
            *)
                log_error "Unknown option: $1"
                show_help
                ;;
        esac
    done

    echo ""
    echo -e "${BOLD}${MAGENTA}=====================================${NC}"
    echo -e "${BOLD}${MAGENTA}  Olorin Platform Full Deployment   ${NC}"
    echo -e "${BOLD}${MAGENTA}=====================================${NC}"
    echo ""

    if [ "$DRY_RUN" = true ]; then
        echo -e "${YELLOW}${BOLD}DRY RUN MODE - No changes will be made${NC}"
        echo ""
    fi

    # Pre-flight checks
    check_prerequisites
    validate_environment
    verify_secrets
    confirm_deployment

    # Run tests and quality checks (before deployment)
    run_tests
    run_quality_checks

    # Deploy components
    if [ "$PARALLEL" = true ] && [ "$SKIP_BACKEND" = false ] && [ "$SKIP_FRONTEND" = false ]; then
        log_info "Running deployments in parallel..."
        deploy_backend &
        local backend_pid=$!

        deploy_frontend &
        local frontend_pid=$!

        wait $backend_pid || { log_error "Backend deployment failed"; exit 1; }
        wait $frontend_pid || { log_error "Frontend deployment failed"; exit 1; }
    else
        deploy_backend
        deploy_frontend
    fi

    # Generate deployment report
    generate_report

    log_success "Full deployment completed successfully!"
}

main "$@"
