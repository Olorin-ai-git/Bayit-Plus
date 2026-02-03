# Google Cloud Secrets - Email Templates Configuration

**Feature**: Admin Email Templates Management
**Date**: 2026-02-02
**Status**: Required for Production

## Overview

This document lists the Google Cloud secrets required for the Email Templates feature in the Bayit+ admin panel.

## Required Secrets

### 1. VITE_APP_BASE_URL

**Description**: Base URL for the Bayit+ web application
**Type**: String (URL)
**Environment**: Frontend (web)
**Default**: `https://bayit.tv` (production), `http://localhost:3200` (development)
**Required**: Yes

**Purpose**: Used to construct URLs in email templates (signup, verification, invitation accept)

**GCloud Commands**:

```bash
# Production
gcloud secrets create VITE_APP_BASE_URL \
  --data-file=- <<< "https://bayit.tv"

# Staging
gcloud secrets create VITE_APP_BASE_URL_STAGING \
  --data-file=- <<< "https://staging.bayit.tv"

# Development (local)
gcloud secrets create VITE_APP_BASE_URL_DEV \
  --data-file=- <<< "http://localhost:3200"
```

**Grant Access** (if needed):

```bash
# Grant access to Cloud Build service account
gcloud secrets add-iam-policy-binding VITE_APP_BASE_URL \
  --member="serviceAccount:PROJECT_NUMBER@cloudbuild.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Grant access to Compute Engine service account
gcloud secrets add-iam-policy-binding VITE_APP_BASE_URL \
  --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

### 2. VITE_SUPPORT_EMAIL

**Description**: Support email address for Bayit+ platform
**Type**: String (email)
**Environment**: Frontend (web)
**Default**: `support@bayit.tv`
**Required**: Yes

**Purpose**: Displayed in email templates for user support contact

**GCloud Commands**:

```bash
# Production
gcloud secrets create VITE_SUPPORT_EMAIL \
  --data-file=- <<< "support@bayit.tv"

# Staging
gcloud secrets create VITE_SUPPORT_EMAIL_STAGING \
  --data-file=- <<< "support-staging@bayit.tv"

# Development
gcloud secrets create VITE_SUPPORT_EMAIL_DEV \
  --data-file=- <<< "dev-support@bayit.tv"
```

**Grant Access**:

```bash
# Grant access to Cloud Build service account
gcloud secrets add-iam-policy-binding VITE_SUPPORT_EMAIL \
  --member="serviceAccount:PROJECT_NUMBER@cloudbuild.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Grant access to Compute Engine service account
gcloud secrets add-iam-policy-binding VITE_SUPPORT_EMAIL \
  --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## Deployment Workflow

### 1. Add Secrets to Google Cloud

```bash
# Navigate to project root
cd /path/to/bayit-plus

# Add production secrets (replace with actual values)
gcloud secrets create VITE_APP_BASE_URL \
  --data-file=- <<< "https://bayitplus.com"

gcloud secrets create VITE_SUPPORT_EMAIL \
  --data-file=- <<< "support@bayitplus.com"
```

### 2. Regenerate .env Files

```bash
# Run secrets sync script
./scripts/sync-gcloud-secrets.sh

# This will regenerate:
# - web/.env
# - backend/.env
```

### 3. Verify Secrets Loaded

```bash
# Check frontend .env
cat web/.env | grep VITE_

# Expected output:
# VITE_APP_BASE_URL=https://bayitplus.com
# VITE_SUPPORT_EMAIL=support@bayitplus.com
```

### 4. Restart Services

```bash
# Development
npm run bayit-start

# Production (Kubernetes)
kubectl rollout restart deployment/bayit-plus-frontend
```

---

## Usage in Code

**Frontend (EmailTemplatesPage.tsx)**:

```typescript
// Access environment variables via import.meta.env
const baseUrl = import.meta.env.VITE_APP_BASE_URL || window.location.origin
const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL

const defaults: Record<string, string> = {
  support_email: supportEmail,
  signup_url: `${baseUrl}/signup`,
  verification_url: `${baseUrl}/beta/verify?token=EXAMPLE`,
  accept_url: `${baseUrl}/accept-invitation?code=EXAMPLE`,
}
```

---

## Environment-Specific Values

| Environment | VITE_APP_BASE_URL | VITE_SUPPORT_EMAIL |
|-------------|-------------------|-------------------|
| **Production** | `https://bayit.tv` | `support@bayit.tv` |
| **Staging** | `https://staging.bayit.tv` | `support-staging@bayit.tv` |
| **Development** | `http://localhost:3200` | `dev-support@bayit.tv` |

---

## Security Notes

1. **Never commit .env files**: They are generated from GCloud secrets
2. **Use Secret Manager for all environments**: No hardcoded values in code
3. **Audit secret access**: Review IAM policies regularly
4. **Rotate secrets**: Change support email or URLs require secret update + sync + restart

---

## Troubleshooting

### Issue: Environment variables undefined in frontend

**Cause**: Secrets not synced or .env not loaded

**Fix**:
```bash
# Regenerate .env from GCloud
./scripts/sync-gcloud-secrets.sh

# Restart frontend dev server
cd web
npm start
```

### Issue: Email templates show "undefined" for URLs

**Cause**: `VITE_*` secrets not added to Google Cloud Secret Manager

**Fix**:
```bash
# Add missing secrets to GCloud
gcloud secrets create VITE_APP_BASE_URL --data-file=- <<< "https://bayitplus.com"
gcloud secrets create VITE_SUPPORT_EMAIL --data-file=- <<< "support@bayitplus.com"

# Regenerate and restart
./scripts/sync-gcloud-secrets.sh
npm run bayit-start
```

---

## Related Documentation

- [Secrets Management Guide](SECRETS_MANAGEMENT.md) - Global secrets workflow
- [Email Templates API](../api/EMAIL_TEMPLATES_API.md) - Backend API reference
- [Deployment Guide](DEPLOYMENT.md) - Full deployment procedures

---

**Last Updated**: 2026-02-02
**Author**: Claude (AI Assistant)
**Status**: Ready for Review
