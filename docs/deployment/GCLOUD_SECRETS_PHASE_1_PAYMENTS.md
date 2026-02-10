# Google Cloud Secrets - Phase 1 Mobile Payments

**CRITICAL**: This file documents the required Google Cloud secrets for Phase 1 mobile payment functionality.

**DO NOT edit `.env` files directly.** All secrets must be added to Google Cloud Secret Manager first, then regenerated using `./scripts/sync-gcloud-secrets.sh`.

See [Secrets Management Guide](SECRETS_MANAGEMENT.md) for complete workflow.

---

## Required Secrets

### 1. STRIPE_PUBLISHABLE_KEY (Mobile App)

**Secret Name**: `STRIPE_PUBLISHABLE_KEY`
**Description**: Stripe publishable API key for mobile Payment Sheet integration
**Type**: String
**Required**: Yes
**Default**: None (must be explicitly set)
**Used By**: Mobile app (iOS/Android)

**Value Format**:
```
pk_test_... (test mode)
pk_live_... (production mode)
```

**GCloud Commands**:

```bash
# Add secret to Google Cloud Secret Manager
gcloud secrets create STRIPE_PUBLISHABLE_KEY \
  --project=bayit-plus \
  --replication-policy="automatic" \
  --data-file=- <<< "pk_test_YOUR_PUBLISHABLE_KEY_HERE"

# Grant access to mobile app service account
gcloud secrets add-iam-policy-binding STRIPE_PUBLISHABLE_KEY \
  --project=bayit-plus \
  --member="serviceAccount:mobile-app@bayit-plus.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Verify secret exists
gcloud secrets describe STRIPE_PUBLISHABLE_KEY --project=bayit-plus

# Access secret value (for verification only)
gcloud secrets versions access latest --secret="STRIPE_PUBLISHABLE_KEY" --project=bayit-plus
```

### 2. STRIPE_SECRET_KEY (Backend)

**Secret Name**: `STRIPE_SECRET_KEY`
**Description**: Stripe secret API key for backend payment intent creation
**Type**: String
**Required**: Yes
**Default**: None (must be explicitly set)
**Used By**: Backend API (payment endpoints)

**Value Format**:
```
sk_test_... (test mode)
sk_live_... (production mode)
```

**GCloud Commands**:

```bash
# Add secret to Google Cloud Secret Manager
gcloud secrets create STRIPE_SECRET_KEY \
  --project=bayit-plus \
  --replication-policy="automatic" \
  --data-file=- <<< "sk_test_YOUR_SECRET_KEY_HERE"

# Grant access to backend service account
gcloud secrets add-iam-policy-binding STRIPE_SECRET_KEY \
  --project=bayit-plus \
  --member="serviceAccount:backend-api@bayit-plus.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Verify secret exists
gcloud secrets describe STRIPE_SECRET_KEY --project=bayit-plus
```

---

## Deployment Workflow

### Step 1: Add Secrets to Google Cloud

```bash
# Navigate to project root
cd /Users/olorin/Documents/Projects/olorin/olorin-media/bayit-plus

# Add STRIPE_PUBLISHABLE_KEY
gcloud secrets create STRIPE_PUBLISHABLE_KEY \
  --project=bayit-plus \
  --data-file=- <<< "pk_test_YOUR_KEY_HERE"

# Add STRIPE_SECRET_KEY
gcloud secrets create STRIPE_SECRET_KEY \
  --project=bayit-plus \
  --data-file=- <<< "sk_test_YOUR_KEY_HERE"
```

### Step 2: Grant Service Account Access

```bash
# Mobile app service account
gcloud secrets add-iam-policy-binding STRIPE_PUBLISHABLE_KEY \
  --project=bayit-plus \
  --member="serviceAccount:mobile-app@bayit-plus.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Backend service account
gcloud secrets add-iam-policy-binding STRIPE_SECRET_KEY \
  --project=bayit-plus \
  --member="serviceAccount:backend-api@bayit-plus.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### Step 3: Regenerate .env Files from GCloud

```bash
# Regenerate .env files from Google Cloud secrets
./scripts/sync-gcloud-secrets.sh

# This will update:
# - backend/.env (STRIPE_SECRET_KEY)
# - mobile-app/.env (STRIPE_PUBLISHABLE_KEY)
```

### Step 4: Restart Services

```bash
# Restart backend
cd backend
poetry run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Restart mobile app
cd mobile-app
npm run ios  # or npm run android
```

---

## Stripe Test Cards

Use these test card numbers for testing payment flows:

| Card Type | Number | CVC | Expiry | Result |
|-----------|--------|-----|--------|--------|
| Success | 4242 4242 4242 4242 | Any 3 digits | Any future date | Payment succeeds |
| Decline | 4000 0000 0000 0002 | Any 3 digits | Any future date | Payment declined |
| Requires 3DS | 4000 0025 0000 3155 | Any 3 digits | Any future date | Requires authentication |

---

## Verification Checklist

After deployment, verify:

- [ ] STRIPE_PUBLISHABLE_KEY exists in Google Cloud Secret Manager
- [ ] STRIPE_SECRET_KEY exists in Google Cloud Secret Manager
- [ ] Mobile app service account can access STRIPE_PUBLISHABLE_KEY
- [ ] Backend service account can access STRIPE_SECRET_KEY
- [ ] `.env` files regenerated via sync script (not edited directly)
- [ ] Backend `/health` endpoint returns 200
- [ ] Backend `/api/v1/payments/create-payment-intent` endpoint exists
- [ ] Mobile app can initialize Stripe SDK (no errors in logs)
- [ ] Payment flow works with test card 4242 4242 4242 4242

---

## Rollback Procedure

If deployment fails:

```bash
# Revert secrets to previous version
gcloud secrets versions list STRIPE_PUBLISHABLE_KEY --project=bayit-plus
gcloud secrets versions access VERSION_NUMBER --secret="STRIPE_PUBLISHABLE_KEY" > /tmp/old_key
gcloud secrets versions add STRIPE_PUBLISHABLE_KEY --data-file=/tmp/old_key

# Regenerate .env files
./scripts/sync-gcloud-secrets.sh

# Restart services
./scripts/restart-services.sh
```

---

## Related Documentation

- [Secrets Management Guide](SECRETS_MANAGEMENT.md) - Complete secrets workflow
- [Payment Implementation](../implementation/PHASE_1_PAYMENT_IMPLEMENTATION.md) - Payment feature specification
- [Critical Fixes](../implementation/PHASE_1_CRITICAL_FIXES.md) - Zero-tolerance compliance fixes
