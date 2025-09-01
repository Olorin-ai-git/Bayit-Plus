# Firebase Secrets Manager User Guide

## Overview

This guide explains how to set, manage, and use secrets in the Olorin platform with the new Firebase Secret Manager integration. The system provides secure, centralized secret management with environment-specific configurations and automatic fallback mechanisms.

> **Important:** Firebase Secret Manager uses Google Cloud Secret Manager under the hood. You can use either `firebase functions:secrets:set` or `gcloud secrets` commands. All secret names must be in UPPER_SNAKE_CASE format.

## Quick Start

For a quick setup, run the helper script:
```bash
./scripts/set-firebase-secrets.sh
```

Or manually set your first secret:
```bash
# Using Firebase CLI
firebase functions:secrets:set ANTHROPIC_API_KEY

# Using Google Cloud SDK  
echo -n "sk-ant-api03-..." | gcloud secrets create ANTHROPIC_API_KEY \
    --data-file=- --project=olorin-ai
```

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Setting Secrets](#setting-secrets)
3. [Secret Naming Convention](#secret-naming-convention)
4. [Required Secrets](#required-secrets)
5. [Using Secrets in Different Environments](#using-secrets-in-different-environments)
6. [Verification and Testing](#verification-and-testing)
7. [Troubleshooting](#troubleshooting)
8. [Security Best Practices](#security-best-practices)

## Prerequisites

Before working with secrets, ensure you have:

1. **Firebase CLI installed:**
   ```bash
   npm install -g firebase-tools
   ```

2. **Google Cloud SDK installed:**
   ```bash
   # macOS
   brew install google-cloud-sdk
   
   # Or download from https://cloud.google.com/sdk/docs/install
   ```

3. **Authentication configured:**
   ```bash
   # Authenticate with Firebase
   firebase login
   
   # Authenticate with Google Cloud
   gcloud auth application-default login
   
   # Set the project
   gcloud config set project olorin-ai
   ```

4. **Proper IAM permissions:**
   ```bash
   # Run the setup script to configure service accounts
   ./scripts/gcp-service-account-setup.sh
   ```

## Setting Secrets

### Method 1: Firebase Secret Manager (Production Recommended)

You can use either Firebase CLI or Google Cloud SDK to manage secrets:

#### Option A: Using Firebase CLI

```bash
# Set a shared secret (used across all environments)
firebase functions:secrets:set ANTHROPIC_API_KEY

# Set an environment-specific secret (use prefix in the name)
firebase functions:secrets:set PRODUCTION_DATABASE_PASSWORD
firebase functions:secrets:set STAGING_DATABASE_PASSWORD

# The CLI will prompt you to enter the secret value securely
```

#### Option B: Using Google Cloud SDK

```bash
# Create a new secret
echo -n "your-secret-value" | gcloud secrets create ANTHROPIC_API_KEY \
    --data-file=- \
    --project=olorin-ai

# Create an environment-specific secret
echo -n "your-password" | gcloud secrets create PRODUCTION_DATABASE_PASSWORD \
    --data-file=- \
    --project=olorin-ai

# Update an existing secret with a new version
echo -n "new-secret-value" | gcloud secrets versions add ANTHROPIC_API_KEY \
    --data-file=- \
    --project=olorin-ai
```

#### Setting Multiple Secrets

```bash
# Set multiple secrets in sequence
firebase functions:secrets:set PRODUCTION_JWT_SECRET_KEY
firebase functions:secrets:set PRODUCTION_REDIS_PASSWORD
firebase functions:secrets:set SPLUNK_USERNAME
firebase functions:secrets:set SPLUNK_PASSWORD
```

#### Setting Secrets from a File

```bash
# For sensitive keys like private keys
echo "your-private-key-content" > /tmp/private_key.txt
firebase functions:secrets:set SNOWFLAKE_PRIVATE_KEY < /tmp/private_key.txt
rm /tmp/private_key.txt  # Clean up immediately
```

### Method 2: Environment Variables (Development Only)

For local development, you can use environment variables as a fallback:

#### Option A: Export in Shell

```bash
# Set environment variables in your current shell
export DB_PASSWORD="your_local_password"
export JWT_SECRET_KEY="your_local_jwt_secret"
export ANTHROPIC_API_KEY="sk-ant-..."
export OPENAI_API_KEY="sk-..."
export REDIS_PASSWORD="your_redis_password"

# Start the service
poetry run python -m app.local_server
```

#### Option B: Create .env File

Create a `.env` file in the `olorin-server` directory:

```env
# olorin-server/.env
APP_ENV=development
DB_PASSWORD=your_local_password
JWT_SECRET_KEY=your_local_jwt_secret_minimum_32_chars
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GAIA_API_KEY=your_gaia_key
OLORIN_API_KEY=your_olorin_key
REDIS_PASSWORD=your_redis_password
```

### Method 3: Using Setup Scripts

#### Frontend Applications

The frontend applications need secrets at build time. Use the provided loader script:

```bash
# For olorin-front
cd olorin-front
node ../scripts/load-secrets.js olorin-front production

# For olorin-web-portal
cd olorin-web-portal
node ../scripts/load-secrets.js olorin-web-portal production

# For development environment
node ../scripts/load-secrets.js olorin-front development
```

This creates a `.env.local` file with the necessary secrets for the React build process.

#### Docker Deployments

For Docker containers, use the Docker secrets loader:

```bash
# Load secrets for production Docker deployment
./scripts/docker-secrets-loader.sh production

# Load secrets for staging
./scripts/docker-secrets-loader.sh staging

# This creates .env.docker.secrets with proper permissions (600)
```

## Secret Naming Convention

Firebase Secret Manager requires secrets to be in UPPER_SNAKE_CASE format.

### Environment-Specific Secrets

Format: `{ENVIRONMENT}_{SECRET_NAME}`

Examples:
- `PRODUCTION_DATABASE_PASSWORD`
- `STAGING_JWT_SECRET_KEY`
- `DEVELOPMENT_REDIS_PASSWORD`

### Shared Secrets

Format: `{SECRET_NAME}`

Examples:
- `ANTHROPIC_API_KEY` (same API key across environments)
- `OPENAI_API_KEY`
- `GAIA_API_KEY`

### Frontend-Specific Secrets

Format: `{ENVIRONMENT}_{PROJECT}_{SECRET_NAME}`

Examples:
- `PRODUCTION_OLORIN_FRONT_API_BASE_URL`
- `PRODUCTION_WEB_PORTAL_EMAILJS_PUBLIC_KEY`

## Required Secrets

### Critical Secrets (Required for Production)

These secrets will cause the application to fail at startup if missing in production:

| Firebase Secret Name | Environment Variable | Description | Required In |
|---------------------|---------------------|-------------|-------------|
| `PRODUCTION_DATABASE_PASSWORD` | `DB_PASSWORD` | MySQL/PostgreSQL password | Production |
| `STAGING_DATABASE_PASSWORD` | `DB_PASSWORD` | MySQL/PostgreSQL password | Staging |
| `PRODUCTION_JWT_SECRET_KEY` | `JWT_SECRET_KEY` | JWT signing key (min 32 chars) | Production |
| `STAGING_JWT_SECRET_KEY` | `JWT_SECRET_KEY` | JWT signing key (min 32 chars) | Staging |

### API Keys

| Firebase Secret Name | Environment Variable | Description | Required In |
|---------------------|---------------------|-------------|-------------|
| `ANTHROPIC_API_KEY` | `ANTHROPIC_API_KEY` | Claude API access | All environments |
| `OPENAI_API_KEY` | `OPENAI_API_KEY` | OpenAI GPT access | All environments |
| `GAIA_API_KEY` | `GAIA_API_KEY` | GAIA service integration | Production |
| `OLORIN_API_KEY` | `OLORIN_API_KEY` | Internal API authentication | Production |
| `DATABRICKS_TOKEN` | `DATABRICKS_TOKEN` | Databricks workspace access | Production |

### Service Credentials

| Firebase Secret Name | Environment Variable | Description | Required In |
|---------------------|---------------------|-------------|-------------|
| `PRODUCTION_REDIS_PASSWORD` | `REDIS_PASSWORD` | Redis cache password | Production |
| `STAGING_REDIS_PASSWORD` | `REDIS_PASSWORD` | Redis cache password | Staging |
| `SPLUNK_USERNAME` | `SPLUNK_USERNAME` | Splunk integration user | Production |
| `SPLUNK_PASSWORD` | `SPLUNK_PASSWORD` | Splunk integration password | Production |
| `SNOWFLAKE_ACCOUNT` | `SNOWFLAKE_ACCOUNT` | Snowflake account ID | Production |
| `SNOWFLAKE_USER` | `SNOWFLAKE_USER` | Snowflake username | Production |
| `SNOWFLAKE_PASSWORD` | `SNOWFLAKE_PASSWORD` | Snowflake password | Production |
| `SNOWFLAKE_PRIVATE_KEY` | `SNOWFLAKE_PRIVATE_KEY` | Snowflake private key | Production |

### Frontend Secrets

| Secret Name | Project | Description |
|------------|---------|-------------|
| `api_base_url` | olorin-front | Backend API URL |
| `websocket_url` | olorin-front | WebSocket server URL |
| `google_maps_api_key` | olorin-front | Google Maps integration |
| `emailjs_public_key` | olorin-web-portal | Email service key |

## Using Secrets in Different Environments

### Local Development

```bash
# Set environment to local
export APP_ENV=local

# Secrets will be loaded in this order:
# 1. Environment variables
# 2. .env file
# 3. Generated defaults (for non-critical secrets only)

poetry run python -m app.local_server
```

### Staging Environment

```bash
# Set environment to staging
export APP_ENV=staging

# Set staging-specific secrets
firebase functions:secrets:set STAGING_DATABASE_PASSWORD
firebase functions:secrets:set STAGING_JWT_SECRET_KEY

# Deploy to staging
./scripts/deploy-staging.sh
```

### Production Environment

```bash
# Set environment to production
export APP_ENV=production

# Ensure all required secrets are set
firebase functions:secrets:set PRODUCTION_DATABASE_PASSWORD
firebase functions:secrets:set PRODUCTION_JWT_SECRET_KEY
# ... set all other required secrets

# Deploy to production
./scripts/deploy-production.sh
```

## Verification and Testing

### List All Secrets

```bash
# Using Google Cloud SDK (recommended)
gcloud secrets list --project=olorin-ai

# Filter by environment
gcloud secrets list --project=olorin-ai | grep PRODUCTION_

# Get secret details
gcloud secrets describe ANTHROPIC_API_KEY --project=olorin-ai

# List secret versions
gcloud secrets versions list ANTHROPIC_API_KEY --project=olorin-ai
```

### Test Secret Access

```bash
# Test backend secret loading
cd olorin-server
poetry run python -c "
from app.service.config_loader import get_config_loader
loader = get_config_loader()
try:
    config = loader.load_all_secrets()
    print('✅ All secrets loaded successfully!')
    print(f'  - Database configured: {bool(config.get(\"database\"))}'')
    print(f'  - JWT configured: {bool(config.get(\"jwt\"))}'')
    print(f'  - API keys configured: {bool(config.get(\"anthropic_api_key\"))}'')
except Exception as e:
    print(f'❌ Error loading secrets: {e}')
"
```

### Run Security Validation

```bash
# Run the comprehensive security validation
./scripts/security-validation.sh

# This checks:
# - No hardcoded secrets
# - Cache TTL implementation
# - Proper logging
# - Production validation
# - File permissions
```

### Test Frontend Secret Loading

```bash
# Test frontend secret loading
cd olorin-front
node ../scripts/load-secrets.js olorin-front development

# Check the generated file
cat .env.local
# Should show REACT_APP_* variables
```

## Troubleshooting

### Common Issues and Solutions

#### 1. "Permission Denied" Error

**Problem:** Cannot access secrets from Firebase Secret Manager

**Solution:**
```bash
# Ensure you're authenticated
gcloud auth application-default login

# Check your current project
gcloud config get-value project

# Run the IAM setup script
./scripts/gcp-service-account-setup.sh
```

#### 2. "Secret Not Found" Error

**Problem:** Application cannot find a required secret

**Solution:**
```bash
# Check if the secret exists using gcloud
gcloud secrets list --project=olorin-ai | grep YOUR_SECRET_NAME

# Set the missing secret using Firebase CLI
firebase functions:secrets:set YOUR_SECRET_NAME

# Or using gcloud
echo -n "your-secret-value" | gcloud secrets create YOUR_SECRET_NAME \
    --data-file=- \
    --project=olorin-ai
```

#### 3. "Critical: Database password not found"

**Problem:** Production startup fails due to missing critical secrets

**Solution:**
```bash
# Set the required secrets for your environment
firebase functions:secrets:set PRODUCTION_DATABASE_PASSWORD
firebase functions:secrets:set PRODUCTION_JWT_SECRET_KEY

# Or using gcloud
echo -n "your-db-password" | gcloud secrets create PRODUCTION_DATABASE_PASSWORD \
    --data-file=- --project=olorin-ai
echo -n "your-jwt-secret-min-32-chars" | gcloud secrets create PRODUCTION_JWT_SECRET_KEY \
    --data-file=- --project=olorin-ai

# Verify they're set
gcloud secrets list --project=olorin-ai | grep PRODUCTION_
```

#### 4. Frontend Build Fails

**Problem:** React build fails due to missing environment variables

**Solution:**
```bash
# Load secrets before building
cd olorin-front
node ../scripts/load-secrets.js olorin-front production

# Verify .env.local was created
ls -la .env.local

# Build with error override if needed
TSC_COMPILE_ON_ERROR=true npm run build
```

### Debug Mode

Enable debug logging to see secret loading details:

```bash
# For backend
export LOG_LEVEL=debug
poetry run python -m app.local_server

# For frontend loader
DEBUG=true node ../scripts/load-secrets.js olorin-front development
```

## Security Best Practices

### 1. Never Commit Secrets

Ensure these files are in `.gitignore`:
- `.env`
- `.env.local`
- `.env.docker.secrets`
- `*_service_account.json`

### 2. Use Strong Secrets

- **JWT Secret:** Minimum 32 characters, use random generation
- **Passwords:** Use strong, unique passwords for each service
- **API Keys:** Rotate regularly and use separate keys per environment

### 3. Limit Secret Access

- Use the principle of least privilege
- Create separate service accounts for different roles:
  - Reader: Can only access secrets (for applications)
  - Admin: Can manage secrets (for DevOps)
  - CI/CD: Limited to deployment operations

### 4. Regular Rotation

```bash
# Rotate a secret
firebase functions:secrets:set JWT_SECRET_KEY

# Update the application to use the new secret
# Old secret remains accessible until deleted
```

### 5. Monitor Access

```bash
# View secret access logs
gcloud logging read "resource.type=secretmanager.googleapis.com/Secret" \
  --limit 50 \
  --format json
```

### 6. Clean Up Unused Secrets

```bash
# Delete an unused secret using gcloud
gcloud secrets delete OLD_SECRET_NAME --project=olorin-ai

# Or using Firebase CLI
firebase functions:secrets:destroy OLD_SECRET_NAME

# Prune all unused secrets (Firebase CLI)
firebase functions:secrets:prune
```

## Secret Cache Management

The system caches secrets for performance with a 5-minute TTL:

### Cache Behavior

- **TTL:** 300 seconds (5 minutes) by default
- **Automatic refresh:** Cache expires and reloads after TTL
- **Manual refresh:** Restart the application to force reload

### Adjusting Cache TTL

```python
# In your code, adjust cache TTL if needed
from app.service.secret_manager import SecretManagerClient

# Create with custom TTL (in seconds)
client = SecretManagerClient(project_id="olorin-ai", cache_ttl=600)  # 10 minutes
```

## Migration from Environment Files

If migrating from `.env` files:

1. **Export existing secrets:**
   ```bash
   # Create a backup
   cp .env .env.backup
   
   # Set each secret in Firebase
   source .env
   firebase functions:secrets:set DATABASE_PASSWORD <<< "$DB_PASSWORD"
   ```

2. **Verify migration:**
   ```bash
   # Test with Firebase secrets
   unset $(grep -v '^#' .env | sed -E 's/(.*)=.*/\1/' | xargs)
   poetry run python -m app.local_server
   ```

3. **Clean up:**
   ```bash
   # After successful verification
   rm .env
   # Keep .env.backup until fully confident
   ```

## Support and Resources

- **Firebase Secrets Documentation:** https://firebase.google.com/docs/functions/config-env
- **Google Secret Manager:** https://cloud.google.com/secret-manager/docs
- **Project Issues:** Report issues in the project repository
- **Security Concerns:** Contact the security team immediately

## Appendix: Quick Reference

### Essential Commands

```bash
# Set a secret (Firebase CLI)
firebase functions:secrets:set SECRET_NAME

# Set a secret (Google Cloud SDK)
echo -n "secret-value" | gcloud secrets create SECRET_NAME \
    --data-file=- --project=olorin-ai

# List secrets
gcloud secrets list --project=olorin-ai

# Access a secret value
gcloud secrets versions access latest --secret=SECRET_NAME --project=olorin-ai

# Delete a secret
gcloud secrets delete SECRET_NAME --project=olorin-ai

# Load frontend secrets
node scripts/load-secrets.js [project] [environment]

# Load Docker secrets
./scripts/docker-secrets-loader.sh [environment]

# Run security validation
./scripts/security-validation.sh

# Setup IAM permissions
./scripts/gcp-service-account-setup.sh

# Helper script to set all secrets
./scripts/set-firebase-secrets.sh
```

### Environment Variables

```bash
# Control variables
APP_ENV=production|staging|development|local
FIREBASE_PROJECT_ID=olorin-ai
LOG_LEVEL=debug|info|warning|error

# Fallback pattern
DB_PASSWORD=...
JWT_SECRET_KEY=...
REDIS_PASSWORD=...
```

---

*Last updated: 2025-01-31*
*Author: Gil Klainert*
*Version: 1.0.0*