# Secret Provisioning Guide - Olorin Ecosystem

**Last Updated:** 2026-01-23
**Status:** Production
**Scope:** All Olorin platforms (Bayit+, Fraud, CVPlus, Station AI)

---

## Executive Summary

This document describes how to provision platform-specific API keys in Google Cloud Secret Manager for the Olorin ecosystem. Following this guide ensures **security isolation** between platforms and prevents credential sharing vulnerabilities.

## Critical Requirements

### 1. **Platform-Specific API Keys**

Each platform MUST use distinct API keys for:
- **Anthropic API** (Claude)
- **OpenAI API** (GPT, Whisper)
- **ElevenLabs API** (TTS/STT)

| Platform | Anthropic Secret Name | OpenAI Secret Name | ElevenLabs Secret Name |
|----------|----------------------|-------------------|----------------------|
| **Bayit+** | `bayit-anthropic-api-key` | `bayit-openai-api-key` | `bayit-elevenlabs-api-key` |
| **Fraud** | `fraud-anthropic-api-key` | `fraud-openai-api-key` | N/A |
| **CVPlus** | N/A | `cvplus-openai-api-key` | `cvplus-elevenlabs-api-key` |
| **Station AI** | `station-anthropic-api-key` | `station-openai-api-key` | N/A |

### 2. **Unique JWT Secrets**

Each platform MUST have a unique JWT secret:
- `bayit-secret-key`
- `fraud-jwt-secret`
- `cvplus-jwt-secret`
- `station-jwt-secret`

**Verification:** Run `./scripts/audit/verify-jwt-uniqueness.sh` to ensure uniqueness.

---

## Step-by-Step Provisioning

### Prerequisites

1. **GCloud CLI** installed and authenticated
2. **Project permissions:**
   - `secretmanager.admin` role (to create secrets)
   - `iam.serviceAccountAdmin` role (to grant access)
3. **API Keys** obtained from providers:
   - Anthropic: https://console.anthropic.com/
   - OpenAI: https://platform.openai.com/api-keys
   - ElevenLabs: https://elevenlabs.io/

### Step 1: Generate API Keys (Provider Dashboards)

#### Anthropic Console
```bash
# Go to: https://console.anthropic.com/settings/keys
# Create separate keys:
# - "Bayit+ Production Key" (for Bayit+)
# - "Fraud Detection Key" (for Fraud)
# - "Station AI Key" (for Station AI)
```

#### OpenAI Dashboard
```bash
# Go to: https://platform.openai.com/api-keys
# Create separate keys:
# - "Bayit+ Production Key" (for Bayit+)
# - "Fraud Detection Key" (for Fraud)
# - "CVPlus Key" (for CVPlus)
# - "Station AI Key" (for Station AI)
```

#### ElevenLabs Dashboard
```bash
# Go to: https://elevenlabs.io/app/settings/api-keys
# Create separate keys:
# - "Bayit+ Production Key" (for Bayit+)
# - "CVPlus Key" (for CVPlus)
```

### Step 2: Create Secrets in Google Cloud Secret Manager

#### Production Secrets (Bayit+)

```bash
# Anthropic API Key
echo -n "sk-ant-api03-YOUR_BAYIT_ANTHROPIC_KEY" | \
  gcloud secrets create bayit-anthropic-api-key \
  --data-file=- \
  --replication-policy=automatic \
  --project=bayit-plus

# OpenAI API Key
echo -n "sk-proj-YOUR_BAYIT_OPENAI_KEY" | \
  gcloud secrets create bayit-openai-api-key \
  --data-file=- \
  --replication-policy=automatic \
  --project=bayit-plus

# ElevenLabs API Key
echo -n "YOUR_BAYIT_ELEVENLABS_KEY" | \
  gcloud secrets create bayit-elevenlabs-api-key \
  --data-file=- \
  --replication-policy=automatic \
  --project=bayit-plus

# JWT Secret (generate secure random value)
python3 -c "import secrets; print(secrets.token_urlsafe(64))" | \
  gcloud secrets create bayit-secret-key \
  --data-file=- \
  --replication-policy=automatic \
  --project=bayit-plus
```

#### Staging Secrets (Bayit+)

```bash
# Anthropic API Key (Staging)
echo -n "sk-ant-api03-YOUR_BAYIT_ANTHROPIC_STAGING_KEY" | \
  gcloud secrets create bayit-anthropic-api-key-staging \
  --data-file=- \
  --replication-policy=automatic \
  --project=bayit-plus

# OpenAI API Key (Staging)
echo -n "sk-proj-YOUR_BAYIT_OPENAI_STAGING_KEY" | \
  gcloud secrets create bayit-openai-api-key-staging \
  --data-file=- \
  --replication-policy=automatic \
  --project=bayit-plus

# ElevenLabs API Key (Staging)
echo -n "YOUR_BAYIT_ELEVENLABS_STAGING_KEY" | \
  gcloud secrets create bayit-elevenlabs-api-key-staging \
  --data-file=- \
  --replication-policy=automatic \
  --project=bayit-plus

# JWT Secret (Staging)
python3 -c "import secrets; print(secrets.token_urlsafe(64))" | \
  gcloud secrets create bayit-secret-key-staging \
  --data-file=- \
  --replication-policy=automatic \
  --project=bayit-plus
```

#### Fraud Platform Secrets

```bash
# Anthropic API Key
echo -n "sk-ant-api03-YOUR_FRAUD_ANTHROPIC_KEY" | \
  gcloud secrets create fraud-anthropic-api-key \
  --data-file=- \
  --replication-policy=automatic \
  --project=olorin-platform

# OpenAI API Key
echo -n "sk-proj-YOUR_FRAUD_OPENAI_KEY" | \
  gcloud secrets create fraud-openai-api-key \
  --data-file=- \
  --replication-policy=automatic \
  --project=olorin-platform

# JWT Secret
python3 -c "import secrets; print(secrets.token_urlsafe(64))" | \
  gcloud secrets create fraud-jwt-secret \
  --data-file=- \
  --replication-policy=automatic \
  --project=olorin-platform
```

### Step 3: Grant Service Account Access

Each Cloud Run service needs `secretAccessor` permissions on its secrets.

#### Bayit+ Production

```bash
# Get service account email
SERVICE_ACCOUNT="bayit-plus@bayit-plus.iam.gserviceaccount.com"

# Grant access to all Bayit+ secrets
for secret in bayit-anthropic-api-key bayit-openai-api-key bayit-elevenlabs-api-key bayit-secret-key; do
  gcloud secrets add-iam-policy-binding $secret \
    --member="serviceAccount:${SERVICE_ACCOUNT}" \
    --role="roles/secretmanager.secretAccessor" \
    --project=bayit-plus
done
```

#### Bayit+ Staging

```bash
# Grant access to staging secrets
for secret in bayit-anthropic-api-key-staging bayit-openai-api-key-staging bayit-elevenlabs-api-key-staging bayit-secret-key-staging; do
  gcloud secrets add-iam-policy-binding $secret \
    --member="serviceAccount:${SERVICE_ACCOUNT}" \
    --role="roles/secretmanager.secretAccessor" \
    --project=bayit-plus
done
```

#### Fraud Platform

```bash
SERVICE_ACCOUNT="olorin-fraud@olorin-platform.iam.gserviceaccount.com"

for secret in fraud-anthropic-api-key fraud-openai-api-key fraud-jwt-secret; do
  gcloud secrets add-iam-policy-binding $secret \
    --member="serviceAccount:${SERVICE_ACCOUNT}" \
    --role="roles/secretmanager.secretAccessor" \
    --project=olorin-platform
done
```

### Step 4: Verify Secret Access

```bash
# Test secret access (Bayit+ Production)
gcloud secrets versions access latest --secret=bayit-anthropic-api-key --project=bayit-plus

# Should output the secret value (first 20 chars)
# sk-ant-api03-XXXXXXX...
```

### Step 5: Update CI/CD Workflows

Secrets are automatically injected via `--set-secrets` flags in GitHub Actions workflows:

**Bayit+ Production:** `.github/workflows/deploy-production.yml` (line 178)
```yaml
--set-secrets "ANTHROPIC_API_KEY=bayit-anthropic-api-key:latest,ELEVENLABS_API_KEY=bayit-elevenlabs-api-key:latest,OPENAI_API_KEY=bayit-openai-api-key:latest"
```

**Bayit+ Staging:** `.github/workflows/deploy-staging.yml` (line 143)
```yaml
--set-secrets "ANTHROPIC_API_KEY=bayit-anthropic-api-key-staging:latest,ELEVENLABS_API_KEY=bayit-elevenlabs-api-key-staging:latest,OPENAI_API_KEY=bayit-openai-api-key-staging:latest"
```

---

## Secret Rotation Procedures

### Zero-Downtime JWT Rotation

JWT secrets can be rotated without downtime using dual-key validation:

```bash
# Step 1: Create new secret version
python3 -c "import secrets; print(secrets.token_urlsafe(64))" | \
  gcloud secrets versions add bayit-secret-key --data-file=-

# Step 2: Deploy with dual-key support (SECRET_KEY_OLD)
# Update deployment to include:
--set-secrets "SECRET_KEY=bayit-secret-key:latest,SECRET_KEY_OLD=bayit-secret-key:1"

# Step 3: Wait 7 days (token expiry)

# Step 4: Remove old secret from deployment
--set-secrets "SECRET_KEY=bayit-secret-key:latest"

# Step 5: Disable old secret version
gcloud secrets versions disable 1 --secret=bayit-secret-key
```

### API Key Rotation

API keys should be rotated if compromised:

```bash
# Step 1: Generate new key in provider dashboard

# Step 2: Add new version to Secret Manager
echo -n "NEW_API_KEY" | gcloud secrets versions add bayit-anthropic-api-key --data-file=-

# Step 3: Deploy (automatic - uses :latest)
# CI/CD will automatically pick up new version

# Step 4: Verify deployment health

# Step 5: Disable old key in provider dashboard
```

---

## Verification Checklist

After provisioning, verify:

- [ ] **JWT Uniqueness:** Run `./scripts/audit/verify-jwt-uniqueness.sh`
- [ ] **Secret Access:** Service accounts can access their secrets
- [ ] **CI/CD Integration:** Workflows reference correct secret names
- [ ] **No Hardcoded Keys:** No API keys in `.env`, code, or git history
- [ ] **Provider Dashboards:** Keys labeled with platform names
- [ ] **Staging/Production:** Separate keys for each environment

---

## Security Best Practices

1. **Never Commit Secrets to Git**
   - Use `.gitignore` for `.env`, `.env.production`, etc.
   - Scan git history: `git log -p -S "sk-ant-" --all`

2. **Use Descriptive Key Names**
   - Provider dashboards: "Bayit+ Production Key"
   - Secret Manager: `bayit-anthropic-api-key`

3. **Rotate Regularly**
   - JWT secrets: Every 90 days
   - API keys: Every 180 days or if compromised

4. **Monitor Usage**
   - Set up alerts for unusual API usage
   - Review Secret Manager audit logs monthly

5. **Principle of Least Privilege**
   - Only grant `secretAccessor` to required service accounts
   - Never use personal credentials in production

---

## Troubleshooting

### Error: "Permission denied accessing secret"

```bash
# Check IAM permissions
gcloud secrets get-iam-policy bayit-anthropic-api-key

# Add missing permission
gcloud secrets add-iam-policy-binding bayit-anthropic-api-key \
  --member="serviceAccount:YOUR_SA@PROJECT.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### Error: "Secret not found"

```bash
# List all secrets
gcloud secrets list --project=bayit-plus

# Create missing secret (see Step 2)
```

### Error: "Duplicate JWT secrets detected"

```bash
# Run verification script
./scripts/audit/verify-jwt-uniqueness.sh

# Generate new unique secret
python3 -c "import secrets; print(secrets.token_urlsafe(64))" | \
  gcloud secrets versions add AFFECTED_SECRET --data-file=-
```

---

## Related Documentation

- [Configuration Security Implementation Plan](/docs/reviews/CONFIGURATION_AUDIT_REPORT_2026-01-23.md)
- [Zero-Downtime Deployment Guide](/docs/deployment/ZERO_DOWNTIME_DEPLOYMENT.md)
- [Security Incident Response](/docs/security/INCIDENT_RESPONSE.md)

---

**Document Owner:** DevSecOps Team
**Review Schedule:** Quarterly
**Last Audit:** 2026-01-23
