#!/bin/bash
# =============================================================================
# Olorin Backend - Cloud Run Deployment Script
# =============================================================================
# Usage: ./deployment/scripts/deploy_server.sh [options]
#
# Options:
#   --environment <env>  Set deployment environment (staging|production)
#   --skip-tests         Skip test suite execution
#   --skip-quality       Skip quality checks (tox)
#   --skip-build         Skip Docker build (deploy existing image)
#   --skip-verification  Skip post-deployment health verification
#   --skip-secrets-check Skip secrets verification
#   --image <tag>        Deploy specific image tag (default: latest)
#   --dry-run            Show what would be done without executing
#   --force              Skip confirmation prompts
#   -h, --help           Show this help message
#
# =============================================================================

set -euo pipefail

# =============================================================================
# Configuration
# =============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Default values
ENVIRONMENT="${OLORIN_ENVIRONMENT:-staging}"
PROJECT_ID="${OLORIN_PROJECT_ID:-olorin-fraud-detection}"
REGION="${OLORIN_REGION:-us-east1}"
SERVICE_NAME_PREFIX="olorin-backend"

# Docker/Artifact Registry
ARTIFACT_REGISTRY="us-east1-docker.pkg.dev"
REPOSITORY="olorin"
IMAGE_NAME="backend"
IMAGE_TAG="latest"

# Cloud Run settings (environment-specific defaults)
MEMORY_STAGING="2Gi"
MEMORY_PRODUCTION="4Gi"
CPU_STAGING="1"
CPU_PRODUCTION="2"
MIN_INSTANCES_STAGING="0"
MIN_INSTANCES_PRODUCTION="1"
MAX_INSTANCES_STAGING="5"
MAX_INSTANCES_PRODUCTION="10"
CONCURRENCY="80"
TIMEOUT="300"

# Feature flags
SKIP_TESTS=false
SKIP_QUALITY=false
SKIP_BUILD=false
SKIP_VERIFICATION=false
SKIP_SECRETS_CHECK=false
DRY_RUN=false
FORCE=false

# Build tracking
BUILD_ID="$(date +%Y%m%d-%H%M%S)"
START_TIME=$(date +%s)

# =============================================================================
# Required Secrets Definition
# =============================================================================
# Core secrets required for ALL deployments
CORE_SECRETS=(
    "MONGODB_URI:olorin-mongodb-uri"
    "MONGODB_DATABASE:olorin-mongodb-database"
    "JWT_SECRET_KEY:JWT_SECRET_KEY"
    "ANTHROPIC_API_KEY:ANTHROPIC_API_KEY"
    "OPENAI_API_KEY:OPENAI_API_KEY"
)

# Database secrets
DATABASE_SECRETS=(
    "DATABASE_PASSWORD:DATABASE_PASSWORD"
    "POSTGRES_PASSWORD:POSTGRES_PASSWORD"
    "SNOWFLAKE_PASSWORD:SNOWFLAKE_PASSWORD"
    "SNOWFLAKE_ACCOUNT:SNOWFLAKE_ACCOUNT"
    "SNOWFLAKE_PRIVATE_KEY:SNOWFLAKE_PRIVATE_KEY"
)

# Observability secrets
OBSERVABILITY_SECRETS=(
    "LANGFUSE_SECRET_KEY:LANGFUSE_SECRET_KEY"
    "LANGFUSE_PUBLIC_KEY:LANGFUSE_PUBLIC_KEY"
    "SPLUNK_PASSWORD:SPLUNK_PASSWORD"
    "SPLUNK_TOKEN:SPLUNK_TOKEN"
)

# Cache secrets
CACHE_SECRETS=(
    "REDIS_PASSWORD:REDIS_PASSWORD"
)

# B2B Platform secrets (only required if B2B is enabled)
B2B_SECRETS=(
    "OLORIN_B2B_JWT_SECRET:OLORIN_B2B_JWT_SECRET"
    "OLORIN_B2B_API_KEY_SALT:OLORIN_B2B_API_KEY_SALT"
    "OLORIN_B2B_STRIPE_SECRET_KEY:OLORIN_B2B_STRIPE_SECRET_KEY"
    "OLORIN_B2B_STRIPE_WEBHOOK_SECRET:OLORIN_B2B_STRIPE_WEBHOOK_SECRET"
    "BAYIT_PLUS_INTERNAL_API_KEY:BAYIT_PLUS_INTERNAL_API_KEY"
)

# API keys
API_SECRETS=(
    "OLORIN_API_KEY:OLORIN_API_KEY"
)

# =============================================================================
# Colors
# =============================================================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# =============================================================================
# Logging
# =============================================================================
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "\n${MAGENTA}${BOLD}=== $1 ===${NC}\n"; }
log_substep() { echo -e "${CYAN}  -> $1${NC}"; }

# =============================================================================
# Helper Functions
# =============================================================================
show_help() {
    head -25 "$0" | tail -20
    exit 0
}

get_env_config() {
    case "$ENVIRONMENT" in
        staging)
            MEMORY="$MEMORY_STAGING"
            CPU="$CPU_STAGING"
            MIN_INSTANCES="$MIN_INSTANCES_STAGING"
            MAX_INSTANCES="$MAX_INSTANCES_STAGING"
            SERVICE_NAME="${SERVICE_NAME_PREFIX}-staging"
            ;;
        production)
            MEMORY="$MEMORY_PRODUCTION"
            CPU="$CPU_PRODUCTION"
            MIN_INSTANCES="$MIN_INSTANCES_PRODUCTION"
            MAX_INSTANCES="$MAX_INSTANCES_PRODUCTION"
            SERVICE_NAME="${SERVICE_NAME_PREFIX}-production"
            ;;
        *)
            log_error "Invalid environment: $ENVIRONMENT"
            exit 1
            ;;
    esac

    FULL_IMAGE_PATH="${ARTIFACT_REGISTRY}/${PROJECT_ID}/${REPOSITORY}/${IMAGE_NAME}"
}

check_prerequisites() {
    log_step "Checking Prerequisites"

    local missing=()

    command -v gcloud >/dev/null 2>&1 || missing+=("gcloud")
    command -v docker >/dev/null 2>&1 || missing+=("docker")
    command -v poetry >/dev/null 2>&1 || missing+=("poetry")

    if [ ${#missing[@]} -gt 0 ]; then
        log_error "Missing required tools: ${missing[*]}"
        exit 1
    fi

    # Check gcloud auth
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null | grep -q .; then
        log_error "Not authenticated with gcloud. Run: gcloud auth login"
        exit 1
    fi

    # Set project
    gcloud config set project "$PROJECT_ID" --quiet

    # Configure Docker for Artifact Registry
    log_substep "Configuring Docker for Artifact Registry..."
    gcloud auth configure-docker "$ARTIFACT_REGISTRY" --quiet 2>/dev/null || true

    log_success "Prerequisites satisfied"
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
    local optional_missing=()

    # Check core secrets (required)
    log_substep "Checking core secrets..."
    for secret_pair in "${CORE_SECRETS[@]}"; do
        local env_var="${secret_pair%%:*}"
        local secret_name="${secret_pair##*:}"
        if check_secret_exists "$secret_name"; then
            echo -e "    ${GREEN}✓${NC} $secret_name"
        else
            echo -e "    ${RED}✗${NC} $secret_name (REQUIRED)"
            missing_secrets+=("$secret_name")
        fi
    done

    # Check database secrets (required for full functionality)
    log_substep "Checking database secrets..."
    for secret_pair in "${DATABASE_SECRETS[@]}"; do
        local env_var="${secret_pair%%:*}"
        local secret_name="${secret_pair##*:}"
        if check_secret_exists "$secret_name"; then
            echo -e "    ${GREEN}✓${NC} $secret_name"
        else
            echo -e "    ${YELLOW}○${NC} $secret_name (optional)"
            optional_missing+=("$secret_name")
        fi
    done

    # Check observability secrets
    log_substep "Checking observability secrets..."
    for secret_pair in "${OBSERVABILITY_SECRETS[@]}"; do
        local env_var="${secret_pair%%:*}"
        local secret_name="${secret_pair##*:}"
        if check_secret_exists "$secret_name"; then
            echo -e "    ${GREEN}✓${NC} $secret_name"
        else
            echo -e "    ${YELLOW}○${NC} $secret_name (optional)"
            optional_missing+=("$secret_name")
        fi
    done

    # Check cache secrets
    log_substep "Checking cache secrets..."
    for secret_pair in "${CACHE_SECRETS[@]}"; do
        local env_var="${secret_pair%%:*}"
        local secret_name="${secret_pair##*:}"
        if check_secret_exists "$secret_name"; then
            echo -e "    ${GREEN}✓${NC} $secret_name"
        else
            echo -e "    ${YELLOW}○${NC} $secret_name (optional)"
            optional_missing+=("$secret_name")
        fi
    done

    # Check API secrets
    log_substep "Checking API secrets..."
    for secret_pair in "${API_SECRETS[@]}"; do
        local env_var="${secret_pair%%:*}"
        local secret_name="${secret_pair##*:}"
        if check_secret_exists "$secret_name"; then
            echo -e "    ${GREEN}✓${NC} $secret_name"
        else
            echo -e "    ${YELLOW}○${NC} $secret_name (optional)"
            optional_missing+=("$secret_name")
        fi
    done

    # Check B2B secrets (required only if B2B enabled in env vars)
    log_substep "Checking B2B Platform secrets..."
    local b2b_enabled=false
    if [ -f "$PROJECT_ROOT/cloudrun-env-vars.${ENVIRONMENT}.txt" ]; then
        if grep -q "OLORIN_B2B_ENABLED=true" "$PROJECT_ROOT/cloudrun-env-vars.${ENVIRONMENT}.txt"; then
            b2b_enabled=true
        fi
    fi

    for secret_pair in "${B2B_SECRETS[@]}"; do
        local env_var="${secret_pair%%:*}"
        local secret_name="${secret_pair##*:}"
        if check_secret_exists "$secret_name"; then
            echo -e "    ${GREEN}✓${NC} $secret_name"
        else
            if [ "$b2b_enabled" = true ]; then
                echo -e "    ${RED}✗${NC} $secret_name (REQUIRED - B2B enabled)"
                missing_secrets+=("$secret_name")
            else
                echo -e "    ${YELLOW}○${NC} $secret_name (B2B disabled)"
            fi
        fi
    done

    # Report results
    echo ""
    if [ ${#missing_secrets[@]} -gt 0 ]; then
        log_error "Missing required secrets: ${missing_secrets[*]}"
        echo ""
        log_info "To create missing secrets, run:"
        echo "  ./deployment/scripts/setup_gcp_secrets.sh --env-file .env"
        echo ""
        log_info "Or create them manually:"
        for secret in "${missing_secrets[@]}"; do
            echo "  echo -n 'YOUR_VALUE' | gcloud secrets create $secret --data-file=- --project=$PROJECT_ID"
        done
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

    if [ ${#optional_missing[@]} -gt 0 ]; then
        log_warning "Optional secrets not configured: ${#optional_missing[@]}"
        log_info "Some features may be limited without these secrets"
    fi
}

generate_secrets_string() {
    log_substep "Generating secrets configuration..."

    local secrets_file="$PROJECT_ROOT/cloudrun-secrets.txt"

    if [ -f "$secrets_file" ]; then
        # Use existing secrets file
        cat "$secrets_file"
    else
        # Generate from verified secrets
        local secrets_array=()

        # Add all secrets that exist
        for secret_pair in "${CORE_SECRETS[@]}" "${DATABASE_SECRETS[@]}" "${OBSERVABILITY_SECRETS[@]}" "${CACHE_SECRETS[@]}" "${API_SECRETS[@]}" "${B2B_SECRETS[@]}"; do
            local env_var="${secret_pair%%:*}"
            local secret_name="${secret_pair##*:}"
            if check_secret_exists "$secret_name"; then
                secrets_array+=("${env_var}=${secret_name}:latest")
            fi
        done

        # Join with commas
        local IFS=','
        echo "${secrets_array[*]}"
    fi
}

validate_poetry() {
    log_step "Validating Poetry Configuration"

    cd "$PROJECT_ROOT"

    log_substep "Checking poetry.lock..."
    if ! poetry check 2>/dev/null; then
        log_warning "Poetry lock file may be out of sync. Running poetry lock..."
        poetry lock --no-update
    fi

    log_substep "Installing dependencies..."
    poetry install --no-root

    log_success "Poetry configuration valid"
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

    log_substep "Compiling Python files for syntax validation..."
    if ! poetry run python -m py_compile app/main.py; then
        log_error "Python syntax error detected!"
        exit 1
    fi

    log_substep "Running pytest..."
    if ! poetry run pytest --tb=short -q --cov=app --cov-report=term-missing --cov-fail-under=30; then
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
        log_info "[DRY RUN] Would run quality checks"
        return 0
    fi

    local failed=false

    log_substep "Running black (code formatting)..."
    if ! poetry run black --check app/ 2>/dev/null; then
        log_warning "Black formatting check failed"
        failed=true
    fi

    log_substep "Running isort (import sorting)..."
    if ! poetry run isort --check-only app/ 2>/dev/null; then
        log_warning "isort check failed"
        failed=true
    fi

    log_substep "Running mypy (type checking)..."
    if ! poetry run mypy app/ --ignore-missing-imports 2>/dev/null; then
        log_warning "mypy type check failed"
        failed=true
    fi

    if [ "$failed" = true ]; then
        log_warning "Some quality checks failed, but continuing deployment..."
    else
        log_success "All quality checks passed"
    fi
}

build_docker_image() {
    if [ "$SKIP_BUILD" = true ]; then
        log_warning "Skipping Docker build (--skip-build)"
        return 0
    fi

    log_step "Building Docker Image"

    cd "$PROJECT_ROOT"

    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] Would build: ${FULL_IMAGE_PATH}:${BUILD_ID}"
        return 0
    fi

    local dockerfile="Dockerfile.cloudrun"
    if [ ! -f "$dockerfile" ]; then
        dockerfile="Dockerfile"
    fi

    log_substep "Building image with $dockerfile..."
    log_info "Image: ${FULL_IMAGE_PATH}:${BUILD_ID}"

    # Build with cache from latest
    docker build \
        --file "$dockerfile" \
        --tag "${FULL_IMAGE_PATH}:${BUILD_ID}" \
        --tag "${FULL_IMAGE_PATH}:latest" \
        --tag "${FULL_IMAGE_PATH}:deployed-${ENVIRONMENT}" \
        --cache-from "${FULL_IMAGE_PATH}:latest" \
        --build-arg BUILDKIT_INLINE_CACHE=1 \
        --platform linux/amd64 \
        . || {
            log_error "Docker build failed!"
            exit 1
        }

    log_success "Docker image built successfully"
}

push_docker_image() {
    if [ "$SKIP_BUILD" = true ]; then
        log_warning "Skipping Docker push (--skip-build)"
        return 0
    fi

    log_step "Pushing Docker Image to Artifact Registry"

    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] Would push: ${FULL_IMAGE_PATH}:${BUILD_ID}"
        return 0
    fi

    log_substep "Pushing ${FULL_IMAGE_PATH}:${BUILD_ID}..."
    docker push "${FULL_IMAGE_PATH}:${BUILD_ID}"

    log_substep "Pushing ${FULL_IMAGE_PATH}:latest..."
    docker push "${FULL_IMAGE_PATH}:latest"

    log_substep "Pushing ${FULL_IMAGE_PATH}:deployed-${ENVIRONMENT}..."
    docker push "${FULL_IMAGE_PATH}:deployed-${ENVIRONMENT}"

    log_success "Docker images pushed successfully"
}

deploy_to_cloud_run() {
    log_step "Deploying to Cloud Run"

    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] Would deploy to Cloud Run service: $SERVICE_NAME"
        return 0
    fi

    # Read environment variables configuration
    local env_vars_file="$PROJECT_ROOT/cloudrun-env-vars.${ENVIRONMENT}.txt"

    if [ ! -f "$env_vars_file" ]; then
        log_error "Missing: $env_vars_file"
        exit 1
    fi

    local env_vars
    env_vars=$(cat "$env_vars_file" | tr '\n' ',' | sed 's/,$//')

    # Generate secrets string
    local secrets
    secrets=$(generate_secrets_string)

    log_substep "Deploying $SERVICE_NAME..."
    log_info "  Memory: $MEMORY"
    log_info "  CPU: $CPU"
    log_info "  Min Instances: $MIN_INSTANCES"
    log_info "  Max Instances: $MAX_INSTANCES"

    local image_to_deploy="${FULL_IMAGE_PATH}:${IMAGE_TAG}"
    if [ "$SKIP_BUILD" = false ]; then
        image_to_deploy="${FULL_IMAGE_PATH}:${BUILD_ID}"
    fi

    # Build the deployment command
    local deploy_cmd="gcloud run deploy $SERVICE_NAME \
        --image $image_to_deploy \
        --region $REGION \
        --project $PROJECT_ID \
        --platform managed \
        --allow-unauthenticated \
        --memory $MEMORY \
        --cpu $CPU \
        --min-instances $MIN_INSTANCES \
        --max-instances $MAX_INSTANCES \
        --concurrency $CONCURRENCY \
        --timeout ${TIMEOUT}s \
        --set-env-vars \"$env_vars\" \
        --service-account olorin-detection@${PROJECT_ID}.iam.gserviceaccount.com \
        --execution-environment gen2 \
        --cpu-throttling \
        --no-cpu-boost \
        --port 8090 \
        --quiet"

    # Add secrets if available
    if [ -n "$secrets" ]; then
        deploy_cmd="$deploy_cmd --set-secrets \"$secrets\""
    fi

    # Execute deployment
    eval $deploy_cmd

    log_success "Deployed to Cloud Run"
}

verify_deployment() {
    if [ "$SKIP_VERIFICATION" = true ]; then
        log_warning "Skipping deployment verification (--skip-verification)"
        return 0
    fi

    log_step "Verifying Deployment"

    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] Would verify deployment health"
        return 0
    fi

    # Get service URL
    local service_url
    service_url=$(gcloud run services describe "$SERVICE_NAME" \
        --region "$REGION" \
        --project "$PROJECT_ID" \
        --format="value(status.url)" 2>/dev/null)

    if [ -z "$service_url" ]; then
        log_error "Could not retrieve service URL"
        exit 1
    fi

    log_substep "Service URL: $service_url"

    # Health check with retries
    local max_attempts=18
    local attempt=1
    local health_url="${service_url}/health"

    log_substep "Checking health endpoint: $health_url"

    while [ $attempt -le $max_attempts ]; do
        log_info "  Attempt $attempt/$max_attempts..."

        local status_code
        status_code=$(curl -s -o /dev/null -w "%{http_code}" "$health_url" --max-time 10 || echo "000")

        if [ "$status_code" = "200" ]; then
            log_success "Health check passed!"

            # Verify OpenAPI docs
            local docs_status
            docs_status=$(curl -s -o /dev/null -w "%{http_code}" "${service_url}/docs" --max-time 10 || echo "000")
            if [ "$docs_status" = "200" ]; then
                log_substep "OpenAPI docs available at: ${service_url}/docs"
            fi

            return 0
        fi

        log_warning "  Health check returned: $status_code"
        sleep 10
        ((attempt++))
    done

    log_error "Health check failed after $max_attempts attempts!"
    log_info "Check logs: gcloud run services logs read $SERVICE_NAME --region $REGION --project $PROJECT_ID"
    exit 1
}

generate_report() {
    local end_time=$(date +%s)
    local duration=$((end_time - START_TIME))

    log_step "Deployment Report"

    local service_url
    service_url=$(gcloud run services describe "$SERVICE_NAME" \
        --region "$REGION" \
        --project "$PROJECT_ID" \
        --format="value(status.url)" 2>/dev/null || echo "N/A")

    local revision
    revision=$(gcloud run services describe "$SERVICE_NAME" \
        --region "$REGION" \
        --project "$PROJECT_ID" \
        --format="value(status.latestReadyRevisionName)" 2>/dev/null || echo "N/A")

    echo ""
    echo -e "${BOLD}Backend Deployment Completed${NC}"
    echo "================================"
    echo "  Build ID:      $BUILD_ID"
    echo "  Environment:   $ENVIRONMENT"
    echo "  Service:       $SERVICE_NAME"
    echo "  Revision:      $revision"
    echo "  Duration:      ${duration}s"
    echo ""
    echo "  Service URL:   $service_url"
    echo "  Health:        ${service_url}/health"
    echo "  API Docs:      ${service_url}/docs"
    echo ""
    echo "Secrets Configured:"
    echo "  Core:          ${#CORE_SECRETS[@]} secrets"
    echo "  Database:      ${#DATABASE_SECRETS[@]} secrets"
    echo "  Observability: ${#OBSERVABILITY_SECRETS[@]} secrets"
    echo "  B2B Platform:  ${#B2B_SECRETS[@]} secrets"
    echo ""
    echo "Useful Commands:"
    echo "  View logs:     gcloud run services logs read $SERVICE_NAME --region $REGION --project $PROJECT_ID"
    echo "  Rollback:      gcloud run services update-traffic $SERVICE_NAME --to-revisions=<revision>=100 --region $REGION"
    echo "  List revisions: gcloud run revisions list --service=$SERVICE_NAME --region $REGION --limit=5"
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
            --skip-verification)
                SKIP_VERIFICATION=true
                shift
                ;;
            --skip-secrets-check)
                SKIP_SECRETS_CHECK=true
                shift
                ;;
            --image)
                IMAGE_TAG="$2"
                shift 2
                ;;
            --dry-run)
                DRY_RUN=true
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
    echo -e "${BOLD}${MAGENTA}======================================${NC}"
    echo -e "${BOLD}${MAGENTA}  Olorin Backend Deployment          ${NC}"
    echo -e "${BOLD}${MAGENTA}======================================${NC}"
    echo ""

    if [ "$DRY_RUN" = true ]; then
        echo -e "${YELLOW}${BOLD}DRY RUN MODE${NC}"
        echo ""
    fi

    # Initialize environment-specific configuration
    get_env_config

    # Pre-flight checks
    check_prerequisites

    # Verify secrets in GCP Secret Manager
    verify_secrets

    # Validate Poetry
    validate_poetry

    # Run verification (tests and quality)
    run_tests
    run_quality_checks

    # Build and push
    build_docker_image
    push_docker_image

    # Deploy
    deploy_to_cloud_run

    # Verify
    verify_deployment

    # Report
    generate_report

    log_success "Backend deployment completed successfully!"
}

main "$@"
