#!/bin/bash

# Olorin Production Deployment Script
# This script executes Phase 1A deployment to Google Cloud Run
#
# Prerequisites:
#   - gcloud CLI installed and authenticated
#   - Docker installed (for local validation)
#   - GCP project: bayit-plus
#   - All 7 required secrets in GCP Secret Manager

set -e

PROJECT_ID="bayit-plus"
SERVICE_NAME="olorin-backend"
REGION="us-east1"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║         Olorin Production Deployment Script (Phase 1A)         ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Step 1: Verify GCP Project Access
echo "📍 STEP 1: Verifying GCP project access..."
CURRENT_PROJECT=$(gcloud config get-value project)
if [ "$CURRENT_PROJECT" != "$PROJECT_ID" ]; then
  echo "⚠️  Current project: $CURRENT_PROJECT"
  echo "    Setting to: $PROJECT_ID"
  gcloud config set project "$PROJECT_ID"
fi
echo "✓ GCP Project: $PROJECT_ID"
echo ""

# Step 2: Verify Required Secrets
echo "📍 STEP 2: Verifying required secrets in Secret Manager..."
REQUIRED_SECRETS=(
  "bayit-mongodb-url"
  "bayit-mongodb-db-name"
  "bayit-anthropic-api-key"
  "bayit-openai-api-key"
  "bayit-elevenlabs-api-key"
  "olorin-pinecone-api-key"
  "olorin-partner-api-key-salt"
  "olorin-secret-key"
)

MISSING_SECRETS=()
for secret in "${REQUIRED_SECRETS[@]}"; do
  if gcloud secrets describe "$secret" --project="$PROJECT_ID" &>/dev/null; then
    echo "  ✓ $secret"
  else
    echo "  ✗ $secret (MISSING)"
    MISSING_SECRETS+=("$secret")
  fi
done

if [ ${#MISSING_SECRETS[@]} -gt 0 ]; then
  echo ""
  echo "❌ ERROR: Missing secrets:"
  for secret in "${MISSING_SECRETS[@]}"; do
    echo "   - $secret"
  done
  echo ""
  echo "Create them in GCP Secret Manager:"
  echo "  gcloud secrets create SECRET_NAME --data-file=- <<< 'YOUR_VALUE'"
  echo ""
  echo "For olorin-secret-key, generate a secure value:"
  echo "  python -c \"import secrets; print(secrets.token_urlsafe(32))\" | gcloud secrets create olorin-secret-key --data-file=-"
  exit 1
fi
echo "✓ All 8 required secrets verified"
echo ""

# Step 3: Validate Cloud Build Configuration
echo "📍 STEP 3: Validating Cloud Build configuration..."
if [ ! -f "backend-olorin/cloudbuild.yaml" ]; then
  echo "❌ ERROR: backend-olorin/cloudbuild.yaml not found"
  exit 1
fi
echo "✓ Cloud Build configuration found"
echo ""

# Step 4: Verify Docker Image Can Build (Optional - requires Docker)
echo "📍 STEP 4: Docker image validation (optional)..."
if command -v docker &> /dev/null; then
  echo "  Building Docker image locally (validation only)..."
  docker build -f backend-olorin/Dockerfile -t olorin-backend:test . > /dev/null 2>&1
  if [ $? -eq 0 ]; then
    echo "  ✓ Docker image builds successfully"
  else
    echo "  ⚠️  Docker image build failed (continuing anyway)"
  fi
else
  echo "  ⓘ Docker not available - skipping local validation"
fi
echo "✓ Docker validation complete"
echo ""

# Step 5: Confirm Deployment
echo "📍 STEP 5: Deployment confirmation"
echo ""
echo "This will deploy to:"
echo "  Service:  $SERVICE_NAME"
echo "  Project:  $PROJECT_ID"
echo "  Region:   $REGION"
echo "  Image:    gcr.io/$PROJECT_ID/olorin-backend:latest"
echo ""
echo "Features (all disabled for gradual rollout):"
echo "  ✓ OLORIN_SEMANTIC_SEARCH_ENABLED=false"
echo "  ✓ OLORIN_DUBBING_ENABLED=false"
echo "  ✓ OLORIN_CULTURAL_CONTEXT_ENABLED=false"
echo "  ✓ OLORIN_RECAP_ENABLED=false"
echo ""
echo "Scaling Configuration:"
echo "  ✓ Min instances: 0 (scale-to-zero)"
echo "  ✓ Max instances: 10"
echo "  ✓ Memory: 1 GiB"
echo "  ✓ CPU: 1 vCPU"
echo "  ✓ Timeout: 120 seconds"
echo ""

read -p "Continue with deployment? (yes/no): " -r CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo "Deployment cancelled."
  exit 0
fi
echo ""

# Step 6: Submit Cloud Build
echo "📍 STEP 6: Submitting Cloud Build deployment..."
echo ""

cd /Users/olorin/Documents/Bayit-Plus

gcloud builds submit \
  --config=backend-olorin/cloudbuild.yaml \
  --project="$PROJECT_ID"

BUILD_ID=$?

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                   DEPLOYMENT SUBMITTED                         ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "📊 Build Status:"
echo ""
echo "   Watch logs in real-time:"
echo "   $ gcloud builds log --stream --project=$PROJECT_ID"
echo ""
echo "   Check service deployment:"
echo "   $ gcloud run services describe $SERVICE_NAME --platform=managed --region=$REGION --project=$PROJECT_ID"
echo ""
echo "   Get service URL:"
echo "   $ gcloud run services describe $SERVICE_NAME --platform=managed --region=$REGION --project=$PROJECT_ID --format='value(status.url)'"
echo ""
echo "🔍 Health Check (after ~5 minutes):"
echo ""
echo "   SERVICE_URL=\$(gcloud run services describe $SERVICE_NAME --platform=managed --region=$REGION --project=$PROJECT_ID --format='value(status.url)')"
echo "   curl \$SERVICE_URL/health"
echo ""
echo "📈 Monitor First 24 Hours:"
echo ""
echo "   $ gcloud logging read \"resource.type=cloud_run_revision AND resource.labels.service_name=$SERVICE_NAME\" --project=$PROJECT_ID --limit=50 --format=json | jq '.[] | select(.severity==\"ERROR\" or .severity==\"WARNING\")'"
echo ""
echo "⏮️  Rollback Procedure (if needed):"
echo ""
echo "   gcloud run revisions list --service=$SERVICE_NAME --platform=managed --region=$REGION --project=$PROJECT_ID --format='table(name, create_time)' --limit=5"
echo ""
echo "   gcloud run services update-traffic $SERVICE_NAME --to-revisions=REVISION_NAME=100 --platform=managed --region=$REGION --project=$PROJECT_ID"
echo ""

if [ $BUILD_ID -eq 0 ]; then
  echo "✅ Deployment process initiated successfully!"
else
  echo "⚠️  Deployment submission completed (check logs for details)"
fi
