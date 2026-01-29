# Google Cloud Secrets - Payment Flow Configuration

**Date:** 2026-01-29
**Feature:** Mandatory Subscription Payment Flow
**Single Source of Truth:** Google Cloud Secret Manager

---

## ⚠️ CRITICAL: Secrets Management Workflow

1. **Update Google Cloud Secrets** (single source of truth)
2. **Regenerate `.env` files** from GCloud secrets
3. **NEVER edit `.env` files directly**

---

## New Secrets to Add to Google Cloud Secret Manager

### Backend Secrets (bayit-plus-backend)

#### Payment Flow Feature Flags

```yaml
# Secret: REQUIRE_PAYMENT_ON_SIGNUP
# Description: Master switch for payment-required signup flow
# Type: boolean
# Default: false (safe default - feature disabled)
# Production: Set to true when ready to enable
REQUIRE_PAYMENT_ON_SIGNUP=false

# Secret: REQUIRE_PAYMENT_ON_SIGNUP_PERCENTAGE
# Description: Percentage of new signups requiring payment (0-100)
#              Used for gradual rollout: 0% → 5% → 25% → 50% → 100%
# Type: integer (0-100)
# Default: 0 (disabled)
# Rollout Plan:
#   - Phase 1: 5% (monitoring and testing)
#   - Phase 2: 25% (scaling validation)
#   - Phase 3: 50% (majority testing)
#   - Phase 4: 100% (full rollout)
REQUIRE_PAYMENT_ON_SIGNUP_PERCENTAGE=0
```

#### Payment Configuration

```yaml
# Secret: SIGNUP_TRIAL_PERIOD_DAYS
# Description: Free trial duration for new signups (Stripe subscription trial)
# Type: integer
# Default: 7
# Options: 0 (no trial), 7, 14, 30 days
# Note: Card required upfront, charged after trial
SIGNUP_TRIAL_PERIOD_DAYS=7

# Secret: PAYMENT_SUCCESS_PATH
# Description: Frontend path for successful payment redirect from Stripe
# Type: string (URL path)
# Default: /payment/success
PAYMENT_SUCCESS_PATH=/payment/success

# Secret: PAYMENT_CANCELLED_PATH
# Description: Frontend path for cancelled payment redirect from Stripe
# Type: string (URL path)
# Default: /payment/cancelled
PAYMENT_CANCELLED_PATH=/payment/cancelled

# Secret: PAYMENT_STATUS_POLL_INTERVAL_MS
# Description: Backend polling interval for payment status checks (milliseconds)
# Type: integer
# Default: 5000 (5 seconds)
# Note: Frontend also has its own polling interval
PAYMENT_STATUS_POLL_INTERVAL_MS=5000

# Secret: PAYMENT_PENDING_CLEANUP_DAYS
# Description: Days before deleting abandoned payment_pending users
# Type: integer
# Default: 7
# Note: Users who register but never complete payment are cleaned up
PAYMENT_PENDING_CLEANUP_DAYS=7

# Secret: PAYMENT_CHECKOUT_SESSION_TTL_HOURS
# Description: Stripe checkout session expiration time (hours)
# Type: integer
# Default: 24
PAYMENT_CHECKOUT_SESSION_TTL_HOURS=24
```

#### Rollback Configuration

```yaml
# Secret: PAYMENT_CONVERSION_THRESHOLD
# Description: Minimum acceptable payment conversion rate (0.0-1.0)
#              Triggers automatic rollback if conversion falls below threshold
# Type: float (0.0 to 1.0)
# Default: 0.40 (40% conversion minimum)
# Note: If signup-to-payment conversion < 40%, alert and consider rollback
PAYMENT_CONVERSION_THRESHOLD=0.40
```

### Frontend Secrets (bayit-plus-web)

```yaml
# Secret: REACT_APP_PAYMENT_STATUS_POLL_INTERVAL_MS
# Description: Frontend polling interval for checking payment status (milliseconds)
# Type: integer
# Default: 5000 (5 seconds)
# Note: Uses exponential backoff (doubles after 10 attempts)
REACT_APP_PAYMENT_STATUS_POLL_INTERVAL_MS=5000
```

---

## Deployment Steps

### 1. Add Secrets to Google Cloud

```bash
# Backend secrets
gcloud secrets create REQUIRE_PAYMENT_ON_SIGNUP \
  --data-file=- <<< "false"

gcloud secrets create REQUIRE_PAYMENT_ON_SIGNUP_PERCENTAGE \
  --data-file=- <<< "0"

gcloud secrets create SIGNUP_TRIAL_PERIOD_DAYS \
  --data-file=- <<< "7"

gcloud secrets create PAYMENT_SUCCESS_PATH \
  --data-file=- <<< "/payment/success"

gcloud secrets create PAYMENT_CANCELLED_PATH \
  --data-file=- <<< "/payment/cancelled"

gcloud secrets create PAYMENT_STATUS_POLL_INTERVAL_MS \
  --data-file=- <<< "5000"

gcloud secrets create PAYMENT_PENDING_CLEANUP_DAYS \
  --data-file=- <<< "7"

gcloud secrets create PAYMENT_CHECKOUT_SESSION_TTL_HOURS \
  --data-file=- <<< "24"

gcloud secrets create PAYMENT_CONVERSION_THRESHOLD \
  --data-file=- <<< "0.40"

# Frontend secret
gcloud secrets create REACT_APP_PAYMENT_STATUS_POLL_INTERVAL_MS \
  --data-file=- <<< "5000"
```

### 2. Grant Secret Access to Service Accounts

```bash
# Backend service account
gcloud secrets add-iam-policy-binding REQUIRE_PAYMENT_ON_SIGNUP \
  --member="serviceAccount:bayit-plus-backend@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Repeat for all secrets...
```

### 3. Regenerate .env Files

```bash
# Run your secrets sync script
./scripts/sync-gcloud-secrets.sh

# Or manually regenerate
gcloud secrets versions access latest --secret="REQUIRE_PAYMENT_ON_SIGNUP" >> backend/.env
# ... etc
```

### 4. Restart Services

```bash
# Backend
kubectl rollout restart deployment/bayit-plus-backend

# Frontend
kubectl rollout restart deployment/bayit-plus-web
```

---

## Gradual Rollout Plan

### Phase 1: Monitoring (5% rollout)
```bash
gcloud secrets versions add REQUIRE_PAYMENT_ON_SIGNUP --data-file=- <<< "true"
gcloud secrets versions add REQUIRE_PAYMENT_ON_SIGNUP_PERCENTAGE --data-file=- <<< "5"
```
- **Duration:** 48 hours
- **Monitor:** Conversion rate, error rate, support tickets
- **Rollback if:** Conversion < 40%, error rate > 5%

### Phase 2: Scaling (25% rollout)
```bash
gcloud secrets versions add REQUIRE_PAYMENT_ON_SIGNUP_PERCENTAGE --data-file=- <<< "25"
```
- **Duration:** 72 hours
- **Monitor:** Same as Phase 1
- **Rollback if:** Same thresholds

### Phase 3: Majority (50% rollout)
```bash
gcloud secrets versions add REQUIRE_PAYMENT_ON_SIGNUP_PERCENTAGE --data-file=- <<< "50"
```
- **Duration:** 1 week
- **Monitor:** Same as Phase 1

### Phase 4: Full Rollout (100%)
```bash
gcloud secrets versions add REQUIRE_PAYMENT_ON_SIGNUP_PERCENTAGE --data-file=- <<< "100"
```
- **Duration:** Ongoing
- **Monitor:** Weekly reviews

---

## Emergency Rollback

### Disable Feature Immediately
```bash
gcloud secrets versions add REQUIRE_PAYMENT_ON_SIGNUP --data-file=- <<< "false"

# Regenerate .env and restart
./scripts/sync-gcloud-secrets.sh
kubectl rollout restart deployment/bayit-plus-backend
```

### Revert Users to Viewer
```bash
poetry run python backend/scripts/rollback_payment_pending.py --execute
```

---

## Monitoring Alerts

Set up alerts in Google Cloud Monitoring:

1. **Low Conversion Rate:**
   - Metric: `signup_payment_completed / signup_payment_required`
   - Threshold: < 0.40
   - Action: Alert ops team

2. **High Payment Pending Queue:**
   - Metric: `payment_pending_queue_size`
   - Threshold: > 500
   - Action: Investigate bottleneck

3. **Webhook Failures:**
   - Metric: `webhook_processing_errors`
   - Threshold: > 5%
   - Action: Check Stripe integration

---

## Related Documentation

- [Implementation Plan](/Users/olorin/.claude/plans/sleepy-zooming-salamander.md)
- [Security Tests](../../backend/tests/security/test_payment_security.py)
- [Migration Script](../../backend/scripts/restrict_viewer_access.py)
- [Rollback Script](../../backend/scripts/rollback_payment_pending.py)

---

## Notes

- All secrets use **safe defaults** (feature disabled)
- Gradual rollout via percentage-based bucketing
- Hash-based user assignment (consistent across restarts)
- Automatic rollback trigger at 40% conversion threshold
- Prometheus metrics track all key indicators
