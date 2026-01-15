#!/bin/bash
#
# Create Cloud Build Trigger for Automatic Deployments
# Run this AFTER connecting GitHub to Cloud Build
#

set -e

PROJECT_ID="bayit-plus"
REGION="us-east1"
TRIGGER_NAME="bayit-plus-backend-auto-deploy"

echo "=================================="
echo "Cloud Build Trigger Setup"
echo "=================================="
echo ""

# Check if trigger already exists
echo "Checking if trigger already exists..."
if gcloud builds triggers describe "$TRIGGER_NAME" --project="$PROJECT_ID" --region="$REGION" &>/dev/null; then
    echo "⚠️  Trigger '$TRIGGER_NAME' already exists!"
    echo ""
    read -p "Do you want to update it? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 1
    fi
    
    # Delete existing trigger
    echo "Deleting existing trigger..."
    gcloud builds triggers delete "$TRIGGER_NAME" \
        --project="$PROJECT_ID" \
        --region="$REGION" \
        --quiet
    
    echo "✅ Existing trigger deleted"
    echo ""
fi

# Create the trigger
echo "Creating Cloud Build trigger..."
gcloud builds triggers create github \
    --name="$TRIGGER_NAME" \
    --description="Auto-deploy backend on push to main branch" \
    --repo-name="Bayit-Plus" \
    --repo-owner="Olorin-ai-git" \
    --branch-pattern="^main$" \
    --build-config="backend/cloudbuild.yaml" \
    --project="$PROJECT_ID" \
    --region="$REGION" \
    --substitutions="_REGION=$REGION,_MEMORY=2Gi,_CPU=2,_MAX_INSTANCES=10,_MIN_INSTANCES=0"

if [ $? -eq 0 ]; then
    echo ""
    echo "=================================="
    echo "✅ SUCCESS!"
    echo "=================================="
    echo ""
    echo "Trigger '$TRIGGER_NAME' has been created!"
    echo ""
    echo "🎯 What happens now:"
    echo "  - Every push to 'main' branch triggers a build"
    echo "  - Build uses backend/cloudbuild.yaml"
    echo "  - Deploys to Cloud Run automatically"
    echo "  - Takes ~5-10 minutes per deployment"
    echo ""
    echo "📊 Monitor builds:"
    echo "  Console: https://console.cloud.google.com/cloud-build/builds?project=$PROJECT_ID"
    echo "  CLI: gcloud builds list --project=$PROJECT_ID --limit=5"
    echo ""
    echo "🧪 Test the trigger:"
    echo "  1. Make a small change in your code"
    echo "  2. git commit -m \"Test auto-deploy\""
    echo "  3. git push origin main"
    echo "  4. Watch the build start automatically!"
    echo ""
else
    echo ""
    echo "=================================="
    echo "❌ FAILED TO CREATE TRIGGER"
    echo "=================================="
    echo ""
    echo "Possible reasons:"
    echo "  1. GitHub is not connected to Cloud Build"
    echo "     → Go to: https://console.cloud.google.com/cloud-build/triggers/connect?project=$PROJECT_ID"
    echo ""
    echo "  2. Repository 'Olorin-ai-git/Bayit-Plus' not found"
    echo "     → Check the repository name and owner"
    echo ""
    echo "  3. Insufficient permissions"
    echo "     → Ensure you have 'Cloud Build Editor' role"
    echo ""
    exit 1
fi
