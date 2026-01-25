#!/bin/bash
set -e

# Deploy specific remediation phase to staging
# Usage: ./deploy-phase.sh <phase-name>
# Example: ./deploy-phase.sh phase-1-batch-1

PHASE=$1

if [ -z "$PHASE" ]; then
  echo "Usage: $0 <phase-name>"
  echo "Examples:"
  echo "  $0 phase-1-batch-1"
  echo "  $0 phase-2-userdetail"
  echo "  $0 phase-3-integrations"
  exit 1
fi

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

echo -e "${YELLOW}🚀 Deploying $PHASE to staging...${NC}"

# Ensure we're on the correct branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "Current branch: $CURRENT_BRANCH"

# Create deployment tag
DEPLOYMENT_TAG="staging-$PHASE-$(date +%Y%m%d-%H%M%S)"
git tag "$DEPLOYMENT_TAG"

echo -e "${YELLOW}📦 Tagged deployment: $DEPLOYMENT_TAG${NC}"

# Run standard staging deployment
bash "$PROJECT_ROOT/scripts/deployment/deploy-staging.sh"

# Log deployment
DEPLOYMENT_LOG="$PROJECT_ROOT/scripts/deployment/logs/$PHASE.log"
mkdir -p "$(dirname "$DEPLOYMENT_LOG")"

cat > "$DEPLOYMENT_LOG" << LOGEOF
Deployment Log
==============
Phase: $PHASE
Tag: $DEPLOYMENT_TAG
Branch: $CURRENT_BRANCH
Start Time: $(date +"%Y-%m-%d %H:%M:%S")
Deployed By: $(git config user.name)

Status: DEPLOYED
Next: Monitor for 2-4 hours, then validate checkpoints
LOGEOF

echo -e "${GREEN}✅ Phase $PHASE deployed successfully${NC}"
echo -e "${GREEN}📝 Log saved to: $DEPLOYMENT_LOG${NC}"
echo ""
echo "Next steps:"
echo "  1. Monitor staging for 2-4 hours"
echo "  2. Review deployment checkpoints: scripts/deployment/DEPLOYMENT_CHECKPOINTS.md"
echo "  3. Document approval decision in: $DEPLOYMENT_LOG"
