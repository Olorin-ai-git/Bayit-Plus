# CI/CD Pipeline Setup Guide

This document provides comprehensive instructions for setting up and configuring the CI/CD pipelines for the CVPlus project.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [GitHub Secrets Configuration](#github-secrets-configuration)
- [Backend CI/CD](#backend-cicd)
- [Frontend CI/CD](#frontend-cicd)
- [Workflow Details](#workflow-details)
- [Troubleshooting](#troubleshooting)

---

## Overview

CVPlus uses GitHub Actions for continuous integration and deployment across two main components:

- **Backend**: Python FastAPI application deployed to Google Cloud Run
- **Frontend**: React/Vite application deployed to Firebase Hosting

### Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci-backend.yml` | Push/PR to main/develop | Lint, type-check, test backend with coverage |
| `deploy-backend.yml` | Push to main | Build Docker image and deploy to Cloud Run |
| `ci-frontend.yml` | Push/PR to main/develop | Type-check, lint, test, build frontend |
| `deploy-frontend-new.yml` | Push to main | Build and deploy to Firebase Hosting |

---

## Prerequisites

### Required Tools

- GitHub repository with Actions enabled
- Google Cloud Platform account with billing enabled
- Firebase project created
- Docker installed locally (for testing)

### Required Permissions

- **GitHub**: Admin access to repository settings
- **GCP**: Owner or Editor role on target projects
- **Firebase**: Owner or Editor role on Firebase projects

---

## GitHub Secrets Configuration

Navigate to your GitHub repository → Settings → Secrets and variables → Actions → New repository secret.

### Backend Secrets

#### Google Cloud Platform

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `GCP_SERVICE_ACCOUNT_KEY` | GCP service account JSON key | `{"type": "service_account", ...}` |
| `GCP_PROJECT_ID_PROD` | Production GCP project ID | `cvplus-production` |
| `GCP_PROJECT_ID_STAGING` | Staging GCP project ID | `cvplus-staging` |
| `GCP_PROJECT_ID_DEV` | Development GCP project ID | `cvplus-dev` |

#### Google Cloud Secrets (Stored in Secret Manager)

These should be configured in Google Cloud Secret Manager for each environment:

- `JWT_SECRET_KEY` - JWT signing secret (32+ character random string)
- `MONGODB_URI` - MongoDB connection string
- `ANTHROPIC_API_KEY` - Anthropic Claude API key

**To create secrets in Secret Manager:**

```bash
# Production
gcloud secrets create JWT_SECRET_KEY \
  --project=cvplus-production \
  --replication-policy="automatic" \
  --data-file=- <<< "your-jwt-secret-key"

gcloud secrets create MONGODB_URI \
  --project=cvplus-production \
  --replication-policy="automatic" \
  --data-file=- <<< "mongodb+srv://user:pass@cluster.mongodb.net/cvplus"

gcloud secrets create ANTHROPIC_API_KEY \
  --project=cvplus-production \
  --replication-policy="automatic" \
  --data-file=- <<< "sk-ant-..."

# Repeat for staging and development projects
```

#### Service Account Setup

Create a service account for Cloud Run deployment:

```bash
# Create service account
gcloud iam service-accounts create cvplus-backend \
  --display-name="CVPlus Backend Service Account" \
  --project=cvplus-production

# Grant necessary permissions
gcloud projects add-iam-policy-binding cvplus-production \
  --member="serviceAccount:cvplus-backend@cvplus-production.iam.gserviceaccount.com" \
  --role="roles/run.invoker"

gcloud projects add-iam-policy-binding cvplus-production \
  --member="serviceAccount:cvplus-backend@cvplus-production.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Create and download key
gcloud iam service-accounts keys create key.json \
  --iam-account=cvplus-backend@cvplus-production.iam.gserviceaccount.com

# Copy key.json content to GCP_SERVICE_ACCOUNT_KEY secret
```

### Frontend Secrets

#### Firebase

| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `FIREBASE_TOKEN` | Firebase CI token | Run `firebase login:ci` |
| `FIREBASE_PROJECT_ID_PROD` | Production Firebase project | From Firebase Console |
| `FIREBASE_PROJECT_ID_STAGING` | Staging Firebase project | From Firebase Console |
| `FIREBASE_PROJECT_ID_DEV` | Development Firebase project | From Firebase Console |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase service account JSON | From Firebase Console → Project Settings → Service Accounts |

**To get Firebase CI token:**

```bash
firebase login:ci
# Copy the token displayed and add to GitHub Secrets as FIREBASE_TOKEN
```

### Optional Secrets

| Secret Name | Description | Required For |
|-------------|-------------|--------------|
| `CODECOV_TOKEN` | Codecov upload token | Coverage reports |
| `SLACK_WEBHOOK_URL` | Slack notification webhook | Deployment notifications |
| `DISCORD_WEBHOOK_URL` | Discord notification webhook | Deployment notifications |

---

## Backend CI/CD

### CI Pipeline (`ci-backend.yml`)

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`
- Changes in `python-backend/**`

**Jobs:**

1. **Lint and Format Check**
   - Black format validation
   - isort import ordering
   - Ruff linting

2. **Type Checking**
   - mypy static type analysis

3. **Test Suite**
   - Runs pytest with MongoDB service container
   - Generates coverage reports
   - Enforces 87% minimum coverage
   - Uploads to Codecov

4. **Security Scan**
   - Poetry dependency audit
   - Safety vulnerability scanning

5. **Docker Build**
   - Builds production Docker image
   - Validates container startup
   - Health check verification

**Success Criteria:**
- All linting and formatting checks pass
- Type checking passes with no errors
- Test coverage ≥ 87%
- No high/critical security vulnerabilities
- Docker image builds and starts successfully

### Deployment Pipeline (`deploy-backend.yml`)

**Triggers:**
- Push to `main` branch (after CI passes)
- Manual workflow dispatch with environment selection

**Jobs:**

1. **Build and Push**
   - Builds Docker image with multi-stage optimization
   - Tags with timestamp and git SHA
   - Pushes to Google Container Registry (GCR)

2. **Deploy to Cloud Run**
   - Deploys to Google Cloud Run
   - Configures auto-scaling (0-10 instances for production)
   - Sets environment variables and secrets
   - Implements gradual traffic rollout (production only)

3. **Health Check**
   - Waits for deployment propagation
   - Verifies health endpoint
   - Checks API documentation accessibility

4. **Rollback Preparation**
   - Generates rollback instructions (on failure)
   - Lists previous revisions

**Environment Configuration:**

| Environment | Min Instances | Max Instances | Memory | CPU |
|-------------|---------------|---------------|--------|-----|
| Production | 1 | 10 | 1Gi | 1 |
| Staging | 0 | 5 | 512Mi | 1 |
| Development | 0 | 2 | 512Mi | 1 |

---

## Frontend CI/CD

### CI Pipeline (`ci-frontend.yml`)

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`
- Changes in `frontend/**`

**Jobs:**

1. **Install and Cache**
   - Installs npm dependencies
   - Caches node_modules for subsequent jobs

2. **Type Check**
   - Runs TypeScript compiler in check mode
   - Ensures type safety

3. **Lint**
   - Runs ESLint with project configuration
   - Enforces code quality standards

4. **Test**
   - Runs Vitest with coverage
   - Uploads coverage to Codecov

5. **Build**
   - Builds production bundle with Vite
   - Analyzes bundle size (5MB threshold)
   - Scans for security issues (console statements, source maps, secrets)
   - Uploads build artifacts

**Success Criteria:**
- TypeScript compilation succeeds
- No ESLint errors
- All tests pass
- Production build completes
- Bundle size < 5MB
- No security issues in build output

### Deployment Pipeline (`deploy-frontend-new.yml`)

**Triggers:**
- Push to `main` branch
- Manual workflow dispatch with environment selection

**Jobs:**

1. **Build**
   - Builds optimized production bundle
   - Configures environment variables
   - Analyzes bundle size
   - Uploads build artifacts

2. **Deploy to Firebase Hosting**
   - Downloads build artifacts
   - Authenticates with Firebase
   - Deploys to Firebase Hosting
   - Gets deployment URL

3. **Post-Deployment Verification**
   - Waits for CDN propagation
   - Health check on live URL
   - Content verification
   - Performance check (< 3s response time)

4. **Rollback Preparation**
   - Generates rollback instructions (on failure)

**Environment URLs:**

| Environment | URL |
|-------------|-----|
| Production | `https://cvplus.web.app` |
| Staging | `https://cvplus-staging.web.app` |
| Development | `https://cvplus-dev.web.app` |

---

## Workflow Details

### Caching Strategy

**Backend:**
- Poetry installation cached per OS
- Python dependencies cached by `poetry.lock` hash
- Speeds up subsequent builds by 2-3 minutes

**Frontend:**
- npm dependencies cached by `package-lock.json` hash
- node_modules shared across jobs
- Reduces install time by 1-2 minutes

### Parallel Execution

Jobs run in parallel when possible to minimize CI time:

- **Backend CI**: Lint, type-check, and security-scan run in parallel after dependency installation
- **Frontend CI**: Type-check, lint, and test run in parallel after dependency installation

### Artifact Management

**Retention Periods:**
- Build artifacts: 7 days
- Coverage reports: 30 days
- Security reports: 30 days
- Deployment metadata: 90 days

### Deployment Strategies

#### Backend (Cloud Run)

**Production Deployment:**
1. Build and push Docker image
2. Deploy new revision with 10% traffic
3. Monitor metrics for 5 minutes
4. Gradually increase to 100% (manual)

**Rollback:**
```bash
# List revisions
gcloud run revisions list --service=cvplus-backend --region=us-central1

# Rollback
gcloud run services update-traffic cvplus-backend \
  --to-revisions=PREVIOUS_REVISION=100 \
  --region=us-central1
```

#### Frontend (Firebase Hosting)

**Deployment:**
- Atomic deployment (all or nothing)
- Previous versions automatically retained
- Instant rollback capability

**Rollback:**
```bash
# Via CLI
firebase hosting:rollback --project=cvplus-production

# Via Console
# Firebase Console → Hosting → Release History → Rollback
```

---

## Troubleshooting

### Common Issues

#### Backend

**Issue: Coverage below 87%**
```
Solution: Add more tests or adjust coverage threshold in workflow
```

**Issue: Docker build fails**
```
Check:
1. Poetry dependencies resolve correctly
2. Dockerfile syntax is valid
3. Base image is accessible
```

**Issue: Cloud Run deployment fails**
```
Verify:
1. GCP service account has correct permissions
2. Secret Manager secrets exist and are accessible
3. Cloud Run API is enabled
4. Service account email matches deployment configuration
```

**Issue: Health check fails**
```
Debug:
1. Check Cloud Run logs: gcloud run services logs read cvplus-backend
2. Verify health endpoint: curl SERVICE_URL/health
3. Check environment variables are set correctly
```

#### Frontend

**Issue: Build fails**
```
Check:
1. TypeScript errors: npm run type-check
2. Missing dependencies: npm ci
3. Environment variables are set
```

**Issue: Firebase deployment fails**
```
Verify:
1. FIREBASE_TOKEN is valid
2. Firebase project ID is correct
3. firebase.json configuration is valid
4. Build artifacts exist in dist/ directory
```

**Issue: Bundle size exceeds threshold**
```
Optimize:
1. Analyze bundle: npm run build -- --analyze
2. Check for large dependencies
3. Implement code splitting
4. Enable tree shaking
```

### Debugging Workflows

**View Workflow Logs:**
```
GitHub → Actions → Select workflow run → View job logs
```

**Re-run Failed Jobs:**
```
GitHub → Actions → Select workflow run → Re-run failed jobs
```

**Test Locally:**

**Backend:**
```bash
cd python-backend
poetry install
poetry run pytest --cov
docker build -t cvplus-backend:test .
docker run -p 8080:8080 cvplus-backend:test
```

**Frontend:**
```bash
cd frontend
npm ci
npm run type-check
npm run lint
npm run test
npm run build
```

### Getting Help

**Workflow Syntax Issues:**
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Workflow Syntax Reference](https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions)

**GCP/Cloud Run Issues:**
- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- Check Cloud Run logs in GCP Console

**Firebase Issues:**
- [Firebase Hosting Documentation](https://firebase.google.com/docs/hosting)
- Check Firebase Console for deployment status

---

## Maintenance

### Regular Tasks

**Weekly:**
- Review failed workflow runs
- Check security scan results
- Monitor coverage trends

**Monthly:**
- Update GitHub Actions to latest versions
- Review and optimize caching strategies
- Audit secrets and rotate if necessary

**Quarterly:**
- Update base Docker images
- Review and update Node.js/Python versions
- Audit IAM permissions

### Updates

**Updating Python Version:**
1. Update `PYTHON_VERSION` in `.github/workflows/ci-backend.yml`
2. Update `pyproject.toml` Python requirement
3. Update Dockerfile base image
4. Test locally before committing

**Updating Node.js Version:**
1. Update `NODE_VERSION` in `.github/workflows/ci-frontend.yml`
2. Update `.nvmrc` if present
3. Test locally before committing

---

## Security Best Practices

1. **Never commit secrets** - Use GitHub Secrets or Secret Manager
2. **Rotate credentials regularly** - At least quarterly
3. **Use least privilege** - Service accounts should have minimal required permissions
4. **Enable branch protection** - Require PR reviews and status checks
5. **Monitor workflow runs** - Set up notifications for failures
6. **Audit access logs** - Review who triggered deployments
7. **Use dependabot** - Enable automatic dependency updates
8. **Scan for vulnerabilities** - Review security scan results

---

## Performance Optimization

### Backend

- Use multi-stage Docker builds
- Minimize image layers
- Cache Poetry dependencies
- Enable Cloud Run CPU allocation (only during request)

### Frontend

- Enable code splitting
- Optimize images and assets
- Use CDN caching headers
- Minimize bundle size with tree shaking

---

## Monitoring

### Backend Metrics

Monitor in GCP Console:
- Request count
- Response time (p50, p95, p99)
- Error rate
- Instance count
- Memory/CPU usage

### Frontend Metrics

Monitor in Firebase Console:
- Page views
- Load time
- Error rates
- Geographic distribution

### Alerts

Set up alerts for:
- Deployment failures
- High error rates (> 1%)
- Slow response times (> 1s p95)
- High instance count (> 80% max)

---

## Badge Configuration

Add these badges to your README.md:

```markdown
[![Backend CI](https://github.com/YOUR_ORG/cvplus/workflows/Backend%20CI/badge.svg)](https://github.com/YOUR_ORG/cvplus/actions/workflows/ci-backend.yml)
[![Frontend CI](https://github.com/YOUR_ORG/cvplus/workflows/Frontend%20CI/badge.svg)](https://github.com/YOUR_ORG/cvplus/actions/workflows/ci-frontend.yml)
[![codecov](https://codecov.io/gh/YOUR_ORG/cvplus/branch/main/graph/badge.svg)](https://codecov.io/gh/YOUR_ORG/cvplus)
```

---

## Appendix

### Example Service Account Permissions

**Backend Service Account:**
```
roles/run.invoker
roles/secretmanager.secretAccessor
roles/cloudsql.client (if using Cloud SQL)
roles/storage.objectViewer (if accessing GCS)
```

**Deployment Service Account (GitHub Actions):**
```
roles/run.admin
roles/iam.serviceAccountUser
roles/storage.admin
roles/secretmanager.admin
```

### Environment Variable Reference

**Backend:**
```bash
APP_ENV=production|staging|development
PORT=8080
JWT_SECRET_KEY=<secret>
JWT_EXPIRY_HOURS=24
MONGODB_URI=<connection-string>
ANTHROPIC_API_KEY=<api-key>
```

**Frontend:**
```bash
VITE_APP_ENV=production|staging|development
VITE_FIREBASE_PROJECT_ID=<project-id>
VITE_FIREBASE_API_KEY=<api-key>
VITE_FIREBASE_AUTH_DOMAIN=<auth-domain>
```

---

**Last Updated**: 2026-01-22
**Document Version**: 1.0.0
