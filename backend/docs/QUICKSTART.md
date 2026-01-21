# Quick Start: Deploy to Google Cloud Run

Deploy your Bayit+ backend to Google Cloud Run in minutes using the automated deployment script.

## Prerequisites

1. **Google Cloud Project** with billing enabled
2. **gcloud CLI** installed and authenticated
   ```bash
   gcloud auth login
   ```
3. **MongoDB Atlas** cluster with connection string ready
4. **API Keys** for:
   - Stripe (secret key, webhook secret, price IDs)
   - Anthropic Claude
   - Google OAuth (client ID, secret)
   - ElevenLabs (optional)

## Quick Deploy

```bash
cd /Users/olorin/Documents/olorin/backend

# Run the deployment script
./deploy.sh
```

The script will interactively guide you through:
1. ✅ Project configuration
2. ✅ Enabling required APIs
3. ✅ Creating GCS bucket for media storage
4. ✅ Creating service account
5. ✅ Setting up secrets in Secret Manager
6. ✅ Granting permissions
7. ✅ Building and deploying to Cloud Run
8. ✅ Optional: Custom domain setup
9. ✅ Optional: CI/CD with Cloud Build

## What the Script Does

### Infrastructure Setup
- Creates a GCS bucket for media storage
- Configures CORS for browser uploads
- Sets up lifecycle rules for temp file cleanup
- Creates a dedicated service account
- Configures all necessary IAM permissions

### Secrets Management
- Securely stores all API keys in Google Secret Manager
- Automatically injects secrets into Cloud Run
- Never exposes secrets in code or environment

### Cloud Run Deployment
- Builds optimized Docker image with Poetry
- Deploys with production-ready configuration:
  - 2Gi memory, 2 CPUs
  - Auto-scaling: 1-10 instances
  - Min 1 instance (no cold starts)
  - 300s timeout for long operations
  - Health checks enabled

### Optional Features
- Custom domain mapping (api.bayit.tv)
- Automated CI/CD on git push
- S3 to GCS data migration
- Database URL migration

## After Deployment

### 1. Update External Services

**Google OAuth Console:**
```
https://console.cloud.google.com/apis/credentials
→ Add redirect URI: https://api.bayit.tv/api/v1/auth/google/callback
```

**Stripe Dashboard:**
```
https://dashboard.stripe.com/webhooks
→ Create webhook: https://api.bayit.tv/api/v1/subscriptions/webhook
→ Events: checkout.session.completed, customer.subscription.*
→ Update webhook secret in Secret Manager
```

### 2. Update Frontend

Update your frontend configuration:
```javascript
// web/src/config/appConfig.js
export const API_BASE_URL = 'https://api.bayit.tv';
```

### 3. Test Deployment

```bash
# Get your service URL
export SERVICE_URL=$(gcloud run services describe bayit-plus-backend \
  --region us-central1 --format 'value(status.url)')

# Health check
curl $SERVICE_URL/health
# Expected: {"status":"healthy","app":"Bayit+ API"}

# API docs
curl $SERVICE_URL/api/v1/docs

# View logs
gcloud run services logs read bayit-plus-backend \
  --region us-central1 --limit 50
```

## Automated Deployments

After initial setup, every push to `main` branch automatically deploys:

1. Push code to GitHub
2. Cloud Build automatically triggers
3. Builds new container image
4. Deploys to Cloud Run
5. Routes traffic to new version

## Rollback

If something goes wrong, rollback instantly:

```bash
# List recent revisions
gcloud run revisions list \
  --service bayit-plus-backend \
  --region us-central1 \
  --limit 5

# Rollback to previous
gcloud run services update-traffic bayit-plus-backend \
  --region us-central1 \
  --to-revisions [REVISION-NAME]=100
```

## Update a Secret

```bash
# Update any secret
echo -n "new-value" | gcloud secrets versions add secret-name --data-file=-

# Trigger new deployment to use updated secret
gcloud run services update bayit-plus-backend --region us-central1
```

## Monitoring

### View Logs
```bash
# Recent logs
gcloud run services logs read bayit-plus-backend \
  --region us-central1 \
  --limit 100

# Follow logs in real-time
gcloud run services logs tail bayit-plus-backend \
  --region us-central1

# Search logs
gcloud run services logs read bayit-plus-backend \
  --region us-central1 \
  --limit 100 \
  | grep "error"
```

### Setup Alerts
1. Go to: https://console.cloud.google.com/monitoring
2. Create uptime check for `/health` endpoint
3. Create alerts for error rates
4. Setup budget alerts

## Cost Estimate

**Monthly Costs:**
- Cloud Run (1 min instance): ~$50
- GCS Storage (100GB): $2
- Secret Manager (15 secrets): $1
- **Total: ~$53/month** + variable traffic costs

**Optimize Costs:**
- Set min instances to 0 (adds cold starts)
- Use Cloud CDN for reduced egress
- Set log retention to 30 days

## Troubleshooting

### Service won't start
```bash
# Check logs
gcloud run services logs read bayit-plus-backend --region us-central1 --limit 100

# Check service details
gcloud run services describe bayit-plus-backend --region us-central1
```

### MongoDB connection fails
- Verify MongoDB Atlas allows connections from 0.0.0.0/0
- Check connection string in Secret Manager
- View logs for connection errors

### GCS upload fails
- Verify service account has objectAdmin role
- Check bucket exists: `gsutil ls gs://bayit-plus-media`
- Test permissions: `gsutil iam get gs://bayit-plus-media`

### Secrets not loading
```bash
# Verify secret exists
gcloud secrets describe secret-name

# Check IAM permissions
gcloud secrets get-iam-policy secret-name

# View secret version
gcloud secrets versions access latest --secret=secret-name
```

## Manual Deployment

If you prefer manual control over the automated script:

```bash
# See full manual commands in:
cat DEPLOYMENT_GUIDE.md
```

## Support

- **Cloud Run Docs:** https://cloud.google.com/run/docs
- **Troubleshooting:** See DEPLOYMENT_GUIDE.md
- **View Plan:** See /Users/olorin/.claude/plans/vivid-hopping-pike.md

## What's Next?

After successful deployment:
1. ✅ Setup monitoring and alerts
2. ✅ Configure budget alerts
3. ✅ Test all API endpoints
4. ✅ Update frontend configuration
5. ✅ Test OAuth and Stripe integrations
6. ✅ Run load tests
7. ✅ Setup staging environment (optional)

---

**Ready to deploy?** Run `./deploy.sh` and follow the prompts!
