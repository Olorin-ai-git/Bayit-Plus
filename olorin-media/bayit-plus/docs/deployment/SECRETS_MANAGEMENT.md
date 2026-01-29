# Secrets Management - Google Cloud Single Source of Truth

**Date:** 2026-01-29
**Status:** CRITICAL REQUIREMENT - ZERO TOLERANCE

---

## 🚨 CRITICAL RULE: NEVER EDIT .env FILES DIRECTLY

### Single Source of Truth: Google Cloud Secret Manager

All environment variables and secrets are managed through **Google Cloud Secret Manager**.

**Workflow (MANDATORY):**

```
1. Update Google Cloud Secrets (single source of truth)
   ↓
2. Regenerate .env files from GCloud secrets
   ↓
3. Restart services to pick up new configuration
```

**❌ FORBIDDEN:**
```bash
# NEVER do this
echo "NEW_SECRET=value" >> backend/.env
echo "REACT_APP_CONFIG=value" >> web/.env
vim backend/.env.example  # Never edit directly
```

**✅ CORRECT:**
```bash
# 1. Add/update secret in Google Cloud
gcloud secrets create NEW_SECRET --data-file=- <<< "value"

# 2. Regenerate .env from GCloud
./scripts/sync-gcloud-secrets.sh

# 3. Restart services
kubectl rollout restart deployment/bayit-plus-backend
```

---

## Why Google Cloud Secret Manager?

### Advantages:
- ✅ **Single Source of Truth** - One place for all configuration
- ✅ **Version Control** - All secret changes tracked and auditable
- ✅ **Encryption at Rest** - Secrets encrypted by Google Cloud KMS
- ✅ **Access Control** - IAM-based secret access permissions
- ✅ **Audit Logs** - Every secret access logged for compliance
- ✅ **Rotation** - Automated secret rotation capabilities
- ✅ **Disaster Recovery** - Point-in-time secret recovery

### Problems with .env Files:
- ❌ No version control (shouldn't be in git)
- ❌ No encryption at rest
- ❌ No access control
- ❌ No audit trail
- ❌ Easy to have drift between environments
- ❌ Easy to forget to sync after local changes

---

## Secrets Management Scripts

### Sync Secrets from GCloud

```bash
# Regenerate backend .env
./scripts/sync-gcloud-secrets.sh backend

# Regenerate web .env
./scripts/sync-gcloud-secrets.sh web

# Regenerate all .env files
./scripts/sync-gcloud-secrets.sh all
```

### Add New Secret

```bash
# 1. Create secret in GCloud
gcloud secrets create SECRET_NAME \
  --data-file=- <<< "secret_value"

# 2. Grant access to service account
gcloud secrets add-iam-policy-binding SECRET_NAME \
  --member="serviceAccount:SERVICE_ACCOUNT@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# 3. Regenerate .env
./scripts/sync-gcloud-secrets.sh backend

# 4. Restart service
kubectl rollout restart deployment/bayit-plus-backend
```

### Update Existing Secret

```bash
# 1. Add new version to GCloud
gcloud secrets versions add SECRET_NAME \
  --data-file=- <<< "new_value"

# 2. Regenerate .env
./scripts/sync-gcloud-secrets.sh backend

# 3. Restart service
kubectl rollout restart deployment/bayit-plus-backend
```

### View Secret Value

```bash
# View latest version
gcloud secrets versions access latest --secret="SECRET_NAME"

# View specific version
gcloud secrets versions access 5 --secret="SECRET_NAME"

# List all versions
gcloud secrets versions list SECRET_NAME
```

### Delete Secret

```bash
# Disable specific version (soft delete)
gcloud secrets versions disable 5 --secret="SECRET_NAME"

# Delete specific version (hard delete)
gcloud secrets versions destroy 5 --secret="SECRET_NAME"

# Delete entire secret
gcloud secrets delete SECRET_NAME
```

---

## .env.example Files

### Purpose

`.env.example` files serve as **documentation only**:
- ✅ List all required environment variables
- ✅ Show expected format/type
- ✅ Provide example/placeholder values
- ✅ Document what each variable does

### Rules

1. **Never contain real secrets**
   - Use placeholders: `YOUR_API_KEY_HERE`, `CHANGEME`, etc.
   - Use example values: `http://example.com`, `user@example.com`

2. **Never used by applications**
   - Applications read from `.env` (generated from GCloud)
   - `.env.example` is for developer reference only

3. **Safe to commit to git**
   - Contains no sensitive information
   - Documents expected configuration

4. **Updated when adding new config**
   - Add new variables to `.env.example` for documentation
   - Include comments explaining what the variable does
   - But NEVER add real values

---

## Environment-Specific Secrets

### Development (Local)

```bash
# Use development project
gcloud config set project bayit-plus-dev

# Sync dev secrets
./scripts/sync-gcloud-secrets.sh all
```

### Staging

```bash
# Use staging project
gcloud config set project bayit-plus-staging

# Sync staging secrets
./scripts/sync-gcloud-secrets.sh all
```

### Production

```bash
# Use production project
gcloud config set project bayit-plus-prod

# Sync production secrets
./scripts/sync-gcloud-secrets.sh all
```

---

## Secret Naming Conventions

### Backend Secrets (Python/FastAPI)
- Format: `UPPERCASE_SNAKE_CASE`
- Example: `DATABASE_URL`, `STRIPE_SECRET_KEY`

### Frontend Secrets (React/Vite)
- Format: `REACT_APP_UPPERCASE` or `VITE_UPPERCASE`
- Example: `REACT_APP_API_URL`, `VITE_API_BASE_URL`
- **Note:** Only secrets prefixed with `REACT_APP_` or `VITE_` are exposed to frontend

### Shared Secrets
- Format: `SHARED_UPPERCASE_SNAKE_CASE`
- Example: `SHARED_JWT_SECRET`, `SHARED_ENCRYPTION_KEY`

---

## Security Best Practices

### 1. Least Privilege Access
```bash
# Grant only necessary access
gcloud secrets add-iam-policy-binding SECRET_NAME \
  --member="serviceAccount:backend@PROJECT.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Never use "allUsers" or "allAuthenticatedUsers"
```

### 2. Secret Rotation
```bash
# Rotate critical secrets every 90 days
# 1. Generate new secret value
# 2. Add new version to GCloud
# 3. Test with new version
# 4. Deploy to all environments
# 5. Disable old version after 7 days
```

### 3. Audit Access
```bash
# View secret access logs
gcloud logging read \
  "resource.type=secretmanager.googleapis.com/Secret" \
  --limit 100
```

### 4. Never Log Secrets
```python
# ❌ FORBIDDEN
logger.info(f"API Key: {settings.STRIPE_SECRET_KEY}")
print(f"Database password: {db_password}")

# ✅ CORRECT
logger.info("Connecting to database")
logger.info("Stripe API initialized")
```

---

## Compliance Requirements

### SOC 2 / ISO 27001

- ✅ All secrets stored in GCloud Secret Manager (encrypted)
- ✅ All secret access logged and auditable
- ✅ IAM-based access control enforced
- ✅ Secrets never committed to version control
- ✅ Regular secret rotation schedule
- ✅ Incident response plan for secret leaks

### GDPR / Data Privacy

- ✅ User data encryption keys managed via Secret Manager
- ✅ Access to user data secrets logged and monitored
- ✅ Data retention policies enforced

---

## Troubleshooting

### .env file not updating

```bash
# Check GCloud authentication
gcloud auth list

# Check project is correct
gcloud config get-value project

# Verify secret exists
gcloud secrets list | grep SECRET_NAME

# Verify you have access
gcloud secrets versions access latest --secret="SECRET_NAME"

# Force regenerate
rm backend/.env web/.env
./scripts/sync-gcloud-secrets.sh all
```

### Service can't access secrets

```bash
# Check service account permissions
gcloud secrets get-iam-policy SECRET_NAME

# Grant access
gcloud secrets add-iam-policy-binding SECRET_NAME \
  --member="serviceAccount:SERVICE_ACCOUNT@PROJECT.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### Secret version mismatch

```bash
# List all versions
gcloud secrets versions list SECRET_NAME

# Access specific version
gcloud secrets versions access VERSION_NUMBER --secret="SECRET_NAME"

# Promote older version to latest
gcloud secrets versions enable VERSION_NUMBER --secret="SECRET_NAME"
```

---

## Related Documentation

- [GCloud Secrets - Payment Flow](./GCLOUD_SECRETS_PAYMENT_FLOW.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [Security Best Practices](../security/SECURITY_BEST_PRACTICES.md)

---

## Emergency Procedures

### Secret Leaked / Compromised

```bash
# 1. IMMEDIATELY disable compromised version
gcloud secrets versions disable VERSION_NUMBER --secret="SECRET_NAME"

# 2. Generate new secret value
NEW_VALUE=$(openssl rand -base64 32)

# 3. Add new version
gcloud secrets versions add SECRET_NAME --data-file=- <<< "$NEW_VALUE"

# 4. Regenerate .env files
./scripts/sync-gcloud-secrets.sh all

# 5. Rolling restart all services
kubectl rollout restart deployment/bayit-plus-backend
kubectl rollout restart deployment/bayit-plus-web

# 6. Verify old version disabled
gcloud secrets versions list SECRET_NAME

# 7. Monitor for unauthorized access
gcloud logging read "resource.type=secretmanager.googleapis.com/Secret"

# 8. Notify security team
./scripts/notify-security-incident.sh "SECRET_NAME compromised"
```

---

## Enforcement

**This is a CRITICAL REQUIREMENT with ZERO TOLERANCE.**

Any `.env` file edits that bypass Google Cloud Secret Manager will be:
- ❌ Rejected in code review
- ❌ Blocked by CI/CD pipeline
- ❌ Flagged as security incident

**Claude Code is configured to REFUSE any direct .env edits** and will:
1. Create GCloud secrets documentation instead
2. Provide sync scripts for regenerating .env
3. Never modify .env files directly
