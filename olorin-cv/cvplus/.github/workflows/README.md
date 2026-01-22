# GitHub Actions Workflows

This directory contains the CI/CD workflows for the CVPlus project.

---

## Workflow Overview

| Workflow | Type | Trigger | Duration | Purpose |
|----------|------|---------|----------|---------|
| `ci-backend.yml` | CI | Push/PR | ~8-10min | Backend quality gates |
| `deploy-backend.yml` | CD | Push to main | ~5-7min | Backend deployment |
| `ci-frontend.yml` | CI | Push/PR | ~6-8min | Frontend quality gates |
| `deploy-frontend-new.yml` | CD | Push to main | ~4-5min | Frontend deployment |

---

## When Each Workflow Runs

### Automatic Triggers

```
┌─────────────────────────────────────────────────────────────┐
│ Developer Flow                                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Developer pushes to feature branch                        │
│  └─> No workflows triggered                                │
│                                                             │
│  Developer creates PR to main/develop                      │
│  ├─> ci-backend.yml runs (if backend changes)              │
│  └─> ci-frontend.yml runs (if frontend changes)            │
│                                                             │
│  PR merged to develop                                      │
│  ├─> ci-backend.yml runs                                   │
│  └─> ci-frontend.yml runs                                  │
│                                                             │
│  PR merged to main                                         │
│  ├─> ci-backend.yml runs                                   │
│  ├─> ci-frontend.yml runs                                  │
│  ├─> deploy-backend.yml runs (after CI passes)            │
│  └─> deploy-frontend-new.yml runs (after CI passes)       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Manual Triggers

Both deployment workflows can be manually triggered via:

**GitHub UI:**
```
Actions → Select workflow → Run workflow → Choose environment
```

**GitHub CLI:**
```bash
gh workflow run deploy-backend.yml -f environment=staging
gh workflow run deploy-frontend-new.yml -f environment=production
```

---

## Workflow Details

### Backend CI (`ci-backend.yml`)

**Purpose**: Ensure backend code quality and reliability

**Jobs:**
1. **lint-and-format** - Code style validation (Black, isort, Ruff)
2. **type-check** - Static type analysis (mypy)
3. **test** - Test suite with MongoDB (87% coverage minimum)
4. **security-scan** - Vulnerability scanning (Poetry, Safety)
5. **build-docker** - Docker image build and validation

**Success Criteria:**
- ✅ No linting or formatting issues
- ✅ No type errors
- ✅ All tests pass with ≥87% coverage
- ✅ No high/critical vulnerabilities
- ✅ Docker image builds successfully

**Failure Impact:**
- ❌ PR cannot be merged (if branch protection enabled)
- ❌ Deployment is blocked

---

### Backend Deployment (`deploy-backend.yml`)

**Purpose**: Deploy backend to Google Cloud Run

**Jobs:**
1. **build-and-push** - Build Docker image and push to GCR
2. **deploy-cloud-run** - Deploy to Cloud Run with health checks
3. **health-check** - Verify deployment success
4. **rollback-preparation** - Prepare rollback instructions (on failure)

**Environments:**
- **Production**: 1-10 instances, 1Gi memory, gradual rollout
- **Staging**: 0-5 instances, 512Mi memory
- **Development**: 0-2 instances, 512Mi memory

**Success Criteria:**
- ✅ Docker image built and pushed
- ✅ Service deployed to Cloud Run
- ✅ Health check passes (/health endpoint)
- ✅ API docs accessible (/api/docs)

**On Failure:**
- 🔄 Rollback instructions generated
- 📋 Previous revisions listed

---

### Frontend CI (`ci-frontend.yml`)

**Purpose**: Ensure frontend code quality and build success

**Jobs:**
1. **install-and-cache** - Install and cache dependencies
2. **type-check** - TypeScript validation
3. **lint** - ESLint validation
4. **test** - Vitest with coverage
5. **build** - Production build with security checks

**Success Criteria:**
- ✅ TypeScript compiles without errors
- ✅ No ESLint errors
- ✅ All tests pass
- ✅ Production build succeeds
- ✅ Bundle size < 5MB
- ✅ No security issues (console, secrets, source maps)

**Failure Impact:**
- ❌ PR cannot be merged (if branch protection enabled)
- ❌ Deployment is blocked

---

### Frontend Deployment (`deploy-frontend-new.yml`)

**Purpose**: Deploy frontend to Firebase Hosting

**Jobs:**
1. **build** - Build production bundle with env config
2. **deploy** - Deploy to Firebase Hosting
3. **post-deployment** - Health checks and verification
4. **rollback-preparation** - Rollback instructions (on failure)

**Environments:**
- **Production**: https://cvplus.web.app
- **Staging**: https://cvplus-staging.web.app
- **Development**: https://cvplus-dev.web.app

**Success Criteria:**
- ✅ Production build completes
- ✅ Deployed to Firebase Hosting
- ✅ Site accessible and serving content
- ✅ Response time < 3 seconds

**On Failure:**
- 🔄 Rollback instructions generated
- 📋 Previous versions available in Firebase Console

---

## Workflow Dependencies

```
┌───────────────────────────────────────────────────────────────┐
│                     Workflow Dependencies                     │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  Backend:                                                     │
│  ┌──────────────┐       ┌──────────────┐                    │
│  │ ci-backend   │──────>│ deploy-      │                    │
│  │   .yml       │ must  │ backend.yml  │                    │
│  │              │ pass  │              │                    │
│  └──────────────┘       └──────────────┘                    │
│                                                               │
│  Frontend:                                                    │
│  ┌──────────────┐       ┌──────────────┐                    │
│  │ ci-frontend  │──────>│ deploy-      │                    │
│  │   .yml       │ must  │ frontend-    │                    │
│  │              │ pass  │ new.yml      │                    │
│  └──────────────┘       └──────────────┘                    │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

---

## Environment Variables and Secrets

### Required GitHub Secrets

**Backend:**
- `GCP_SERVICE_ACCOUNT_KEY` - GCP service account JSON key
- `GCP_PROJECT_ID_PROD` - Production GCP project ID
- `GCP_PROJECT_ID_STAGING` - Staging GCP project ID
- `GCP_PROJECT_ID_DEV` - Development GCP project ID

**Frontend:**
- `FIREBASE_TOKEN` - Firebase CI token
- `FIREBASE_PROJECT_ID_PROD` - Production Firebase project
- `FIREBASE_PROJECT_ID_STAGING` - Staging Firebase project
- `FIREBASE_PROJECT_ID_DEV` - Development Firebase project

**Optional:**
- `CODECOV_TOKEN` - Coverage reporting token

### GCP Secret Manager Secrets

Configure in Google Cloud Secret Manager:
- `JWT_SECRET_KEY` - JWT signing secret
- `MONGODB_URI` - MongoDB connection string
- `ANTHROPIC_API_KEY` - Anthropic Claude API key

---

## Monitoring and Debugging

### View Workflow Runs

**GitHub UI:**
```
Repository → Actions → Select workflow → View run
```

**GitHub CLI:**
```bash
# List recent runs
gh run list --workflow=ci-backend.yml

# View specific run
gh run view <run-id>

# View logs
gh run view <run-id> --log

# Re-run failed jobs
gh run rerun <run-id> --failed
```

### Common Issues

**CI Failures:**
```bash
# Run locally before pushing
cd python-backend && poetry run pytest --cov
cd frontend && npm run type-check && npm run lint && npm test
```

**Deployment Failures:**
```bash
# Check Cloud Run logs
gcloud run services logs read cvplus-backend --region=us-central1

# Check Firebase deployment status
firebase hosting:channel:list
```

**Secret Issues:**
```bash
# Verify secrets exist in GCP
gcloud secrets list --project=cvplus-production

# Test secret access
gcloud secrets versions access latest --secret=JWT_SECRET_KEY
```

---

## Performance Optimization

### Caching

**Backend:**
- Poetry installation cached by OS
- Python dependencies cached by `poetry.lock` hash
- Docker layers cached by default

**Frontend:**
- npm dependencies cached by `package-lock.json` hash
- node_modules shared across jobs
- Build outputs cached for deployment

### Parallelization

**Backend CI:**
```
lint-and-format ──┐
type-check       ──┼──> test ──> build-docker
security-scan   ──┘
```

**Frontend CI:**
```
type-check ──┐
lint        ──┼──> build
test        ──┘
```

---

## Security Best Practices

1. **Never commit secrets** - Always use GitHub Secrets
2. **Rotate credentials** - Update secrets quarterly
3. **Least privilege** - Service accounts with minimal permissions
4. **Scan dependencies** - Automated vulnerability detection
5. **Branch protection** - Require CI to pass before merge
6. **Audit logs** - Review who triggered deployments
7. **Container scanning** - Detect image vulnerabilities

---

## Maintenance

### Regular Updates

**Weekly:**
- Review failed workflow runs
- Check security scan results
- Monitor coverage trends

**Monthly:**
- Update GitHub Actions to latest versions
- Review caching strategies
- Optimize workflow performance

**Quarterly:**
- Update base Docker images
- Update Node.js/Python versions
- Rotate credentials and secrets
- Review and update IAM permissions

---

## Resources

- **Setup Guide**: [../docs/CI_CD_SETUP.md](../docs/CI_CD_SETUP.md)
- **Quick Start**: [../CI_CD_QUICK_START.md](../CI_CD_QUICK_START.md)
- **Implementation Summary**: [../CI_CD_IMPLEMENTATION_SUMMARY.md](../CI_CD_IMPLEMENTATION_SUMMARY.md)
- **GitHub Actions Docs**: https://docs.github.com/en/actions
- **Cloud Run Docs**: https://cloud.google.com/run/docs
- **Firebase Hosting Docs**: https://firebase.google.com/docs/hosting

---

## Support

For issues or questions:
1. Check troubleshooting section in [CI_CD_SETUP.md](../docs/CI_CD_SETUP.md)
2. Review workflow logs in GitHub Actions
3. Create an issue with `ci/cd` label

---

**Last Updated**: 2026-01-22
**Workflow Version**: 1.0.0
