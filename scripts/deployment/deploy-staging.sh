#!/bin/bash
set -e

echo "🚀 Deploying to staging environment..."

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
STAGING_URL="${STAGING_URL:-https://staging.bayitplus.com}"
BACKEND_DIR="$PROJECT_ROOT/backend"
WEB_DIR="$PROJECT_ROOT/web"
MOBILE_DIR="$PROJECT_ROOT/mobile-app"

echo -e "${YELLOW}📦 Building all packages...${NC}"

# Build backend
echo "Building backend..."
cd "$BACKEND_DIR"
if [ ! -f "pyproject.toml" ]; then
  echo -e "${RED}❌ Backend pyproject.toml not found${NC}"
  exit 1
fi

poetry install --no-dev
poetry build

# Build web
echo "Building web application..."
cd "$WEB_DIR"
if [ ! -f "package.json" ]; then
  echo -e "${RED}❌ Web package.json not found${NC}"
  exit 1
fi

npm ci
npm run build

# Build shared packages
echo "Building shared packages..."
cd "$PROJECT_ROOT/packages/ui/glass-components"
npm ci
npm run build

echo -e "${GREEN}✅ All packages built successfully${NC}"

# Deploy backend to Cloud Run staging
echo -e "${YELLOW}🚀 Deploying backend to Cloud Run staging...${NC}"

cd "$BACKEND_DIR"

# Check if gcloud is configured
if ! command -v gcloud &> /dev/null; then
  echo -e "${RED}❌ gcloud CLI not found. Please install Google Cloud SDK.${NC}"
  exit 1
fi

# Deploy with staging tag
gcloud run deploy bayit-backend-staging \
  --region=us-central1 \
  --tag=staging \
  --source=. \
  --allow-unauthenticated \
  --set-env-vars="ENV=staging" \
  --quiet || {
    echo -e "${RED}❌ Backend deployment failed${NC}"
    exit 1
  }

echo -e "${GREEN}✅ Backend deployed to Cloud Run staging${NC}"

# Deploy web to Firebase Hosting preview channel
echo -e "${YELLOW}🌐 Deploying web to Firebase Hosting preview channel...${NC}"

cd "$WEB_DIR"

# Check if firebase is configured
if ! command -v firebase &> /dev/null; then
  echo -e "${RED}❌ firebase CLI not found. Please install Firebase CLI.${NC}"
  exit 1
fi

# Deploy to staging channel
firebase hosting:channel:deploy staging --expires 30d || {
  echo -e "${RED}❌ Web deployment failed${NC}"
  exit 1
}

echo -e "${GREEN}✅ Web deployed to Firebase Hosting staging channel${NC}"

# Wait for deployment propagation
echo -e "${YELLOW}⏳ Waiting 30 seconds for deployment propagation...${NC}"
sleep 30

# Run smoke tests
echo -e "${YELLOW}🧪 Running smoke tests against staging...${NC}"

SMOKE_TEST_SCRIPT="$PROJECT_ROOT/scripts/deployment/smoke-tests-staging.sh"
if [ -f "$SMOKE_TEST_SCRIPT" ]; then
  bash "$SMOKE_TEST_SCRIPT" || {
    echo -e "${RED}❌ Smoke tests failed${NC}"
    exit 1
  }
else
  echo -e "${YELLOW}⚠️  Smoke test script not found, skipping tests${NC}"
fi

echo -e "${GREEN}✅ Staging deployment complete${NC}"
echo ""
echo "Staging URLs:"
echo "  Backend: https://bayit-backend-staging-[hash].a.run.app"
echo "  Web: https://bayitplus--staging-[hash].web.app"
echo ""
echo "Next steps:"
echo "  1. Monitor staging for 2-4 hours"
echo "  2. Review metrics (error rate, latency, logs)"
echo "  3. Get approval to proceed to next phase"
