#!/bin/bash
# Verify Cloud Scheduler Jobs for Daily Librarian Audit

set -e

PROJECT_ID="${GCLOUD_PROJECT:-bayit-plus}"
REGION="${GCLOUD_REGION:-us-east1}"

echo "╔═══════════════════════════════════════════════╗"
echo "║   Verify Cloud Scheduler Jobs                ║"
echo "╚═══════════════════════════════════════════════╝"
echo ""
echo "📋 Configuration:"
echo "   Project: $PROJECT_ID"
echo "   Region: $REGION"
echo ""

# Check if gcloud is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" > /dev/null 2>&1; then
    echo "❌ Not authenticated with gcloud"
    echo ""
    echo "Please authenticate first:"
    echo "   gcloud auth login"
    echo ""
    exit 1
fi

ACTIVE_ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -n1)
echo "✅ Authenticated as: $ACTIVE_ACCOUNT"
echo ""

# Check if project is set
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null)
if [ -z "$CURRENT_PROJECT" ]; then
    echo "⚠️  No project set. Setting project to: $PROJECT_ID"
    gcloud config set project "$PROJECT_ID"
    echo ""
fi

echo "🔍 Checking Cloud Scheduler jobs..."
echo ""

# List all librarian scheduler jobs
if gcloud scheduler jobs list --location="$REGION" --filter="name:librarian" --format="table(
  name.basename(),
  schedule,
  state,
  httpTarget.uri,
  lastAttemptTime,
  status.code
)" 2>/dev/null; then

    echo ""
    echo "✅ Found librarian scheduler jobs"
    echo ""

    # Check specific jobs
    echo "📊 Detailed Job Information:"
    echo ""

    for job in "librarian-daily-maintenance" "librarian-weekly-comprehensive"; do
        if gcloud scheduler jobs describe "$job" --location="$REGION" &>/dev/null; then
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo "Job: $job"
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            gcloud scheduler jobs describe "$job" --location="$REGION" --format="yaml(
              schedule,
              state,
              timeZone,
              httpTarget.uri,
              httpTarget.httpMethod,
              httpTarget.body,
              lastAttemptTime,
              retryConfig
            )"
            echo ""
        else
            echo "❌ Job not found: $job"
            echo ""
        fi
    done

else
    echo "❌ No librarian scheduler jobs found"
    echo ""
    echo "💡 To create the scheduler jobs, run:"
    echo "   ./scripts/backend/update_cloud_schedulers.sh"
    echo ""
    exit 1
fi

echo "╔═══════════════════════════════════════════════╗"
echo "║         ✅ VERIFICATION COMPLETE!            ║"
echo "╚═══════════════════════════════════════════════╝"
echo ""
echo "💡 Next Steps:"
echo ""
echo "1. Test manually:"
echo "   gcloud scheduler jobs run librarian-daily-maintenance --location=$REGION"
echo ""
echo "2. Monitor logs:"
echo "   gcloud run logs read bayit-plus-backend --region=us-east1 --limit=100"
echo ""
echo "3. Check audit results:"
echo "   curl https://bayit-plus-backend-znfki37vbq-ue.a.run.app/api/v1/admin/librarian/status"
echo ""
