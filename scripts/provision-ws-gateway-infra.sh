#!/usr/bin/env bash
#
# Provision infrastructure for Bayit+ WebSocket Gateway
#
# Project:  bayit-plus
# Region:   us-east1
# Network:  default
#
# Run steps in order. Each step is idempotent (safe to re-run).
# Review output after each step before proceeding.

set -euo pipefail

PROJECT="bayit-plus"
REGION="us-east1"
NETWORK="default"

echo "=== Bayit+ WS Gateway Infrastructure Provisioning ==="
echo "Project: $PROJECT | Region: $REGION | Network: $NETWORK"
echo ""

# ============================================
# Step 1: Enable required APIs
# ============================================
echo "--- Step 1: Enabling APIs ---"

gcloud services enable redis.googleapis.com \
  --project="$PROJECT"

gcloud services enable vpcaccess.googleapis.com \
  --project="$PROJECT"

gcloud services enable run.googleapis.com \
  --project="$PROJECT"

echo "APIs enabled."
echo ""

# ============================================
# Step 2: Create VPC Connector
# ============================================
echo "--- Step 2: Creating VPC Connector ---"

# Check if connector already exists
if gcloud compute networks vpc-access connectors describe bayit-vpc-connector \
  --region="$REGION" --project="$PROJECT" &>/dev/null; then
  echo "VPC connector 'bayit-vpc-connector' already exists. Skipping."
else
  gcloud compute networks vpc-access connectors create bayit-vpc-connector \
    --region="$REGION" \
    --network="$NETWORK" \
    --range="10.8.0.0/28" \
    --min-instances=2 \
    --max-instances=3 \
    --project="$PROJECT"
  echo "VPC connector created."
fi
echo ""

# ============================================
# Step 3: Create Memorystore Redis Instance
# ============================================
echo "--- Step 3: Creating Memorystore Redis ---"

# Check if Redis instance already exists
if gcloud redis instances describe bayit-redis \
  --region="$REGION" --project="$PROJECT" &>/dev/null; then
  echo "Redis instance 'bayit-redis' already exists. Skipping."
else
  gcloud redis instances create bayit-redis \
    --size=1 \
    --region="$REGION" \
    --tier=standard \
    --network="$NETWORK" \
    --redis-version=redis_7_2 \
    --project="$PROJECT" \
    --async

  echo "Redis instance creation started (takes 5-10 minutes)."
  echo "Run this to check status:"
  echo "  gcloud redis instances describe bayit-redis --region=$REGION --project=$PROJECT --format='value(state)'"
fi
echo ""

# ============================================
# Step 4: Wait for Redis & get host IP
# ============================================
echo "--- Step 4: Waiting for Redis to be READY ---"
echo "(This can take 5-10 minutes for a new instance)"

REDIS_STATE=""
while [ "$REDIS_STATE" != "READY" ]; do
  REDIS_STATE=$(gcloud redis instances describe bayit-redis \
    --region="$REGION" --project="$PROJECT" \
    --format='value(state)' 2>/dev/null || echo "CREATING")
  if [ "$REDIS_STATE" != "READY" ]; then
    echo "  State: $REDIS_STATE ... waiting 30s"
    sleep 30
  fi
done

REDIS_HOST=$(gcloud redis instances describe bayit-redis \
  --region="$REGION" --project="$PROJECT" \
  --format='value(host)')

REDIS_PORT=$(gcloud redis instances describe bayit-redis \
  --region="$REGION" --project="$PROJECT" \
  --format='value(port)')

REDIS_URL="redis://${REDIS_HOST}:${REDIS_PORT}/0"

echo "Redis READY at $REDIS_URL"
echo ""

# ============================================
# Step 5: Store REDIS_URL in Secret Manager
# ============================================
echo "--- Step 5: Storing REDIS_URL in Secret Manager ---"

# Create secret if it doesn't exist
if gcloud secrets describe bayit-redis-url --project="$PROJECT" &>/dev/null; then
  echo "Secret 'bayit-redis-url' exists. Adding new version."
else
  gcloud secrets create bayit-redis-url \
    --replication-policy=automatic \
    --project="$PROJECT"
  echo "Secret 'bayit-redis-url' created."
fi

echo -n "$REDIS_URL" | gcloud secrets versions add bayit-redis-url \
  --data-file=- \
  --project="$PROJECT"

echo "REDIS_URL stored: $REDIS_URL"
echo ""

# ============================================
# Step 6: Attach VPC Connector to Monolith
# ============================================
echo "--- Step 6: Attaching VPC connector to bayit-backend-production ---"

gcloud run services update bayit-backend-production \
  --region="$REGION" \
  --vpc-connector=bayit-vpc-connector \
  --vpc-egress=private-ranges-only \
  --project="$PROJECT"

echo "VPC connector attached to monolith."
echo ""

# ============================================
# Step 7: Deploy updated monolith (Phase 1+2)
# ============================================
echo "--- Step 7: Deploy monolith with Redis support ---"
echo ""
echo "Run from bayit-plus/ root:"
echo ""
echo "  gcloud builds submit --config=cloudbuild.yaml --project=$PROJECT ."
echo ""
echo "After deploy, verify in Cloud Run logs:"
echo "  - 'Redis client and pub/sub manager initialized'"
echo "  - Health check passes"
echo ""

# ============================================
# Step 8: Deploy WS Gateway
# ============================================
echo "--- Step 8: Deploy WS Gateway ---"
echo ""
echo "Run from bayit-plus/ root:"
echo ""
echo "  gcloud builds submit --config=bayit-ws-gateway/cloudbuild-ws-gateway.yaml --project=$PROJECT ."
echo ""
echo "Then attach VPC connector to gateway:"
echo ""
echo "  gcloud run services update bayit-ws-gateway \\"
echo "    --region=$REGION \\"
echo "    --vpc-connector=bayit-vpc-connector \\"
echo "    --vpc-egress=private-ranges-only \\"
echo "    --project=$PROJECT"
echo ""

# ============================================
# Step 9: DNS for ws.bayit.tv
# ============================================
echo "--- Step 9: DNS Setup for ws.bayit.tv ---"
echo ""
echo "Option A - Cloud Run domain mapping:"
echo ""
echo "  gcloud beta run domain-mappings create \\"
echo "    --service=bayit-ws-gateway \\"
echo "    --domain=ws.bayit.tv \\"
echo "    --region=$REGION \\"
echo "    --project=$PROJECT"
echo ""
echo "Then add the CNAME record shown in the output to your DNS provider."
echo ""
echo "Option B - If using Cloudflare/external DNS:"
echo "  Add CNAME: ws.bayit.tv -> ghs.googlehosted.com"
echo "  (after domain mapping is verified)"
echo ""

# ============================================
# Step 10: Verify
# ============================================
echo "--- Step 10: Verification Commands ---"
echo ""
echo "# Check Redis status"
echo "gcloud redis instances describe bayit-redis --region=$REGION --project=$PROJECT"
echo ""
echo "# Check monolith logs for Redis connection"
echo "gcloud run services logs read bayit-backend-production --region=$REGION --project=$PROJECT --limit=50"
echo ""
echo "# Check gateway health"
echo "curl -s https://ws.bayit.tv/health"
echo ""
echo "# Check gateway logs"
echo "gcloud run services logs read bayit-ws-gateway --region=$REGION --project=$PROJECT --limit=50"
echo ""
echo "=== Provisioning script complete ==="
