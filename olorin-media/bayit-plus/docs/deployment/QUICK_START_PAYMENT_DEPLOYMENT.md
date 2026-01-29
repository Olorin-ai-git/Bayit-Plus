# Quick Start: Payment Flow Deployment

**Date:** 2026-01-29
**Target:** Immediate 100% rollout (no users yet)
**Duration:** ~10 minutes

---

## Prerequisites

✅ **gcloud CLI** installed and authenticated
✅ **Appropriate IAM permissions** to create secrets
✅ **Service accounts** exist:
- `bayit-plus-backend@YOUR_PROJECT_ID.iam.gserviceaccount.com`
- `bayit-plus-web@YOUR_PROJECT_ID.iam.gserviceaccount.com`

Check authentication:
```bash
gcloud auth list
gcloud config get-value project
```

---

## Deployment Steps (3 Steps)

### Step 1: Deploy Secrets to Google Cloud (2 minutes)

```bash
cd /Users/olorin/Documents/olorin/olorin-media/bayit-plus

# Deploy all payment flow secrets
./scripts/deploy-payment-flow-config.sh

# Or specify project explicitly:
./scripts/deploy-payment-flow-config.sh YOUR_PROJECT_ID
```

**What this does:**
- Creates 10 secrets in Google Cloud Secret Manager
- Sets `REQUIRE_PAYMENT_ON_SIGNUP=true` (ENABLED)
- Sets `REQUIRE_PAYMENT_ON_SIGNUP_PERCENTAGE=100` (all users)
- Sets `SIGNUP_TRIAL_PERIOD_DAYS=7` (7-day free trial)
- Grants service account permissions
- Verifies all secrets created successfully

**Expected output:**
```
✓ All secrets verified successfully
Next Steps: Regenerate .env files...
```

---

### Step 2: Regenerate .env Files (1 minute)

```bash
# Sync all .env files from Google Cloud
./scripts/sync-gcloud-secrets.sh all

# Or sync individually:
./scripts/sync-gcloud-secrets.sh backend
./scripts/sync-gcloud-secrets.sh web
```

**What this does:**
- Fetches all secrets from Google Cloud Secret Manager
- Generates `backend/.env` with payment configuration
- Generates `web/.env` with payment configuration
- Creates backups of old .env files (`.env.backup.TIMESTAMP`)

**Verify secrets loaded:**
```bash
# Backend
grep REQUIRE_PAYMENT_ON_SIGNUP backend/.env
# Should output: REQUIRE_PAYMENT_ON_SIGNUP=true

# Web
grep REACT_APP_PAYMENT_STATUS_POLL_INTERVAL_MS web/.env
# Should output: REACT_APP_PAYMENT_STATUS_POLL_INTERVAL_MS=5000
```

---

### Step 3: Restart Services (5 minutes)

#### Local Development:

**Backend:**
```bash
cd backend
poetry run python -m app.local_server
```

**Frontend:**
```bash
cd web
npm start
```

#### Production (Kubernetes):

**Backend:**
```bash
kubectl rollout restart deployment/bayit-plus-backend
kubectl rollout status deployment/bayit-plus-backend
```

**Frontend:**
```bash
kubectl rollout restart deployment/bayit-plus-web
kubectl rollout status deployment/bayit-plus-web
```

---

## Verification Checklist

After deployment, verify the payment flow is working:

### 1. Backend Health Check
```bash
curl http://localhost:8090/health
# Should return: {"status": "healthy"}
```

### 2. Register New User
```bash
# Navigate to: http://localhost:3000/register
# Fill in registration form
# Submit
```

**Expected behavior:**
- ✅ User created with `payment_pending=true`
- ✅ Redirected to home page
- ✅ PaymentPendingGuard intercepts and shows payment page
- ✅ "Continue to Payment" button generates Stripe Checkout URL

### 3. Check Metrics (if Prometheus enabled)
```bash
curl http://localhost:8090/metrics | grep signup
```

Expected metrics:
```
signup_started_total{method="email"} 1
signup_payment_required_total{plan_tier="basic"} 1
```

### 4. Test Stripe Checkout (Staging/Prod)
- Click "Continue to Payment"
- Redirected to Stripe Checkout
- Use Stripe test card: `4242 4242 4242 4242`
- Complete payment
- Redirected to `/payment/success`
- User logged out (session rotation)
- Login again → Full access (payment_pending=false)

---

## Configuration Summary

| Secret | Value | Description |
|--------|-------|-------------|
| `REQUIRE_PAYMENT_ON_SIGNUP` | `true` | ✅ **ENABLED** - Payment required |
| `REQUIRE_PAYMENT_ON_SIGNUP_PERCENTAGE` | `100` | 100% of users (all) |
| `SIGNUP_TRIAL_PERIOD_DAYS` | `7` | 7-day free trial |
| `PAYMENT_SUCCESS_PATH` | `/payment/success` | Success redirect |
| `PAYMENT_CANCELLED_PATH` | `/payment/cancelled` | Cancel redirect |
| `PAYMENT_STATUS_POLL_INTERVAL_MS` | `5000` | Backend polling: 5s |
| `PAYMENT_PENDING_CLEANUP_DAYS` | `7` | Cleanup after 7 days |
| `PAYMENT_CHECKOUT_SESSION_TTL_HOURS` | `24` | Checkout expires: 24h |
| `PAYMENT_CONVERSION_THRESHOLD` | `0.40` | Rollback if < 40% |
| `REACT_APP_PAYMENT_STATUS_POLL_INTERVAL_MS` | `5000` | Frontend polling: 5s |

---

## User Experience Flow

```
┌────────────────────────────────────────────────────────────┐
│ 1. User visits bayit.plus                                  │
└────────────────────────────────────────────────────────────┘
                         ↓
┌────────────────────────────────────────────────────────────┐
│ 2. Clicks "Sign Up"                                        │
└────────────────────────────────────────────────────────────┘
                         ↓
┌────────────────────────────────────────────────────────────┐
│ 3. Fills registration form (name, email, password)        │
└────────────────────────────────────────────────────────────┘
                         ↓
┌────────────────────────────────────────────────────────────┐
│ 4. Submits → Account created with payment_pending=true    │
└────────────────────────────────────────────────────────────┘
                         ↓
┌────────────────────────────────────────────────────────────┐
│ 5. Redirected to home → PaymentPendingGuard intercepts    │
│    Shows: "Complete Your Subscription"                    │
│    Plan options: Basic, Premium, Family                   │
└────────────────────────────────────────────────────────────┘
                         ↓
┌────────────────────────────────────────────────────────────┐
│ 6. User clicks "Continue to Payment"                      │
│    → Fresh Stripe Checkout URL generated                  │
└────────────────────────────────────────────────────────────┘
                         ↓
┌────────────────────────────────────────────────────────────┐
│ 7. Redirected to Stripe Checkout                          │
│    Enters credit card details                             │
│    ⚠️  Card required but NOT charged for 7 days           │
└────────────────────────────────────────────────────────────┘
                         ↓
┌────────────────────────────────────────────────────────────┐
│ 8. Payment completed → Webhook received                   │
│    User activated: payment_pending=false                  │
│    Session rotated (logout + redirect to login)           │
└────────────────────────────────────────────────────────────┘
                         ↓
┌────────────────────────────────────────────────────────────┐
│ 9. User logs in → Full access to Bayit+ content! 🎉       │
│    7-day free trial starts (card charged on day 8)        │
└────────────────────────────────────────────────────────────┘
```

---

## Troubleshooting

### Secrets not loading
```bash
# Check GCloud authentication
gcloud auth list
gcloud auth application-default login

# Check project
gcloud config get-value project
gcloud config set project YOUR_PROJECT_ID

# List secrets
gcloud secrets list | grep PAYMENT
```

### Backend fails to start
```bash
# Check .env file exists
ls -la backend/.env

# Check secrets loaded
grep REQUIRE_PAYMENT_ON_SIGNUP backend/.env

# Check logs
cd backend
poetry run python -m app.local_server 2>&1 | grep -i payment
```

### Frontend fails to start
```bash
# Check .env file exists
ls -la web/.env

# Check secrets loaded
grep REACT_APP_PAYMENT web/.env

# Clear build cache
cd web
rm -rf node_modules/.cache
npm start
```

### Payment page not showing
```bash
# Check user has payment_pending=true
# Check PaymentPendingGuard is in App.tsx
grep -r "PaymentPendingGuard" web/src/App.tsx

# Check routes exist
grep -r "/payment/success" web/src/App.tsx
```

---

## Rollback (Emergency Disable)

If you need to disable the payment requirement:

```bash
# 1. Disable feature
gcloud secrets versions add REQUIRE_PAYMENT_ON_SIGNUP \
  --data-file=- <<< "false"

# 2. Regenerate .env
./scripts/sync-gcloud-secrets.sh all

# 3. Restart services
kubectl rollout restart deployment/bayit-plus-backend
kubectl rollout restart deployment/bayit-plus-web

# 4. Revert existing payment_pending users
cd backend
poetry run python scripts/rollback_payment_pending.py --execute
```

---

## Support

- **Documentation:** [Secrets Management](./SECRETS_MANAGEMENT.md)
- **Payment Secrets:** [GCloud Secrets - Payment Flow](./GCLOUD_SECRETS_PAYMENT_FLOW.md)
- **Implementation Plan:** `/Users/olorin/.claude/plans/sleepy-zooming-salamander.md`

---

## Success Criteria

✅ All 10 secrets created in Google Cloud
✅ .env files regenerated from secrets
✅ Backend starts without errors
✅ Frontend starts without errors
✅ New user registration creates payment_pending=true
✅ PaymentPendingGuard shows payment page
✅ Stripe Checkout URL generates successfully
✅ Payment completion activates user

**Deployment Status:** Ready for immediate 100% rollout! 🚀
