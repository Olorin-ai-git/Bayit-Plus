# Google Cloud Secret Manager - MongoDB Atlas Setup Guide

## Overview

This guide explains how to configure Google Cloud Secret Manager to store MongoDB Atlas credentials for all Olorin platforms using the centralized database connection.

## Quick Start

### Option 1: Automated Setup (Recommended)

Run the provided setup script:

```bash
cd /path/to/olorin-core/backend-core/olorin-shared
./GOOGLE_CLOUD_SECRETS_SETUP.sh
```

### Option 2: Manual Setup

Follow the step-by-step commands below for more control.

---

## Prerequisites

1. **gcloud CLI installed**
   ```bash
   # Check if installed
   gcloud --version

   # If not installed, visit: https://cloud.google.com/sdk/docs/install
   ```

2. **Authenticated with Google Cloud**
   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   ```

3. **Required IAM Permissions**
   - `secretmanager.secrets.create`
   - `secretmanager.secrets.update`
   - `secretmanager.versions.add`

---

## MongoDB Atlas Connection Details

**Shared Cluster**: `cluster0.ydrvaft.mongodb.net`

**Connection String Format**:
```
mongodb+srv://admin_db_user:PASSWORD@cluster0.ydrvaft.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
```

**Database Names**:
- Bayit+: `bayit_plus`
- Israeli Radio Manager: `israeli_radio`
- Olorin Fraud Detection: `olorin`

---

## Step-by-Step Manual Setup

### 1. Bayit+ (Streaming Platform)

```bash
# Create/update MongoDB connection URL
gcloud secrets create bayit-mongodb-url \
  --replication-policy="automatic" \
  --data-file=- <<< "mongodb+srv://admin_db_user:Jersey1973!@cluster0.ydrvaft.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"

# Or if secret already exists (add new version):
echo "mongodb+srv://admin_db_user:Jersey1973!@cluster0.ydrvaft.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0" | \
  gcloud secrets versions add bayit-mongodb-url --data-file=-

# Create/update database name
gcloud secrets create bayit-mongodb-db-name \
  --replication-policy="automatic" \
  --data-file=- <<< "bayit_plus"

# Or update existing:
echo "bayit_plus" | gcloud secrets versions add bayit-mongodb-db-name --data-file=-
```

### 2. Israeli Radio Manager

```bash
# Create/update MongoDB connection URL
gcloud secrets create israeli-radio-mongodb-url \
  --replication-policy="automatic" \
  --data-file=- <<< "mongodb+srv://admin_db_user:Jersey1973!@cluster0.ydrvaft.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"

# Or update existing:
echo "mongodb+srv://admin_db_user:Jersey1973!@cluster0.ydrvaft.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0" | \
  gcloud secrets versions add israeli-radio-mongodb-url --data-file=-

# Create/update database name
gcloud secrets create israeli-radio-mongodb-db-name \
  --replication-policy="automatic" \
  --data-file=- <<< "israeli_radio"

# Or update existing:
echo "israeli_radio" | gcloud secrets versions add israeli-radio-mongodb-db-name --data-file=-
```

### 3. Olorin Fraud Detection

```bash
# Create/update MongoDB connection URL
gcloud secrets create olorin-mongodb-url \
  --replication-policy="automatic" \
  --data-file=- <<< "mongodb+srv://admin_db_user:Jersey1973!@cluster0.ydrvaft.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"

# Or update existing:
echo "mongodb+srv://admin_db_user:Jersey1973!@cluster0.ydrvaft.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0" | \
  gcloud secrets versions add olorin-mongodb-url --data-file=-

# Create/update database name
gcloud secrets create olorin-mongodb-db-name \
  --replication-policy="automatic" \
  --data-file=- <<< "olorin"

# Or update existing:
echo "olorin" | gcloud secrets versions add olorin-mongodb-db-name --data-file=-
```

---

## Verification

### List All MongoDB Secrets

```bash
gcloud secrets list --filter="name~mongodb"
```

Expected output:
```
NAME                           CREATED              REPLICATION_POLICY  LOCATIONS
bayit-mongodb-db-name          2026-01-21T13:00:00  automatic           -
bayit-mongodb-url              2026-01-21T13:00:00  automatic           -
israeli-radio-mongodb-db-name  2026-01-21T13:00:00  automatic           -
israeli-radio-mongodb-url      2026-01-21T13:00:00  automatic           -
olorin-mongodb-db-name         2026-01-21T13:00:00  automatic           -
olorin-mongodb-url             2026-01-21T13:00:00  automatic           -
```

### Access a Secret (for testing)

```bash
# View secret metadata
gcloud secrets describe bayit-mongodb-url

# Access secret value (requires secretAccessor role)
gcloud secrets versions access latest --secret="bayit-mongodb-url"
```

---

## IAM Permissions Setup

Grant your service accounts access to the secrets:

### For Bayit+

```bash
# Get your service account email
SERVICE_ACCOUNT="YOUR_SERVICE_ACCOUNT@YOUR_PROJECT.iam.gserviceaccount.com"

# Grant access to MongoDB URL
gcloud secrets add-iam-policy-binding bayit-mongodb-url \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor"

# Grant access to database name
gcloud secrets add-iam-policy-binding bayit-mongodb-db-name \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor"
```

### For Israeli Radio Manager

```bash
SERVICE_ACCOUNT="YOUR_SERVICE_ACCOUNT@YOUR_PROJECT.iam.gserviceaccount.com"

gcloud secrets add-iam-policy-binding israeli-radio-mongodb-url \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding israeli-radio-mongodb-db-name \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor"
```

### For Olorin Fraud Detection

```bash
SERVICE_ACCOUNT="YOUR_SERVICE_ACCOUNT@YOUR_PROJECT.iam.gserviceaccount.com"

gcloud secrets add-iam-policy-binding olorin-mongodb-url \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding olorin-mongodb-db-name \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor"
```

---

## Application Configuration

### App Engine (app.yaml)

```yaml
runtime: python311
entrypoint: uvicorn app.main:app --host 0.0.0.0 --port $PORT

# Reference secrets from Secret Manager
env_variables:
  MONGODB_URI: ${SECRET:bayit-mongodb-url}
  MONGODB_DB_NAME: ${SECRET:bayit-mongodb-db-name}
  MONGODB_MAX_POOL_SIZE: "100"
  MONGODB_MIN_POOL_SIZE: "20"
```

### Cloud Run

```bash
gcloud run deploy bayit-plus \
  --image=gcr.io/YOUR_PROJECT/bayit-plus:latest \
  --set-secrets=MONGODB_URI=bayit-mongodb-url:latest,MONGODB_DB_NAME=bayit-mongodb-db-name:latest \
  --region=us-central1
```

Or in YAML:

```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: bayit-plus
spec:
  template:
    spec:
      containers:
      - image: gcr.io/YOUR_PROJECT/bayit-plus:latest
        env:
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: bayit-mongodb-url
              key: latest
        - name: MONGODB_DB_NAME
          valueFrom:
            secretKeyRef:
              name: bayit-mongodb-db-name
              key: latest
```

### Kubernetes (GKE)

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: mongodb-secrets
type: Opaque
data:
  # Base64 encoded values from Secret Manager
  mongodb-uri: <base64-encoded-url>
  mongodb-db-name: <base64-encoded-db-name>
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: bayit-plus
spec:
  template:
    spec:
      containers:
      - name: backend
        env:
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: mongodb-secrets
              key: mongodb-uri
        - name: MONGODB_DB_NAME
          valueFrom:
            secretKeyRef:
              name: mongodb-secrets
              key: mongodb-db-name
```

---

## Local Development

For local development, use a `.env` file instead of Secret Manager:

```bash
# .env
MONGODB_URI=mongodb+srv://admin_db_user:PASSWORD@cluster0.ydrvaft.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
MONGODB_DB_NAME=bayit_plus  # or israeli_radio, or olorin
MONGODB_MAX_POOL_SIZE=20
MONGODB_MIN_POOL_SIZE=5
```

**Important**: Never commit `.env` files to git. Add to `.gitignore`:

```gitignore
.env
.env.local
.env.*.local
```

---

## Security Best Practices

### 1. Rotate MongoDB Password Immediately

The current password (`Jersey1973!`) was exposed in plain text and MUST be rotated:

```bash
# 1. Go to MongoDB Atlas
https://cloud.mongodb.com

# 2. Navigate to: Database Access → Edit User (admin_db_user)

# 3. Click "Edit Password" and generate a strong password

# 4. Update all secrets with new password:
NEW_PASSWORD="your-new-secure-password"

echo "mongodb+srv://admin_db_user:${NEW_PASSWORD}@cluster0.ydrvaft.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0" | \
  gcloud secrets versions add bayit-mongodb-url --data-file=-

echo "mongodb+srv://admin_db_user:${NEW_PASSWORD}@cluster0.ydrvaft.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0" | \
  gcloud secrets versions add israeli-radio-mongodb-url --data-file=-

echo "mongodb+srv://admin_db_user:${NEW_PASSWORD}@cluster0.ydrvaft.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0" | \
  gcloud secrets versions add olorin-mongodb-url --data-file=-
```

### 2. Enable Secret Manager Audit Logs

```bash
# Enable audit logs for Secret Manager
gcloud logging read "protoPayload.serviceName=secretmanager.googleapis.com" \
  --limit 50 --format json
```

### 3. Principle of Least Privilege

Only grant `secretmanager.secretAccessor` role, not broader roles like `secretmanager.admin`.

### 4. Use Secret Rotation Policies

```bash
# Set expiration on secrets (90 days)
gcloud secrets update bayit-mongodb-url \
  --next-rotation-time="2026-04-21T00:00:00Z" \
  --rotation-period="90d"
```

### 5. Monitor Secret Access

Set up alerts for unauthorized access attempts:

```bash
# Create alert policy for Secret Manager access
gcloud alpha monitoring policies create \
  --notification-channels=YOUR_CHANNEL_ID \
  --display-name="Secret Manager Unauthorized Access" \
  --condition-display-name="Failed secret access" \
  --condition-threshold-value=1 \
  --condition-threshold-duration=60s \
  --condition-filter='resource.type="secretmanager.googleapis.com/Secret" AND protoPayload.status.code!=0'
```

---

## Troubleshooting

### Error: "Secret already exists"

If you get "already exists" errors, use `versions add` instead of `create`:

```bash
echo "NEW_VALUE" | gcloud secrets versions add SECRET_NAME --data-file=-
```

### Error: "Permission denied"

Check your IAM permissions:

```bash
# Check your current permissions
gcloud projects get-iam-policy YOUR_PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:YOUR_EMAIL"
```

You need:
- `secretmanager.secrets.create`
- `secretmanager.secrets.update`
- `secretmanager.versions.add`

### Error: "Secret not found" in Application

Verify:
1. Secret exists: `gcloud secrets describe SECRET_NAME`
2. IAM permissions granted to service account
3. Environment variable configured correctly
4. Service account has `roles/secretmanager.secretAccessor` role

### Connection String Format Issues

Ensure password is URL-encoded if it contains special characters:

```python
from urllib.parse import quote_plus
password = "Password@123!"
encoded_password = quote_plus(password)
# Result: Password%40123%21
```

---

## Migration Checklist

- [ ] Run secret setup script or execute manual commands
- [ ] Verify all 6 secrets created (2 per platform)
- [ ] Grant IAM permissions to service accounts
- [ ] Update app.yaml / Cloud Run configurations
- [ ] Test connection from each platform
- [ ] **CRITICAL**: Rotate MongoDB password
- [ ] Enable audit logging
- [ ] Set up monitoring alerts
- [ ] Document service account emails
- [ ] Update deployment documentation

---

## Support

**Issues**: Report to #olorin-backend Slack channel
**Documentation**: See `/olorin-shared` README and MONGODB_SETUP.md
**Google Cloud Secret Manager**: https://cloud.google.com/secret-manager/docs
**MongoDB Atlas**: https://cloud.mongodb.com

---

**Last Updated**: January 21, 2026
**Author**: Olorin.ai Backend Team
**Status**: Production Ready ✅
