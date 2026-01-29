# Google Cloud Secrets - Beta 500 Program

**CRITICAL**: This document lists ALL secrets required for the Beta 500 program. **NEVER edit `.env` files directly**. All secrets MUST be managed through Google Cloud Secret Manager.

**Last Updated**: 2026-01-29
**Owner**: Platform Team
**Related**: [Secrets Management Guide](./SECRETS_MANAGEMENT.md)

---

## Workflow Summary

```
1. Add/Update secret in Google Cloud Secret Manager
   ↓
2. Run ./scripts/sync-gcloud-secrets.sh
   ↓
3. Restart services
```

---

## Beta 500 Secrets

### 1. Beta Program Configuration

#### `BETA_MAX_USERS`
- **Description**: Maximum number of beta users allowed in the program
- **Type**: Integer
- **Default**: 500
- **Required**: Yes
- **Environments**: All (staging, production)

**Add to Google Cloud**:
```bash
echo "500" | gcloud secrets create BETA_MAX_USERS \
  --data-file=- \
  --replication-policy="automatic" \
  --labels=env=production,app=bayit-plus,feature=beta-500
```

**Grant Access**:
```bash
# Backend service account
gcloud secrets add-iam-policy-binding BETA_MAX_USERS \
  --member="serviceAccount:bayit-plus-backend@bayit-plus.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# CI/CD service account
gcloud secrets add-iam-policy-binding BETA_MAX_USERS \
  --member="serviceAccount:github-actions@bayit-plus.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

#### `BETA_AI_CREDITS`
- **Description**: Total AI credits allocated per beta user
- **Type**: Integer
- **Default**: 5000
- **Required**: Yes
- **Environments**: All

**Add to Google Cloud**:
```bash
echo "5000" | gcloud secrets create BETA_AI_CREDITS \
  --data-file=- \
  --replication-policy="automatic" \
  --labels=env=production,app=bayit-plus,feature=beta-500
```

**Grant Access**:
```bash
gcloud secrets add-iam-policy-binding BETA_AI_CREDITS \
  --member="serviceAccount:bayit-plus-backend@bayit-plus.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

#### `BETA_DURATION_DAYS`
- **Description**: Duration of beta program in days
- **Type**: Integer
- **Default**: 90
- **Required**: Yes
- **Environments**: All

**Add to Google Cloud**:
```bash
echo "90" | gcloud secrets create BETA_DURATION_DAYS \
  --data-file=- \
  --replication-policy="automatic" \
  --labels=env=production,app=bayit-plus,feature=beta-500
```

---

### 2. Credit System Configuration

#### `CREDIT_RATE_LIVE_DUBBING`
- **Description**: Credits consumed per second of live dubbing
- **Type**: Float
- **Default**: 1.0
- **Required**: Yes
- **Environments**: All

**Add to Google Cloud**:
```bash
echo "1.0" | gcloud secrets create CREDIT_RATE_LIVE_DUBBING \
  --data-file=- \
  --replication-policy="automatic" \
  --labels=env=production,app=bayit-plus,feature=beta-500
```

---

#### `CREDIT_RATE_AI_SEARCH`
- **Description**: Credits per AI search query
- **Type**: Float
- **Default**: 10.0
- **Required**: Yes
- **Environments**: All

**Add to Google Cloud**:
```bash
echo "10.0" | gcloud secrets create CREDIT_RATE_AI_SEARCH \
  --data-file=- \
  --replication-policy="automatic" \
  --labels=env=production,app=bayit-plus,feature=beta-500
```

---

#### `CREDIT_RATE_AI_RECOMMENDATIONS`
- **Description**: Credits per AI recommendation generation
- **Type**: Float
- **Default**: 5.0
- **Required**: Yes
- **Environments**: All

**Add to Google Cloud**:
```bash
echo "5.0" | gcloud secrets create CREDIT_RATE_AI_RECOMMENDATIONS \
  --data-file=- \
  --replication-policy="automatic" \
  --labels=env=production,app=bayit-plus,feature=beta-500
```

---

#### `BETA_CREDIT_WARNING_THRESHOLD`
- **Description**: Credit balance threshold for warning notification (show warning when below this)
- **Type**: Integer
- **Default**: 500
- **Required**: Yes
- **Environments**: All

**Add to Google Cloud**:
```bash
echo "500" | gcloud secrets create BETA_CREDIT_WARNING_THRESHOLD \
  --data-file=- \
  --replication-policy="automatic" \
  --labels=env=production,app=bayit-plus,feature=beta-500
```

---

#### `BETA_CREDIT_CRITICAL_THRESHOLD`
- **Description**: Credit balance threshold for critical alert (show critical warning when below this)
- **Type**: Integer
- **Default**: 100
- **Required**: Yes
- **Environments**: All

**Add to Google Cloud**:
```bash
echo "100" | gcloud secrets create BETA_CREDIT_CRITICAL_THRESHOLD \
  --data-file=- \
  --replication-policy="automatic" \
  --labels=env=production,app=bayit-plus,feature=beta-500
```

---

### 3. Session Management

#### `SESSION_CHECKPOINT_INTERVAL_SECONDS`
- **Description**: Interval in seconds between credit checkpoint updates during live dubbing
- **Type**: Integer
- **Default**: 30
- **Required**: Yes
- **Environments**: All

**Add to Google Cloud**:
```bash
echo "30" | gcloud secrets create SESSION_CHECKPOINT_INTERVAL_SECONDS \
  --data-file=- \
  --replication-policy="automatic" \
  --labels=env=production,app=bayit-plus,feature=beta-500
```

---

#### `SESSION_CLEANUP_INTERVAL_SECONDS`
- **Description**: Interval for background worker to clean up orphaned sessions
- **Type**: Integer
- **Default**: 300
- **Required**: Yes
- **Environments**: All

**Add to Google Cloud**:
```bash
echo "300" | gcloud secrets create SESSION_CLEANUP_INTERVAL_SECONDS \
  --data-file=- \
  --replication-policy="automatic" \
  --labels=env=production,app=bayit-plus,feature=beta-500
```

---

#### `SESSION_TIMEOUT_SECONDS`
- **Description**: Maximum inactive session duration before auto-termination
- **Type**: Integer
- **Default**: 3600
- **Required**: Yes
- **Environments**: All

**Add to Google Cloud**:
```bash
echo "3600" | gcloud secrets create SESSION_TIMEOUT_SECONDS \
  --data-file=- \
  --replication-policy="automatic" \
  --labels=env=production,app=bayit-plus,feature=beta-500
```

---

### 4. Email Verification

#### `EMAIL_VERIFICATION_TOKEN_EXPIRY_HOURS`
- **Description**: Expiration time for email verification tokens (hours)
- **Type**: Integer
- **Default**: 24
- **Required**: Yes
- **Environments**: All

**Add to Google Cloud**:
```bash
echo "24" | gcloud secrets create EMAIL_VERIFICATION_TOKEN_EXPIRY_HOURS \
  --data-file=- \
  --replication-policy="automatic" \
  --labels=env=production,app=bayit-plus,feature=beta-500
```

---

#### `EMAIL_VERIFICATION_SECRET_KEY`
- **Description**: Secret key for HMAC-SHA256 email verification token signing
- **Type**: String (64+ characters)
- **Default**: NONE (must generate unique)
- **Required**: YES (CRITICAL - no default allowed)
- **Environments**: All

**Generate and Add**:
```bash
# Generate secure random secret
SECRET_KEY=$(openssl rand -hex 64)

echo "$SECRET_KEY" | gcloud secrets create EMAIL_VERIFICATION_SECRET_KEY \
  --data-file=- \
  --replication-policy="automatic" \
  --labels=env=production,app=bayit-plus,feature=beta-500,security=critical

# Grant access
gcloud secrets add-iam-policy-binding EMAIL_VERIFICATION_SECRET_KEY \
  --member="serviceAccount:bayit-plus-backend@bayit-plus.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

**IMPORTANT**: This secret is CRITICAL for security. Never use default values.

---

### 5. Twilio SMS Configuration

#### `TWILIO_ACCOUNT_SID`
- **Description**: Twilio account SID for SMS notifications
- **Type**: String
- **Default**: NONE
- **Required**: YES
- **Environments**: Production (optional in staging)

**Add to Google Cloud**:
```bash
echo "YOUR_TWILIO_ACCOUNT_SID" | gcloud secrets create TWILIO_ACCOUNT_SID \
  --data-file=- \
  --replication-policy="automatic" \
  --labels=env=production,app=bayit-plus,feature=beta-500,vendor=twilio
```

---

#### `TWILIO_AUTH_TOKEN`
- **Description**: Twilio authentication token
- **Type**: String (sensitive)
- **Default**: NONE
- **Required**: YES
- **Environments**: Production (optional in staging)

**Add to Google Cloud**:
```bash
echo "YOUR_TWILIO_AUTH_TOKEN" | gcloud secrets create TWILIO_AUTH_TOKEN \
  --data-file=- \
  --replication-policy="automatic" \
  --labels=env=production,app=bayit-plus,feature=beta-500,vendor=twilio,security=critical

# Grant access
gcloud secrets add-iam-policy-binding TWILIO_AUTH_TOKEN \
  --member="serviceAccount:bayit-plus-backend@bayit-plus.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

#### `TWILIO_PHONE_NUMBER`
- **Description**: Twilio phone number for sending SMS
- **Type**: String (E.164 format)
- **Default**: NONE
- **Required**: YES
- **Environments**: Production

**Add to Google Cloud**:
```bash
echo "+1234567890" | gcloud secrets create TWILIO_PHONE_NUMBER \
  --data-file=- \
  --replication-policy="automatic" \
  --labels=env=production,app=bayit-plus,feature=beta-500,vendor=twilio
```

---

### 6. Marketing Integration

#### `BETA_LANDING_PAGE_URL`
- **Description**: URL for beta program landing page
- **Type**: String (URL)
- **Default**: https://bayitplus.com/beta-500
- **Required**: Yes
- **Environments**: All

**Add to Google Cloud**:
```bash
echo "https://bayitplus.com/beta-500" | gcloud secrets create BETA_LANDING_PAGE_URL \
  --data-file=- \
  --replication-policy="automatic" \
  --labels=env=production,app=bayit-plus,feature=beta-500
```

---

#### `BETA_SUPPORT_EMAIL`
- **Description**: Support email address for beta users
- **Type**: String (email)
- **Default**: beta@bayitplus.com
- **Required**: Yes
- **Environments**: All

**Add to Google Cloud**:
```bash
echo "beta@bayitplus.com" | gcloud secrets create BETA_SUPPORT_EMAIL \
  --data-file=- \
  --replication-policy="automatic" \
  --labels=env=production,app=bayit-plus,feature=beta-500
```

---

## Batch Secret Creation Script

Create all secrets at once using this script:

```bash
#!/bin/bash
# scripts/create-beta-500-secrets.sh

set -e

PROJECT_ID="bayit-plus"
SERVICE_ACCOUNT="bayit-plus-backend@bayit-plus.iam.gserviceaccount.com"

echo "Creating Beta 500 secrets in Google Cloud Secret Manager..."

# Beta Program Configuration
echo "500" | gcloud secrets create BETA_MAX_USERS --data-file=- --replication-policy="automatic" --labels=feature=beta-500
echo "5000" | gcloud secrets create BETA_AI_CREDITS --data-file=- --replication-policy="automatic" --labels=feature=beta-500
echo "90" | gcloud secrets create BETA_DURATION_DAYS --data-file=- --replication-policy="automatic" --labels=feature=beta-500

# Credit Rates
echo "1.0" | gcloud secrets create CREDIT_RATE_LIVE_DUBBING --data-file=- --replication-policy="automatic" --labels=feature=beta-500
echo "10.0" | gcloud secrets create CREDIT_RATE_AI_SEARCH --data-file=- --replication-policy="automatic" --labels=feature=beta-500
echo "5.0" | gcloud secrets create CREDIT_RATE_AI_RECOMMENDATIONS --data-file=- --replication-policy="automatic" --labels=feature=beta-500

# Credit Thresholds
echo "500" | gcloud secrets create BETA_CREDIT_WARNING_THRESHOLD --data-file=- --replication-policy="automatic" --labels=feature=beta-500
echo "100" | gcloud secrets create BETA_CREDIT_CRITICAL_THRESHOLD --data-file=- --replication-policy="automatic" --labels=feature=beta-500

# Session Management
echo "30" | gcloud secrets create SESSION_CHECKPOINT_INTERVAL_SECONDS --data-file=- --replication-policy="automatic" --labels=feature=beta-500
echo "300" | gcloud secrets create SESSION_CLEANUP_INTERVAL_SECONDS --data-file=- --replication-policy="automatic" --labels=feature=beta-500
echo "3600" | gcloud secrets create SESSION_TIMEOUT_SECONDS --data-file=- --replication-policy="automatic" --labels=feature=beta-500

# Email Verification
echo "24" | gcloud secrets create EMAIL_VERIFICATION_TOKEN_EXPIRY_HOURS --data-file=- --replication-policy="automatic" --labels=feature=beta-500

# Generate secure verification key
VERIFICATION_KEY=$(openssl rand -hex 64)
echo "$VERIFICATION_KEY" | gcloud secrets create EMAIL_VERIFICATION_SECRET_KEY --data-file=- --replication-policy="automatic" --labels=feature=beta-500,security=critical

# Marketing
echo "https://bayitplus.com/beta-500" | gcloud secrets create BETA_LANDING_PAGE_URL --data-file=- --replication-policy="automatic" --labels=feature=beta-500
echo "beta@bayitplus.com" | gcloud secrets create BETA_SUPPORT_EMAIL --data-file=- --replication-policy="automatic" --labels=feature=beta-500

echo "✅ All Beta 500 secrets created successfully"

# Grant access to service account
echo "Granting access to service account: $SERVICE_ACCOUNT"

for secret in BETA_MAX_USERS BETA_AI_CREDITS BETA_DURATION_DAYS \
  CREDIT_RATE_LIVE_DUBBING CREDIT_RATE_AI_SEARCH CREDIT_RATE_AI_RECOMMENDATIONS \
  BETA_CREDIT_WARNING_THRESHOLD BETA_CREDIT_CRITICAL_THRESHOLD \
  SESSION_CHECKPOINT_INTERVAL_SECONDS SESSION_CLEANUP_INTERVAL_SECONDS SESSION_TIMEOUT_SECONDS \
  EMAIL_VERIFICATION_TOKEN_EXPIRY_HOURS EMAIL_VERIFICATION_SECRET_KEY \
  BETA_LANDING_PAGE_URL BETA_SUPPORT_EMAIL; do

  gcloud secrets add-iam-policy-binding $secret \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/secretmanager.secretAccessor" \
    --quiet
done

echo "✅ Service account access granted for all secrets"

# Regenerate .env files
echo "Regenerating .env files from secrets..."
./scripts/sync-gcloud-secrets.sh

echo "✅ Beta 500 secrets setup complete!"
```

**Make executable and run**:
```bash
chmod +x scripts/create-beta-500-secrets.sh
./scripts/create-beta-500-secrets.sh
```

---

## Updating Existing Secrets

To update a secret value:

```bash
# Method 1: Create new version
echo "NEW_VALUE" | gcloud secrets versions add SECRET_NAME --data-file=-

# Method 2: Delete and recreate (if needed)
gcloud secrets delete SECRET_NAME --quiet
echo "NEW_VALUE" | gcloud secrets create SECRET_NAME --data-file=- --replication-policy="automatic"
```

After updating secrets, **ALWAYS regenerate .env files**:
```bash
./scripts/sync-gcloud-secrets.sh
```

---

## Viewing Secrets

```bash
# List all Beta 500 secrets
gcloud secrets list --filter="labels.feature=beta-500"

# View secret metadata
gcloud secrets describe BETA_MAX_USERS

# View secret value (requires secretAccessor role)
gcloud secrets versions access latest --secret="BETA_MAX_USERS"

# View all versions
gcloud secrets versions list BETA_MAX_USERS
```

---

## Verification Checklist

After creating secrets, verify:

- [ ] All 16 Beta 500 secrets created in Google Cloud
- [ ] Service account has secretAccessor role for all secrets
- [ ] EMAIL_VERIFICATION_SECRET_KEY is unique (64+ hex characters)
- [ ] TWILIO credentials are valid (test SMS send)
- [ ] Secrets have correct labels (`feature=beta-500`)
- [ ] ./scripts/sync-gcloud-secrets.sh runs successfully
- [ ] backend/.env contains all Beta 500 environment variables
- [ ] Backend server starts without missing config errors
- [ ] Settings validation passes at startup

---

## Security Best Practices

1. **Never commit `.env` files** to version control
2. **Rotate EMAIL_VERIFICATION_SECRET_KEY** every 90 days
3. **Rotate TWILIO_AUTH_TOKEN** every 6 months
4. **Use separate secrets for staging vs production** when appropriate
5. **Monitor secret access** via Cloud Audit Logs
6. **Limit service account permissions** to secretAccessor only
7. **Enable Secret Manager notifications** for critical secrets
8. **Review IAM policies** monthly

---

## Troubleshooting

### Secret not found
```bash
# Verify secret exists
gcloud secrets list --filter="name:BETA_MAX_USERS"

# Check if you have access
gcloud secrets versions access latest --secret="BETA_MAX_USERS"
```

### Permission denied
```bash
# Verify service account has access
gcloud secrets get-iam-policy BETA_MAX_USERS

# Grant access if needed
gcloud secrets add-iam-policy-binding BETA_MAX_USERS \
  --member="serviceAccount:bayit-plus-backend@bayit-plus.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### .env not regenerating
```bash
# Check sync script has execute permission
chmod +x ./scripts/sync-gcloud-secrets.sh

# Run with debug output
bash -x ./scripts/sync-gcloud-secrets.sh

# Verify GCloud authentication
gcloud auth list
```

---

## References

- [Global Secrets Management Guide](./SECRETS_MANAGEMENT.md)
- [Beta 500 Implementation Plan](../../BETA_500_REVISED_PLAN.md)
- [Google Cloud Secret Manager Documentation](https://cloud.google.com/secret-manager/docs)
- [Secrets Sync Script](../../scripts/sync-gcloud-secrets.sh)
