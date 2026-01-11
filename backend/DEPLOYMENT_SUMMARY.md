# Bayit+ Backend Deployment Summary

## ✅ Deployment Successful

**Service URL**: `https://bayit-plus-backend-534446777606.us-east1.run.app`

**Deployment Date**: January 11, 2026

---

## Infrastructure Details

### Google Cloud Run
- **Service Name**: `bayit-plus-backend`
- **Region**: `us-east1`
- **Project**: `israeli-radio-475c9`
- **Image**: `us-east1-docker.pkg.dev/israeli-radio-475c9/bayit-plus/backend:latest`
- **Service Account**: `israeli-radio-auth@israeli-radio-475c9.iam.gserviceaccount.com`
- **Current Revision**: `bayit-plus-backend-00002-7m4`

### Resources
- **Memory**: 2Gi
- **CPU**: 2 vCPU
- **Min Instances**: 1 (no cold starts)
- **Max Instances**: 10
- **Concurrency**: 80 requests per instance
- **Timeout**: 300 seconds
- **Port**: 8080

### MongoDB Atlas
- **Cluster**: `cluster0.ydrvaft.mongodb.net`
- **Database**: `bayit_plus` (new database created)
- **Connection**: Verified via Secret Manager

### Google Cloud Storage
- **Bucket**: `gs://bayit-plus-media`
- **Region**: `us-central1`
- **Storage Class**: STANDARD
- **Public Access**: Enabled for images
- **CORS**: Configured for browser uploads

### Secrets (15 total in Secret Manager)
- ✅ `bayit-secret-key`
- ✅ `mongodb-url`
- ✅ `mongodb-db-name`
- ✅ `stripe-secret-key` (placeholder)
- ✅ `stripe-webhook-secret` (placeholder)
- ✅ `stripe-price-basic` (placeholder)
- ✅ `stripe-price-premium` (placeholder)
- ✅ `stripe-price-family` (placeholder)
- ✅ `anthropic-api-key`
- ✅ `google-client-id` (from Israeli-Radio-Manager)
- ✅ `google-client-secret` (from Israeli-Radio-Manager)
- ✅ `google-redirect-uri`
- ✅ `elevenlabs-api-key`
- ✅ `gcs-bucket-name`
- ✅ `backend-cors-origins`

---

## Verified Endpoints

### ✅ Health Check
```bash
curl https://bayit-plus-backend-534446777606.us-east1.run.app/health
# Response: {"status":"healthy","app":"Bayit+ API"}
```

### ✅ API Documentation
- **Swagger UI**: https://bayit-plus-backend-534446777606.us-east1.run.app/docs
- **OpenAPI JSON**: https://bayit-plus-backend-534446777606.us-east1.run.app/api/v1/openapi.json

### ✅ Content API
```bash
curl https://bayit-plus-backend-534446777606.us-east1.run.app/api/v1/content/featured
# Response: {"hero":null,"spotlight":[],"categories":[]}
# (Empty because database is new - working correctly)
```

---

## Next Steps

### 1. Update Frontend Applications

Update the API base URL in all frontend apps to point to the new Cloud Run service:

**Web App** (`web/src/config/appConfig.js`):
```javascript
export const API_BASE_URL = 'https://bayit-plus-backend-534446777606.us-east1.run.app/api/v1';
```

**Tizen TV App**:
```javascript
const API_BASE_URL = 'https://bayit-plus-backend-534446777606.us-east1.run.app/api/v1';
```

**Mobile Apps** (if applicable):
Update environment configuration to use new API URL.

### 2. Populate Database with Content

The database is currently empty. You need to:

#### Option A: Import Existing Data
If you have existing data from another database, export and import it:
```bash
# Export from old database
mongodump --uri="mongodb://old-connection-string" --db=bayit_plus

# Import to Atlas
mongorestore --uri="mongodb+srv://cluster0.ydrvaft.mongodb.net/bayit_plus" dump/bayit_plus/
```

#### Option B: Upload Movies from USB Drive (Background Task)
Run the following script to upload movies from the USB drive:
```bash
# This will be implemented as a background task
python scripts/upload_movies.py --source="/Volumes/USB Drive/Movies" --collection="content"
```

#### Option C: Use Admin Panel
Access the admin panel through the web app to manually add content.

### 3. Update External Services

#### Google OAuth Console
Add the new redirect URI:
```
https://bayit-plus-backend-534446777606.us-east1.run.app/api/v1/auth/google/callback
```

**Steps**:
1. Go to https://console.cloud.google.com/apis/credentials?project=israeli-radio-475c9
2. Edit the OAuth 2.0 Client ID
3. Add to "Authorized redirect URIs"

#### Stripe Webhooks (When Ready)
1. Go to https://dashboard.stripe.com/webhooks
2. Create new webhook endpoint:
   - URL: `https://bayit-plus-backend-534446777606.us-east1.run.app/api/v1/subscriptions/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.*`
3. Update `stripe-webhook-secret` in Secret Manager with the signing secret
4. Update `stripe-secret-key`, `stripe-price-basic`, `stripe-price-premium`, `stripe-price-family` secrets

### 4. Configure Custom Domain (Optional)

If you want to use `api.bayit.tv` instead of the Cloud Run URL:

```bash
gcloud run domain-mappings create \
  --service bayit-plus-backend \
  --domain api.bayit.tv \
  --region us-east1 \
  --project israeli-radio-475c9
```

Then update DNS with the CNAME record provided.

### 5. Setup CI/CD Automation

Create a Cloud Build trigger for automatic deployments:

1. Go to https://console.cloud.google.com/cloud-build/triggers?project=israeli-radio-475c9
2. Click "CREATE TRIGGER"
3. Configure:
   - **Name**: `deploy-bayit-plus-backend`
   - **Repository**: Connect your GitHub repo
   - **Branch**: `^main$`
   - **Build configuration**: `backend/cloudbuild.yaml`
4. Save

Now every push to `main` will automatically build and deploy the backend.

### 6. Monitoring & Alerts

#### Set Up Uptime Checks
1. Go to https://console.cloud.google.com/monitoring/uptime?project=israeli-radio-475c9
2. Create uptime check:
   - **Protocol**: HTTPS
   - **URL**: `https://bayit-plus-backend-534446777606.us-east1.run.app/health`
   - **Frequency**: 1 minute

#### Create Alert Policies
- Error rate > 5%
- 99th percentile latency > 3 seconds
- Instance count approaching max (10 instances)

---

## Cost Estimate

- **Cloud Run** (1 min instance, 2Gi, 2 CPU): ~$50/month
- **GCS Storage** (100GB media): $2/month
- **GCS Operations**: <$1/month
- **Secret Manager** (15 secrets): $0.90/month
- **MongoDB Atlas** (Shared cluster): Reusing existing
- **Total New Costs**: ~$53/month

---

## Deployment Files Created/Modified

### Created
- ✅ `Dockerfile` - Optimized multi-stage build
- ✅ `requirements.txt` - Python dependencies
- ✅ `cloudbuild.yaml` - CI/CD configuration
- ✅ `.gcloudignore` - Build optimization
- ✅ `app/core/logging_config.py` - Structured logging
- ✅ `scripts/migrate_storage_urls.py` - S3 to GCS migration

### Modified
- ✅ `app/core/config.py` - Added GCS configuration
- ✅ `app/core/storage.py` - Added GCSStorageProvider
- ✅ `app/main.py` - Added logging and CORS updates
- ✅ `pyproject.toml` - Added google-cloud-storage dependencies

---

## Rollback Procedure

If you need to rollback to a previous version:

```bash
# List revisions
gcloud run revisions list \
  --service bayit-plus-backend \
  --region us-east1 \
  --project israeli-radio-475c9

# Rollback to specific revision
gcloud run services update-traffic bayit-plus-backend \
  --region us-east1 \
  --to-revisions [REVISION-NAME]=100
```

---

## Support & Documentation

- **Cloud Run Console**: https://console.cloud.google.com/run/detail/us-east1/bayit-plus-backend?project=israeli-radio-475c9
- **Logs**: https://console.cloud.google.com/logs/query?project=israeli-radio-475c9
- **Secrets**: https://console.cloud.google.com/security/secret-manager?project=israeli-radio-475c9
- **GCS Bucket**: https://console.cloud.google.com/storage/browser/bayit-plus-media?project=israeli-radio-475c9
- **API Docs**: https://bayit-plus-backend-534446777606.us-east1.run.app/docs

---

## Summary

🎉 **Deployment Complete!**

The Bayit+ backend is now running on Google Cloud Run with:
- ✅ MongoDB Atlas connection
- ✅ Google Cloud Storage for media
- ✅ All secrets secured in Secret Manager
- ✅ Automatic scaling (1-10 instances)
- ✅ Public API access enabled
- ✅ Health checks passing

**Next**: Update your frontend apps to use the new API URL and start adding content to the database.
