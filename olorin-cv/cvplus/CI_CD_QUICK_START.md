# CI/CD Quick Start Guide

**Get your pipelines running in 15 minutes!**

---

## Prerequisites Checklist

- [ ] GitHub repository admin access
- [ ] Google Cloud Platform account
- [ ] Firebase account
- [ ] `gcloud` CLI installed
- [ ] `firebase` CLI installed

---

## Step 1: GCP Setup (5 minutes)

```bash
# Login to GCP
gcloud auth login

# Create projects (or use existing)
export PROD_PROJECT="cvplus-production"
export STAGING_PROJECT="cvplus-staging"
export DEV_PROJECT="cvplus-dev"

# Set project
gcloud config set project $PROD_PROJECT

# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable secretmanager.googleapis.com

# Create service account for backend
gcloud iam service-accounts create cvplus-backend \
  --display-name="CVPlus Backend"

# Grant permissions
gcloud projects add-iam-policy-binding $PROD_PROJECT \
  --member="serviceAccount:cvplus-backend@${PROD_PROJECT}.iam.gserviceaccount.com" \
  --role="roles/run.invoker"

gcloud projects add-iam-policy-binding $PROD_PROJECT \
  --member="serviceAccount:cvplus-backend@${PROD_PROJECT}.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Create service account key for GitHub Actions
gcloud iam service-accounts keys create ~/cvplus-sa-key.json \
  --iam-account=cvplus-backend@${PROD_PROJECT}.iam.gserviceaccount.com

echo "✅ Service account key saved to ~/cvplus-sa-key.json"
```

---

## Step 2: GCP Secrets (3 minutes)

```bash
# Create secrets in Secret Manager
echo -n "your-jwt-secret-32-chars-min" | gcloud secrets create JWT_SECRET_KEY \
  --data-file=- --replication-policy="automatic"

echo -n "mongodb+srv://user:pass@cluster.mongodb.net/cvplus" | gcloud secrets create MONGODB_URI \
  --data-file=- --replication-policy="automatic"

echo -n "sk-ant-your-api-key" | gcloud secrets create ANTHROPIC_API_KEY \
  --data-file=- --replication-policy="automatic"

echo "✅ Secrets created in Secret Manager"
```

---

## Step 3: Firebase Setup (3 minutes)

```bash
# Login to Firebase
firebase login

# List projects
firebase projects:list

# Get CI token
firebase login:ci

# Save this token! You'll need it for GitHub Secrets
```

---

## Step 4: GitHub Secrets (4 minutes)

Go to: `GitHub Repository → Settings → Secrets and variables → Actions`

Add these secrets:

### Backend Secrets
```
GCP_SERVICE_ACCOUNT_KEY: <paste content of ~/cvplus-sa-key.json>
GCP_PROJECT_ID_PROD: cvplus-production
GCP_PROJECT_ID_STAGING: cvplus-staging
GCP_PROJECT_ID_DEV: cvplus-dev
```

### Frontend Secrets
```
FIREBASE_TOKEN: <token from firebase login:ci>
FIREBASE_PROJECT_ID_PROD: cvplus-production
FIREBASE_PROJECT_ID_STAGING: cvplus-staging
FIREBASE_PROJECT_ID_DEV: cvplus-dev
```

### Optional (for coverage reports)
```
CODECOV_TOKEN: <get from codecov.io after signing up>
```

---

## Step 5: Test Workflows (2 minutes)

```bash
# Commit and push to trigger CI
git add .github/workflows/
git commit -m "ci: add CI/CD pipelines"
git push origin develop

# Check GitHub Actions tab
open https://github.com/YOUR_ORG/cvplus/actions
```

---

## Quick Commands

### Manually trigger deployment

```bash
# Backend deployment
gh workflow run deploy-backend.yml -f environment=staging

# Frontend deployment
gh workflow run deploy-frontend-new.yml -f environment=staging
```

### View workflow status

```bash
gh run list
gh run view <run-id>
gh run view <run-id> --log
```

### Check Cloud Run deployment

```bash
gcloud run services list --project=cvplus-production
gcloud run services describe cvplus-backend --region=us-central1
```

### Check Firebase deployment

```bash
firebase hosting:channel:list --project=cvplus-production
```

---

## Troubleshooting Quick Fixes

### Backend CI fails with "Coverage below threshold"
```bash
cd python-backend
poetry run pytest --cov
# Add more tests if coverage is low
```

### Frontend build size exceeds 5MB
```bash
cd frontend
npm run build
du -h dist/  # Check what's large
# Optimize images, split code, or adjust threshold in workflow
```

### Docker build fails
```bash
cd python-backend
docker build -t test .
docker run -p 8080:8080 test
# Check logs for specific errors
```

### Deployment fails with "permission denied"
```bash
# Check service account has correct roles
gcloud projects get-iam-policy cvplus-production \
  --flatten="bindings[].members" \
  --filter="bindings.members:cvplus-backend@"
```

---

## Success Criteria

✅ CI workflows run on every push/PR
✅ All checks pass (lint, test, build)
✅ Deployments succeed to all environments
✅ Health checks pass after deployment
✅ Coverage reports uploaded to Codecov

---

## Next Steps

1. **Setup monitoring**: Configure GCP Cloud Monitoring dashboards
2. **Enable alerts**: Set up alerting for failures and high error rates
3. **Optimize performance**: Review build times and optimize caching
4. **Add notifications**: Configure Slack/Discord webhooks for deployment updates

---

## Resources

- Full documentation: `docs/CI_CD_SETUP.md`
- Workflow files: `.github/workflows/`
- Implementation summary: `CI_CD_IMPLEMENTATION_SUMMARY.md`

---

**Questions?** Check the troubleshooting section in `docs/CI_CD_SETUP.md`
