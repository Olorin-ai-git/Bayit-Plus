#!/bin/bash
# =============================================================================
# Olorin Platform - GCP Secret Manager Setup Script
# =============================================================================
# Usage: ./deployment/scripts/setup_gcp_secrets.sh [options]
#
# Options:
#   --env-file <path>    Path to .env file (default: .env)
#   --project <id>       GCP Project ID (default: olorin-fraud-detection)
#   --service-account    Service account to grant access
#   --dry-run            Show what would be done without executing
#   --force              Overwrite existing secrets
#   --list               List all secrets in project
#   -h, --help           Show this help message
#
# This script reads secrets from .env file and uploads them to GCP Secret Manager.
# It automatically detects sensitive keys by matching patterns:
#   PASSWORD, SECRET, KEY, TOKEN, PRIVATE, CREDENTIALS, URI, URL (with credentials)
#
# =============================================================================

set -euo pipefail

# =============================================================================
# Configuration
# =============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Defaults
ENV_FILE="$PROJECT_ROOT/.env"
PROJECT_ID="${OLORIN_PROJECT_ID:-olorin-fraud-detection}"
SERVICE_ACCOUNT="olorin-detection@olorin-fraud-detection.iam.gserviceaccount.com"
DRY_RUN=false
FORCE=false
LIST_ONLY=false

# Counters
created_count=0
updated_count=0
skipped_count=0
failed_count=0

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

# =============================================================================
# Helper Functions
# =============================================================================
show_help() {
    head -25 "$0" | tail -20
    exit 0
}

check_prerequisites() {
    log_step "Checking Prerequisites"

    if ! command -v gcloud &> /dev/null; then
        log_error "gcloud CLI not found. Please install it first."
        log_info "Visit: https://cloud.google.com/sdk/docs/install"
        exit 1
    fi

    # Check authentication
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null | grep -q .; then
        log_error "Not authenticated with gcloud. Run: gcloud auth login"
        exit 1
    fi

    # Set project
    gcloud config set project "$PROJECT_ID" --quiet
    log_success "Using project: $PROJECT_ID"
}

is_sensitive_key() {
    local key="$1"

    # Patterns that indicate sensitive data
    if [[ "$key" =~ (PASSWORD|SECRET|KEY|TOKEN|PRIVATE|CREDENTIALS|SALT) ]]; then
        return 0
    fi

    # URIs/URLs with potential credentials
    if [[ "$key" =~ (MONGODB_URI|DATABASE_URL|REDIS_URL|SNOWFLAKE_CONNECTION) ]]; then
        return 0
    fi

    # API keys and service accounts
    if [[ "$key" =~ (API_KEY|APIKEY|API_SECRET|CLIENT_SECRET) ]]; then
        return 0
    fi

    return 1
}

is_placeholder() {
    local value="$1"

    # Check for common placeholder patterns
    if [[ -z "$value" ]] || \
       [[ "$value" =~ ^(your-|YOUR_|CHANGE_ME|PLACEHOLDER|xxx|XXX|<.*>|\.\.\.) ]] || \
       [[ "$value" == "null" ]] || \
       [[ "$value" == "none" ]] || \
       [[ "$value" == '""' ]] || \
       [[ "$value" == "''" ]]; then
        return 0
    fi

    return 1
}

create_or_update_secret() {
    local key="$1"
    local value="$2"

    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] Would create/update secret: $key"
        return 0
    fi

    # Check if secret exists
    if gcloud secrets describe "$key" --project="$PROJECT_ID" &>/dev/null; then
        if [ "$FORCE" = true ]; then
            # Add new version
            echo -n "$value" | gcloud secrets versions add "$key" \
                --data-file=- \
                --project="$PROJECT_ID" 2>/dev/null
            if [ $? -eq 0 ]; then
                echo -e "  ${CYAN}$key${NC}: ${GREEN}Updated${NC}"
                ((updated_count++))
            else
                echo -e "  ${CYAN}$key${NC}: ${RED}Failed to update${NC}"
                ((failed_count++))
            fi
        else
            echo -e "  ${CYAN}$key${NC}: ${YELLOW}Exists (use --force to update)${NC}"
            ((skipped_count++))
        fi
    else
        # Create new secret
        echo -n "$value" | gcloud secrets create "$key" \
            --data-file=- \
            --replication-policy="automatic" \
            --labels="service=olorin,environment=production" \
            --project="$PROJECT_ID" 2>/dev/null
        if [ $? -eq 0 ]; then
            echo -e "  ${CYAN}$key${NC}: ${GREEN}Created${NC}"
            ((created_count++))
        else
            echo -e "  ${CYAN}$key${NC}: ${RED}Failed to create${NC}"
            ((failed_count++))
        fi
    fi
}

grant_service_account_access() {
    log_step "Granting Service Account Access"

    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] Would grant secretAccessor role to: $SERVICE_ACCOUNT"
        return 0
    fi

    log_info "Granting access to: $SERVICE_ACCOUNT"

    gcloud projects add-iam-policy-binding "$PROJECT_ID" \
        --member="serviceAccount:$SERVICE_ACCOUNT" \
        --role="roles/secretmanager.secretAccessor" \
        --quiet 2>/dev/null || true

    log_success "Service account access granted"
}

list_secrets() {
    log_step "Secrets in Project: $PROJECT_ID"

    gcloud secrets list --project="$PROJECT_ID" --format="table(name,createTime,replication.automatic)"
}

process_env_file() {
    log_step "Processing Secrets from: $ENV_FILE"

    if [ ! -f "$ENV_FILE" ]; then
        log_error "Environment file not found: $ENV_FILE"
        exit 1
    fi

    log_info "Reading environment file..."
    echo ""

    while IFS='=' read -r key value || [ -n "$key" ]; do
        # Skip comments and empty lines
        [[ "$key" =~ ^[[:space:]]*# ]] && continue
        [[ -z "$key" ]] && continue
        [[ "$key" =~ ^[[:space:]]*$ ]] && continue

        # Remove leading/trailing whitespace
        key=$(echo "$key" | xargs)
        value=$(echo "$value" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')

        # Remove surrounding quotes
        value="${value%\"}"
        value="${value#\"}"
        value="${value%\'}"
        value="${value#\'}"

        # Check if key is sensitive
        if is_sensitive_key "$key"; then
            # Skip placeholders
            if is_placeholder "$value"; then
                echo -e "  ${CYAN}$key${NC}: ${YELLOW}Skipped (placeholder value)${NC}"
                ((skipped_count++))
                continue
            fi

            # Create or update secret
            create_or_update_secret "$key" "$value"
        fi
    done < "$ENV_FILE"
}

generate_cloudrun_secrets_file() {
    log_step "Generating cloudrun-secrets.txt"

    local output_file="$PROJECT_ROOT/cloudrun-secrets.txt"
    local secrets=()

    # Get list of all secrets
    while IFS= read -r secret_name; do
        secrets+=("${secret_name}=${secret_name}:latest")
    done < <(gcloud secrets list --project="$PROJECT_ID" --format="value(name)" 2>/dev/null)

    if [ ${#secrets[@]} -gt 0 ]; then
        # Join with commas and write to file
        local secrets_string
        secrets_string=$(IFS=','; echo "${secrets[*]}")
        echo "$secrets_string" > "$output_file"
        log_success "Generated: $output_file"
        log_info "Contains ${#secrets[@]} secrets"
    else
        log_warning "No secrets found to generate file"
    fi
}

print_summary() {
    log_step "Summary"

    echo ""
    echo "Results:"
    echo -e "  ${GREEN}Created:${NC} $created_count secrets"
    echo -e "  ${BLUE}Updated:${NC} $updated_count secrets"
    echo -e "  ${YELLOW}Skipped:${NC} $skipped_count secrets"
    echo -e "  ${RED}Failed:${NC}  $failed_count secrets"
    echo ""

    if [ $failed_count -gt 0 ]; then
        log_warning "Some secrets failed to create/update"
    else
        log_success "All secrets processed successfully"
    fi

    echo ""
    echo "Next Steps:"
    echo "  1. Verify secrets: gcloud secrets list --project=$PROJECT_ID"
    echo "  2. Grant Cloud Run access (if not already done):"
    echo "     gcloud projects add-iam-policy-binding $PROJECT_ID \\"
    echo "       --member='serviceAccount:$SERVICE_ACCOUNT' \\"
    echo "       --role='roles/secretmanager.secretAccessor'"
    echo "  3. Deploy: ./deployment/scripts/deploy_server.sh --environment production"
    echo ""
}

# =============================================================================
# Main Execution
# =============================================================================
main() {
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --env-file)
                ENV_FILE="$2"
                shift 2
                ;;
            --project)
                PROJECT_ID="$2"
                shift 2
                ;;
            --service-account)
                SERVICE_ACCOUNT="$2"
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
            --list)
                LIST_ONLY=true
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
    echo -e "${BOLD}${MAGENTA}===========================================${NC}"
    echo -e "${BOLD}${MAGENTA}  Olorin GCP Secret Manager Setup         ${NC}"
    echo -e "${BOLD}${MAGENTA}===========================================${NC}"
    echo ""

    if [ "$DRY_RUN" = true ]; then
        echo -e "${YELLOW}${BOLD}DRY RUN MODE - No changes will be made${NC}"
        echo ""
    fi

    check_prerequisites

    if [ "$LIST_ONLY" = true ]; then
        list_secrets
        exit 0
    fi

    process_env_file
    grant_service_account_access
    generate_cloudrun_secrets_file
    print_summary
}

main "$@"
