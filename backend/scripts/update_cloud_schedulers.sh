#!/bin/bash
# Update Google Cloud Scheduler Jobs for Improved Audit Strategy
# 
# New Strategy:
# 1. Weekly Comprehensive Scan (Sunday 3 AM) - Full library audit
# 2. Daily Maintenance Scan (2 AM) - Subtitle-focused with quota management

set -e

# Configuration
PROJECT_ID="${GCLOUD_PROJECT:-bayit-plus}"
REGION="${GCLOUD_REGION:-us-east1}"
SERVICE_URL="${SERVICE_URL:-https://bayit-plus-backend-znfki37vbq-ue.a.run.app}"
SERVICE_ACCOUNT="${SERVICE_ACCOUNT:-624470113582-compute@developer.gserviceaccount.com}"
TIMEZONE="Asia/Jerusalem"

echo "╔═══════════════════════════════════════════════╗"
echo "║   Update Cloud Scheduler for Bayit+ Agent    ║"
echo "╚═══════════════════════════════════════════════╝"
echo ""
echo "📋 Configuration:"
echo "   Project: $PROJECT_ID"
echo "   Region: $REGION"
echo "   Service: $SERVICE_URL"
echo "   Timezone: $TIMEZONE"
echo ""

# Check if gcloud is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" > /dev/null 2>&1; then
    echo "❌ Not authenticated with gcloud. Please run: gcloud auth login"
    exit 1
fi

echo "✅ Authenticated with gcloud"
echo ""

# Function to delete job if exists
delete_job_if_exists() {
    local job_name=$1
    if gcloud scheduler jobs describe "$job_name" --location="$REGION" &>/dev/null; then
        echo "   🗑️  Deleting existing job: $job_name"
        gcloud scheduler jobs delete "$job_name" --location="$REGION" --quiet
        echo "   ✅ Deleted"
    else
        echo "   ℹ️  Job $job_name does not exist, will create new"
    fi
}

# ============================================
# JOB 1: Weekly Comprehensive Library Scan
# ============================================

echo "📅 JOB 1: Weekly Comprehensive Library Scan"
echo "   Schedule: Every Sunday at 3:00 AM Israel time"
echo "   Strategy: Full library audit with high limits"
echo ""

delete_job_if_exists "librarian-weekly-comprehensive"

gcloud scheduler jobs create http librarian-weekly-comprehensive \
  --location="$REGION" \
  --schedule="0 3 * * 0" \
  --time-zone="$TIMEZONE" \
  --uri="$SERVICE_URL/api/v1/internal/librarian/scheduled-audit" \
  --http-method=POST \
  --headers="Content-Type=application/json,User-Agent=Google-Cloud-Scheduler" \
  --message-body='{
    "use_ai_agent": true,
    "dry_run": false,
    "max_iterations": 200,
    "budget_limit_usd": 15.0,
    "audit_type": "weekly_comprehensive"
  }' \
  --oidc-service-account-email="$SERVICE_ACCOUNT" \
  --oidc-token-audience="$SERVICE_URL" \
  --max-retry-attempts=2 \
  --max-retry-duration=600s \
  --min-backoff=5s \
  --max-backoff=3600s \
  --max-doublings=5 \
  --attempt-deadline=900s

echo "✅ Created: librarian-weekly-comprehensive"
echo ""

# ============================================
# JOB 2: Daily Subtitle Maintenance Scan
# ============================================

echo "📅 JOB 2: Daily Subtitle Maintenance Scan"
echo "   Schedule: Every day at 2:00 AM Israel time"
echo "   Strategy: Subtitle-focused with quota management"
echo ""

delete_job_if_exists "librarian-daily-maintenance"

gcloud scheduler jobs create http librarian-daily-maintenance \
  --location="$REGION" \
  --schedule="0 2 * * *" \
  --time-zone="$TIMEZONE" \
  --uri="$SERVICE_URL/api/v1/internal/librarian/scheduled-audit" \
  --http-method=POST \
  --headers="Content-Type=application/json,User-Agent=Google-Cloud-Scheduler" \
  --message-body='{
    "use_ai_agent": true,
    "dry_run": false,
    "max_iterations": 100,
    "budget_limit_usd": 5.0,
    "audit_type": "daily_maintenance"
  }' \
  --oidc-service-account-email="$SERVICE_ACCOUNT" \
  --oidc-token-audience="$SERVICE_URL" \
  --max-retry-attempts=2 \
  --max-retry-duration=600s \
  --min-backoff=5s \
  --max-backoff=3600s \
  --max-doublings=5 \
  --attempt-deadline=600s

echo "✅ Created: librarian-daily-maintenance"
echo ""

# ============================================
# Delete Old Jobs
# ============================================

echo "🗑️  Cleaning up old scheduler jobs..."
echo ""

# Delete old daily rule-based audit
if gcloud scheduler jobs describe "librarian-daily-audit" --location="$REGION" &>/dev/null; then
    echo "   Deleting old: librarian-daily-audit"
    gcloud scheduler jobs delete "librarian-daily-audit" --location="$REGION" --quiet
    echo "   ✅ Deleted"
fi

# Delete old weekly AI audit
if gcloud scheduler jobs describe "librarian-weekly-ai-audit" --location="$REGION" &>/dev/null; then
    echo "   Deleting old: librarian-weekly-ai-audit"
    gcloud scheduler jobs delete "librarian-weekly-ai-audit" --location="$REGION" --quiet
    echo "   ✅ Deleted"
fi

echo ""

# ============================================
# Verify Jobs
# ============================================

echo "📊 Verifying scheduler jobs..."
echo ""

gcloud scheduler jobs list --location="$REGION" --filter="name:librarian" --format="table(
  name.basename(),
  schedule,
  state,
  lastAttemptTime
)"

echo ""
echo "╔═══════════════════════════════════════════════╗"
echo "║            ✅ UPDATE COMPLETE!                ║"
echo "╚═══════════════════════════════════════════════╝"
echo ""
echo "📅 New Schedule:"
echo "   • Sunday 3 AM: Comprehensive library scan (200 iterations, \$15 budget)"
echo "   • Daily 2 AM: Subtitle maintenance scan (100 iterations, \$5 budget)"
echo ""
echo "💡 Next Steps:"
echo "   1. Verify jobs are enabled: gcloud scheduler jobs list --location=$REGION"
echo "   2. Test manually:"
echo "      gcloud scheduler jobs run librarian-daily-maintenance --location=$REGION"
echo "   3. Monitor logs:"
echo "      gcloud run logs read bayit-plus-backend --region=us-east1 --limit=100"
echo ""
echo "📖 See SCHEDULER_STRATEGY_UPDATED.md for full documentation"
