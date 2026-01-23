#!/bin/bash
set -euo pipefail

# Bayit+ Backend Deployment Script (Fully Automated)
# Deploys FastAPI backend to Google Cloud Run with complete configuration
# All configuration from environment variables and .env file

# Get repository root and backend path (centralized deployment script)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OLORIN_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
REPO_ROOT="$OLORIN_ROOT/olorin-media/bayit-plus"
BACKEND_DIR="$REPO_ROOT/backend"

# Source shared utilities
source "$OLORIN_ROOT/scripts/common/colors.sh"
source "$OLORIN_ROOT/scripts/common/logging.sh"
source "$OLORIN_ROOT/scripts/common/prerequisites.sh"
source "$OLORIN_ROOT/scripts/common/health-check.sh"
source "$OLORIN_ROOT/scripts/common/docker-utils.sh"

# Main deployment script
main() {
    print_header "Bayit+ Backend Deployment Script (Automated)"

    # Check prerequisites
    log_step "Checking Prerequisites"
    check_prerequisites "gcloud" "gsutil" "poetry" || exit 1

    # ============================================================
    # AUTHENTICATION CHECK (mandatory before deployment)
    # ============================================================
    log_step "Checking Google Cloud Authentication"

    # Check if user is authenticated
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null | grep -q .; then
        print_error "Not authenticated with Google Cloud"
        echo ""
        log_info "Please authenticate with Google Cloud first:"
        echo "  gcloud auth login"
        echo ""
        log_info "If using a service account:"
        echo "  gcloud auth activate-service-account --key-file=/path/to/key.json"
        echo ""
        exit 1
    fi

    ACTIVE_ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null | head -1)
    print_success "Authenticated as: $ACTIVE_ACCOUNT"

    # Try to set project (this will fail if auth tokens are expired)
    PROJECT_ID="${GCP_PROJECT_ID:-bayit-plus}"
    log_substep "Setting project to $PROJECT_ID..."
    if ! gcloud config set project "$PROJECT_ID" > /dev/null 2>&1; then
        print_error "Failed to set project. Authentication tokens may be expired."
        echo ""
        log_info "Please re-authenticate:"
        echo "  gcloud auth login"
        echo ""
        exit 1
    fi
    print_success "Project set to: $PROJECT_ID"

    # ============================================================
    # BUILD VERIFICATION (mandatory before deployment)
    # ============================================================
    log_step "Build Verification"

    log_substep "Verifying backend build at: $BACKEND_DIR"
    cd "$BACKEND_DIR"

    # Step 1: Verify Poetry lock file is up to date
    log_substep "Checking Poetry lock file..."
    if ! poetry check 2>&1 | grep -q "All set"; then
        log_warning "Poetry lock file may need updating, continuing..."
    fi
    print_success "Poetry check complete"

    # Step 2: Install dependencies (ensure all are present)
    log_substep "Installing dependencies..."
    if ! poetry install --no-root 2>&1 | tail -5; then
        print_error "Failed to install dependencies"
        exit 1
    fi
    print_success "Dependencies installed"

    # Step 3: Compile all Python files (syntax check)
    log_substep "Verifying Python syntax..."
    if ! poetry run python -m py_compile app/main.py 2>&1; then
        print_error "Python syntax error in app/main.py"
        exit 1
    fi

    # Compile all route files
    for f in app/api/routes/*.py; do
        if [[ -f "$f" ]] && ! poetry run python -m py_compile "$f" 2>&1; then
            print_error "Python syntax error in $f"
            exit 1
        fi
    done

    # Compile all service files
    for f in app/services/*.py; do
        if [[ -f "$f" ]] && ! poetry run python -m py_compile "$f" 2>&1; then
            print_error "Python syntax error in $f"
            exit 1
        fi
    done

    # Compile AI agent files
    for f in app/services/ai_agent/*.py; do
        if [[ -f "$f" ]] && ! poetry run python -m py_compile "$f" 2>&1; then
            print_error "Python syntax error in $f"
            exit 1
        fi
    done
    for f in app/services/ai_agent/executors/*.py; do
        if [[ -f "$f" ]] && ! poetry run python -m py_compile "$f" 2>&1; then
            print_error "Python syntax error in $f"
            exit 1
        fi
    done
    print_success "Python syntax verification passed"

    # Step 4: Verify imports work (catches missing dependencies)
    log_substep "Verifying application imports..."
    IMPORT_OUTPUT=$(poetry run python -c "from app.main import app; print('OK')" 2>&1)
    if echo "$IMPORT_OUTPUT" | tail -1 | grep -q "OK"; then
        print_success "Application imports verified"
    else
        print_error "Application import failed. Check for missing dependencies or import errors."
        echo "$IMPORT_OUTPUT"
        log_info "Run manually: cd $BACKEND_DIR && poetry run python -c 'from app.main import app'"
        exit 1
    fi

    print_success "Build verification passed - proceeding with deployment"
    echo ""

    # Configuration from environment or defaults
    log_step "Configuration"

    # PROJECT_ID already set in authentication check
    REGION="${GCP_REGION:-us-east1}"
    BUCKET_NAME="${GCS_BUCKET_NAME:-bayit-plus-media-new}"
    SERVICE_NAME="${CLOUD_RUN_SERVICE_NAME:-bayit-plus-backend}"
    SERVICE_ACCOUNT="${SERVICE_ACCOUNT_EMAIL:-bayit-plus@appspot.gserviceaccount.com}"

    # Optional features (default: skip)
    ENABLE_APIS="${ENABLE_APIS:-false}"
    ENABLE_S3_MIGRATION="${ENABLE_S3_MIGRATION:-false}"
    ENABLE_CUSTOM_DOMAIN="${ENABLE_CUSTOM_DOMAIN:-false}"
    ENABLE_CLOUD_BUILD="${ENABLE_CLOUD_BUILD:-false}"
    ENABLE_PUBLIC_BUCKET="${ENABLE_PUBLIC_BUCKET:-false}"

    # Display configuration
    echo ""
    log_info "Configuration:"
    echo "  Project ID: $PROJECT_ID"
    echo "  Region: $REGION"
    echo "  Bucket Name: $BUCKET_NAME"
    echo "  Service Name: $SERVICE_NAME"
    echo "  Service Account: $SERVICE_ACCOUNT"
    echo "  Enable APIs: $ENABLE_APIS"
    echo "  S3 Migration: $ENABLE_S3_MIGRATION"
    echo "  Custom Domain: $ENABLE_CUSTOM_DOMAIN"
    echo "  Cloud Build: $ENABLE_CLOUD_BUILD"
    echo ""

    # Step 1: Enable APIs (optional)
    if [[ "$ENABLE_APIS" == "true" ]]; then
        log_step "Enabling Required APIs"
        log_substep "Enabling APIs..."
        gcloud services enable \
            cloudbuild.googleapis.com \
            run.googleapis.com \
            secretmanager.googleapis.com \
            storage-api.googleapis.com \
            storage-component.googleapis.com \
            --quiet
        print_success "APIs enabled"
    else
        log_info "Skipping API enablement (set ENABLE_APIS=true to enable)"
    fi

    # Step 2: Create GCS Bucket
    log_step "Creating Google Cloud Storage Bucket"

    if gsutil ls -b "gs://$BUCKET_NAME" >/dev/null 2>&1; then
        log_warning "Bucket gs://$BUCKET_NAME already exists"
    else
        log_substep "Creating bucket..."
        gsutil mb -p "$PROJECT_ID" -c STANDARD -l "$REGION" "gs://$BUCKET_NAME"

        # Enable uniform access
        gsutil uniformbucketlevelaccess set on "gs://$BUCKET_NAME"

        # Configure CORS
        cat > /tmp/bayit-cors.json << 'EOF'
[
  {
    "origin": ["https://bayit.tv", "https://www.bayit.tv", "http://localhost:3000"],
    "method": ["GET", "HEAD", "PUT", "POST"],
    "responseHeader": ["Content-Type", "Content-Length"],
    "maxAgeSeconds": 3600
  }
]
EOF
        gsutil cors set /tmp/bayit-cors.json "gs://$BUCKET_NAME"

        # Set lifecycle rules
        cat > /tmp/bayit-lifecycle.json << 'EOF'
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {
          "age": 7,
          "matchesPrefix": ["uploads/temp/"]
        }
      }
    ]
  }
}
EOF
        gsutil lifecycle set /tmp/bayit-lifecycle.json "gs://$BUCKET_NAME"

        # Grant service account access
        gsutil iam ch "serviceAccount:$SERVICE_ACCOUNT:objectAdmin" "gs://$BUCKET_NAME"

        # Enable public access for images (optional)
        if [[ "$ENABLE_PUBLIC_BUCKET" == "true" ]]; then
            gsutil iam ch allUsers:objectViewer "gs://$BUCKET_NAME"
            log_info "Public read access enabled"
        fi

        print_success "Bucket created: gs://$BUCKET_NAME"
    fi

    # Step 3: Verify Service Account
    log_step "Verifying Service Account"

    if gcloud iam service-accounts describe "$SERVICE_ACCOUNT" >/dev/null 2>&1; then
        print_success "Service account exists: $SERVICE_ACCOUNT"
    else
        print_error "Service account not found: $SERVICE_ACCOUNT"
        log_info "Please create the service account first or set SERVICE_ACCOUNT_EMAIL env var"
        exit 1
    fi

    # Step 4: Create/Update Secrets
    log_step "Creating Secrets in Secret Manager"

    log_substep "Reading secrets from backend/.env file..."

    ENV_FILE="$REPO_ROOT/backend/.env"

    log_info "Looking for .env at: $ENV_FILE"

    # Function to create or update secret
    create_or_update_secret() {
        local secret_name=$1
        local env_key=$2
        local value=""

        # Try to read from backend/.env
        if [[ -f "$ENV_FILE" ]]; then
            value=$(grep "^${env_key}=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2-)
        fi

        # Try from environment variable
        if [[ -z "$value" ]]; then
            value="${!env_key}"
        fi

        if [[ -n "$value" ]]; then
            if gcloud secrets describe "$secret_name" >/dev/null 2>&1; then
                echo -n "$value" | gcloud secrets versions add "$secret_name" --data-file=- 2>/dev/null
                print_success "Updated: $secret_name"
            else
                echo -n "$value" | gcloud secrets create "$secret_name" --data-file=- 2>/dev/null
                print_success "Created: $secret_name"
            fi
        else
            log_warning "Skipped: $secret_name (not found in .env or environment)"
        fi
    }

    # SECURITY FIX: MongoDB credentials must come from environment/.env ONLY
    # No hardcoded fallback values
    if [[ -z "$MONGODB_URL" ]]; then
        print_error "MONGODB_URL environment variable is required"
        log_info "Set MONGODB_URL in backend/.env or as environment variable"
        exit 1
    fi

    echo -n "$MONGODB_URL" | gcloud secrets create bayit-mongodb-url --data-file=- 2>/dev/null || \
        echo -n "$MONGODB_URL" | gcloud secrets versions add bayit-mongodb-url --data-file=-
    print_success "Created: bayit-mongodb-url"

    MONGODB_DB="${MONGODB_DB_NAME:-bayit_plus}"
    echo -n "$MONGODB_DB" | gcloud secrets create bayit-mongodb-db-name --data-file=- 2>/dev/null || \
        echo -n "$MONGODB_DB" | gcloud secrets versions add bayit-mongodb-db-name --data-file=-
    print_success "Created: bayit-mongodb-db-name"

    # All other secrets from .env
    create_or_update_secret "bayit-secret-key" "SECRET_KEY"
    create_or_update_secret "bayit-stripe-api-key" "STRIPE_API_KEY"
    create_or_update_secret "bayit-stripe-secret-key" "STRIPE_SECRET_KEY"
    create_or_update_secret "bayit-stripe-webhook-secret" "STRIPE_WEBHOOK_SECRET"
    create_or_update_secret "bayit-stripe-price-basic" "STRIPE_PRICE_BASIC"
    create_or_update_secret "bayit-stripe-price-premium" "STRIPE_PRICE_PREMIUM"
    create_or_update_secret "bayit-stripe-price-family" "STRIPE_PRICE_FAMILY"
    create_or_update_secret "bayit-openai-api-key" "OPENAI_API_KEY"
    create_or_update_secret "bayit-anthropic-api-key" "ANTHROPIC_API_KEY"
    create_or_update_secret "tmdb-api-key" "TMDB_API_KEY"
    create_or_update_secret "tmdb-api-token" "TMDB_API_TOKEN"
    create_or_update_secret "bayit-google-client-id" "GOOGLE_CLIENT_ID"
    create_or_update_secret "bayit-google-client-secret" "GOOGLE_CLIENT_SECRET"
    create_or_update_secret "bayit-elevenlabs-api-key" "ELEVENLABS_API_KEY"
    create_or_update_secret "bayit-twilio-account-sid" "TWILIO_ACCOUNT_SID"
    create_or_update_secret "bayit-twilio-auth-token" "TWILIO_AUTH_TOKEN"
    create_or_update_secret "bayit-twilio-phone-number" "TWILIO_PHONE_NUMBER"
    create_or_update_secret "opensubtitles-api-key" "OPENSUBTITLES_API_KEY"
    create_or_update_secret "picovoice-access-key" "PICOVOICE_ACCESS_KEY"
    create_or_update_secret "bayit-sentry-dsn" "SENTRY_DSN"

    # Google redirect URI
    GOOGLE_REDIRECT_URI="${GOOGLE_REDIRECT_URI:-https://bayit.tv/auth/google/callback}"
    echo -n "$GOOGLE_REDIRECT_URI" | gcloud secrets create bayit-google-redirect-uri --data-file=- 2>/dev/null || \
        echo -n "$GOOGLE_REDIRECT_URI" | gcloud secrets versions add bayit-google-redirect-uri --data-file=-
    print_success "Created: bayit-google-redirect-uri"

    # GCS bucket name secret
    echo -n "$BUCKET_NAME" | gcloud secrets create bayit-gcs-bucket-name --data-file=- 2>/dev/null || \
        echo -n "$BUCKET_NAME" | gcloud secrets versions add bayit-gcs-bucket-name --data-file=-

    # CORS origins secret
    CORS_ORIGINS='["https://bayit.tv","https://www.bayit.tv","http://localhost:3000"]'
    echo -n "$CORS_ORIGINS" | gcloud secrets create bayit-cors-origins --data-file=- 2>/dev/null || \
        echo -n "$CORS_ORIGINS" | gcloud secrets versions add bayit-cors-origins --data-file=-

    # GCP Project ID
    echo -n "$PROJECT_ID" | gcloud secrets create bayit-gcp-project-id --data-file=- 2>/dev/null || \
        echo -n "$PROJECT_ID" | gcloud secrets versions add bayit-gcp-project-id --data-file=-

    # Librarian Agent Configuration
    create_or_update_secret "bayit-librarian-daily-audit-cron" "LIBRARIAN_DAILY_AUDIT_CRON"
    create_or_update_secret "bayit-librarian-daily-audit-time" "LIBRARIAN_DAILY_AUDIT_TIME"
    create_or_update_secret "bayit-librarian-daily-audit-mode" "LIBRARIAN_DAILY_AUDIT_MODE"
    create_or_update_secret "bayit-librarian-daily-audit-cost" "LIBRARIAN_DAILY_AUDIT_COST"
    create_or_update_secret "bayit-librarian-daily-audit-status" "LIBRARIAN_DAILY_AUDIT_STATUS"
    create_or_update_secret "bayit-librarian-daily-audit-description" "LIBRARIAN_DAILY_AUDIT_DESCRIPTION"
    create_or_update_secret "bayit-librarian-weekly-audit-cron" "LIBRARIAN_WEEKLY_AUDIT_CRON"
    create_or_update_secret "bayit-librarian-weekly-audit-time" "LIBRARIAN_WEEKLY_AUDIT_TIME"
    create_or_update_secret "bayit-librarian-weekly-audit-mode" "LIBRARIAN_WEEKLY_AUDIT_MODE"
    create_or_update_secret "bayit-librarian-weekly-audit-cost" "LIBRARIAN_WEEKLY_AUDIT_COST"
    create_or_update_secret "bayit-librarian-weekly-audit-status" "LIBRARIAN_WEEKLY_AUDIT_STATUS"
    create_or_update_secret "bayit-librarian-weekly-audit-description" "LIBRARIAN_WEEKLY_AUDIT_DESCRIPTION"
    create_or_update_secret "bayit-librarian-max-iterations" "LIBRARIAN_MAX_ITERATIONS"
    create_or_update_secret "bayit-librarian-default-budget-usd" "LIBRARIAN_DEFAULT_BUDGET_USD"
    create_or_update_secret "bayit-librarian-min-budget-usd" "LIBRARIAN_MIN_BUDGET_USD"
    create_or_update_secret "bayit-librarian-max-budget-usd" "LIBRARIAN_MAX_BUDGET_USD"
    create_or_update_secret "bayit-librarian-budget-step-usd" "LIBRARIAN_BUDGET_STEP_USD"
    create_or_update_secret "bayit-librarian-reports-limit" "LIBRARIAN_REPORTS_LIMIT"
    create_or_update_secret "bayit-librarian-actions-limit" "LIBRARIAN_ACTIONS_LIMIT"
    create_or_update_secret "bayit-librarian-activity-page-size" "LIBRARIAN_ACTIVITY_PAGE_SIZE"
    create_or_update_secret "bayit-librarian-id-truncate-length" "LIBRARIAN_ID_TRUNCATE_LENGTH"
    create_or_update_secret "bayit-librarian-modal-max-height" "LIBRARIAN_MODAL_MAX_HEIGHT"

    # Series Linker Configuration
    create_or_update_secret "bayit-series-linker-title-similarity" "SERIES_LINKER_TITLE_SIMILARITY_THRESHOLD"
    create_or_update_secret "bayit-series-linker-auto-link-confidence" "SERIES_LINKER_AUTO_LINK_CONFIDENCE_THRESHOLD"
    create_or_update_secret "bayit-series-linker-batch-size" "SERIES_LINKER_AUTO_LINK_BATCH_SIZE"
    create_or_update_secret "bayit-series-linker-duplicate-strategy" "SERIES_LINKER_DUPLICATE_RESOLUTION_STRATEGY"
    create_or_update_secret "bayit-series-linker-create-missing" "SERIES_LINKER_CREATE_MISSING_SERIES"

    # Judaism Section Configuration
    create_or_update_secret "bayit-jewish-news-cache-ttl" "JEWISH_NEWS_CACHE_TTL_MINUTES"
    create_or_update_secret "bayit-jewish-news-sync-interval" "JEWISH_NEWS_SYNC_INTERVAL_MINUTES"
    create_or_update_secret "bayit-jewish-news-timeout" "JEWISH_NEWS_REQUEST_TIMEOUT_SECONDS"
    create_or_update_secret "bayit-hebcal-api-url" "HEBCAL_API_BASE_URL"
    create_or_update_secret "bayit-sefaria-api-url" "SEFARIA_API_BASE_URL"
    create_or_update_secret "bayit-jewish-calendar-cache-ttl" "JEWISH_CALENDAR_CACHE_TTL_HOURS"
    create_or_update_secret "bayit-community-search-radius" "COMMUNITY_SEARCH_RADIUS_MILES"
    create_or_update_secret "bayit-community-default-region" "COMMUNITY_DEFAULT_REGION"
    create_or_update_secret "bayit-us-jewish-regions" "US_JEWISH_REGIONS"
    create_or_update_secret "bayit-community-scrape-interval" "COMMUNITY_SCRAPE_INTERVAL_HOURS"
    create_or_update_secret "bayit-yutorah-rss-url" "YUTORAH_RSS_URL"
    create_or_update_secret "bayit-chabad-multimedia-rss-url" "CHABAD_MULTIMEDIA_RSS_URL"
    create_or_update_secret "bayit-torahanytime-rss-url" "TORAHANYTIME_RSS_URL"

    # Apple Push Notifications (APNs)
    create_or_update_secret "bayit-apple-key-id" "APPLE_KEY_ID"
    create_or_update_secret "bayit-apple-team-id" "APPLE_TEAM_ID"
    create_or_update_secret "bayit-apple-bundle-id-ios" "APPLE_BUNDLE_ID_IOS"
    create_or_update_secret "bayit-apple-bundle-id-tvos" "APPLE_BUNDLE_ID_TVOS"

    # Olorin.ai Platform Configuration
    create_or_update_secret "olorin-pinecone-api-key" "PINECONE_API_KEY"
    create_or_update_secret "olorin-partner-api-key-salt" "PARTNER_API_KEY_SALT"
    create_or_update_secret "olorin-secret-key" "SECRET_KEY"

    # Turborepo Remote Cache Configuration
    create_or_update_secret "turbo-token" "TURBO_TOKEN"
    create_or_update_secret "turbo-team" "TURBO_TEAM"

    print_success "Secrets created/updated from .env"

    # Step 5: Grant Secret Access
    log_step "Granting Secret Access to Service Account"

    log_substep "Granting secret access..."
    for secret in bayit-secret-key bayit-mongodb-url bayit-mongodb-db-name \
                  bayit-stripe-api-key bayit-stripe-secret-key bayit-stripe-webhook-secret \
                  bayit-stripe-price-basic bayit-stripe-price-premium bayit-stripe-price-family \
                  bayit-openai-api-key bayit-anthropic-api-key \
                  tmdb-api-key tmdb-api-token \
                  bayit-google-client-id bayit-google-client-secret bayit-google-redirect-uri \
                  bayit-elevenlabs-api-key bayit-gcs-bucket-name bayit-cors-origins bayit-gcp-project-id \
                  bayit-twilio-account-sid bayit-twilio-auth-token bayit-twilio-phone-number \
                  opensubtitles-api-key picovoice-access-key bayit-sentry-dsn \
                  bayit-librarian-daily-audit-cron bayit-librarian-daily-audit-time bayit-librarian-daily-audit-mode \
                  bayit-librarian-daily-audit-cost bayit-librarian-daily-audit-status bayit-librarian-daily-audit-description \
                  bayit-librarian-weekly-audit-cron bayit-librarian-weekly-audit-time bayit-librarian-weekly-audit-mode \
                  bayit-librarian-weekly-audit-cost bayit-librarian-weekly-audit-status bayit-librarian-weekly-audit-description \
                  bayit-librarian-max-iterations bayit-librarian-default-budget-usd bayit-librarian-min-budget-usd \
                  bayit-librarian-max-budget-usd bayit-librarian-budget-step-usd bayit-librarian-reports-limit \
                  bayit-librarian-actions-limit bayit-librarian-activity-page-size bayit-librarian-id-truncate-length \
                  bayit-librarian-modal-max-height \
                  bayit-series-linker-title-similarity bayit-series-linker-auto-link-confidence \
                  bayit-series-linker-batch-size bayit-series-linker-duplicate-strategy \
                  bayit-series-linker-create-missing \
                  bayit-jewish-news-cache-ttl bayit-jewish-news-sync-interval bayit-jewish-news-timeout \
                  bayit-hebcal-api-url bayit-sefaria-api-url bayit-jewish-calendar-cache-ttl \
                  bayit-community-search-radius bayit-community-default-region bayit-us-jewish-regions \
                  bayit-community-scrape-interval bayit-yutorah-rss-url bayit-chabad-multimedia-rss-url \
                  bayit-torahanytime-rss-url \
                  bayit-apple-key-id bayit-apple-team-id bayit-apple-bundle-id-ios bayit-apple-bundle-id-tvos \
                  olorin-pinecone-api-key olorin-partner-api-key-salt olorin-secret-key \
                  turbo-token turbo-team; do
        gcloud secrets add-iam-policy-binding "$secret" \
            --member="serviceAccount:$SERVICE_ACCOUNT" \
            --role="roles/secretmanager.secretAccessor" \
            --quiet 2>/dev/null || true
    done

    # Grant logging permissions
    gcloud projects add-iam-policy-binding "$PROJECT_ID" \
        --member="serviceAccount:$SERVICE_ACCOUNT" \
        --role="roles/logging.logWriter" \
        --quiet 2>/dev/null || true

    gcloud projects add-iam-policy-binding "$PROJECT_ID" \
        --member="serviceAccount:$SERVICE_ACCOUNT" \
        --role="roles/cloudtrace.agent" \
        --quiet 2>/dev/null || true

    print_success "Permissions granted"

    # Step 6: S3 to GCS Migration (optional)
    if [[ "$ENABLE_S3_MIGRATION" == "true" && -n "$AWS_S3_BUCKET" ]]; then
        log_step "S3 to GCS Migration"

        if command_exists aws; then
            log_substep "Migrating data from s3://$AWS_S3_BUCKET to gs://$BUCKET_NAME..."
            gsutil -m rsync -r -d "s3://$AWS_S3_BUCKET" "gs://$BUCKET_NAME/"
            print_success "Data migration complete"
        else
            log_warning "AWS CLI not found. Skipping S3 migration"
        fi
    else
        log_info "Skipping S3 migration (set ENABLE_S3_MIGRATION=true and AWS_S3_BUCKET to enable)"
    fi

    # Step 7: Build and Deploy
    log_step "Building and Deploying to Cloud Run"

    log_substep "Building and deploying using Cloud Build (cloudbuild.yaml)..."

    # Navigate to repo root for Cloud Build
    cd "$REPO_ROOT"

    # Verify cloudbuild.yaml exists
    if [[ ! -f "cloudbuild.yaml" ]]; then
        print_error "cloudbuild.yaml not found at $REPO_ROOT"
        log_info "Current directory: $(pwd)"
        log_info "Looking for: $REPO_ROOT/cloudbuild.yaml"
        exit 1
    fi
    log_info "Found cloudbuild.yaml at $REPO_ROOT"

    # Build and deploy using cloudbuild.yaml (includes all configuration)
    gcloud builds submit \
        --config=cloudbuild.yaml \
        --substitutions=_REGION=$REGION,_MEMORY=2Gi,_CPU=2,_MAX_INSTANCES=10,_MIN_INSTANCES=1

    # Get service URL
    SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" --region "$REGION" --format 'value(status.url)')

    print_success "Deployment complete!"
    echo ""
    log_info "Service URL: $SERVICE_URL"
    echo ""

    # Test health endpoint using shared utility
    log_substep "Testing health endpoint..."
    if check_health_endpoint "$SERVICE_URL" "/health" 10 5; then
        print_success "Health check passed!"
    else
        log_warning "Health check failed. Check logs with:"
        echo "  gcloud run services logs read $SERVICE_NAME --region $REGION --limit 50"
    fi

    # Step 8: Custom Domain (optional)
    if [[ "$ENABLE_CUSTOM_DOMAIN" == "true" && -n "$CUSTOM_DOMAIN" ]]; then
        log_step "Custom Domain"

        log_substep "Creating domain mapping for $CUSTOM_DOMAIN..."
        gcloud run domain-mappings create \
            --service "$SERVICE_NAME" \
            --domain "$CUSTOM_DOMAIN" \
            --region "$REGION" 2>/dev/null || true

        log_info "DNS Configuration Required:"
        gcloud run domain-mappings describe \
            --domain "$CUSTOM_DOMAIN" \
            --region "$REGION" \
            --format 'value(status.resourceRecords)' 2>/dev/null || true

        log_warning "Add the CNAME record shown above to your DNS provider"
    else
        log_info "Skipping custom domain (set ENABLE_CUSTOM_DOMAIN=true and CUSTOM_DOMAIN to enable)"
    fi

    # Step 9: Cloud Build Trigger (optional)
    if [[ "$ENABLE_CLOUD_BUILD" == "true" ]]; then
        log_step "Cloud Build Trigger"

        log_substep "Configuring Cloud Build permissions..."

        PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
        CLOUD_BUILD_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

        gcloud projects add-iam-policy-binding "$PROJECT_ID" \
            --member="serviceAccount:$CLOUD_BUILD_SA" \
            --role="roles/run.admin" \
            --quiet 2>/dev/null || true

        gcloud iam service-accounts add-iam-policy-binding "$SERVICE_ACCOUNT" \
            --member="serviceAccount:$CLOUD_BUILD_SA" \
            --role="roles/iam.serviceAccountUser" \
            --quiet 2>/dev/null || true

        print_success "Cloud Build permissions configured"
        log_info "Create trigger at: https://console.cloud.google.com/cloud-build/triggers?project=$PROJECT_ID"
    else
        log_info "Skipping Cloud Build trigger (set ENABLE_CLOUD_BUILD=true to enable)"
    fi

    # Summary
    log_step "Deployment Summary"

    print_deployment_complete
    echo ""
    echo "Resources configured:"
    echo "  ✓ GCS Bucket: gs://$BUCKET_NAME"
    echo "  ✓ Service Account: $SERVICE_ACCOUNT"
    echo "  ✓ Cloud Run Service: $SERVICE_NAME"
    echo "  ✓ Service URL: $SERVICE_URL"
    echo ""
    echo "Features enabled:"
    echo "  ✓ OpenAI Whisper transcription (SPEECH_TO_TEXT_PROVIDER=whisper)"
    echo "  ✓ Stripe payments (API key + secret key)"
    echo "  ✓ Google OAuth authentication"
    echo "  ✓ Anthropic Claude AI"
    echo "  ✓ ElevenLabs speech synthesis"
    echo "  ✓ MongoDB Atlas database"
    echo "  ✓ Twilio SMS verification (Account SID + Auth Token + Phone Number)"
    echo "  ✓ Judaism Section (Jewish News, Calendar, Community Directory, Torah Content)"
    echo "  ✓ GCS Upload (10min timeout, 5 retries, 8MB chunks)"
    echo "  ✓ Apple Push Notifications (APNs for iOS + tvOS)"
    echo "  ✓ Kids Content Service (runtime aggregation with caching)"
    echo "  ✓ Olorin.ai Platform (Realtime Dubbing, Semantic Search, Cultural Context, Recap Agent)"
    echo ""
    echo "Next steps:"
    echo "  1. Update OAuth redirect URIs in Google Cloud Console"
    echo "  2. Update Stripe webhook URLs in Stripe Dashboard"
    echo "  3. Update frontend API URL to: $SERVICE_URL"
    echo "  4. Test all endpoints (especially live subtitles with Whisper)"
    echo "  5. Setup monitoring and alerts"
    echo ""
    log_info "View logs:"
    echo "  gcloud run services logs read $SERVICE_NAME --region $REGION --limit 50"
    echo ""
    print_success "Deployment script complete!"
}

# Run main function
main "$@"
