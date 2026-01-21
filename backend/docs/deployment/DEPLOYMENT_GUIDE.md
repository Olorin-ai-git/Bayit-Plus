# Bayit+ Backend Deployment Guide
## Google Cloud Run + MongoDB Atlas + Google Cloud Storage

This guide covers deploying the Bayit+ backend to Google Cloud Run with all necessary infrastructure.

## Prerequisites

- Google Cloud Project with billing enabled
- MongoDB Atlas cluster with connection string
- `gcloud` CLI installed and authenticated
- Your AWS S3 bucket name (for migration)

## Step 1: Set Environment Variables

```bash
# Set your project configuration
export PROJECT_ID="your-gcp-project-id"
export REGION="us-central1"
export BUCKET_NAME="bayit-plus-media"
export SERVICE_ACCOUNT="bayit-plus-backend@${PROJECT_ID}.iam.gserviceaccount.com"

# Configure gcloud
gcloud config set project $PROJECT_ID
```

## Step 2: Enable Required APIs

```bash
# Enable all required Google Cloud APIs
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  secretmanager.googleapis.com \
  storage-api.googleapis.com \
  storage-component.googleapis.com
```

## Step 3: Create Google Cloud Storage Bucket

```bash
# Create the bucket
gsutil mb -p $PROJECT_ID -c STANDARD -l $REGION gs://$BUCKET_NAME

# Enable uniform bucket-level access
gsutil uniformbucketlevelaccess set on gs://$BUCKET_NAME

# Configure CORS for browser uploads
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

gsutil cors set /tmp/cors.json gs://$BUCKET_NAME

# Set lifecycle rule to cleanup temp uploads
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

gsutil lifecycle set /tmp/lifecycle.json gs://$BUCKET_NAME

# Enable public access for images (optional - use signed URLs for private content)
gsutil iam ch allUsers:objectViewer gs://$BUCKET_NAME

echo "✓ GCS bucket created: gs://$BUCKET_NAME"
```

## Step 4: Create Service Account

```bash
# Create dedicated service account
gcloud iam service-accounts create bayit-plus-backend \
    --display-name="Bayit Plus Backend Service" \
    --description="Service account for Bayit+ FastAPI backend on Cloud Run"

# Grant GCS permissions
gsutil iam ch serviceAccount:$SERVICE_ACCOUNT:objectAdmin gs://$BUCKET_NAME

echo "✓ Service account created: $SERVICE_ACCOUNT"
```

## Step 5: Create Secrets in Secret Manager

```bash
# Create all secrets (replace with your actual values)

# Application secret key (generate with: openssl rand -hex 32)
echo -n "your-secret-key-here" | gcloud secrets create bayit-secret-key --data-file=-

# MongoDB Atlas connection
echo -n "mongodb+srv://username:password@cluster.mongodb.net" | gcloud secrets create mongodb-url --data-file=-
echo -n "bayit_plus" | gcloud secrets create mongodb-db-name --data-file=-

# Stripe keys
echo -n "sk_live_..." | gcloud secrets create stripe-secret-key --data-file=-
echo -n "whsec_..." | gcloud secrets create stripe-webhook-secret --data-file=-
echo -n "price_..." | gcloud secrets create stripe-price-basic --data-file=-
echo -n "price_..." | gcloud secrets create stripe-price-premium --data-file=-
echo -n "price_..." | gcloud secrets create stripe-price-family --data-file=-

# Anthropic API key
echo -n "sk-ant-..." | gcloud secrets create anthropic-api-key --data-file=-

# Google OAuth credentials
echo -n "your-client-id.apps.googleusercontent.com" | gcloud secrets create google-client-id --data-file=-
echo -n "GOCSPX-..." | gcloud secrets create google-client-secret --data-file=-
echo -n "https://bayit.tv/auth/google/callback" | gcloud secrets create google-redirect-uri --data-file=-

# ElevenLabs API key (for Speech-to-Text - recommended provider)
echo -n "your-elevenlabs-key" | gcloud secrets create elevenlabs-api-key --data-file=-

# OpenAI API key (for Whisper fallback and OpenAI translation)
echo -n "sk-proj-..." | gcloud secrets create openai-api-key --data-file=-

# GCS bucket name
echo -n "$BUCKET_NAME" | gcloud secrets create gcs-bucket-name --data-file=-

# CORS origins as JSON array
echo -n '["https://bayit.tv","https://www.bayit.tv","http://localhost:3000"]' | gcloud secrets create backend-cors-origins --data-file=-

echo "✓ All secrets created"
```

## Step 6: Grant Secret Access to Service Account

```bash
# Grant Secret Manager access for all secrets
for secret in bayit-secret-key mongodb-url mongodb-db-name \
              stripe-secret-key stripe-webhook-secret \
              stripe-price-basic stripe-price-premium stripe-price-family \
              anthropic-api-key google-client-id google-client-secret \
              google-redirect-uri elevenlabs-api-key openai-api-key \
              gcs-bucket-name backend-cors-origins; do
  gcloud secrets add-iam-policy-binding $secret \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/secretmanager.secretAccessor"
done

# Grant Cloud Logging permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/logging.logWriter"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/cloudtrace.agent"

echo "✓ Service account permissions configured"
```

## Step 7: Migrate Data from AWS S3 to GCS (Optional)

If you have existing data in S3:

```bash
# Install AWS CLI if not already installed
# pip install awscli

# Configure AWS credentials
# aws configure

# Set your S3 bucket name
export AWS_BUCKET="your-aws-bucket-name"

# Transfer all data from S3 to GCS
gsutil -m rsync -r -d s3://$AWS_BUCKET gs://$BUCKET_NAME/

echo "✓ Data migrated from S3 to GCS"
```

## Step 8: Update Database URLs (After S3 Migration)

If you migrated from S3, update all URLs in MongoDB:

```bash
cd /Users/olorin/Documents/olorin/backend

# Set environment variables for migration script
export MONGODB_URL="your-mongodb-atlas-url"
export MONGODB_DB_NAME="bayit_plus"
export OLD_STORAGE_DOMAIN="s3.amazonaws.com/your-aws-bucket"  # or CloudFront domain
export NEW_STORAGE_DOMAIN="storage.googleapis.com/$BUCKET_NAME"  # or Cloud CDN domain

# Run migration script
python scripts/migrate_storage_urls.py

echo "✓ Database URLs updated"
```

## Step 9: Build and Deploy to Cloud Run (Manual First Deployment)

```bash
cd /Users/olorin/Documents/olorin/backend

# Build the container image
gcloud builds submit --tag gcr.io/$PROJECT_ID/bayit-plus-backend:v1

# Deploy to Cloud Run
gcloud run deploy bayit-plus-backend \
  --image gcr.io/$PROJECT_ID/bayit-plus-backend:v1 \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --service-account $SERVICE_ACCOUNT \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300 \
  --max-instances 10 \
  --min-instances 1 \
  --concurrency 80 \
  --port 8080 \
  --set-env-vars "API_V1_PREFIX=/api/v1,STORAGE_TYPE=gcs,DEBUG=false,SPEECH_TO_TEXT_PROVIDER=elevenlabs,LIVE_TRANSLATION_PROVIDER=google" \
  --set-secrets "SECRET_KEY=bayit-secret-key:latest,MONGODB_URL=mongodb-url:latest,MONGODB_DB_NAME=mongodb-db-name:latest,STRIPE_SECRET_KEY=stripe-secret-key:latest,STRIPE_WEBHOOK_SECRET=stripe-webhook-secret:latest,STRIPE_PRICE_BASIC=stripe-price-basic:latest,STRIPE_PRICE_PREMIUM=stripe-price-premium:latest,STRIPE_PRICE_FAMILY=stripe-price-family:latest,ANTHROPIC_API_KEY=anthropic-api-key:latest,GOOGLE_CLIENT_ID=google-client-id:latest,GOOGLE_CLIENT_SECRET=google-client-secret:latest,GOOGLE_REDIRECT_URI=google-redirect-uri:latest,ELEVENLABS_API_KEY=elevenlabs-api-key:latest,OPENAI_API_KEY=openai-api-key:latest,GCS_BUCKET_NAME=gcs-bucket-name:latest,BACKEND_CORS_ORIGINS=backend-cors-origins:latest"

# Get the service URL
SERVICE_URL=$(gcloud run services describe bayit-plus-backend --region $REGION --format 'value(status.url)')
echo ""
echo "✓ Deployment successful!"
echo "Service URL: $SERVICE_URL"
echo ""
echo "Test health endpoint:"
echo "curl $SERVICE_URL/health"
```

## Step 10: Configure Custom Domain (Optional)

```bash
# Map your custom domain to Cloud Run
gcloud run domain-mappings create \
  --service bayit-plus-backend \
  --domain api.bayit.tv \
  --region $REGION

# Get DNS records to configure
gcloud run domain-mappings describe \
  --domain api.bayit.tv \
  --region $REGION

# Update your DNS provider with the CNAME record shown above
# CNAME: api.bayit.tv -> ghs.googlehosted.com

# Check certificate status (wait for SSL to be provisioned)
gcloud run domain-mappings describe \
  --domain api.bayit.tv \
  --region $REGION \
  --format 'value(status.conditions)'

echo "✓ Custom domain configured (wait for SSL provisioning)"
```

## Step 11: Setup Automated CI/CD with Cloud Build

```bash
# Get your Cloud Build service account
export PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
export CLOUD_BUILD_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

# Grant Cloud Build permissions to deploy
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$CLOUD_BUILD_SA" \
    --role="roles/run.admin"

gcloud iam service-accounts add-iam-policy-binding $SERVICE_ACCOUNT \
    --member="serviceAccount:$CLOUD_BUILD_SA" \
    --role="roles/iam.serviceAccountUser"

# Create Cloud Build trigger (requires GitHub connection)
# Option 1: Via Console (recommended for first-time setup)
echo "Create trigger at: https://console.cloud.google.com/cloud-build/triggers"
echo "  - Name: bayit-plus-backend-deploy"
echo "  - Repository: Connect your GitHub repo"
echo "  - Branch: ^main$"
echo "  - Build config: backend/cloudbuild.yaml"

# Option 2: Via CLI (if GitHub already connected)
# gcloud builds triggers create github \
#     --name="bayit-plus-backend-deploy" \
#     --repo-name="Bayit-Plus" \
#     --repo-owner="your-github-username" \
#     --branch-pattern="^main$" \
#     --build-config="backend/cloudbuild.yaml"

echo "✓ Cloud Build trigger configured (or use console)"
```

## Step 12: Update External Service URLs

### Google OAuth Console
1. Go to: https://console.cloud.google.com/apis/credentials
2. Select your OAuth 2.0 Client ID
3. Add authorized redirect URI: `https://api.bayit.tv/api/v1/auth/google/callback`
4. Add authorized JavaScript origins: `https://bayit.tv`

### Stripe Webhooks
1. Go to: https://dashboard.stripe.com/webhooks
2. Create new webhook endpoint
3. URL: `https://api.bayit.tv/api/v1/subscriptions/webhook`
4. Events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copy the webhook signing secret
6. Update Secret Manager:
   ```bash
   echo -n "whsec_new_secret" | gcloud secrets versions add stripe-webhook-secret --data-file=-
   ```

## Step 13: Verify Deployment

```bash
# Health check
curl https://api.bayit.tv/health
# Expected: {"status":"healthy","app":"Bayit+ API"}

# Check API documentation
curl https://api.bayit.tv/api/v1/docs
# Should return OpenAPI JSON

# Check logs
gcloud run services logs read bayit-plus-backend \
  --region $REGION \
  --limit 50

# Check MongoDB connection in logs
gcloud run services logs read bayit-plus-backend \
  --region $REGION \
  --limit 50 | grep -i "mongo"
```

## Step 14: Setup Monitoring (Optional but Recommended)

```bash
# Create uptime check via console:
echo "Create uptime check at: https://console.cloud.google.com/monitoring/uptime"
echo "  - Name: Bayit Plus Backend Health"
echo "  - Protocol: HTTPS"
echo "  - Resource Type: URL"
echo "  - Hostname: api.bayit.tv"
echo "  - Path: /health"
echo "  - Check frequency: 1 minute"

# Create log-based metrics
gcloud logging metrics create backend_error_rate \
  --description="Rate of 5xx errors in backend" \
  --log-filter='resource.type="cloud_run_revision"
                resource.labels.service_name="bayit-plus-backend"
                httpRequest.status>=500'

gcloud logging metrics create backend_slow_requests \
  --description="Requests taking >3s" \
  --log-filter='resource.type="cloud_run_revision"
                resource.labels.service_name="bayit-plus-backend"
                httpRequest.latency>"3s"'

echo "✓ Monitoring configured"
```

## Rollback Procedure

If you need to rollback to a previous version:

```bash
# List recent revisions
gcloud run revisions list \
  --service bayit-plus-backend \
  --region $REGION \
  --limit 5

# Rollback to previous revision
gcloud run services update-traffic bayit-plus-backend \
  --region $REGION \
  --to-revisions [previous-revision-name]=100

echo "✓ Rolled back to previous revision"
```

## Update a Secret

```bash
# Update any secret with a new value
echo -n "new-secret-value" | gcloud secrets versions add secret-name --data-file=-

# Cloud Run will automatically use the latest version
# Or trigger a new deployment to pick up the change immediately
gcloud run services update bayit-plus-backend --region $REGION
```

## Cost Optimization Tips

1. **Min instances**: Set to 1 for production to avoid cold starts (~$50/month)
2. **Request timeout**: 300s allows long operations but charges for full duration
3. **GCS storage**: Use lifecycle rules to delete old temp files
4. **Logging**: Set retention policy to avoid excessive storage costs:
   ```bash
   gcloud logging buckets update _Default --location=global --retention-days=30
   ```

## Estimated Monthly Costs

- Cloud Run (1 min instance): ~$50/month
- GCS Storage (100GB): $2/month
- GCS Operations: <$1/month
- Secret Manager (15 secrets): $0.90/month
- **Total: ~$53/month** (plus variable costs for traffic)

## Troubleshooting

### Service won't start
```bash
# Check logs for errors
gcloud run services logs read bayit-plus-backend --region $REGION --limit 100

# Check service details
gcloud run services describe bayit-plus-backend --region $REGION
```

### MongoDB connection fails
- Verify connection string in Secret Manager
- Check MongoDB Atlas network access (allow 0.0.0.0/0 for Cloud Run)
- Verify database name is correct

### GCS upload fails
- Verify service account has objectAdmin role
- Check bucket name in secret
- Verify bucket exists: `gsutil ls gs://$BUCKET_NAME`

### Stripe webhooks not working
- Verify webhook URL is correct
- Check webhook secret in Secret Manager
- View logs: `gcloud run services logs read bayit-plus-backend --region $REGION | grep stripe`

## Next Steps

1. Update frontend to use new API URL (`https://api.bayit.tv`)
2. Update OAuth redirect URIs
3. Update Stripe webhook endpoints
4. Test all functionality end-to-end
5. Setup monitoring alerts
6. Configure budget alerts in GCP

## Support

For issues or questions:
- Cloud Run docs: https://cloud.google.com/run/docs
- GCS docs: https://cloud.google.com/storage/docs
- Secret Manager docs: https://cloud.google.com/secret-manager/docs
