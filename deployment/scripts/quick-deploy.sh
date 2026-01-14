#!/bin/bash
set -e

# Bayit+ Backend Quick Redeploy Script
# Rebuilds and redeploys the backend to Cloud Run using cloudbuild.yaml

echo "🚀 Bayit+ Backend Quick Redeploy"
echo "================================"
echo ""

# Configuration
PROJECT_ID="bayit-plus"
REGION="us-east1"
SERVICE_NAME="bayit-plus-backend"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

echo "📝 Configuration:"
echo "  Project: $PROJECT_ID"
echo "  Region: $REGION"
echo "  Service: $SERVICE_NAME"
echo "  Repo Root: $REPO_ROOT"
echo ""

# Set gcloud project
echo "⚙️  Setting gcloud project..."
gcloud config set project $PROJECT_ID

# Build and deploy using cloudbuild.yaml
echo ""
echo "🔨 Building and deploying with Cloud Build..."
cd "$REPO_ROOT"
gcloud builds submit \
    --config=cloudbuild.yaml \
    --substitutions=_REGION=$REGION,_MEMORY=2Gi,_CPU=2,_MAX_INSTANCES=10,_MIN_INSTANCES=1

# Get service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region $REGION --format 'value(status.url)')

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🌐 Service URL: $SERVICE_URL"
echo ""

# Test health endpoint
echo "🏥 Testing health endpoint..."
sleep 3
if curl -s "$SERVICE_URL/health" | grep -q "healthy"; then
    echo "✅ Health check passed!"
else
    echo "⚠️  Health check failed. Check logs with:"
    echo "   gcloud run services logs read $SERVICE_NAME --region $REGION --limit 50"
fi

echo ""
echo "📊 View logs:"
echo "   gcloud run services logs read $SERVICE_NAME --region $REGION --tail"
echo ""
echo "🔄 Rollback if needed:"
echo "   gcloud run services update-traffic $SERVICE_NAME --region $REGION --to-revisions=PREVIOUS=100"
echo ""
