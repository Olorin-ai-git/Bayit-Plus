# Bayit+ Deployment Guide

## Quick Deployment Scripts

All deployment scripts are now conveniently accessible from the bayit-plus root directory via symlinks.

### Main Deployment Commands

```bash
# Deploy all platforms (backend + web + iOS + tvOS)
./deploy_all.sh

# Deploy individual platforms
./deploy_server.sh      # Backend API server
./deploy_web.sh         # Web application
./deploy_ios.sh         # iOS mobile app
./deploy_tvos.sh        # tvOS TV app

# Quick deployment (faster, minimal checks)
./quick_deploy.sh
```

### Script Locations

The actual scripts are in `deployment/scripts/` but symlinked to root:

```
bayit-plus/
├── deploy_all.sh -> deployment/scripts/deploy_all.sh
├── deploy_server.sh -> deployment/scripts/deploy_server.sh
├── deploy_ios.sh -> deployment/scripts/deploy_ios.sh
├── deploy_tvos.sh -> deployment/scripts/deploy_tvos.sh
├── deploy_web.sh -> deployment/scripts/deploy-web.sh
└── quick_deploy.sh -> deployment/scripts/quick-deploy.sh
```

---

## Cloud Build Deployment

### Quick Deploy

Deploy with default settings:

```bash
gcloud builds submit --config=cloudbuild.yaml
```

## Deploy with Custom Settings

Override any of the default substitution variables:

```bash
gcloud builds submit \
  --config=cloudbuild.yaml \
  --substitutions=_REGION=us-west1,_MEMORY=4Gi,_CPU=4,_MIN_INSTANCES=2,_MAX_INSTANCES=20
```

## Substitution Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `_REGION` | `us-central1` | Cloud Run region |
| `_MEMORY` | `2Gi` | Container memory allocation |
| `_CPU` | `2` | Number of CPUs |
| `_MIN_INSTANCES` | `1` | Minimum instances (always running) |
| `_MAX_INSTANCES` | `10` | Maximum instances (auto-scale limit) |

## Examples

### Production with High Performance

```bash
gcloud builds submit \
  --config=cloudbuild.yaml \
  --substitutions=_MEMORY=4Gi,_CPU=4,_MIN_INSTANCES=2,_MAX_INSTANCES=50
```

### Staging with Lower Resources

```bash
gcloud builds submit \
  --config=cloudbuild.yaml \
  --substitutions=_MEMORY=1Gi,_CPU=1,_MIN_INSTANCES=0,_MAX_INSTANCES=3
```

### Different Region

```bash
gcloud builds submit \
  --config=cloudbuild.yaml \
  --substitutions=_REGION=europe-west1
```

## What Gets Deployed

1. **Docker Build**: Builds the backend container image
2. **Push to GCR**: Pushes to Google Container Registry
3. **Cloud Run Deploy**: Deploys to Cloud Run with the specified settings
4. **Tags**: Creates both `BUILD_ID` and `latest` tags

## Build Process

- **Build Time**: ~15-40 minutes (depending on cache)
- **Timeout**: 2400s (40 minutes)
- **Source Size**: ~2.8 GiB compressed

## Troubleshooting

### Substitution Errors

If you see errors like:
```
ERROR: key "_CPU" in the substitution data is not matched in the template
```

Make sure you're using the updated `cloudbuild.yaml` that includes the `substitutions:` section.

### Memory/CPU Limits

Cloud Run limits:
- **Memory**: 128Mi - 32Gi
- **CPU**: 1 - 8
- **Min Instances**: 0 - 1000
- **Max Instances**: 1 - 1000

### Build Timeout

If builds timeout, increase the timeout:
```yaml
timeout: '3600s'  # 60 minutes
```

## CI/CD Integration

Add to GitHub Actions:

```yaml
- name: Deploy to Cloud Run
  run: |
    gcloud builds submit \
      --config=cloudbuild.yaml \
      --substitutions=_REGION=us-central1,_MEMORY=2Gi,_CPU=2
```

## Cost Optimization

**Development:**
```bash
--substitutions=_MIN_INSTANCES=0  # Scale to zero when idle
```

**Production:**
```bash
--substitutions=_MIN_INSTANCES=1  # Always ready, no cold starts
```
