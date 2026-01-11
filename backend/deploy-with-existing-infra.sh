#!/bin/bash
set -e

# Bayit+ Backend Deployment Script
# Leverages existing Israeli-Radio-Manager infrastructure

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

print_header() {
    echo -e "\n${BLUE}===================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}===================================================${NC}\n"
}

print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠ $1${NC}"; }
print_info() { echo -e "${CYAN}ℹ $1${NC}"; }

confirm() {
    local prompt="$1"
    local response
    read -p "$prompt (y/N): " response
    [[ "$response" =~ ^[Yy]$ ]]
}

print_header "Bayit+ Deployment (Using Existing Infrastructure)"

# Load existing infrastructure config
print_info "Loading configuration from Israeli-Radio-Manager..."

# Use existing GCP project
PROJECT_ID="israeli-radio-475c9"
REGION="us-east1"
SERVICE_NAME="bayit-plus-backend"
BUCKET_NAME="bayit-plus-media"
MONGODB_DB="bayit_plus"

# Paths to existing credentials
ISRAELI_RADIO_DIR="/Users/olorin/Documents/Israeli-Radio-Manager/backend"
SERVICE_ACCOUNT_FILE="$ISRAELI_RADIO_DIR/service-account.json"
GOOGLE_CREDENTIALS_FILE="$ISRAELI_RADIO_DIR/credentials.json"

print_info "Configuration Summary:"
echo "  GCP Project: $PROJECT_ID (shared with Israeli-Radio-Manager)"
echo "  Region: $REGION"
echo "  Service: $SERVICE_NAME (new)"
echo "  GCS Bucket: $BUCKET_NAME (new)"
echo "  MongoDB DB: $MONGODB_DB (new DB on existing cluster)"
echo ""

if ! confirm "Continue with this configuration?"; then
    print_warning "Deployment cancelled"
    exit 0
fi

# Set gcloud project
print_info "Setting gcloud project..."
gcloud config set project $PROJECT_ID

# Verify service account exists
print_header "Step 1: Verifying Service Account"

if [[ -f "$SERVICE_ACCOUNT_FILE" ]]; then
    print_success "Found existing service account: $SERVICE_ACCOUNT_FILE"

    # Extract service account email
    SERVICE_ACCOUNT_EMAIL=$(grep -o '"client_email": "[^"]*' "$SERVICE_ACCOUNT_FILE" | cut -d'"' -f4)
    print_info "Service account: $SERVICE_ACCOUNT_EMAIL"
else
    print_warning "Service account not found at: $SERVICE_ACCOUNT_FILE"
    print_info "You'll need to create a new service account"

    if confirm "Create new service account?"; then
        gcloud iam service-accounts create $SERVICE_NAME \
            --display-name="Bayit Plus Backend Service"
        SERVICE_ACCOUNT_EMAIL="$SERVICE_NAME@$PROJECT_ID.iam.gserviceaccount.com"
        print_success "Created service account: $SERVICE_ACCOUNT_EMAIL"
    else
        exit 1
    fi
fi

# Create GCS bucket
print_header "Step 2: Creating GCS Bucket"

if gsutil ls -b "gs://$BUCKET_NAME" >/dev/null 2>&1; then
    print_warning "Bucket already exists: gs://$BUCKET_NAME"
else
    if confirm "Create GCS bucket gs://$BUCKET_NAME?"; then
        print_info "Creating bucket..."
        gsutil mb -p $PROJECT_ID -c STANDARD -l $REGION "gs://$BUCKET_NAME"
        gsutil uniformbucketlevelaccess set on "gs://$BUCKET_NAME"

        # CORS configuration
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

        # Lifecycle rules
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
        gsutil iam ch "serviceAccount:$SERVICE_ACCOUNT_EMAIL:objectAdmin" "gs://$BUCKET_NAME"

        # Enable public read for images
        if confirm "Enable public read access for images?"; then
            gsutil iam ch allUsers:objectViewer "gs://$BUCKET_NAME"
        fi

        print_success "Bucket created and configured"
    fi
fi

# Create/Update Secrets
print_header "Step 3: Managing Secrets"

print_info "Checking for existing reusable secrets..."

# Check for existing secrets
EXISTING_SECRETS=$(gcloud secrets list --format="value(name)" 2>/dev/null || echo "")

check_secret() {
    local secret_name=$1
    echo "$EXISTING_SECRETS" | grep -q "^$secret_name$"
}

# List secrets that can be reused
print_info "Existing secrets that can be reused:"
for secret in ELEVENLABS_API_KEY ANTHROPIC_API_KEY; do
    if check_secret "$secret"; then
        print_success "  ✓ $secret (exists)"
    else
        print_warning "  ✗ $secret (not found)"
    fi
done

echo ""
if confirm "Create Bayit+ specific secrets?"; then
    print_info "Creating Bayit+ secrets..."

    # Helper function
    create_secret() {
        local name=$1
        local prompt=$2
        local default=$3

        read -sp "$prompt: " value
        echo ""

        if [[ -z "$value" && -n "$default" ]]; then
            value=$default
        fi

        if [[ -n "$value" ]]; then
            if check_secret "$name"; then
                echo -n "$value" | gcloud secrets versions add "$name" --data-file=-
                print_success "Updated: $name"
            else
                echo -n "$value" | gcloud secrets create "$name" --data-file=-
                print_success "Created: $name"
            fi
        fi
    }

    # Bayit+ specific secrets
    create_secret "bayit-secret-key" "Secret key (or generate with: openssl rand -hex 32)"

    # MongoDB (reuse cluster, new database)
    MONGODB_URL="mongodb+srv://admin_db_user:Jersey1973!@cluster0.ydrvaft.mongodb.net/$MONGODB_DB?retryWrites=true&w=majority&appName=Cluster0"
    echo -n "$MONGODB_URL" | gcloud secrets create bayit-mongodb-url --data-file=- 2>/dev/null || \
        echo -n "$MONGODB_URL" | gcloud secrets versions add bayit-mongodb-url --data-file=-
    print_success "Created: bayit-mongodb-url (using existing cluster)"

    echo -n "$MONGODB_DB" | gcloud secrets create bayit-mongodb-db-name --data-file=- 2>/dev/null || \
        echo -n "$MONGODB_DB" | gcloud secrets versions add bayit-mongodb-db-name --data-file=-
    print_success "Created: bayit-mongodb-db-name"

    # Stripe secrets
    create_secret "bayit-stripe-secret-key" "Stripe secret key"
    create_secret "bayit-stripe-webhook-secret" "Stripe webhook secret"
    create_secret "bayit-stripe-price-basic" "Stripe basic price ID"
    create_secret "bayit-stripe-price-premium" "Stripe premium price ID"
    create_secret "bayit-stripe-price-family" "Stripe family price ID"

    # Google OAuth (can reuse or create new)
    if confirm "Reuse existing Google OAuth credentials?"; then
        if [[ -f "$GOOGLE_CREDENTIALS_FILE" ]]; then
            CLIENT_ID=$(grep -o '"client_id":"[^"]*' "$GOOGLE_CREDENTIALS_FILE" | cut -d'"' -f4 | head -1)
            CLIENT_SECRET=$(grep -o '"client_secret":"[^"]*' "$GOOGLE_CREDENTIALS_FILE" | cut -d'"' -f4 | head -1)

            echo -n "$CLIENT_ID" | gcloud secrets create bayit-google-client-id --data-file=- 2>/dev/null || \
                echo -n "$CLIENT_ID" | gcloud secrets versions add bayit-google-client-id --data-file=-
            echo -n "$CLIENT_SECRET" | gcloud secrets create bayit-google-client-secret --data-file=- 2>/dev/null || \
                echo -n "$CLIENT_SECRET" | gcloud secrets versions add bayit-google-client-secret --data-file=-
            print_success "Reused Google OAuth credentials"
        fi
    else
        create_secret "bayit-google-client-id" "Google OAuth client ID"
        create_secret "bayit-google-client-secret" "Google OAuth client secret"
    fi

    create_secret "bayit-google-redirect-uri" "Google OAuth redirect URI" "https://bayit.tv/auth/google/callback"

    # GCS bucket name
    echo -n "$BUCKET_NAME" | gcloud secrets create bayit-gcs-bucket-name --data-file=- 2>/dev/null || \
        echo -n "$BUCKET_NAME" | gcloud secrets versions add bayit-gcs-bucket-name --data-file=-

    # CORS origins
    CORS='["https://bayit.tv","https://www.bayit.tv","http://localhost:3000"]'
    echo -n "$CORS" | gcloud secrets create bayit-cors-origins --data-file=- 2>/dev/null || \
        echo -n "$CORS" | gcloud secrets versions add bayit-cors-origins --data-file=-

    print_success "All Bayit+ secrets created"
fi

# Grant secret access
print_header "Step 4: Granting Secret Access"

if confirm "Grant secret access to service account?"; then
    for secret in bayit-secret-key bayit-mongodb-url bayit-mongodb-db-name \
                  bayit-stripe-secret-key bayit-stripe-webhook-secret \
                  bayit-stripe-price-basic bayit-stripe-price-premium bayit-stripe-price-family \
                  bayit-google-client-id bayit-google-client-secret bayit-google-redirect-uri \
                  bayit-gcs-bucket-name bayit-cors-origins \
                  ELEVENLABS_API_KEY ANTHROPIC_API_KEY; do
        gcloud secrets add-iam-policy-binding "$secret" \
            --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
            --role="roles/secretmanager.secretAccessor" \
            --quiet 2>/dev/null || true
    done

    # Grant logging permissions
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
        --role="roles/logging.logWriter" --quiet 2>/dev/null || true

    print_success "Permissions granted"
fi

# Build and Deploy
print_header "Step 5: Building and Deploying"

if confirm "Build and deploy to Cloud Run?"; then
    print_info "Building container image..."
    gcloud builds submit --tag "gcr.io/$PROJECT_ID/$SERVICE_NAME:latest"

    print_info "Deploying to Cloud Run..."
    gcloud run deploy $SERVICE_NAME \
        --image "gcr.io/$PROJECT_ID/$SERVICE_NAME:latest" \
        --region $REGION \
        --platform managed \
        --allow-unauthenticated \
        --service-account $SERVICE_ACCOUNT_EMAIL \
        --memory 2Gi \
        --cpu 2 \
        --timeout 300 \
        --max-instances 10 \
        --min-instances 1 \
        --concurrency 80 \
        --port 8080 \
        --set-env-vars "API_V1_PREFIX=/api/v1,STORAGE_TYPE=gcs,DEBUG=false" \
        --set-secrets "SECRET_KEY=bayit-secret-key:latest,MONGODB_URL=bayit-mongodb-url:latest,MONGODB_DB_NAME=bayit-mongodb-db-name:latest,STRIPE_SECRET_KEY=bayit-stripe-secret-key:latest,STRIPE_WEBHOOK_SECRET=bayit-stripe-webhook-secret:latest,STRIPE_PRICE_BASIC=bayit-stripe-price-basic:latest,STRIPE_PRICE_PREMIUM=bayit-stripe-price-premium:latest,STRIPE_PRICE_FAMILY=bayit-stripe-price-family:latest,ANTHROPIC_API_KEY=ANTHROPIC_API_KEY:latest,GOOGLE_CLIENT_ID=bayit-google-client-id:latest,GOOGLE_CLIENT_SECRET=bayit-google-client-secret:latest,GOOGLE_REDIRECT_URI=bayit-google-redirect-uri:latest,ELEVENLABS_API_KEY=ELEVENLABS_API_KEY:latest,GCS_BUCKET_NAME=bayit-gcs-bucket-name:latest,BACKEND_CORS_ORIGINS=bayit-cors-origins:latest"

    SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region $REGION --format 'value(status.url)')

    print_success "Deployment complete!"
    echo ""
    print_info "Service URL: $SERVICE_URL"
    echo ""

    # Test health
    print_info "Testing health endpoint..."
    sleep 5
    if curl -s "$SERVICE_URL/health" | grep -q "healthy"; then
        print_success "Health check passed!"
    else
        print_warning "Health check failed. Check logs."
    fi
fi

# Summary
print_header "Deployment Summary"

echo ""
print_success "Bayit+ deployed using shared infrastructure!"
echo ""
echo "Shared Resources:"
echo "  ✓ GCP Project: $PROJECT_ID"
echo "  ✓ Region: $REGION"
echo "  ✓ Service Account: $SERVICE_ACCOUNT_EMAIL"
echo "  ✓ MongoDB Cluster: cluster0.ydrvaft.mongodb.net"
echo ""
echo "New Resources:"
echo "  ✓ Cloud Run Service: $SERVICE_NAME"
echo "  ✓ GCS Bucket: gs://$BUCKET_NAME"
echo "  ✓ MongoDB Database: $MONGODB_DB"
if [[ -n "$SERVICE_URL" ]]; then
    echo "  ✓ Service URL: $SERVICE_URL"
fi
echo ""
echo "Cost Benefits:"
echo "  ✓ Shared GCP project (no additional project cost)"
echo "  ✓ Shared MongoDB cluster (only database storage)"
echo "  ✓ Shared service account (no cost)"
echo "  ✓ Reused OAuth credentials (no setup needed)"
echo ""
print_success "Deployment complete!"
