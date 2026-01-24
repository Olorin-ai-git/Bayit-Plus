#!/bin/bash
# Add Audit Recovery Configuration to Google Cloud Secret Manager
#
# This script creates the necessary GCP secrets for the audit recovery system.
# Run this once to set up the secrets, then they'll be retrieved automatically
# by retrieve_secrets.sh during deployment.

set -e

PROJECT_ID="bayit-plus"

echo "=================================================="
echo "Adding Audit Recovery Secrets to GCP Secret Manager"
echo "Project: $PROJECT_ID"
echo "=================================================="
echo ""

# Function to create or update a secret
create_or_update_secret() {
    local secret_name=$1
    local secret_value=$2
    local description=$3

    echo "Processing: $secret_name"

    # Check if secret exists
    if gcloud secrets describe "$secret_name" --project="$PROJECT_ID" &>/dev/null; then
        echo "  → Secret exists, adding new version..."
        echo -n "$secret_value" | gcloud secrets versions add "$secret_name" \
            --project="$PROJECT_ID" \
            --data-file=-
        echo "  ✅ Updated successfully"
    else
        echo "  → Creating new secret..."
        echo -n "$secret_value" | gcloud secrets create "$secret_name" \
            --project="$PROJECT_ID" \
            --replication-policy="automatic" \
            --data-file=-

        # Add labels for organization
        gcloud secrets update "$secret_name" \
            --project="$PROJECT_ID" \
            --update-labels=category=librarian,subsystem=audit-recovery

        echo "  ✅ Created successfully"
    fi

    echo ""
}

echo "Creating/Updating Audit Recovery Secrets..."
echo ""

# Create the secrets with default values
create_or_update_secret \
    "bayit-audit-stuck-timeout-minutes" \
    "30" \
    "Minutes before audit is considered stuck (default: 30)"

create_or_update_secret \
    "bayit-audit-no-activity-timeout-minutes" \
    "15" \
    "Minutes of no activity before audit is suspicious (default: 15)"

create_or_update_secret \
    "bayit-audit-health-check-interval-seconds" \
    "300" \
    "How often to check for stuck audits in seconds (default: 300 = 5 minutes)"

echo "=================================================="
echo "✅ All audit recovery secrets have been configured!"
echo "=================================================="
echo ""
echo "Secrets created:"
echo "  • bayit-audit-stuck-timeout-minutes = 30"
echo "  • bayit-audit-no-activity-timeout-minutes = 15"
echo "  • bayit-audit-health-check-interval-seconds = 300"
echo ""
echo "To verify:"
echo "  gcloud secrets list --project=$PROJECT_ID --filter='labels.category=librarian'"
echo ""
echo "To update a value:"
echo "  echo -n 'NEW_VALUE' | gcloud secrets versions add SECRET_NAME --project=$PROJECT_ID --data-file=-"
echo ""
echo "These secrets will now be retrieved automatically by retrieve_secrets.sh"
echo "=================================================="
