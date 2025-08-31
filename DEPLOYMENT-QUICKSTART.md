# Firebase App Hosting - Quick Start Guide

**🚀 Olorin Backend Deployment to Firebase App Hosting**

## Prerequisites (One-time Setup)

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Install Google Cloud CLI (optional)
curl https://sdk.cloud.google.com | bash
gcloud auth login
```

## Quick Deploy Commands

```bash
# From project root (/Users/gklainert/Documents/olorin)

# 1. Validate configuration (dry run)
./deploy-backend.sh --dry-run

# 2. Deploy to production
./deploy-backend.sh

# 3. Deploy with verbose output
./deploy-backend.sh --verbose
```

## Configuration Files Overview

| File | Purpose | Location |
|------|---------|----------|
| `apphosting.yaml` | Main App Hosting config | Project root |
| `firebase.json` | Firebase project config | Project root |
| `.env.yaml` | Environment variables | Project root |
| `cloudbuild.yaml` | CI/CD pipeline | Project root |
| `deploy-backend.sh` | Deployment script | Project root |

## Key Configuration Details

### Project Settings
- **Project ID:** olorin-ai
- **Location:** us-central1
- **Runtime:** Python 3.11
- **Port:** 8000 (FastAPI)
- **Resources:** 2 CPU, 4GB RAM
- **Scaling:** 1-100 instances

### Secret Manager Paths
All secrets use pattern: `prd/olorin/{secret_name}`
- `prd/olorin/anthropic_api_key` → `ANTHROPIC_API_KEY`
- `prd/olorin/openai_api_key` → `OPENAI_API_KEY`
- `prd/olorin/database_password` → `DB_PASSWORD`
- `prd/olorin/jwt_secret_key` → `JWT_SECRET_KEY`

## Quick Health Checks

```bash
# Check deployment status
firebase apphosting:backends:list

# Test health endpoint
curl https://[service-url]/health

# View logs
gcloud logging read "resource.type=cloud_run_revision" \
  --project=olorin-ai --limit=20
```

## Common Issues & Solutions

### Issue: Deployment fails with "secrets not found"
**Solution:** Verify all secrets exist in Firebase Secret Manager
```bash
gcloud secrets list --project=olorin-ai
```

### Issue: Health check timeouts
**Solution:** Check application startup logs
```bash
gcloud logging read "resource.labels.service_name=olorin-backend" \
  --project=olorin-ai
```

### Issue: Build fails with dependency errors
**Solution:** Verify Poetry configuration in olorin-server/
```bash
cd olorin-server
poetry check
```

## Emergency Rollback

```bash
# List revisions
gcloud run revisions list --service=olorin-backend \
  --region=us-central1 --project=olorin-ai

# Rollback to previous
gcloud run services update-traffic olorin-backend \
  --to-revisions=[PREVIOUS_REVISION]=100 \
  --region=us-central1 --project=olorin-ai
```

## Support Resources

- **Full Documentation:** `/docs/deployment/firebase-app-hosting-setup.md`
- **Firebase Console:** https://console.firebase.google.com/project/olorin-ai
- **Cloud Run Console:** https://console.cloud.google.com/run?project=olorin-ai
- **Build History:** https://console.cloud.google.com/cloud-build/builds?project=olorin-ai

---

**Need Help?** Check the full documentation or escalate to the DevOps team.