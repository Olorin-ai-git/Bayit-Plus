# Infrastructure Scripts

Cross-service infrastructure management scripts for deployment, secrets, and CI/CD.

---

## Table of Contents

- [Overview](#overview)
- [Directory Structure](#directory-structure)
- [Deployment Scripts](#deployment-scripts)
- [Secrets Management](#secrets-management)
- [CI/CD Scripts](#cicd-scripts)
- [Configuration](#configuration)
- [Usage Examples](#usage-examples)

---

## Overview

This directory contains scripts for cross-service infrastructure operations including:
- **Deployment scripts** - Infrastructure deployment and orchestration
- **Secrets management** - GCP Secret Manager and git-secrets configuration
- **CI/CD scripts** - Cloud Build triggers and GCS setup

**Note:** This directory structure is prepared for future infrastructure scripts. Currently no scripts exist but the organization is ready.

---

## Directory Structure

```
infrastructure/
├── README.md                          # This file
├── deployment/                        # Infrastructure deployment
│   ├── quick-deploy.sh               # Fast deployment (future)
│   ├── DEPLOY.sh                     # Production deployment (future)
│   └── VERIFY.sh                     # Deployment verification (future)
├── secrets/                           # Secret management
│   ├── setup_gcp_secrets.sh          # GCP Secret Manager setup (future)
│   ├── setup-git-secrets.sh          # Git secrets scanning (future)
│   └── retrieve-secrets.sh           # Secret retrieval (future)
└── ci/                                # CI/CD infrastructure
    ├── create-build-trigger.sh       # Cloud Build triggers (future)
    └── setup_gcs_production.sh       # GCS production setup (future)
```

---

## Deployment Scripts

### quick-deploy.sh (Future)

**Purpose:** Fast deployment across multiple services.

**Planned Features:**
- Deploy backend, web, and mobile simultaneously
- Parallel deployment with status tracking
- Automatic rollback on failure
- Slack/email notifications

**Usage:**
```bash
cd scripts/infrastructure
export DEPLOYMENT_ENV='staging'
./deployment/quick-deploy.sh
```

---

### DEPLOY.sh (Future)

**Purpose:** Production deployment with comprehensive checks (Phase 1A).

**Planned Features:**
- Pre-deployment validation
- Database backup before deploy
- Blue-green deployment strategy
- Traffic migration
- Post-deployment verification

**Environment Variables:**
- `DEPLOYMENT_REGION` - GCP region
- `DEPLOYMENT_ENV` - Environment (production/staging)
- `GCP_PROJECT_ID` - Google Cloud project ID

---

### VERIFY.sh (Future)

**Purpose:** Deployment verification and health checks (Phase 1B).

**Planned Features:**
- Endpoint health checks
- Database connectivity
- External service verification
- Performance benchmarks
- Smoke test execution

---

## Secrets Management

### setup_gcp_secrets.sh (Future)

**Purpose:** Configure GCP Secret Manager for all services.

**Planned Features:**
- Create secret definitions
- Set up secret versions
- Configure IAM permissions
- Enable secret rotation
- Setup audit logging

**Usage:**
```bash
cd scripts/infrastructure
./secrets/setup_gcp_secrets.sh
```

---

### setup-git-secrets.sh (Future)

**Purpose:** Configure git-secrets to prevent credential commits.

**Planned Features:**
- Install git-secrets hooks
- Configure secret patterns
- Add custom patterns
- Setup pre-commit validation
- Repository-wide scanning

**Usage:**
```bash
cd scripts/infrastructure
./secrets/setup-git-secrets.sh
```

---

### retrieve-secrets.sh (Future)

**Purpose:** Retrieve secrets from GCP Secret Manager for local development.

**Planned Features:**
- Fetch secrets by environment
- Create .env files
- Set file permissions (600)
- Validate secret completeness

**Usage:**
```bash
cd scripts/infrastructure
./secrets/retrieve-secrets.sh staging
```

---

## CI/CD Scripts

### create-build-trigger.sh (Future)

**Purpose:** Create Cloud Build triggers for automated deployments.

**Planned Features:**
- Create triggers for each environment
- Configure branch filters
- Setup build configuration
- Enable trigger notifications

**Usage:**
```bash
cd scripts/infrastructure
./ci/create-build-trigger.sh backend production
```

---

### setup_gcs_production.sh (Future)

**Purpose:** Configure Google Cloud Storage for production assets.

**Planned Features:**
- Create GCS buckets
- Configure CORS policies
- Setup CDN integration
- Enable versioning
- Configure lifecycle policies

**Usage:**
```bash
cd scripts/infrastructure
./ci/setup_gcs_production.sh
```

---

## Configuration

### Global Configuration

**File:** `scripts/config/monorepo-paths.env.example`

**Infrastructure Variables:**
```bash
DEPLOYMENT_REGION="${DEPLOYMENT_REGION:-us-central1}"
DEPLOYMENT_ENV="${DEPLOYMENT_ENV:-staging}"
GCP_PROJECT_ID="${GCP_PROJECT_ID:-bayit-plus}"
```

### Secrets Configuration

```bash
# GCP Secret Manager
SECRET_MANAGER_PROJECT="${GCP_PROJECT_ID}"
SECRET_VERSION="latest"

# Git Secrets
GIT_SECRETS_PATTERNS="${PROJECT_ROOT}/.git-secrets-patterns"
```

---

## Usage Examples

### Full Deployment Workflow (Future)

```bash
# 1. Setup secrets
cd scripts/infrastructure
./secrets/setup_gcp_secrets.sh

# 2. Verify environment
export DEPLOYMENT_ENV='staging'
./deployment/VERIFY.sh

# 3. Deploy all services
./deployment/quick-deploy.sh

# 4. Post-deployment verification
./deployment/VERIFY.sh
```

### CI/CD Setup (Future)

```bash
# 1. Create build triggers
cd scripts/infrastructure
./ci/create-build-trigger.sh backend staging
./ci/create-build-trigger.sh web staging
./ci/create-build-trigger.sh mobile staging

# 2. Setup GCS
./ci/setup_gcs_production.sh
```

---

## CI/CD Integration (Future)

```yaml
# .github/workflows/infrastructure-deploy.yml
- name: Deploy Infrastructure
  env:
    DEPLOYMENT_ENV: production
    GCP_PROJECT_ID: ${{ secrets.GCP_PROJECT_ID }}
  run: |
    cd scripts/infrastructure
    ./deployment/DEPLOY.sh

- name: Verify Deployment
  run: |
    cd scripts/infrastructure
    ./deployment/VERIFY.sh
```

---

## Backward Compatibility

When infrastructure scripts are added, symlinks will be created at original locations during transition period (90 days):

```bash
# Future symlinks
deployment/scripts/quick-deploy.sh → ../scripts/infrastructure/deployment/quick-deploy.sh
backend-olorin/DEPLOY.sh → ../scripts/infrastructure/deployment/DEPLOY.sh
```

---

## Contributing

### Adding New Infrastructure Scripts

1. **Determine category:** deployment, secrets, or CI
2. **Place in correct subdirectory**
3. **Follow naming conventions:** lowercase with underscores for infrastructure (`setup_gcp.sh`)
4. **Add comprehensive header documentation**
5. **Use configuration from `monorepo-paths.env`**
6. **Add to this README**

### Script Template

```bash
#!/bin/bash
# =============================================================================
# Script Name - Brief Description
# =============================================================================
#
# Purpose: Detailed purpose explanation
#
# Usage:
#   ./script_name.sh [options]
#
# Environment Variables:
#   VARIABLE_NAME    Description (default: value)
#
# Examples:
#   # Example usage
#   ./script_name.sh
#
# =============================================================================

set -e
set -u

# Source configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
source "${SCRIPT_DIR}/config/monorepo-paths.env"

# Main logic here
echo "Script functionality..."
```

---

## Questions?

- **Script Organization:** See `scripts/README.md`
- **Configuration:** See `scripts/config/monorepo-paths.env.example`
- **Monorepo Scripts:** Run `scripts/find-all-scripts.sh infrastructure`

---

## Version History

- **2026-01-23**: Initial infrastructure structure
  - Created directory organization for deployment, secrets, CI
  - Prepared for future infrastructure scripts
  - Documentation framework established
