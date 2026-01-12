#!/bin/bash
set -e

# Bayit+ Backend Quick Redeploy Script
# Rebuilds and redeploys the backend to Cloud Run without prompts

echo "🚀 Bayit+ Backend Quick Redeploy"
echo "================================"
echo ""

# Configuration (hardcoded for speed)
PROJECT_ID="bayit-plus"
REGION="us-east1"
SERVICE_NAME="bayit-plus-backend"

echo "📝 Configuration:"
echo "  Project: $PROJECT_ID"
echo "  Region: $REGION"
echo "  Service: $SERVICE_NAME"
echo ""

# Set gcloud project
echo "⚙️  Setting gcloud project..."
gcloud config set project $PROJECT_ID

# Build container image
echo ""
echo "🔨 Building container image..."
gcloud builds submit --tag "gcr.io/$PROJECT_ID/$SERVICE_NAME:latest"

# Deploy to Cloud Run
echo ""
echo "🚢 Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
    --image "gcr.io/$PROJECT_ID/$SERVICE_NAME:latest" \
    --region $REGION \
    --quiet

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
