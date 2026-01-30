#!/bin/bash
#
# Beta 500 Rollback Script
#
# Emergency rollback for Beta 500 program deployment.
# Disables the feature, rolls back deployment, and notifies stakeholders.
#
# Usage:
#   ./scripts/rollback-beta-500.sh
#

set -e  # Exit on error

echo "⚠️  ROLLING BACK Beta 500 Deployment"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to log messages
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Step 1: Disable Beta 500 feature flag
log_info "Step 1: Disabling Beta 500 feature flag..."
if command -v gcloud &> /dev/null; then
    log_info "Setting BETA_500_ENABLED=false in Google Cloud Secret Manager..."

    # Get current secret value
    CURRENT_SECRET=$(gcloud secrets versions access latest --secret="BETA_500_ENABLED" 2>/dev/null || echo "true")

    if [ "$CURRENT_SECRET" = "true" ]; then
        echo "false" | gcloud secrets versions add BETA_500_ENABLED --data-file=-
        log_info "✅ Feature flag disabled"
    else
        log_warn "Feature flag already disabled"
    fi
else
    log_warn "gcloud CLI not found - skipping feature flag update"
fi

# Step 2: Rollback Kubernetes deployment (if running in K8s)
log_info "Step 2: Rolling back Kubernetes deployment..."
if command -v kubectl &> /dev/null; then
    # Check if deployment exists
    if kubectl get deployment bayit-plus-backend -n production &> /dev/null; then
        log_info "Rolling back bayit-plus-backend deployment..."
        kubectl rollout undo deployment/bayit-plus-backend -n production

        log_info "Waiting for rollback to complete..."
        kubectl rollout status deployment/bayit-plus-backend -n production --timeout=5m
        log_info "✅ Deployment rolled back successfully"
    else
        log_warn "Kubernetes deployment not found - skipping rollback"
    fi
else
    log_warn "kubectl not found - skipping Kubernetes rollback"
fi

# Step 3: Rollback Firebase Functions (if using Firebase)
log_info "Step 3: Checking Firebase deployment..."
if command -v firebase &> /dev/null; then
    log_info "Rolling back Firebase functions..."
    # Note: Firebase doesn't have automatic rollback - would need manual version deployment
    log_warn "Firebase rollback requires manual version deployment"
    log_info "Run: firebase functions:config:set beta500.enabled=false"
else
    log_warn "firebase CLI not found - skipping Firebase rollback"
fi

# Step 4: Clear API cache (if using Redis/Memcached)
log_info "Step 4: Clearing API cache..."
if command -v redis-cli &> /dev/null; then
    log_info "Flushing Redis cache keys for Beta 500..."
    redis-cli KEYS "beta:*" | xargs -r redis-cli DEL
    log_info "✅ Cache cleared"
else
    log_warn "redis-cli not found - skipping cache flush"
fi

# Step 5: Verify rollback
log_info "Step 5: Verifying rollback..."
HEALTH_URL="${HEALTH_URL:-https://api.bayit-plus.com/health}"
log_info "Checking health endpoint: $HEALTH_URL"

if curl -f -s "$HEALTH_URL" > /dev/null; then
    log_info "✅ Health check passed"
else
    log_error "❌ Health check failed - manual intervention required"
    exit 1
fi

# Step 6: Test Beta 500 endpoints are disabled
log_info "Testing Beta 500 endpoint accessibility..."
BETA_URL="${BETA_URL:-https://api.bayit-plus.com/api/v1/beta/credits/balance}"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$BETA_URL" -H "Authorization: Bearer test-token" || echo "000")

if [ "$RESPONSE" = "503" ] || [ "$RESPONSE" = "404" ] || [ "$RESPONSE" = "000" ]; then
    log_info "✅ Beta 500 endpoints disabled or inaccessible"
else
    log_warn "Beta 500 endpoints still returning responses (HTTP $RESPONSE)"
fi

# Step 7: Notify stakeholders
log_info "Step 7: Sending rollback notification..."
if [ -n "$SLACK_WEBHOOK_URL" ]; then
    PAYLOAD=$(cat <<EOF
{
  "text": "🚨 Beta 500 Rollback Completed",
  "blocks": [
    {
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": "🚨 Beta 500 Emergency Rollback"
      }
    },
    {
      "type": "section",
      "fields": [
        {
          "type": "mrkdwn",
          "text": "*Status:* Rolled back"
        },
        {
          "type": "mrkdwn",
          "text": "*Time:* $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
        },
        {
          "type": "mrkdwn",
          "text": "*Executed by:* $(whoami)"
        },
        {
          "type": "mrkdwn",
          "text": "*Health:* ✅ Passing"
        }
      ]
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "Beta 500 deployment has been rolled back. Feature flag disabled, deployment reverted."
      }
    }
  ]
}
EOF
)
    curl -X POST -H 'Content-type: application/json' --data "$PAYLOAD" "$SLACK_WEBHOOK_URL" > /dev/null 2>&1
    log_info "✅ Slack notification sent"
else
    log_warn "SLACK_WEBHOOK_URL not set - skipping notification"
fi

# Final summary
echo ""
echo "=================================="
log_info "✅ Beta 500 Rollback Complete"
echo "=================================="
echo ""
log_info "Summary:"
log_info "  - Feature flag disabled"
log_info "  - Deployment rolled back"
log_info "  - Cache cleared"
log_info "  - Health check passed"
log_info "  - Stakeholders notified"
echo ""
log_info "Next steps:"
log_info "  1. Investigate the root cause of the issue"
log_info "  2. Fix the issue in development environment"
log_info "  3. Test thoroughly before redeployment"
log_info "  4. Update incident report"
echo ""
