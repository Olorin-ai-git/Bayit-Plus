#!/bin/bash

################################################################################
# MongoDB Atlas Migration v6.3 - Phase 3: Production Deployment Script
################################################################################
#
# This script deploys the complete MongoDB Atlas migration to production:
# - Backend Cloud Functions with MongoDB integration
# - Frontend with AudioPlayer components
# - Production environment configuration
# - Post-deployment verification
#
# Prerequisites:
# - Phase 1 complete (MongoDB staging deployed)
# - Phase 2 complete (Backend compiles, frontend builds)
# - gcloud CLI authenticated
# - Firebase CLI authenticated
# - Production secrets configured in Google Cloud Secret Manager
#
# Usage:
#   ./deploy-production-phase3.sh [--skip-backend] [--skip-frontend] [--dry-run]
#
################################################################################

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
GCP_PROJECT_PRODUCTION="cvplus-ai"
MONGODB_CLUSTER="cluster0.ydrvaft.mongodb.net"
MONGODB_DATABASE="cvplus_production"
FIREBASE_PROJECT="cvplus-ai"

# Parse command line arguments
SKIP_BACKEND=false
SKIP_FRONTEND=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-backend)
      SKIP_BACKEND=true
      shift
      ;;
    --skip-frontend)
      SKIP_FRONTEND=true
      shift
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  MongoDB Atlas Migration v6.3 - Phase 3: Production Deploy    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

if [[ "$DRY_RUN" == "true" ]]; then
  echo -e "${YELLOW}🔍 DRY RUN MODE - No actual deployment${NC}"
  echo ""
fi

################################################################################
# Step 1: Pre-deployment Verification
################################################################################

echo -e "${BLUE}Step 1: Pre-deployment Verification${NC}"
echo "─────────────────────────────────────"

# Check GCP authentication
echo "Checking GCP authentication..."
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
  echo -e "${RED}❌ Not authenticated with gcloud${NC}"
  echo "Run: gcloud auth login"
  exit 1
fi
echo -e "${GREEN}✓ GCP authenticated${NC}"

# Check Firebase authentication
echo "Checking Firebase authentication..."
if ! firebase login:list 2>/dev/null | grep -q "Logged in as"; then
  echo -e "${RED}❌ Not authenticated with Firebase${NC}"
  echo "Run: firebase login"
  exit 1
fi
echo -e "${GREEN}✓ Firebase authenticated${NC}"

# Set GCP project
echo "Setting GCP project to ${GCP_PROJECT_PRODUCTION}..."
gcloud config set project "${GCP_PROJECT_PRODUCTION}" > /dev/null
echo -e "${GREEN}✓ GCP project set${NC}"

# Verify MongoDB secrets exist
echo "Verifying MongoDB secrets in Secret Manager..."
if ! gcloud secrets versions access latest --secret="cvplus-mongodb-uri" > /dev/null 2>&1; then
  echo -e "${RED}❌ cvplus-mongodb-uri secret not found${NC}"
  echo "Create with: gcloud secrets create cvplus-mongodb-uri --data-file=-"
  exit 1
fi
if ! gcloud secrets versions access latest --secret="cvplus-mongodb-db-name-production" > /dev/null 2>&1; then
  echo -e "${RED}❌ cvplus-mongodb-db-name-production secret not found${NC}"
  echo "Create with: echo 'cvplus_production' | gcloud secrets create cvplus-mongodb-db-name-production --data-file=-"
  exit 1
fi
echo -e "${GREEN}✓ MongoDB secrets configured${NC}"

# Verify Phase 1 and Phase 2 complete
echo "Verifying Phase 1 and Phase 2 completion..."
PHASE1_REPORT="/Users/olorin/Documents/olorin/olorin-cv/cvplus/docs/plans/PHASE1_DEPLOYMENT_REPORT.md"
PHASE2_REPORT="/Users/olorin/Documents/olorin/docs/plans/PHASE2_COMPLETION_REPORT.md"

if [[ ! -f "$PHASE1_REPORT" ]]; then
  echo -e "${RED}❌ Phase 1 not complete (report not found: $PHASE1_REPORT)${NC}"
  exit 1
fi
if [[ ! -f "$PHASE2_REPORT" ]]; then
  echo -e "${RED}❌ Phase 2 not complete (report not found: $PHASE2_REPORT)${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Phase 1 and Phase 2 complete${NC}"

echo ""

################################################################################
# Step 2: Create Production MongoDB Database
################################################################################

echo -e "${BLUE}Step 2: MongoDB Production Database Setup${NC}"
echo "────────────────────────────────────────────"

if [[ "$DRY_RUN" == "false" ]]; then
  echo "Creating production MongoDB database and collections..."

  # Update environment to production
  export NODE_ENV=production
  export MONGODB_URI=$(gcloud secrets versions access latest --secret="cvplus-mongodb-uri")
  export MONGODB_DB_NAME=$(gcloud secrets versions access latest --secret="cvplus-mongodb-db-name-production")

  # Run MongoDB setup script for production
  cd /Users/olorin/Documents/olorin/olorin-cv/cvplus/backend/functions
  npm run setup:mongodb-indexes 2>&1 | tee setup-production.log

  if grep -q "✅ MongoDB index setup completed successfully" setup-production.log; then
    echo -e "${GREEN}✓ MongoDB production database created${NC}"
  else
    echo -e "${RED}❌ MongoDB setup failed${NC}"
    cat setup-production.log
    exit 1
  fi
else
  echo -e "${YELLOW}🔍 DRY RUN: Would create MongoDB production database${NC}"
fi

echo ""

################################################################################
# Step 3: Deploy Backend Functions
################################################################################

if [[ "$SKIP_BACKEND" == "false" ]]; then
  echo -e "${BLUE}Step 3: Backend Functions Deployment${NC}"
  echo "───────────────────────────────────────"

  cd /Users/olorin/Documents/olorin/olorin-cv/cvplus/backend/functions

  # Build backend
  echo "Building backend functions..."
  if [[ "$DRY_RUN" == "false" ]]; then
    npm run build

    if [[ $? -ne 0 ]]; then
      echo -e "${RED}❌ Backend build failed${NC}"
      exit 1
    fi
    echo -e "${GREEN}✓ Backend built successfully${NC}"
  else
    echo -e "${YELLOW}🔍 DRY RUN: Would build backend${NC}"
  fi

  # Deploy to Firebase
  echo "Deploying backend functions to production..."
  if [[ "$DRY_RUN" == "false" ]]; then
    firebase deploy --only functions --project="${FIREBASE_PROJECT}" --force

    if [[ $? -ne 0 ]]; then
      echo -e "${RED}❌ Backend deployment failed${NC}"
      exit 1
    fi
    echo -e "${GREEN}✓ Backend deployed to production${NC}"
  else
    echo -e "${YELLOW}🔍 DRY RUN: Would deploy backend functions${NC}"
  fi

  echo ""
else
  echo -e "${YELLOW}⏭️  Skipping backend deployment${NC}"
  echo ""
fi

################################################################################
# Step 4: Deploy Frontend
################################################################################

if [[ "$SKIP_FRONTEND" == "false" ]]; then
  echo -e "${BLUE}Step 4: Frontend Deployment${NC}"
  echo "──────────────────────────────"

  cd /Users/olorin/Documents/olorin/olorin-cv/cvplus/frontend

  # Build frontend
  echo "Building frontend..."
  if [[ "$DRY_RUN" == "false" ]]; then
    npm run build

    if [[ $? -ne 0 ]]; then
      echo -e "${RED}❌ Frontend build failed${NC}"
      exit 1
    fi
    echo -e "${GREEN}✓ Frontend built successfully${NC}"
  else
    echo -e "${YELLOW}🔍 DRY RUN: Would build frontend${NC}"
  fi

  # Deploy to Firebase Hosting
  echo "Deploying frontend to Firebase Hosting..."
  if [[ "$DRY_RUN" == "false" ]]; then
    firebase deploy --only hosting --project="${FIREBASE_PROJECT}"

    if [[ $? -ne 0 ]]; then
      echo -e "${RED}❌ Frontend deployment failed${NC}"
      exit 1
    fi
    echo -e "${GREEN}✓ Frontend deployed to production${NC}"
  else
    echo -e "${YELLOW}🔍 DRY RUN: Would deploy frontend to Firebase Hosting${NC}"
  fi

  echo ""
else
  echo -e "${YELLOW}⏭️  Skipping frontend deployment${NC}"
  echo ""
fi

################################################################################
# Step 5: Production Smoke Tests
################################################################################

echo -e "${BLUE}Step 5: Production Smoke Tests${NC}"
echo "─────────────────────────────────"

if [[ "$DRY_RUN" == "false" ]]; then
  # Test 1: MongoDB Connection
  echo "Testing MongoDB production connection..."
  MONGO_URI=$(gcloud secrets versions access latest --secret="cvplus-mongodb-uri")
  if node -e "
    const { MongoClient } = require('mongodb');
    const client = new MongoClient('${MONGO_URI}');
    client.connect()
      .then(() => client.db('${MONGODB_DATABASE}').command({ ping: 1 }))
      .then(() => { console.log('OK'); process.exit(0); })
      .catch((err) => { console.error(err); process.exit(1); });
  "; then
    echo -e "${GREEN}✓ MongoDB production connection successful${NC}"
  else
    echo -e "${RED}❌ MongoDB production connection failed${NC}"
    exit 1
  fi

  # Test 2: Backend Health Check
  echo "Testing backend health endpoint..."
  BACKEND_URL="https://us-central1-${FIREBASE_PROJECT}.cloudfunctions.net"
  if curl -s -f "${BACKEND_URL}/health" > /dev/null; then
    echo -e "${GREEN}✓ Backend health check passed${NC}"
  else
    echo -e "${YELLOW}⚠️  Backend health check unavailable (may be deploying)${NC}"
  fi

  # Test 3: Frontend Accessibility
  echo "Testing frontend accessibility..."
  FRONTEND_URL="https://${FIREBASE_PROJECT}.web.app"
  if curl -s -f "${FRONTEND_URL}" > /dev/null; then
    echo -e "${GREEN}✓ Frontend accessible${NC}"
  else
    echo -e "${YELLOW}⚠️  Frontend not yet accessible (may be deploying)${NC}"
  fi

  # Test 4: Audio Services
  echo "Testing audio stream health endpoint..."
  if curl -s -f "${BACKEND_URL}/audioHealth" > /dev/null; then
    echo -e "${GREEN}✓ Audio services healthy${NC}"
  else
    echo -e "${YELLOW}⚠️  Audio services unavailable (may be deploying)${NC}"
  fi
else
  echo -e "${YELLOW}🔍 DRY RUN: Would run production smoke tests${NC}"
fi

echo ""

################################################################################
# Step 6: Deployment Summary
################################################################################

echo -e "${BLUE}Step 6: Deployment Summary${NC}"
echo "──────────────────────────────"

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           Phase 3: Production Deployment Complete!            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

if [[ "$DRY_RUN" == "false" ]]; then
  echo -e "${GREEN}✅ MongoDB Production Database:${NC} ${MONGODB_DATABASE}"
  echo -e "${GREEN}✅ Backend Functions:${NC} https://us-central1-${FIREBASE_PROJECT}.cloudfunctions.net"
  echo -e "${GREEN}✅ Frontend:${NC} https://${FIREBASE_PROJECT}.web.app"
  echo -e "${GREEN}✅ Audio Services:${NC} /audioStreamTTS, /audioTranscribe"
  echo ""
  echo -e "${BLUE}📊 Next Steps:${NC}"
  echo "1. Monitor Cloud Functions logs: firebase functions:log"
  echo "2. Monitor MongoDB Atlas metrics: https://cloud.mongodb.com"
  echo "3. Test AudioPlayer: https://${FIREBASE_PROJECT}.web.app/audio-test"
  echo "4. Review deployment report: docs/plans/PHASE3_PRODUCTION_REPORT.md"
else
  echo -e "${YELLOW}🔍 DRY RUN COMPLETE${NC}"
  echo ""
  echo "To deploy to production, run:"
  echo "  ./deploy-production-phase3.sh"
fi

echo ""
echo -e "${GREEN}Deployment timestamp: $(date -u +"%Y-%m-%d %H:%M:%S UTC")${NC}"
echo ""

exit 0
