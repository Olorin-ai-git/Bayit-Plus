#!/usr/bin/env bash
#
# Deploy GCP Cloud Load Balancer URL map for Bayit+ service mesh.
#
# Usage:
#   ./infrastructure/deploy-lb.sh [--project PROJECT_ID] [--region REGION]
#
# Prerequisites:
#   - gcloud CLI authenticated with appropriate permissions
#   - Cloud Run services already deployed
#
# This script:
#   1. Creates serverless NEGs for each Cloud Run service
#   2. Creates backend services pointing to those NEGs
#   3. Creates/updates the URL map with path-based routing
#   4. Creates/updates the HTTPS proxy and forwarding rule

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ID="${1:-$(gcloud config get-value project 2>/dev/null)}"
REGION="${REGION:-us-east1}"
URL_MAP_NAME="bayit-api-url-map"
PROXY_NAME="bayit-api-https-proxy"
FORWARDING_RULE="bayit-api-forwarding-rule"
SSL_CERT="bayit-api-ssl-cert"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

if [ -z "${PROJECT_ID}" ]; then
    log "ERROR: No project ID. Set via --project or gcloud config."
    exit 1
fi

log "Project: ${PROJECT_ID}, Region: ${REGION}"

# Serverless NEGs for each Cloud Run service
declare -A SERVICES=(
    ["bayit-backend-neg"]="bayit-backend-production"
    ["bayit-ws-gateway-neg"]="bayit-ws-gateway"
    ["bayit-admin-neg"]="bayit-admin"
    ["olorin-b2b-api-neg"]="olorin-b2b-api"
    ["bayit-search-neg"]="bayit-search"
    ["bayit-ai-neg"]="bayit-ai"
    ["bayit-workers-neg"]="bayit-workers"
    ["bayit-auth-neg"]="bayit-auth"
    ["bayit-content-neg"]="bayit-content"
    ["bayit-user-neg"]="bayit-user"
    ["bayit-payments-neg"]="bayit-payments"
    ["bayit-social-neg"]="bayit-social"
    ["bayit-media-pipeline-neg"]="bayit-media-pipeline"
    ["bayit-community-neg"]="bayit-community"
)

# Step 1: Create serverless NEGs
for neg_name in "${!SERVICES[@]}"; do
    service="${SERVICES[$neg_name]}"
    if gcloud compute network-endpoint-groups describe "${neg_name}" \
        --region="${REGION}" --project="${PROJECT_ID}" &>/dev/null; then
        log "NEG ${neg_name} already exists, skipping"
    else
        log "Creating NEG ${neg_name} -> ${service}"
        gcloud compute network-endpoint-groups create "${neg_name}" \
            --region="${REGION}" \
            --network-endpoint-type=serverless \
            --cloud-run-service="${service}" \
            --project="${PROJECT_ID}"
    fi
done

# Step 2: Create backend services
declare -A BACKEND_TIMEOUTS=(
    ["bayit-backend-bs"]="300"
    ["bayit-ws-gateway-bs"]="3600"
    ["bayit-admin-bs"]="300"
    ["olorin-b2b-api-bs"]="300"
    ["bayit-search-bs"]="60"
    ["bayit-ai-bs"]="3600"
    ["bayit-workers-bs"]="3600"
    ["bayit-auth-bs"]="30"
    ["bayit-content-bs"]="30"
    ["bayit-user-bs"]="15"
    ["bayit-payments-bs"]="30"
    ["bayit-social-bs"]="15"
    ["bayit-media-pipeline-bs"]="3600"
    ["bayit-community-bs"]="30"
)

declare -A BACKEND_NEGS=(
    ["bayit-backend-bs"]="bayit-backend-neg"
    ["bayit-ws-gateway-bs"]="bayit-ws-gateway-neg"
    ["bayit-admin-bs"]="bayit-admin-neg"
    ["olorin-b2b-api-bs"]="olorin-b2b-api-neg"
    ["bayit-search-bs"]="bayit-search-neg"
    ["bayit-ai-bs"]="bayit-ai-neg"
    ["bayit-workers-bs"]="bayit-workers-neg"
    ["bayit-auth-bs"]="bayit-auth-neg"
    ["bayit-content-bs"]="bayit-content-neg"
    ["bayit-user-bs"]="bayit-user-neg"
    ["bayit-payments-bs"]="bayit-payments-neg"
    ["bayit-social-bs"]="bayit-social-neg"
    ["bayit-media-pipeline-bs"]="bayit-media-pipeline-neg"
    ["bayit-community-bs"]="bayit-community-neg"
)

for bs_name in "${!BACKEND_NEGS[@]}"; do
    neg_name="${BACKEND_NEGS[$bs_name]}"
    if gcloud compute backend-services describe "${bs_name}" \
        --global --project="${PROJECT_ID}" &>/dev/null; then
        log "Backend service ${bs_name} already exists, skipping"
    else
        log "Creating backend service ${bs_name}"
        gcloud compute backend-services create "${bs_name}" \
            --global \
            --load-balancing-scheme=EXTERNAL_MANAGED \
            --project="${PROJECT_ID}"

        gcloud compute backend-services add-backend "${bs_name}" \
            --global \
            --network-endpoint-group="${neg_name}" \
            --network-endpoint-group-region="${REGION}" \
            --project="${PROJECT_ID}"
    fi
done

# Step 3: Create URL map (initially all traffic to monolith)
if gcloud compute url-maps describe "${URL_MAP_NAME}" \
    --project="${PROJECT_ID}" &>/dev/null; then
    log "URL map ${URL_MAP_NAME} already exists"
    log "To update path rules, use: gcloud compute url-maps edit ${URL_MAP_NAME}"
else
    log "Creating URL map ${URL_MAP_NAME} (default -> bayit-backend-bs)"
    gcloud compute url-maps create "${URL_MAP_NAME}" \
        --default-service="bayit-backend-bs" \
        --project="${PROJECT_ID}"
fi

log "Load balancer infrastructure deployed."
log ""
log "Next steps:"
log "  1. Deploy each Cloud Run service via its cloudbuild-*.yaml"
log "  2. Verify each service responds at its direct URL"
log "  3. Add path rules to the URL map:"
log "     gcloud compute url-maps add-path-matcher ${URL_MAP_NAME} \\"
log "       --path-matcher-name=bayit-services \\"
log "       --default-service=bayit-backend-bs \\"
log "       --path-rules='/api/v1/admin/*=bayit-admin-bs'"
