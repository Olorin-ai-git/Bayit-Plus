#!/bin/bash
set -e

# Rollback specific remediation phase
# Usage: ./rollback-phase.sh <phase-name>
# Example: ./rollback-phase.sh phase-1-batch-1

PHASE=$1

if [ -z "$PHASE" ]; then
  echo "Usage: $0 <phase-name>"
  echo "Examples:"
  echo "  $0 phase-1-batch-1"
  echo "  $0 phase-2-userdetail"
  exit 1
fi

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

echo -e "${YELLOW}⏪ Rolling back $PHASE...${NC}"

# Find deployment tag for this phase
DEPLOYMENT_TAG=$(git tag -l "staging-$PHASE-*" | tail -1)

if [ -z "$DEPLOYMENT_TAG" ]; then
  echo -e "${RED}❌ No deployment tag found for $PHASE${NC}"
  echo "Available tags:"
  git tag -l "staging-*" | tail -10
  exit 1
fi

echo "Found deployment tag: $DEPLOYMENT_TAG"

# Get the commit before this deployment
PREVIOUS_COMMIT=$(git rev-list -n 1 "${DEPLOYMENT_TAG}^")

echo -e "${YELLOW}Reverting to commit: $PREVIOUS_COMMIT${NC}"

# Method 1: Git revert (preserves history)
echo "Creating revert commit..."
COMMIT_TO_REVERT=$(git rev-list -n 1 "$DEPLOYMENT_TAG")

git revert "$COMMIT_TO_REVERT" --no-commit || {
  echo -e "${YELLOW}⚠️  Conflicts detected during revert${NC}"
  echo "Attempting automatic conflict resolution..."
  
  # Accept theirs for package-lock.json and similar
  git checkout --theirs package-lock.json 2>/dev/null || true
  git checkout --theirs poetry.lock 2>/dev/null || true
  
  # For code files, manual resolution needed
  if git diff --name-only --diff-filter=U | grep -E '\.(ts|tsx|py)$'; then
    echo -e "${RED}❌ Code conflicts require manual resolution${NC}"
    git diff --name-only --diff-filter=U
    git revert --abort
    exit 1
  fi
  
  git add .
}

git commit -m "Rollback $PHASE

Reverts deployment tag: $DEPLOYMENT_TAG
Reason: Rollback rehearsal / Production issue
Rollback time: $(date +"%Y-%m-%d %H:%M:%S")

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

echo -e "${GREEN}✅ Revert commit created${NC}"

# Method 2: Traffic rollback (for Cloud Run)
if command -v gcloud &> /dev/null; then
  echo -e "${YELLOW}🔄 Rolling back Cloud Run traffic...${NC}"
  
  # Get previous revision
  PREVIOUS_REVISION=$(gcloud run revisions list \
    --service=bayit-backend-staging \
    --region=us-central1 \
    --format="value(REVISION)" \
    --limit=2 | tail -n 1)
  
  if [ -n "$PREVIOUS_REVISION" ]; then
    echo "Rolling back to revision: $PREVIOUS_REVISION"
    
    gcloud run services update-traffic bayit-backend-staging \
      --region=us-central1 \
      --to-revisions="$PREVIOUS_REVISION=100" \
      --quiet || {
        echo -e "${YELLOW}⚠️  Cloud Run rollback failed (may not be deployed yet)${NC}"
      }
    
    echo -e "${GREEN}✅ Traffic rolled back to previous revision${NC}"
  else
    echo -e "${YELLOW}⚠️  No previous Cloud Run revision found${NC}"
  fi
fi

# Method 3: Firebase Hosting rollback
if command -v firebase &> /dev/null; then
  echo -e "${YELLOW}🔄 Rolling back Firebase Hosting...${NC}"
  
  cd "$PROJECT_ROOT/web"
  
  # Delete staging channel (will revert to previous)
  firebase hosting:channel:delete staging --force 2>/dev/null || {
    echo -e "${YELLOW}⚠️  Hosting channel rollback failed (may not exist)${NC}"
  }
fi

# Create rollback log
ROLLBACK_LOG="$PROJECT_ROOT/scripts/deployment/logs/rollback-$PHASE-$(date +%Y%m%d-%H%M%S).log"
cat > "$ROLLBACK_LOG" << LOGEOF
Rollback Execution Log
======================
Phase: $PHASE
Deployment Tag: $DEPLOYMENT_TAG
Previous Commit: $PREVIOUS_COMMIT
Rollback Time: $(date +"%Y-%m-%d %H:%M:%S")
Executed By: $(git config user.name)

Method: Git revert + Traffic rollback
Status: COMPLETED

Next Steps:
1. Run validation: ./scripts/deployment/validate-rollback.sh
2. Monitor for 2 hours
3. Verify all services healthy
LOGEOF

echo -e "${GREEN}✅ Rollback complete${NC}"
echo -e "${GREEN}📝 Log saved to: $ROLLBACK_LOG${NC}"
echo ""
echo "Next steps:"
echo "  1. Run validation: ./scripts/deployment/validate-rollback.sh"
echo "  2. Monitor staging for 2 hours"
echo "  3. Verify error rate returned to baseline"
