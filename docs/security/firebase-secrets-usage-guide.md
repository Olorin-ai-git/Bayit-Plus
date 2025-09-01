# Firebase Secret Manager Usage Guide

## Overview

This guide provides comprehensive instructions for using the Firebase Secret Manager integration in the Olorin project. The system provides centralized secret management across all services: backend (olorin-server), frontend (olorin-front), web portal (olorin-web-portal), and Docker environments.

## Table of Contents

1. [Architecture](#architecture)
2. [Backend Usage](#backend-usage-olorin-server)
3. [Frontend Usage](#frontend-usage)
4. [Docker Integration](#docker-integration)
5. [Local Development](#local-development)
6. [Production Deployment](#production-deployment)
7. [Troubleshooting](#troubleshooting)

## Architecture

```
Firebase Secret Manager (olorin-ai project)
    │
    ├── Backend (Python)
    │   ├── SecretManagerClient
    │   ├── ConfigLoader
    │   └── Auto-injection at startup
    │
    ├── Frontend (React)
    │   ├── Build-time injection
    │   └── Environment variables
    │
    └── Docker
        ├── Runtime secrets
        └── docker-compose integration
```

## Backend Usage (olorin-server)

### Automatic Secret Loading

Secrets are automatically loaded when the application starts. The system follows this priority:

1. Environment variable override (for local development)
2. Firebase Secret Manager (environment-specific)
3. Firebase Secret Manager (base/shared)
4. Default values (if configured)

### Python Code Examples

```python
# The configuration is automatically enhanced with secrets
from app.service.config import get_settings_for_env

config = get_settings_for_env()
# Secrets are already loaded
api_key = config.anthropic_api_key
db_password = config.database_password
```

### Direct Secret Access

```python
from app.service.secret_manager import get_secret_manager

secret_manager = get_secret_manager()

# Get a specific secret
api_key = secret_manager.get_secret("olorin/anthropic_api_key")

# Get with fallback
api_key = secret_manager.get_secret_with_fallback(
    "olorin/anthropic_api_key",
    env_var="ANTHROPIC_API_KEY",
    default="default_key"
)
```

### Environment-Specific Secrets

Secrets follow this naming convention:
```
{environment}/olorin/{service}/{secret_name}

Examples:
- production/olorin/server/database_password
- staging/olorin/server/jwt_secret_key
- development/olorin/server/anthropic_api_key
```

## Frontend Usage

### Setup for olorin-front

1. **Initial Setup** (one-time):
```bash
./scripts/frontend-secrets-setup.sh
```

2. **Automatic Loading**:
   - Secrets are loaded automatically before `npm start` and `npm build`
   - Creates `.env.local` with secrets from Firebase

3. **Manual Loading**:
```bash
cd olorin-front
npm run load-secrets
```

### Setup for olorin-web-portal

1. **Initial Setup** (one-time):
```bash
./scripts/frontend-secrets-setup.sh
```

2. **Usage**:
```bash
cd olorin-web-portal
npm run load-secrets  # Manual load
npm start            # Auto-loads secrets
npm build            # Auto-loads secrets
```

### Available Frontend Secrets

**olorin-front**:
- `REACT_APP_API_BASE_URL`
- `REACT_APP_WEBSOCKET_URL`
- `REACT_APP_GOOGLE_MAPS_API_KEY`
- `REACT_APP_GAIA_API_KEY`

**olorin-web-portal**:
- `REACT_APP_EMAILJS_PUBLIC_KEY`
- `REACT_APP_API_BASE_URL`
- `REACT_APP_GOOGLE_ANALYTICS_ID`

## Docker Integration

### Loading Secrets for Docker

1. **Generate Docker secrets file**:
```bash
./scripts/docker-secrets-loader.sh --env production
```

2. **Start services with secrets**:
```bash
docker-compose -f docker-compose.yml -f docker-compose.secrets.yml up
```

### Docker Environment Variables

The script generates `.env.docker.secrets` with:
- Database credentials
- Redis password
- JWT configuration
- API keys
- Service configurations

## Local Development

### Setup Requirements

1. **Install Google Cloud SDK**:
```bash
# macOS
brew install google-cloud-sdk

# Linux/WSL
curl https://sdk.cloud.google.com | bash
```

2. **Authenticate**:
```bash
gcloud auth application-default login
gcloud config set project olorin-ai
```

3. **Set Environment Variables** (optional overrides):
```bash
export FIREBASE_PROJECT_ID=olorin-ai
export APP_ENV=development
export ANTHROPIC_API_KEY=your_local_key  # Override for local testing
```

### Using .env Files

Create `.env` files for local development:

```bash
# olorin-server/.env
APP_ENV=local
ANTHROPIC_API_KEY=your_key
DB_PASSWORD=local_password
JWT_SECRET_KEY=local_secret

# These override Firebase Secret Manager
```

## Production Deployment

### CI/CD Integration

**GitHub Actions Example**:
```yaml
- name: Authenticate to Google Cloud
  uses: google-github-actions/auth@v1
  with:
    credentials_json: ${{ secrets.GCP_SERVICE_ACCOUNT_KEY }}

- name: Load secrets and deploy
  run: |
    ./scripts/docker-secrets-loader.sh --env production
    docker-compose -f docker-compose.yml -f docker-compose.secrets.yml up -d
```

### Service Account Setup

1. **Create Service Account**:
```bash
gcloud iam service-accounts create olorin-secrets-reader \
  --description="Service account for reading secrets" \
  --display-name="Olorin Secrets Reader"
```

2. **Grant Permissions**:
```bash
gcloud projects add-iam-policy-binding olorin-ai \
  --member="serviceAccount:olorin-secrets-reader@olorin-ai.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

3. **Download Key**:
```bash
gcloud iam service-accounts keys create service-account.json \
  --iam-account=olorin-secrets-reader@olorin-ai.iam.gserviceaccount.com
```

## Secret Management

### Creating New Secrets

```bash
# Create a new secret
echo -n "secret_value" | gcloud secrets create olorin/new_secret --data-file=-

# Create environment-specific secret
echo -n "prod_value" | gcloud secrets create production/olorin/server/new_secret --data-file=-
```

### Updating Secrets

```bash
# Add new version
echo -n "new_value" | gcloud secrets versions add olorin/existing_secret --data-file=-
```

### Listing Secrets

```bash
# List all secrets
gcloud secrets list --project=olorin-ai

# List versions
gcloud secrets versions list olorin/database_password
```

## Troubleshooting

### Common Issues

**1. Permission Denied**
```bash
# Check authentication
gcloud auth application-default print-access-token

# Re-authenticate
gcloud auth application-default login
```

**2. Secret Not Found**
```bash
# Verify secret exists
gcloud secrets describe olorin/secret_name --project=olorin-ai

# Check naming convention
# Should be: {env}/olorin/{service}/{secret_name}
```

**3. Frontend Secrets Not Loading**
```bash
# Check Node.js packages
npm list -g @google-cloud/secret-manager

# Install if missing
npm install -g @google-cloud/secret-manager
```

**4. Docker Secrets Issues**
```bash
# Verify environment
echo $FIREBASE_PROJECT_ID
echo $APP_ENV

# Check generated file
cat .env.docker.secrets
```

### Debug Mode

Enable debug logging:
```bash
# Backend
export LOG_LEVEL=DEBUG

# Frontend
export DEBUG=secret-loader

# Docker
./scripts/docker-secrets-loader.sh --env development --debug
```

### Health Check Script

```bash
#!/bin/bash
# scripts/check-secrets-health.sh

echo "Checking Secret Manager connectivity..."
gcloud secrets list --limit=1 --project=olorin-ai

echo "Testing secret access..."
gcloud secrets versions access latest \
  --secret="olorin/app_secret" \
  --project=olorin-ai > /dev/null

if [ $? -eq 0 ]; then
  echo "✅ Secret Manager is accessible"
else
  echo "❌ Cannot access Secret Manager"
fi
```

## Security Best Practices

1. **Never commit secrets** to version control
2. **Use environment-specific secrets** for different environments
3. **Rotate secrets regularly** (every 90 days)
4. **Limit access** using IAM roles
5. **Audit secret access** through Cloud Logging
6. **Use service accounts** for applications
7. **Enable secret versioning** for rollback capability

## Migration Checklist

- [ ] Google Cloud SDK installed
- [ ] Authentication configured
- [ ] Service account created
- [ ] Secrets created in Firebase Secret Manager
- [ ] Backend integration tested
- [ ] Frontend scripts configured
- [ ] Docker integration working
- [ ] CI/CD pipeline updated
- [ ] Team trained on new procedures
- [ ] Documentation reviewed

## Support

For issues or questions:
1. Check this documentation
2. Review error logs
3. Contact the DevOps team
4. File an issue in the project repository