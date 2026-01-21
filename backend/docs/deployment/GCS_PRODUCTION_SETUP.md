# GCS Production Setup Guide

This guide covers the production-ready Google Cloud Storage (GCS) authentication setup for the Bayit+ backend deployed on Cloud Run.

## Overview

The Bayit+ backend uses **Workload Identity** via Cloud Run's default service account to authenticate with GCS. This is the recommended production approach as it:

- ✅ No service account keys to manage or rotate
- ✅ Automatic authentication via metadata server
- ✅ Scoped permissions per service
- ✅ Audit logging built-in
- ✅ Follows Google Cloud security best practices

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Cloud Run                                │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Bayit+ Backend Container                                  │  │
│  │                                                             │  │
│  │  google.cloud.storage.Client()                             │  │
│  │         │                                                   │  │
│  │         └─→ Metadata Server (automatic auth)               │  │
│  │                                                             │  │
│  └───────────────────────────────────────────────────────────┘  │
│                           │                                      │
│              Service Account: 624470113582-compute@...          │
└───────────────────────────┼──────────────────────────────────────┘
                            │
                            ▼
                  ┌──────────────────┐
                  │  GCS Bucket      │
                  │  bayit-plus-     │
                  │  media-new       │
                  └──────────────────┘
```

## Service Account

**Email:** `624470113582-compute@developer.gserviceaccount.com`  
**Type:** Default Compute Service Account  
**Project:** bayit-plus (624470113582)

This is the existing default service account automatically created for the project.

## Required Permissions

The service account needs the following IAM roles:

### 1. Storage Permissions
```bash
# Full access to objects (read, write, delete)
roles/storage.objectAdmin

# Bucket management (create, list, configure)
roles/storage.admin
```

### 2. Secret Manager Access
```bash
# Read secrets at runtime
roles/secretmanager.secretAccessor
```

### 3. Cloud Run Permissions
```bash
# Allow service invocation (for scheduled jobs)
roles/run.invoker
```

## Setup Instructions

### Automated Setup (Recommended)

Run the provided setup script:

```bash
cd /Users/olorin/Documents/olorin
./deployment/scripts/setup_gcs_production.sh
```

This script will:
1. ✅ Verify the service account exists
2. ✅ Grant necessary GCS permissions
3. ✅ Create/verify the GCS bucket
4. ✅ Configure CORS for web access
5. ✅ Enable public read access
6. ✅ Update Secret Manager
7. ✅ Verify the complete setup

### Manual Setup

If you prefer to set up manually:

#### Step 1: Verify Service Account
```bash
PROJECT_ID="bayit-plus"
SERVICE_ACCOUNT="624470113582-compute@developer.gserviceaccount.com"

gcloud iam service-accounts describe $SERVICE_ACCOUNT --project=$PROJECT_ID
```

#### Step 2: Grant GCS Permissions
```bash
# Storage Object Admin
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/storage.objectAdmin"

# Storage Admin
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/storage.admin"

# Secret Manager Accessor
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/secretmanager.secretAccessor"
```

#### Step 3: Create GCS Bucket
```bash
BUCKET_NAME="bayit-plus-media-new"
REGION="us-east1"

# Create bucket
gsutil mb -p $PROJECT_ID -c STANDARD -l $REGION gs://$BUCKET_NAME

# Set permissions
gsutil iam ch serviceAccount:$SERVICE_ACCOUNT:objectAdmin gs://$BUCKET_NAME

# Enable public read
gsutil iam ch allUsers:objectViewer gs://$BUCKET_NAME

# Enable uniform bucket-level access
gsutil uniformbucketlevelaccess set on gs://$BUCKET_NAME
```

#### Step 4: Configure CORS
```bash
cat > cors-config.json <<EOF
[
  {
    "origin": ["https://bayit.tv", "https://www.bayit.tv", "http://localhost:3000"],
    "method": ["GET", "HEAD", "PUT", "POST", "DELETE"],
    "responseHeader": ["Content-Type", "Access-Control-Allow-Origin"],
    "maxAgeSeconds": 3600
  }
]
EOF

gsutil cors set cors-config.json gs://$BUCKET_NAME
rm cors-config.json
```

#### Step 5: Update Secrets
```bash
# Update or create GCS bucket name secret
echo -n "bayit-plus-media-new" | \
  gcloud secrets versions add gcs-bucket-name --data-file=- --project=$PROJECT_ID

# Or create if doesn't exist
echo -n "bayit-plus-media-new" | \
  gcloud secrets create gcs-bucket-name --data-file=- --replication-policy="automatic" --project=$PROJECT_ID
```

## Deployment Configuration

The service account is configured in `backend/cloudbuild.yaml`:

```yaml
- '--service-account=624470113582-compute@developer.gserviceaccount.com'
```

This ensures the Cloud Run service runs with the correct identity and can access GCS.

## How Authentication Works in Production

### 1. **Cloud Run Startup**
When the container starts, Cloud Run:
- Assigns the specified service account identity
- Provides access to the metadata server at `http://metadata.google.internal`

### 2. **GCS Client Initialization**
```python
# backend/app/core/storage.py
from google.cloud import storage

# Auto-authenticates via metadata server
client = storage.Client(project=settings.GCS_PROJECT_ID or None)
```

The `storage.Client()` automatically:
- Detects it's running in Cloud Run
- Fetches credentials from the metadata server
- Uses the service account's permissions

### 3. **Upload Service**
```python
# backend/app/services/upload_service.py
async def _get_gcs_client(self) -> gcs_storage.Client:
    if self._gcs_client is None:
        self._gcs_client = gcs_storage.Client()  # Auto-auth
    return self._gcs_client
```

No credentials file, no environment variables - it just works! ✨

## Verification

### 1. Check Service Account Permissions
```bash
gcloud projects get-iam-policy bayit-plus \
    --flatten="bindings[].members" \
    --filter="bindings.members:serviceAccount:624470113582-compute@developer.gserviceaccount.com" \
    --format="table(bindings.role)"
```

Expected output:
```
ROLE
roles/run.invoker
roles/secretmanager.secretAccessor
roles/storage.admin
roles/storage.objectAdmin
```

### 2. Check Bucket Permissions
```bash
gsutil iam get gs://bayit-plus-media-new
```

### 3. Test from Cloud Run
```bash
# Get Cloud Run service URL
SERVICE_URL=$(gcloud run services describe bayit-plus-backend \
    --region=us-east1 \
    --format='value(status.url)')

# Test health endpoint
curl $SERVICE_URL/api/v1/health

# Check logs for GCS operations
gcloud run logs read bayit-plus-backend --region=us-east1 --limit=50
```

### 4. Test Upload
```bash
# Via API (requires authentication)
curl -X POST $SERVICE_URL/api/v1/upload/queue \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test.mp4" \
  -F "type=movie"
```

## Troubleshooting

### Error: "GCS credentials not configured"

**Cause:** Service account not assigned to Cloud Run service

**Fix:**
```bash
gcloud run services update bayit-plus-backend \
    --service-account=624470113582-compute@developer.gserviceaccount.com \
    --region=us-east1
```

### Error: "Permission denied"

**Cause:** Service account lacks required roles

**Fix:** Run the setup script or grant permissions manually (see Step 2 above)

### Error: "Bucket does not exist"

**Cause:** GCS bucket not created or wrong name in secret

**Fix:**
```bash
# Verify bucket exists
gsutil ls gs://bayit-plus-media-new

# Or create it
gsutil mb -p bayit-plus -c STANDARD -l us-east1 gs://bayit-plus-media-new

# Update secret
echo -n "bayit-plus-media-new" | gcloud secrets versions add gcs-bucket-name --data-file=-
```

### Error: "CORS policy blocked"

**Cause:** CORS not configured on bucket

**Fix:** Run CORS configuration (see Step 4 above)

## Security Best Practices

### ✅ What We Do

1. **No Service Account Keys**
   - Use Workload Identity instead of downloaded JSON keys
   - No risk of key leakage or rotation issues

2. **Least Privilege**
   - Service account only has permissions needed for its function
   - Scoped to specific bucket

3. **Uniform Bucket-Level Access**
   - Simpler permission management
   - Better security model than object-level ACLs

4. **Secret Manager for Configuration**
   - Bucket name stored in Secret Manager
   - No hardcoded values in code

5. **Audit Logging**
   - All GCS operations logged automatically
   - Can track who accessed what and when

### ❌ What We Avoid

1. ~~Service account key files~~
2. ~~Hardcoded credentials in code~~
3. ~~Overly broad permissions (e.g., Owner role)~~
4. ~~Public write access to buckets~~
5. ~~Storing secrets in environment variables~~

## Cost Considerations

### GCS Storage Pricing (US Multi-Region)

- **Standard Storage:** $0.020/GB/month
- **Class A Operations:** $0.05 per 10,000 operations (write, delete)
- **Class B Operations:** $0.004 per 10,000 operations (read)
- **Network Egress:** 
  - First 1 GB: Free
  - Next 10 TB: $0.12/GB
  - Over 10 TB: Lower rates apply

### Estimated Monthly Costs

**Scenario:** 1 TB storage, 1M reads, 100K writes
- Storage: 1000 GB × $0.020 = **$20.00**
- Reads: 1,000,000 ÷ 10,000 × $0.004 = **$0.40**
- Writes: 100,000 ÷ 10,000 × $0.05 = **$0.50**
- **Total:** ~**$21/month**

## References

- [Cloud Run Service Identity](https://cloud.google.com/run/docs/securing/service-identity)
- [GCS Authentication](https://cloud.google.com/storage/docs/authentication)
- [Workload Identity Best Practices](https://cloud.google.com/iam/docs/best-practices-service-accounts)
- [GCS Pricing](https://cloud.google.com/storage/pricing)

## Next Steps

After setting up GCS:

1. **Deploy Backend**
   ```bash
   gcloud builds submit --config=backend/cloudbuild.yaml
   ```

2. **Verify Deployment**
   ```bash
   gcloud run services describe bayit-plus-backend --region=us-east1
   ```

3. **Test Upload Flow**
   - Upload a test file via API
   - Verify it appears in GCS bucket
   - Check public URL is accessible

4. **Monitor**
   - Set up Cloud Monitoring for GCS metrics
   - Create alerts for failed uploads
   - Review costs in Cloud Console

---

**Last Updated:** January 2026  
**Maintained By:** Bayit+ DevOps Team
