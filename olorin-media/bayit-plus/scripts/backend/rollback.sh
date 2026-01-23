#!/bin/bash
#
# Bayit+ Backend Cloud Run Rollback Script
#
# Quickly rollback to a previous Cloud Run revision.
#
# Usage:
#   ./scripts/rollback.sh [OPTIONS]
#
# Options:
#   -r, --revision    Specific revision name to rollback to
#   -n, --number      Rollback N revisions back (default: 1)
#   -e, --environment Environment: production or staging (default: production)
#   -l, --list        List available revisions
#   -d, --dry-run     Show what would be done without executing
#   -h, --help        Show this help message
#
# Examples:
#   ./scripts/rollback.sh                          # Rollback production to previous revision
#   ./scripts/rollback.sh -n 2                     # Rollback 2 revisions back
#   ./scripts/rollback.sh -r bayit-plus-backend-00005-abc  # Rollback to specific revision
#   ./scripts/rollback.sh -e staging -l            # List staging revisions
#

set -e

# Configuration
PROJECT_ID="${GCP_PROJECT_ID:-bayit-plus}"
REGION="${REGION:-us-east1}"
ENVIRONMENT="production"
REVISION=""
ROLLBACK_COUNT=1
DRY_RUN=false
LIST_ONLY=false

# Service names by environment
declare -A SERVICES
SERVICES["production"]="bayit-plus-backend"
SERVICES["staging"]="bayit-plus-backend-staging"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Functions
show_help() {
    sed -n '3,21p' "$0" | sed 's/^#//'
    exit 0
}

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

get_service_name() {
    echo "${SERVICES[$ENVIRONMENT]}"
}

list_revisions() {
    local service_name
    service_name=$(get_service_name)

    log_info "Listing revisions for $service_name in $REGION..."
    echo ""

    gcloud run revisions list \
        --service="$service_name" \
        --region="$REGION" \
        --format="table(name,active,deployed,service_account)" \
        --limit=10
}

get_revision_by_number() {
    local service_name
    service_name=$(get_service_name)
    local offset=$1

    gcloud run revisions list \
        --service="$service_name" \
        --region="$REGION" \
        --format="value(name)" \
        --limit=$((offset + 1)) | tail -1
}

get_current_revision() {
    local service_name
    service_name=$(get_service_name)

    gcloud run services describe "$service_name" \
        --region="$REGION" \
        --format="value(status.traffic[0].revisionName)"
}

perform_rollback() {
    local target_revision="$1"
    local service_name
    service_name=$(get_service_name)

    local current_revision
    current_revision=$(get_current_revision)

    echo ""
    log_info "Rollback Details:"
    echo "  Environment:    $ENVIRONMENT"
    echo "  Service:        $service_name"
    echo "  Region:         $REGION"
    echo "  Current:        $current_revision"
    echo "  Target:         $target_revision"
    echo ""

    if [ "$current_revision" = "$target_revision" ]; then
        log_warning "Target revision is already the current revision. Nothing to do."
        exit 0
    fi

    if [ "$DRY_RUN" = true ]; then
        log_warning "DRY RUN: Would route 100% traffic to $target_revision"
        echo ""
        echo "Command that would be executed:"
        echo "  gcloud run services update-traffic $service_name \\"
        echo "    --region=$REGION \\"
        echo "    --to-revisions=$target_revision=100"
        exit 0
    fi

    # Confirm rollback
    echo -e "${YELLOW}WARNING: This will route all traffic to revision: $target_revision${NC}"
    read -p "Are you sure you want to proceed? (y/N) " -n 1 -r
    echo ""

    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Rollback cancelled."
        exit 0
    fi

    # Perform rollback
    log_info "Rolling back to $target_revision..."

    gcloud run services update-traffic "$service_name" \
        --region="$REGION" \
        --to-revisions="$target_revision=100"

    log_success "Rollback completed!"

    # Verify health
    log_info "Verifying service health..."
    sleep 10

    local service_url
    service_url=$(gcloud run services describe "$service_name" \
        --region="$REGION" \
        --format="value(status.url)")

    if curl -sf "$service_url/health" > /dev/null; then
        log_success "Service is healthy after rollback!"
        echo ""
        echo "Service URL: $service_url"
    else
        log_error "Health check failed after rollback!"
        echo "Please investigate manually."
        exit 1
    fi
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -r|--revision)
            REVISION="$2"
            shift 2
            ;;
        -n|--number)
            ROLLBACK_COUNT="$2"
            shift 2
            ;;
        -e|--environment)
            ENVIRONMENT="$2"
            if [[ ! ${SERVICES[$ENVIRONMENT]+_} ]]; then
                log_error "Invalid environment: $ENVIRONMENT"
                echo "Valid environments: ${!SERVICES[*]}"
                exit 1
            fi
            shift 2
            ;;
        -l|--list)
            LIST_ONLY=true
            shift
            ;;
        -d|--dry-run)
            DRY_RUN=true
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

# Main execution
echo ""
echo "========================================"
echo "  Bayit+ Cloud Run Rollback"
echo "========================================"

# Verify gcloud is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -1 > /dev/null 2>&1; then
    log_error "Not authenticated with gcloud. Run: gcloud auth login"
    exit 1
fi

# List revisions if requested
if [ "$LIST_ONLY" = true ]; then
    list_revisions
    exit 0
fi

# Determine target revision
if [ -n "$REVISION" ]; then
    TARGET_REVISION="$REVISION"
else
    log_info "Finding revision $ROLLBACK_COUNT step(s) back..."
    TARGET_REVISION=$(get_revision_by_number "$ROLLBACK_COUNT")

    if [ -z "$TARGET_REVISION" ]; then
        log_error "Could not find revision $ROLLBACK_COUNT step(s) back"
        exit 1
    fi
fi

# Perform rollback
perform_rollback "$TARGET_REVISION"
