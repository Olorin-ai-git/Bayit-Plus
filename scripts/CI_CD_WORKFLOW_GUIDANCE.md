# CI/CD Workflow Guidance for Script Paths

## Overview

This document provides guidance for updating CI/CD workflows when they are created to use the new monorepo-wide script organization.

---

## Script Path Updates

When creating GitHub Actions workflows, use the new script paths:

### Backend Scripts

**Old Path (if workflows existed):**
```yaml
- name: Run backend script
  run: |
    cd backend/scripts
    ./production/database/backup_database.sh
```

**New Path:**
```yaml
- name: Run backend script
  run: |
    cd scripts/backend
    ./production/database/backup_database.sh
```

---

### Web Scripts

**New Path:**
```yaml
- name: Analyze Bundle
  run: |
    cd scripts/web
    ./build/analyze-bundle.sh

- name: Verify Deployment
  env:
    DEPLOYMENT_URL: ${{ needs.deploy.outputs.url }}
  run: |
    cd scripts/web
    ./deployment/verify-deployment.sh
```

---

### Mobile Scripts (Future)

**New Path:**
```yaml
- name: Setup iOS
  run: |
    cd scripts/mobile
    ./ios/setup-xcode.sh

- name: Deploy iOS
  env:
    IOS_PROVISIONING_PROFILE: ${{ secrets.IOS_PROVISIONING_PROFILE }}
  run: |
    cd scripts/mobile
    ./ios/deploy-ios.sh
```

---

### TV Platform Scripts (Future)

**New Path:**
```yaml
- name: Package Tizen
  run: |
    cd scripts/tv-platforms
    ./tizen/package-tizen.sh

- name: Deploy to Samsung TV
  env:
    TIZEN_DEVICE_IP: ${{ secrets.TIZEN_DEVICE_IP }}
  run: |
    cd scripts/tv-platforms
    ./tizen/deploy.sh
```

---

### Infrastructure Scripts (Future)

**New Path:**
```yaml
- name: Deploy Infrastructure
  env:
    DEPLOYMENT_ENV: production
  run: |
    cd scripts/infrastructure
    ./deployment/DEPLOY.sh

- name: Verify Deployment
  run: |
    cd scripts/infrastructure
    ./deployment/VERIFY.sh
```

---

## Common Workflow Patterns

### Deployment Workflow

```yaml
name: Deploy Application

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run deployment script
        env:
          DEPLOYMENT_ENV: production
        run: |
          cd scripts/backend
          ./production/deployment/smoke_tests.sh
```

---

### Web Build and Test

```yaml
name: Web Build and Test

on:
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install dependencies
        run: |
          cd web
          npm install

      - name: Build application
        run: |
          cd web
          npm run build

      - name: Analyze bundle
        run: |
          cd scripts/web
          ./build/analyze-bundle.sh

      - name: Check bundle size
        run: |
          cd scripts/web
          node build/check-bundle-size.cjs
```

---

### Backend Testing

```yaml
name: Backend Tests

on:
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install Poetry
        run: pip install poetry

      - name: Install dependencies
        run: |
          cd backend
          poetry install

      - name: Run tests
        run: |
          cd backend
          poetry run pytest

      - name: Run smoke tests
        env:
          SERVICE_URL: http://localhost:8000
        run: |
          cd scripts/backend
          ./production/deployment/smoke_tests.sh
```

---

## Environment Variables

All scripts expect configuration via environment variables. Set these in GitHub Secrets:

### Backend
- `MONGODB_URL` - MongoDB connection string
- `BACKUP_ENCRYPTION_KEY` - Database backup encryption key
- `ADMIN_EMAIL` - Admin credentials for audit scripts
- `ADMIN_PASSWORD` - Admin password

### Web
- `DEPLOYMENT_URL` - Web application URL for verification
- `PERCY_TOKEN` - Percy API token for visual regression

### Mobile
- `IOS_PROVISIONING_PROFILE` - iOS provisioning profile
- `ANDROID_KEYSTORE_PATH` - Android signing keystore

### Infrastructure
- `GCP_PROJECT_ID` - Google Cloud project ID
- `DEPLOYMENT_REGION` - Deployment region
- `DEPLOYMENT_ENV` - Environment (production/staging)

---

## Backward Compatibility

During the 90-day transition period, workflows can still use old paths via symlinks:

```yaml
# Still works via symlink
- name: Run script (old path)
  run: |
    cd backend/scripts
    ./production/database/backup_database.sh
```

However, **new workflows should use the new paths** under `scripts/`.

---

## Script Discovery in Workflows

Use the discovery utility to find scripts:

```yaml
- name: Find and run deployment script
  run: |
    cd scripts
    ./find-all-scripts.sh backend deploy
```

---

## Validation

Before merging workflow changes:

1. **Test locally** using act or similar tools
2. **Verify script paths** exist and are executable
3. **Check environment variables** are set
4. **Run dry-run mode** for data-modifying scripts

---

## Future Workflow Creation Checklist

When creating new workflows:

- [ ] Use `scripts/` directory paths (not old locations)
- [ ] Set required environment variables
- [ ] Use configuration from secrets/variables
- [ ] Include error handling
- [ ] Add status notifications
- [ ] Test in staging before production
- [ ] Document in this guide

---

## Questions?

- **Script Organization:** See `scripts/README.md`
- **Platform Scripts:** See platform-specific READMEs
- **Configuration:** See `scripts/config/monorepo-paths.env.example`
- **Script Discovery:** Run `scripts/find-all-scripts.sh`

---

## Status

**Current State:** No GitHub Actions workflows found in repository
**Action Required:** When workflows are created, use paths documented in this guide
**Transition Period:** 90 days from 2026-01-23 (symlinks available until Q2 2026)
