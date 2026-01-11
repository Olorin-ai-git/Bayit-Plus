#!/bin/bash
set -e

# Bayit+ Backend Deployment Script
# Deploys FastAPI backend to Google Cloud Run

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo -e "\n${BLUE}===================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}===================================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Prompt for user input with default value
prompt_with_default() {
    local prompt="$1"
    local default="$2"
    local response

    read -p "$prompt [$default]: " response
    echo "${response:-$default}"
}

# Confirm action
confirm() {
    local prompt="$1"
    local response

    read -p "$prompt (y/N): " response
    [[ "$response" =~ ^[Yy]$ ]]
}

# Main deployment script
main() {
    print_header "Bayit+ Backend Deployment Script"

    # Check prerequisites
    print_info "Checking prerequisites..."

    if ! command_exists gcloud; then
        print_error "gcloud CLI not found. Please install: https://cloud.google.com/sdk/docs/install"
        exit 1
    fi

    if ! command_exists gsutil; then
        print_error "gsutil not found. Please install Google Cloud SDK"
        exit 1
    fi

    print_success "Prerequisites check passed"

    # Get configuration
    print_header "Configuration"

    PROJECT_ID=$(prompt_with_default "Enter GCP Project ID" "$(gcloud config get-value project 2>/dev/null)")
    REGION=$(prompt_with_default "Enter GCP Region" "us-central1")
    BUCKET_NAME=$(prompt_with_default "Enter GCS Bucket Name" "bayit-plus-media")
    SERVICE_NAME=$(prompt_with_default "Enter Cloud Run Service Name" "bayit-plus-backend")

    # Configure gcloud
    print_info "Configuring gcloud..."
    gcloud config set project "$PROJECT_ID"
    print_success "Project set to: $PROJECT_ID"

    # Confirm configuration
    echo ""
    print_info "Configuration Summary:"
    echo "  Project ID: $PROJECT_ID"
    echo "  Region: $REGION"
    echo "  Bucket Name: $BUCKET_NAME"
    echo "  Service Name: $SERVICE_NAME"
    echo ""

    if ! confirm "Continue with this configuration?"; then
        print_warning "Deployment cancelled"
        exit 0
    fi

    # Step 1: Enable APIs
    print_header "Step 1: Enabling Required APIs"

    if confirm "Enable required Google Cloud APIs?"; then
        print_info "Enabling APIs (this may take a minute)..."
        gcloud services enable \
            cloudbuild.googleapis.com \
            run.googleapis.com \
            secretmanager.googleapis.com \
            storage-api.googleapis.com \
            storage-component.googleapis.com \
            --quiet
        print_success "APIs enabled"
    else
        print_warning "Skipping API enablement"
    fi

    # Step 2: Create GCS Bucket
    print_header "Step 2: Creating Google Cloud Storage Bucket"

    if gsutil ls -b "gs://$BUCKET_NAME" >/dev/null 2>&1; then
        print_warning "Bucket gs://$BUCKET_NAME already exists"
    else
        if confirm "Create GCS bucket gs://$BUCKET_NAME?"; then
            print_info "Creating bucket..."
            gsutil mb -p "$PROJECT_ID" -c STANDARD -l "$REGION" "gs://$BUCKET_NAME"

            # Enable uniform access
            gsutil uniformbucketlevelaccess set on "gs://$BUCKET_NAME"

            # Configure CORS
            cat > /tmp/cors.json << 'EOF'
[
  {
    "origin": ["https://bayit.tv", "https://www.bayit.tv", "http://localhost:3000"],
    "method": ["GET", "HEAD", "PUT", "POST"],
    "responseHeader": ["Content-Type", "Content-Length"],
    "maxAgeSeconds": 3600
  }
]
EOF
            gsutil cors set /tmp/cors.json "gs://$BUCKET_NAME"

            # Set lifecycle rules
            cat > /tmp/lifecycle.json << 'EOF'
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
            gsutil lifecycle set /tmp/lifecycle.json "gs://$BUCKET_NAME"

            # Enable public access for images
            if confirm "Enable public read access for images?"; then
                gsutil iam ch allUsers:objectViewer "gs://$BUCKET_NAME"
            fi

            print_success "Bucket created: gs://$BUCKET_NAME"
        else
            print_warning "Skipping bucket creation"
        fi
    fi

    # Step 3: Create Service Account
    print_header "Step 3: Creating Service Account"

    SERVICE_ACCOUNT="$SERVICE_NAME@$PROJECT_ID.iam.gserviceaccount.com"

    if gcloud iam service-accounts describe "$SERVICE_ACCOUNT" >/dev/null 2>&1; then
        print_warning "Service account already exists: $SERVICE_ACCOUNT"
    else
        if confirm "Create service account?"; then
            print_info "Creating service account..."
            gcloud iam service-accounts create "$SERVICE_NAME" \
                --display-name="Bayit Plus Backend Service" \
                --description="Service account for Bayit+ FastAPI backend on Cloud Run"

            print_success "Service account created: $SERVICE_ACCOUNT"
        else
            print_warning "Skipping service account creation"
        fi
    fi

    # Grant GCS permissions
    print_info "Granting GCS permissions to service account..."
    gsutil iam ch "serviceAccount:$SERVICE_ACCOUNT:objectAdmin" "gs://$BUCKET_NAME" || true
    print_success "GCS permissions granted"

    # Step 4: Create Secrets
    print_header "Step 4: Creating Secrets in Secret Manager"

    if confirm "Create/update secrets in Secret Manager?"; then
        print_warning "You'll need to provide values for each secret"
        echo ""

        # Function to create or update secret
        create_or_update_secret() {
            local secret_name=$1
            local prompt_text=$2
            local default_value=$3

            local value
            if [[ -n "$default_value" ]]; then
                value=$(prompt_with_default "$prompt_text" "$default_value")
            else
                read -sp "$prompt_text: " value
                echo ""
            fi

            if [[ -n "$value" ]]; then
                if gcloud secrets describe "$secret_name" >/dev/null 2>&1; then
                    echo -n "$value" | gcloud secrets versions add "$secret_name" --data-file=-
                    print_success "Updated: $secret_name"
                else
                    echo -n "$value" | gcloud secrets create "$secret_name" --data-file=-
                    print_success "Created: $secret_name"
                fi
            else
                print_warning "Skipped: $secret_name (no value provided)"
            fi
        }

        # Create all secrets
        create_or_update_secret "bayit-secret-key" "Enter SECRET_KEY (generate with: openssl rand -hex 32)"
        create_or_update_secret "mongodb-url" "Enter MongoDB Atlas connection URL"
        create_or_update_secret "mongodb-db-name" "Enter MongoDB database name" "bayit_plus"
        create_or_update_secret "stripe-secret-key" "Enter Stripe secret key"
        create_or_update_secret "stripe-webhook-secret" "Enter Stripe webhook secret"
        create_or_update_secret "stripe-price-basic" "Enter Stripe basic price ID"
        create_or_update_secret "stripe-price-premium" "Enter Stripe premium price ID"
        create_or_update_secret "stripe-price-family" "Enter Stripe family price ID"
        create_or_update_secret "anthropic-api-key" "Enter Anthropic API key"
        create_or_update_secret "google-client-id" "Enter Google OAuth client ID"
        create_or_update_secret "google-client-secret" "Enter Google OAuth client secret"
        create_or_update_secret "google-redirect-uri" "Enter Google OAuth redirect URI" "https://bayit.tv/auth/google/callback"
        create_or_update_secret "elevenlabs-api-key" "Enter ElevenLabs API key (optional)"

        # Create GCS bucket name secret
        echo -n "$BUCKET_NAME" | gcloud secrets create gcs-bucket-name --data-file=- 2>/dev/null || \
            echo -n "$BUCKET_NAME" | gcloud secrets versions add gcs-bucket-name --data-file=-

        # Create CORS origins secret
        CORS_ORIGINS='["https://bayit.tv","https://www.bayit.tv","http://localhost:3000"]'
        echo -n "$CORS_ORIGINS" | gcloud secrets create backend-cors-origins --data-file=- 2>/dev/null || \
            echo -n "$CORS_ORIGINS" | gcloud secrets versions add backend-cors-origins --data-file=-

        print_success "Secrets created/updated"
    else
        print_warning "Skipping secret creation"
    fi

    # Step 5: Grant Secret Access
    print_header "Step 5: Granting Secret Access to Service Account"

    if confirm "Grant secret access to service account?"; then
        print_info "Granting secret access..."
        for secret in bayit-secret-key mongodb-url mongodb-db-name \
                      stripe-secret-key stripe-webhook-secret \
                      stripe-price-basic stripe-price-premium stripe-price-family \
                      anthropic-api-key google-client-id google-client-secret \
                      google-redirect-uri elevenlabs-api-key \
                      gcs-bucket-name backend-cors-origins; do
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
    else
        print_warning "Skipping permission grants"
    fi

    # Step 6: S3 to GCS Migration
    print_header "Step 6: S3 to GCS Migration (Optional)"

    if confirm "Do you want to migrate data from AWS S3 to GCS?"; then
        AWS_BUCKET=$(prompt_with_default "Enter AWS S3 bucket name" "")
        if [[ -n "$AWS_BUCKET" ]]; then
            print_info "Migrating data from s3://$AWS_BUCKET to gs://$BUCKET_NAME..."
            print_warning "This may take a while depending on data size"

            if command_exists aws; then
                gsutil -m rsync -r -d "s3://$AWS_BUCKET" "gs://$BUCKET_NAME/"
                print_success "Data migration complete"

                # Run database migration script
                if confirm "Update database URLs from S3 to GCS?"; then
                    print_info "Running database migration script..."

                    MONGODB_URL=$(prompt_with_default "Enter MongoDB URL" "")
                    OLD_DOMAIN=$(prompt_with_default "Enter old S3 domain" "s3.amazonaws.com/$AWS_BUCKET")
                    NEW_DOMAIN=$(prompt_with_default "Enter new GCS domain" "storage.googleapis.com/$BUCKET_NAME")

                    export MONGODB_URL="$MONGODB_URL"
                    export MONGODB_DB_NAME="bayit_plus"
                    export OLD_STORAGE_DOMAIN="$OLD_DOMAIN"
                    export NEW_STORAGE_DOMAIN="$NEW_DOMAIN"

                    python3 scripts/migrate_storage_urls.py
                    print_success "Database URLs updated"
                fi
            else
                print_error "AWS CLI not found. Install it to migrate from S3"
            fi
        fi
    else
        print_warning "Skipping S3 migration"
    fi

    # Step 7: Build and Deploy
    print_header "Step 7: Building and Deploying to Cloud Run"

    if confirm "Build and deploy to Cloud Run?"; then
        print_info "Building container image..."

        # Build the image
        gcloud builds submit --tag "gcr.io/$PROJECT_ID/$SERVICE_NAME:latest"

        print_success "Container image built"

        print_info "Deploying to Cloud Run..."

        # Deploy to Cloud Run
        gcloud run deploy "$SERVICE_NAME" \
            --image "gcr.io/$PROJECT_ID/$SERVICE_NAME:latest" \
            --region "$REGION" \
            --platform managed \
            --allow-unauthenticated \
            --service-account "$SERVICE_ACCOUNT" \
            --memory 2Gi \
            --cpu 2 \
            --timeout 300 \
            --max-instances 10 \
            --min-instances 1 \
            --concurrency 80 \
            --port 8080 \
            --set-env-vars "API_V1_PREFIX=/api/v1,STORAGE_TYPE=gcs,DEBUG=false" \
            --set-secrets "SECRET_KEY=bayit-secret-key:latest,MONGODB_URL=mongodb-url:latest,MONGODB_DB_NAME=mongodb-db-name:latest,STRIPE_SECRET_KEY=stripe-secret-key:latest,STRIPE_WEBHOOK_SECRET=stripe-webhook-secret:latest,STRIPE_PRICE_BASIC=stripe-price-basic:latest,STRIPE_PRICE_PREMIUM=stripe-price-premium:latest,STRIPE_PRICE_FAMILY=stripe-price-family:latest,ANTHROPIC_API_KEY=anthropic-api-key:latest,GOOGLE_CLIENT_ID=google-client-id:latest,GOOGLE_CLIENT_SECRET=google-client-secret:latest,GOOGLE_REDIRECT_URI=google-redirect-uri:latest,ELEVENLABS_API_KEY=elevenlabs-api-key:latest,GCS_BUCKET_NAME=gcs-bucket-name:latest,BACKEND_CORS_ORIGINS=backend-cors-origins:latest"

        # Get service URL
        SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" --region "$REGION" --format 'value(status.url)')

        print_success "Deployment complete!"
        echo ""
        print_info "Service URL: $SERVICE_URL"
        echo ""

        # Test health endpoint
        print_info "Testing health endpoint..."
        sleep 5
        if curl -s "$SERVICE_URL/health" | grep -q "healthy"; then
            print_success "Health check passed!"
        else
            print_warning "Health check failed. Check logs with:"
            echo "  gcloud run services logs read $SERVICE_NAME --region $REGION --limit 50"
        fi
    else
        print_warning "Skipping deployment"
    fi

    # Step 8: Custom Domain
    print_header "Step 8: Custom Domain (Optional)"

    if confirm "Configure custom domain?"; then
        CUSTOM_DOMAIN=$(prompt_with_default "Enter custom domain (e.g., api.bayit.tv)" "api.bayit.tv")

        print_info "Creating domain mapping..."
        gcloud run domain-mappings create \
            --service "$SERVICE_NAME" \
            --domain "$CUSTOM_DOMAIN" \
            --region "$REGION" || true

        print_info "DNS Configuration Required:"
        gcloud run domain-mappings describe \
            --domain "$CUSTOM_DOMAIN" \
            --region "$REGION" \
            --format 'value(status.resourceRecords)' || true

        print_warning "Add the CNAME record shown above to your DNS provider"
        print_info "SSL certificate will be provisioned automatically (may take 15-30 minutes)"
    else
        print_warning "Skipping custom domain setup"
    fi

    # Step 9: Cloud Build Trigger
    print_header "Step 9: Cloud Build Trigger (Optional)"

    if confirm "Setup Cloud Build trigger for automatic deployments?"; then
        print_info "Configuring Cloud Build permissions..."

        PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
        CLOUD_BUILD_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

        gcloud projects add-iam-policy-binding "$PROJECT_ID" \
            --member="serviceAccount:$CLOUD_BUILD_SA" \
            --role="roles/run.admin" \
            --quiet || true

        gcloud iam service-accounts add-iam-policy-binding "$SERVICE_ACCOUNT" \
            --member="serviceAccount:$CLOUD_BUILD_SA" \
            --role="roles/iam.serviceAccountUser" \
            --quiet || true

        print_success "Cloud Build permissions configured"
        print_info "To create the trigger, visit:"
        echo "  https://console.cloud.google.com/cloud-build/triggers?project=$PROJECT_ID"
        echo ""
        echo "  Configure:"
        echo "    - Name: $SERVICE_NAME-deploy"
        echo "    - Repository: Connect your GitHub repo"
        echo "    - Branch: ^main$"
        echo "    - Build config: backend/cloudbuild.yaml"
    else
        print_warning "Skipping Cloud Build trigger setup"
    fi

    # Summary
    print_header "Deployment Summary"

    print_success "Deployment completed successfully!"
    echo ""
    echo "Resources created:"
    echo "  ✓ GCS Bucket: gs://$BUCKET_NAME"
    echo "  ✓ Service Account: $SERVICE_ACCOUNT"
    echo "  ✓ Cloud Run Service: $SERVICE_NAME"
    if [[ -n "$SERVICE_URL" ]]; then
        echo "  ✓ Service URL: $SERVICE_URL"
    fi
    echo ""
    echo "Next steps:"
    echo "  1. Update OAuth redirect URIs in Google Cloud Console"
    echo "  2. Update Stripe webhook URLs in Stripe Dashboard"
    echo "  3. Update frontend API URL to point to Cloud Run"
    echo "  4. Test all endpoints"
    echo "  5. Setup monitoring and alerts"
    echo ""
    print_info "View logs:"
    echo "  gcloud run services logs read $SERVICE_NAME --region $REGION --limit 50"
    echo ""
    print_info "Rollback if needed:"
    echo "  gcloud run services update-traffic $SERVICE_NAME --region $REGION --to-revisions=PREVIOUS_REVISION=100"
    echo ""
    print_success "Deployment script complete!"
}

# Run main function
main "$@"
