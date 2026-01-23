# Secrets Management Guide

## Overview

This document describes how secrets are managed in the Bayit-Plus (Olorin) ecosystem across all environments.

## Security Posture

✅ **No secrets in version control** - All .env files are gitignored
✅ **Cloud deployment uses GCP Secret Manager** - 53+ secrets managed centrally
✅ **Configuration validation** - Pydantic models with fail-fast validation
✅ **No hardcoded credentials** - All values from environment variables

## Local Development Setup

### Initial Setup

1. **Copy environment templates:**
   ```bash
   cp backend/.env.example backend/.env
   cp web/.env.example web/.env
   cp mobile-app/.env.example mobile-app/.env
   cp tvos-app/.env.example tvos-app/.env
   ```

2. **Request access to development secrets:**
   - Contact DevOps team for development API keys
   - Never use production secrets in local development
   - Use test/sandbox modes for third-party services when available

3. **Fill in your local `.env` files:**
   - Never commit these files to git
   - Use strong, unique values for SECRET_KEY (32+ characters)
   - Use localhost URLs for local development only

### Environment Files

| File | Purpose | Required |
|------|---------|----------|
| `backend/.env` | Backend API secrets | Yes |
| `web/.env` | Web app configuration | Yes |
| `mobile-app/.env` | Mobile app configuration | Yes |
| `tvos-app/.env` | tvOS app configuration | Yes |
| `partner-portal/.env` | Partner portal configuration | Optional |

## Production Secrets Management

### Google Cloud Secret Manager

All production secrets are stored in GCP Secret Manager and automatically injected into Cloud Run services.

**View secrets:**
```bash
gcloud secrets list --project=bayit-plus
```

**Access a secret value (requires permissions):**
```bash
gcloud secrets versions access latest --secret=SECRET_NAME --project=bayit-plus
```

**Add a new secret:**
```bash
# 1. Add to local backend/.env for testing
echo "NEW_SECRET_KEY=your-value" >> backend/.env

# 2. Add to config.py
# Edit backend/app/core/config.py and add the field

# 3. Upload to Secret Manager
gcloud secrets create NEW_SECRET_KEY \
  --data-file=<(echo -n "production-value") \
  --project=bayit-plus

# 4. Grant access to service account
gcloud secrets add-iam-policy-binding NEW_SECRET_KEY \
  --member="serviceAccount:SERVICE_ACCOUNT_EMAIL" \
  --role="roles/secretmanager.secretAccessor" \
  --project=bayit-plus

# 5. Update cloudbuild.yaml
# Add to --set-secrets list in backend/cloudbuild.yaml
```

## Secret Rotation Schedule

Follow these rotation schedules to minimize risk of credential compromise:

| Secret Type | Rotation Frequency | Owner |
|-------------|-------------------|-------|
| API Keys (Stripe, Anthropic, OpenAI) | Quarterly | Backend Team |
| Database Passwords | Bi-annually | DevOps Team |
| Service Account Keys | Annually | DevOps Team |
| OAuth Client Secrets | Annually | Backend Team |
| Webhook Signing Secrets | Annually | Backend Team |
| JWT SECRET_KEY | Annually | Security Team |
| Emergency Rotation | Within 24 hours | Security Team |

### Rotation Procedure

1. **Generate new secret** in service provider dashboard
2. **Add new secret to GCP Secret Manager** as new version
3. **Deploy application** with new secret (Cloud Run automatically picks up latest version)
4. **Verify application health** - check logs and monitoring
5. **Revoke old secret** after 48-hour grace period
6. **Document rotation** in security audit log

## Emergency Procedures

### Suspected Secret Compromise

If a secret may have been exposed:

1. **Immediate Actions (Within 1 hour):**
   ```bash
   # Rotate the compromised secret immediately
   gcloud secrets versions add SECRET_NAME --data-file=<(echo -n "new-value")

   # Force redeploy to pick up new secret
   gcloud run deploy bayit-plus-backend --region=us-central1
   ```

2. **Investigation (Within 24 hours):**
   - Review access logs for unusual activity
   - Check application logs for unauthorized access
   - Verify all services still functioning with new secret
   - Document incident in security log

3. **Post-Incident (Within 1 week):**
   - Root cause analysis
   - Update .gitignore if needed
   - Add pre-commit hooks if not present
   - Team training on secret handling

### Secret Not Found Error

If application fails to start due to missing secret:

```bash
# Check if secret exists
gcloud secrets describe SECRET_NAME --project=bayit-plus

# Check IAM permissions
gcloud secrets get-iam-policy SECRET_NAME --project=bayit-plus

# Verify Cloud Run service account has access
# Service account: PROJECT_NUMBER-compute@developer.gserviceaccount.com
```

## Configuration Architecture

### Backend Configuration

**File:** `backend/app/core/config.py`

Uses Pydantic BaseSettings for type-safe configuration:

```python
class Settings(BaseSettings):
    SECRET_KEY: str = Field(..., min_length=32)  # Required, validated
    MONGODB_URL: str  # Required
    DEBUG: bool = False  # Optional, defaults to False

    class Config:
        env_file = ".env"
        case_sensitive = True
```

**Validation:**
- Fail-fast on missing required secrets
- Minimum length requirements (SECRET_KEY: 32 chars)
- No placeholder values allowed in production
- No localhost URLs allowed in production mode

### Frontend Configuration

**Web App:** Uses Vite environment variables (VITE_ prefix)
**Mobile/TV Apps:** Uses React Native environment variables
**Partner Portal:** Uses API configuration and feature flags

## Service Accounts & Credentials

### Google Cloud Service Account

**Production:**
- Uses Cloud Run default service account
- Workload Identity for GKE (if applicable)
- No JSON key files in production

**Local Development:**
- Service account JSON file (gitignored)
- Path: Set via `GOOGLE_APPLICATION_CREDENTIALS` environment variable
- Never commit this file to git

### Apple Push Notification Credentials

**File:** `credentials/apple/AuthKey_LMYW5G8928.p8`
- Permissions: 600 (owner read/write only)
- Gitignored via pattern: `*.p8`
- Team ID: Set in `APPLE_TEAM_ID` environment variable
- Key ID: Set in `APPLE_KEY_ID` environment variable

## Compliance & Auditing

### Audit Trail

All secret access is logged via GCP Cloud Audit Logs:

```bash
# View secret access logs
gcloud logging read "protoPayload.serviceName=secretmanager.googleapis.com" \
  --project=bayit-plus \
  --limit=50 \
  --format=json
```

### Access Control Review

Review IAM permissions quarterly:

```bash
# List all users/service accounts with Secret Manager access
gcloud projects get-iam-policy bayit-plus \
  --flatten="bindings[].members" \
  --filter="bindings.role:roles/secretmanager.secretAccessor"
```

### Compliance Checklist

- [ ] All secrets in GCP Secret Manager (not in code)
- [ ] .env files properly gitignored (verified: 0 files in git history)
- [ ] Pre-commit hooks installed (prevents accidental commits)
- [ ] Secret rotation schedule documented and followed
- [ ] Service account permissions follow least-privilege principle
- [ ] Audit logs enabled and reviewed monthly
- [ ] Incident response plan documented and tested
- [ ] Team trained on secret handling procedures

## Third-Party Service Secrets

### Required Secrets

| Service | Secret Type | Environment Variable | Rotation |
|---------|-------------|---------------------|----------|
| MongoDB Atlas | Connection URL | MONGODB_URL | Bi-annually |
| Stripe | API Key | STRIPE_SECRET_KEY | Quarterly |
| Anthropic (Claude) | API Key | ANTHROPIC_API_KEY | Quarterly |
| OpenAI | API Key | OPENAI_API_KEY | Quarterly |
| ElevenLabs | API Key | ELEVENLABS_API_KEY | Quarterly |
| Google OAuth | Client Secret | GOOGLE_CLIENT_SECRET | Annually |
| Twilio | Auth Token | TWILIO_AUTH_TOKEN | Quarterly |
| Pinecone | API Key | PINECONE_API_KEY | Quarterly |
| Sentry | DSN | SENTRY_DSN | Never (public) |
| Picovoice | Access Key | PICOVOICE_ACCESS_KEY | Quarterly |

### Webhook Secrets

| Webhook | Environment Variable | Purpose |
|---------|---------------------|---------|
| Stripe Webhook | STRIPE_WEBHOOK_SECRET | Verify webhook signatures |
| Twilio Webhook | TWILIO_WEBHOOK_SECRET | Verify Twilio callbacks |

## Best Practices

### DO ✅

- Use environment variables for all configuration
- Use Secret Manager for production secrets
- Validate configuration at application startup
- Fail fast on missing/invalid secrets
- Use strong, unique secrets (32+ characters)
- Rotate secrets regularly according to schedule
- Use test/sandbox modes for development
- Document all secrets in .env.example
- Grant minimum necessary IAM permissions
- Enable audit logging for secret access
- Use workload identity when possible
- Restrict file permissions on credential files (600)

### DON'T ❌

- Never commit .env files to git
- Never hardcode secrets in source code
- Never share production secrets via email/Slack
- Never use production secrets in development
- Never disable configuration validation
- Never use placeholder values in production
- Never grant broad Secret Manager access
- Never skip secret rotation schedule
- Never store secrets in application logs
- Never use weak/default secret values
- Never share service account JSON files
- Never use world-readable permissions on credential files

## Testing

### Test Configuration

Tests use mock values, never production secrets:

```python
# tests/conftest.py
@pytest.fixture
def test_settings():
    return Settings(
        SECRET_KEY="test-secret-key-minimum-32-chars-long",
        MONGODB_URL="mongodb://localhost:27017",
        STRIPE_SECRET_KEY="sk_test_mock_key",
        # ... other test values
    )
```

### Test Secret Manager Integration

```bash
# Test secret retrieval
gcloud secrets versions access latest \
  --secret=SECRET_KEY \
  --project=bayit-plus

# Test Cloud Run deployment with secrets
gcloud run deploy bayit-plus-backend-test \
  --image=gcr.io/bayit-plus/backend:test \
  --set-secrets=SECRET_KEY=bayit-secret-key:latest
```

## Troubleshooting

### "Secret not found" Error

```bash
# Check if secret exists
gcloud secrets list --filter="name:SECRET_NAME" --project=bayit-plus

# Create if missing
gcloud secrets create SECRET_NAME --data-file=- --project=bayit-plus
```

### "Permission denied" Error

```bash
# Check IAM policy
gcloud secrets get-iam-policy SECRET_NAME --project=bayit-plus

# Grant access
gcloud secrets add-iam-policy-binding SECRET_NAME \
  --member="serviceAccount:EMAIL" \
  --role="roles/secretmanager.secretAccessor"
```

### Configuration Validation Failed

```bash
# Run validation locally
cd backend
poetry run python -c "from app.core.config import settings; print('Valid')"

# Check which secret is missing/invalid
poetry run python -c "from app.core.config import settings; print(settings.dict())"
```

## Additional Resources

- [GCP Secret Manager Documentation](https://cloud.google.com/secret-manager/docs)
- [Pydantic Settings Documentation](https://docs.pydantic.dev/latest/usage/settings/)
- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- Internal: Backend configuration (`backend/app/core/config.py`)
- Internal: Cloud Build configuration (`backend/cloudbuild.yaml`)
- Internal: Secret setup script (`deployment/scripts/setup_gcp_secrets.sh`)

## Contact

- **Security Issues:** security@bayit.com
- **DevOps Support:** devops@bayit.com
- **Emergency Rotation:** On-call security team (PagerDuty)
