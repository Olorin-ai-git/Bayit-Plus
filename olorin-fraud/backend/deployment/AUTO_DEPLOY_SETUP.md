# Olorin Platform - Automatic Deployment Setup

This guide explains how to set up automatic deployments for the Olorin platform using Google Cloud Build triggers.

## Overview

When configured, every push to the `main` branch will automatically:
1. Build a Docker image
2. Push to Artifact Registry
3. Deploy to Cloud Run (staging or production)
4. Verify deployment health

## Prerequisites

- Google Cloud Project: `olorin-fraud-detection`
- GitHub repository connected to Cloud Build
- Service account with required permissions
- Artifact Registry repository created

## Quick Setup

### 1. Enable Required APIs

```bash
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  --project=olorin-fraud-detection
```

### 2. Create Artifact Registry Repository

```bash
gcloud artifacts repositories create olorin \
  --repository-format=docker \
  --location=us-east1 \
  --description="Olorin Docker images" \
  --project=olorin-fraud-detection
```

### 3. Grant Cloud Build Permissions

```bash
# Get Cloud Build service account
PROJECT_NUMBER=$(gcloud projects describe olorin-fraud-detection --format="value(projectNumber)")
CLOUDBUILD_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

# Grant Cloud Run Admin
gcloud projects add-iam-policy-binding olorin-fraud-detection \
  --member="serviceAccount:${CLOUDBUILD_SA}" \
  --role="roles/run.admin"

# Grant Service Account User
gcloud projects add-iam-policy-binding olorin-fraud-detection \
  --member="serviceAccount:${CLOUDBUILD_SA}" \
  --role="roles/iam.serviceAccountUser"

# Grant Secret Manager Access
gcloud projects add-iam-policy-binding olorin-fraud-detection \
  --member="serviceAccount:${CLOUDBUILD_SA}" \
  --role="roles/secretmanager.secretAccessor"
```

### 4. Connect GitHub Repository

1. Go to [Cloud Build Triggers](https://console.cloud.google.com/cloud-build/triggers?project=olorin-fraud-detection)
2. Click "Connect Repository"
3. Select "GitHub (Cloud Build GitHub App)"
4. Authenticate and select repository: `Olorin-ai-git/olorin-server`

### 5. Create Build Triggers

#### Staging Trigger (on push to main)

```bash
gcloud builds triggers create github \
  --name="olorin-backend-staging" \
  --repo-name="olorin-server" \
  --repo-owner="Olorin-ai-git" \
  --branch-pattern="^main$" \
  --build-config="cloudbuild.yaml" \
  --substitutions="_ENVIRONMENT=staging,_REGION=us-east1" \
  --project=olorin-fraud-detection
```

#### Production Trigger (manual or on tag)

```bash
gcloud builds triggers create github \
  --name="olorin-backend-production" \
  --repo-name="olorin-server" \
  --repo-owner="Olorin-ai-git" \
  --tag-pattern="^v[0-9]+\.[0-9]+\.[0-9]+$" \
  --build-config="cloudbuild.yaml" \
  --substitutions="_ENVIRONMENT=production,_REGION=us-east1" \
  --project=olorin-fraud-detection
```

## Cloud Build Configuration

The `cloudbuild.yaml` file defines the build pipeline:

```yaml
# See /cloudbuild.yaml for full configuration
steps:
  1. Build Docker image with cache
  2. Push to Artifact Registry
  3. Deploy to Cloud Run
  4. Verify health endpoint
  5. Tag deployed image
```

### Substitution Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `_ENVIRONMENT` | `staging` | Target environment |
| `_REGION` | `us-east1` | GCP region |
| `_MEMORY` | `2Gi/4Gi` | Cloud Run memory |
| `_CPU` | `1/2` | Cloud Run CPUs |
| `_MIN_INSTANCES` | `0/1` | Minimum instances |
| `_MAX_INSTANCES` | `5/10` | Maximum instances |

## Manual Deployment

For manual deployments without Cloud Build triggers:

```bash
# Deploy to staging
./deployment/scripts/deploy_server.sh --environment staging

# Deploy to production
./deployment/scripts/deploy_server.sh --environment production

# Full stack deployment
./deployment/scripts/deploy_all.sh --environment production
```

## Monitoring Builds

### View Build History

```bash
# List recent builds
gcloud builds list --project=olorin-fraud-detection --limit=10

# Watch ongoing builds
gcloud builds list --project=olorin-fraud-detection --ongoing

# View specific build logs
gcloud builds log BUILD_ID --project=olorin-fraud-detection
```

### Cloud Console Links

- [Cloud Build Dashboard](https://console.cloud.google.com/cloud-build/builds?project=olorin-fraud-detection)
- [Cloud Run Services](https://console.cloud.google.com/run?project=olorin-fraud-detection)
- [Artifact Registry](https://console.cloud.google.com/artifacts?project=olorin-fraud-detection)
- [Secret Manager](https://console.cloud.google.com/security/secret-manager?project=olorin-fraud-detection)

## Rollback Procedures

### Quick Rollback (Cloud Run)

```bash
# List recent revisions
gcloud run revisions list \
  --service=olorin-backend-production \
  --region=us-east1 \
  --project=olorin-fraud-detection \
  --limit=5

# Rollback to specific revision
gcloud run services update-traffic olorin-backend-production \
  --to-revisions=olorin-backend-production-00003-abc=100 \
  --region=us-east1 \
  --project=olorin-fraud-detection
```

### Redeploy Previous Image

```bash
# List images in Artifact Registry
gcloud artifacts docker images list \
  us-east1-docker.pkg.dev/olorin-fraud-detection/olorin/backend \
  --include-tags

# Deploy specific image
gcloud run deploy olorin-backend-production \
  --image=us-east1-docker.pkg.dev/olorin-fraud-detection/olorin/backend:20240115-123456 \
  --region=us-east1 \
  --project=olorin-fraud-detection
```

## Troubleshooting

### Build Fails with Permission Error

```bash
# Verify Cloud Build service account permissions
gcloud projects get-iam-policy olorin-fraud-detection \
  --flatten="bindings[].members" \
  --filter="bindings.members:cloudbuild.gserviceaccount.com"
```

### Secret Access Denied

```bash
# Verify secrets exist
gcloud secrets list --project=olorin-fraud-detection

# Grant access to specific secret
gcloud secrets add-iam-policy-binding SECRET_NAME \
  --member="serviceAccount:${CLOUDBUILD_SA}" \
  --role="roles/secretmanager.secretAccessor" \
  --project=olorin-fraud-detection
```

### Health Check Fails

1. Check Cloud Run logs:
   ```bash
   gcloud run services logs read olorin-backend-staging \
     --region=us-east1 \
     --project=olorin-fraud-detection \
     --limit=50
   ```

2. Verify environment variables:
   ```bash
   gcloud run services describe olorin-backend-staging \
     --region=us-east1 \
     --project=olorin-fraud-detection \
     --format="yaml(spec.template.spec.containers[0].env)"
   ```

## Cost Estimation

| Resource | Cost | Notes |
|----------|------|-------|
| Cloud Build | $0.003/min | First 120 min/day free |
| Artifact Registry | $0.10/GB/month | Storage costs |
| Cloud Run | $0.00002400/vCPU-second | Pay per use |
| Secret Manager | $0.06/secret/month | First 6 free |

**Estimated Monthly Cost**: $20-50 (staging + low-traffic production)

## Security Best Practices

1. **Never commit secrets** - Use Secret Manager
2. **Least privilege** - Minimal IAM permissions
3. **Image scanning** - Enable vulnerability scanning in Artifact Registry
4. **Private networking** - Consider VPC connector for internal services
5. **Audit logs** - Enable Cloud Audit Logs

## Next Steps

1. Set up [Cloud Build notifications](https://cloud.google.com/build/docs/configuring-notifications) (Slack, email)
2. Configure [uptime monitoring](https://cloud.google.com/monitoring/uptime-checks)
3. Set up [error reporting](https://cloud.google.com/error-reporting)
4. Enable [Cloud Armor](https://cloud.google.com/armor) for DDoS protection

---

For questions or issues, contact the Olorin platform team.
