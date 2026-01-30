#!/bin/bash
#
# Provision Beta 500 Secrets to Google Cloud Secret Manager (Staging)
# Creates all 16 Beta 500 secrets with staging values
#
# Usage: ./scripts/provision-beta-secrets-staging.sh
#

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }

PROJECT_ID="bayit-plus"
SERVICE_ACCOUNT="bayit-backend-staging@${PROJECT_ID}.iam.gserviceaccount.com"

log_info "Provisioning Beta 500 secrets to Google Cloud Secret Manager (staging)"
log_info "Project: $PROJECT_ID"
echo ""

# Helper function to create or update secret
create_secret() {
    local SECRET_NAME=$1
    local SECRET_VALUE=$2
    local DESCRIPTION=$3

    log_info "Creating secret: $SECRET_NAME"

    # Check if secret exists
    if gcloud secrets describe $SECRET_NAME --project=$PROJECT_ID &> /dev/null; then
        log_warning "Secret $SECRET_NAME already exists. Creating new version..."
        echo -n "$SECRET_VALUE" | gcloud secrets versions add $SECRET_NAME \
            --data-file=- \
            --project=$PROJECT_ID
    else
        # Create new secret
        echo -n "$SECRET_VALUE" | gcloud secrets create $SECRET_NAME \
            --data-file=- \
            --replication-policy="automatic" \
            --project=$PROJECT_ID

        # Add description (label)
        gcloud secrets update $SECRET_NAME \
            --update-labels=environment=staging,feature=beta-500,description="$DESCRIPTION" \
            --project=$PROJECT_ID
    fi

    # Grant access to service account
    gcloud secrets add-iam-policy-binding $SECRET_NAME \
        --member="serviceAccount:$SERVICE_ACCOUNT" \
        --role="roles/secretmanager.secretAccessor" \
        --project=$PROJECT_ID \
        --quiet

    log_success "Secret $SECRET_NAME created/updated"
}

# Generate secure random values
generate_random() {
    openssl rand -hex 32
}

log_info "Generating secure random values for secrets..."
HMAC_SECRET=$(generate_random)
FINGERPRINT_SALT=$(generate_random)
GRAFANA_PASSWORD=$(generate_random | cut -c1-16)

echo ""
log_info "╔════════════════════════════════════════════════════════════╗"
log_info "║  Beta 500 Program Configuration                           ║"
log_info "╚════════════════════════════════════════════════════════════╝"

create_secret "BETA_500_PROGRAM_ACTIVE" "true" "Beta 500 program active flag"
create_secret "BETA_500_MAX_USERS" "500" "Maximum beta users allowed"
create_secret "BETA_500_INITIAL_CREDITS" "5000" "Initial credits per user"

echo ""
log_info "╔════════════════════════════════════════════════════════════╗"
log_info "║  Email Verification Configuration                          ║"
log_info "╚════════════════════════════════════════════════════════════╝"

create_secret "BETA_EMAIL_VERIFICATION_SECRET" "$HMAC_SECRET" "HMAC-SHA256 secret for email verification"
create_secret "BETA_EMAIL_FROM_ADDRESS" "beta@bayit.plus" "Beta program email sender"
create_secret "BETA_EMAIL_SMTP_HOST" "smtp.gmail.com" "SMTP host for email"
create_secret "BETA_EMAIL_SMTP_PORT" "587" "SMTP port"

log_warning "IMPORTANT: You must manually set BETA_EMAIL_SMTP_PASSWORD"
log_warning "Generate Gmail App Password: https://myaccount.google.com/apppasswords"
log_warning "Then run: echo -n 'YOUR_APP_PASSWORD' | gcloud secrets create BETA_EMAIL_SMTP_PASSWORD --data-file=- --project=$PROJECT_ID"

echo ""
log_info "╔════════════════════════════════════════════════════════════╗"
log_info "║  Fraud Detection Configuration                             ║"
log_info "╚════════════════════════════════════════════════════════════╝"

create_secret "BETA_FRAUD_FINGERPRINT_SALT" "$FINGERPRINT_SALT" "SHA-256 salt for fingerprinting"
create_secret "BETA_FRAUD_MAX_SIGNUPS_PER_FINGERPRINT" "3" "Max signups per device fingerprint"
create_secret "BETA_FRAUD_DISPOSABLE_EMAIL_DOMAINS" "tempmail.com,guerrillamail.com,10minutemail.com,mailinator.com,throwaway.email" "Blocked disposable email domains"

echo ""
log_info "╔════════════════════════════════════════════════════════════╗"
log_info "║  Credit System Configuration                               ║"
log_info "╚════════════════════════════════════════════════════════════╝"

create_secret "BETA_CREDIT_COST_PER_SECOND" "1" "Credit cost per second of dubbing"
create_secret "BETA_SESSION_CHECKPOINT_INTERVAL" "30" "Session checkpoint interval (seconds)"

echo ""
log_info "╔════════════════════════════════════════════════════════════╗"
log_info "║  Monitoring Configuration                                  ║"
log_info "╚════════════════════════════════════════════════════════════╝"

create_secret "BETA_PROMETHEUS_SCRAPE_INTERVAL" "15s" "Prometheus scrape interval"
create_secret "BETA_GRAFANA_ADMIN_PASSWORD" "$GRAFANA_PASSWORD" "Grafana admin password"

log_warning "IMPORTANT: You must manually set BETA_ALERTMANAGER_SLACK_WEBHOOK"
log_warning "Create Slack webhook: https://api.slack.com/messaging/webhooks"
log_warning "Then run: echo -n 'YOUR_WEBHOOK_URL' | gcloud secrets create BETA_ALERTMANAGER_SLACK_WEBHOOK --data-file=- --project=$PROJECT_ID"

echo ""
log_success "╔════════════════════════════════════════════════════════════╗"
log_success "║  Secret Provisioning Complete!                             ║"
log_success "╚════════════════════════════════════════════════════════════╝"

echo ""
log_info "Secrets created/updated:"
log_info "  ✓ BETA_500_PROGRAM_ACTIVE"
log_info "  ✓ BETA_500_MAX_USERS"
log_info "  ✓ BETA_500_INITIAL_CREDITS"
log_info "  ✓ BETA_EMAIL_VERIFICATION_SECRET"
log_info "  ✓ BETA_EMAIL_FROM_ADDRESS"
log_info "  ✓ BETA_EMAIL_SMTP_HOST"
log_info "  ✓ BETA_EMAIL_SMTP_PORT"
log_info "  ✓ BETA_FRAUD_FINGERPRINT_SALT"
log_info "  ✓ BETA_FRAUD_MAX_SIGNUPS_PER_FINGERPRINT"
log_info "  ✓ BETA_FRAUD_DISPOSABLE_EMAIL_DOMAINS"
log_info "  ✓ BETA_CREDIT_COST_PER_SECOND"
log_info "  ✓ BETA_SESSION_CHECKPOINT_INTERVAL"
log_info "  ✓ BETA_PROMETHEUS_SCRAPE_INTERVAL"
log_info "  ✓ BETA_GRAFANA_ADMIN_PASSWORD"

echo ""
log_warning "Manual steps required:"
log_warning "  1. Set BETA_EMAIL_SMTP_PASSWORD (Gmail App Password)"
log_warning "  2. Set BETA_ALERTMANAGER_SLACK_WEBHOOK (Slack webhook URL)"
log_warning "  3. Set MONGODB_URI_STAGING (MongoDB Atlas connection string)"

echo ""
log_info "Generated values (SAVE THESE SECURELY):"
log_info "  HMAC Secret: $HMAC_SECRET"
log_info "  Fingerprint Salt: $FINGERPRINT_SALT"
log_info "  Grafana Password: $GRAFANA_PASSWORD"

echo ""
log_info "To view secrets:"
log_info "  gcloud secrets list --project=$PROJECT_ID --filter='labels.feature=beta-500'"

echo ""
log_info "To access secret values:"
log_info "  gcloud secrets versions access latest --secret=SECRET_NAME --project=$PROJECT_ID"
