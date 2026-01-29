# Google Cloud Secrets: Librarian & WebAuthn Configuration

**Created:** 2026-01-29
**Status:** New Secrets Required
**Related:** Backend Configuration, Librarian Agent, WebAuthn/Passkeys

## Overview

This document describes the new environment variables required for:
- **Librarian Agent** - AI-powered content audit and maintenance system
- **WebAuthn** - Passkey-based authentication system

These secrets must be added to Google Cloud Secret Manager and then synced to `.env` files.

## ⚠️ CRITICAL WORKFLOW

**NEVER edit `.env` or `.env.example` files directly.**

### Required Steps:
```bash
# 1. Add secrets to Google Cloud Secret Manager (commands below)
# 2. Update sync script to include new secrets
# 3. Regenerate .env files from GCloud
./scripts/sync-gcloud-secrets.sh backend
# 4. Restart backend
cd backend && poetry run python -m app.local_server
```

---

## Librarian Agent Secrets

### Daily Audit Configuration

| Secret Name | Type | Default Value | Description |
|------------|------|---------------|-------------|
| `LIBRARIAN_DAILY_AUDIT_CRON` | string | `0 2 * * *` | Cron schedule for daily audits (2:00 AM) |
| `LIBRARIAN_DAILY_AUDIT_TIME` | string | `2:00 AM Israel Time` | Human-readable schedule |
| `LIBRARIAN_DAILY_AUDIT_MODE` | string | `Rule-based` | Audit mode (Rule-based or AI Agent) |
| `LIBRARIAN_DAILY_AUDIT_COST` | string | `~$0.01/day` | Estimated daily cost |
| `LIBRARIAN_DAILY_AUDIT_STATUS` | string | `ENABLED` | ENABLED or DISABLED |
| `LIBRARIAN_DAILY_AUDIT_DESCRIPTION` | string | `Scans recent content and random 10% sample. Auto-fixes safe issues.` | Description |

### Weekly Audit Configuration

| Secret Name | Type | Default Value | Description |
|------------|------|---------------|-------------|
| `LIBRARIAN_WEEKLY_AUDIT_CRON` | string | `0 3 * * 0` | Cron schedule for weekly audits (Sundays 3:00 AM) |
| `LIBRARIAN_WEEKLY_AUDIT_TIME` | string | `Sundays 3:00 AM Israel Time` | Human-readable schedule |
| `LIBRARIAN_WEEKLY_AUDIT_MODE` | string | `AI Agent` | Audit mode (AI Agent with Claude) |
| `LIBRARIAN_WEEKLY_AUDIT_COST` | string | `~$0.50/week` | Estimated weekly cost |
| `LIBRARIAN_WEEKLY_AUDIT_STATUS` | string | `ENABLED` | ENABLED or DISABLED |
| `LIBRARIAN_WEEKLY_AUDIT_DESCRIPTION` | string | `Claude decides what to check and fix. Sends email only for major issues.` | Description |

### Librarian Limits & Budget

| Secret Name | Type | Default Value | Description |
|------------|------|---------------|-------------|
| `LIBRARIAN_MAX_ITERATIONS` | integer | `50` | Maximum audit iterations |
| `LIBRARIAN_DEFAULT_BUDGET_USD` | float | `10.0` | Default AI budget per audit (USD) |
| `LIBRARIAN_MIN_BUDGET_USD` | float | `0.1` | Minimum budget (USD) |
| `LIBRARIAN_MAX_BUDGET_USD` | float | `20.0` | Maximum budget (USD) |
| `LIBRARIAN_BUDGET_STEP_USD` | float | `0.5` | Budget increment step (USD) |

### Librarian UI & Pagination

| Secret Name | Type | Default Value | Description |
|------------|------|---------------|-------------|
| `LIBRARIAN_REPORTS_LIMIT` | integer | `10` | Max reports per page |
| `LIBRARIAN_ACTIONS_LIMIT` | integer | `50` | Max actions per page |
| `LIBRARIAN_ACTIVITY_PAGE_SIZE` | integer | `10` | Activity feed page size |
| `LIBRARIAN_ID_TRUNCATE_LENGTH` | integer | `8` | ID truncation length for display |
| `LIBRARIAN_MODAL_MAX_HEIGHT` | integer | `600` | Modal maximum height (pixels) |

---

## WebAuthn (Passkey) Secrets

### Relying Party Configuration

| Secret Name | Type | Default Value | Description |
|------------|------|---------------|-------------|
| `WEBAUTHN_RP_ID` | string | `bayit.tv` | Relying Party ID (must match domain) |
| `WEBAUTHN_RP_NAME` | string | `Bayit Plus` | Display name shown to users |
| `WEBAUTHN_ORIGIN` | string | `https://bayit.tv,https://www.bayit.tv` | Comma-separated allowed origins |

---

## Google Cloud Commands

### Add All Secrets to Google Cloud

```bash
# Set project
PROJECT_ID="bayit-plus-production"  # Replace with your project ID
gcloud config set project $PROJECT_ID

# ============================================
# LIBRARIAN DAILY AUDIT
# ============================================
gcloud secrets create LIBRARIAN_DAILY_AUDIT_CRON \
  --replication-policy="automatic" \
  --data-file=- <<< "0 2 * * *"

gcloud secrets create LIBRARIAN_DAILY_AUDIT_TIME \
  --replication-policy="automatic" \
  --data-file=- <<< "2:00 AM Israel Time"

gcloud secrets create LIBRARIAN_DAILY_AUDIT_MODE \
  --replication-policy="automatic" \
  --data-file=- <<< "Rule-based"

gcloud secrets create LIBRARIAN_DAILY_AUDIT_COST \
  --replication-policy="automatic" \
  --data-file=- <<< "~\$0.01/day"

gcloud secrets create LIBRARIAN_DAILY_AUDIT_STATUS \
  --replication-policy="automatic" \
  --data-file=- <<< "ENABLED"

gcloud secrets create LIBRARIAN_DAILY_AUDIT_DESCRIPTION \
  --replication-policy="automatic" \
  --data-file=- <<< "Scans recent content and random 10% sample. Auto-fixes safe issues."

# ============================================
# LIBRARIAN WEEKLY AUDIT
# ============================================
gcloud secrets create LIBRARIAN_WEEKLY_AUDIT_CRON \
  --replication-policy="automatic" \
  --data-file=- <<< "0 3 * * 0"

gcloud secrets create LIBRARIAN_WEEKLY_AUDIT_TIME \
  --replication-policy="automatic" \
  --data-file=- <<< "Sundays 3:00 AM Israel Time"

gcloud secrets create LIBRARIAN_WEEKLY_AUDIT_MODE \
  --replication-policy="automatic" \
  --data-file=- <<< "AI Agent"

gcloud secrets create LIBRARIAN_WEEKLY_AUDIT_COST \
  --replication-policy="automatic" \
  --data-file=- <<< "~\$0.50/week"

gcloud secrets create LIBRARIAN_WEEKLY_AUDIT_STATUS \
  --replication-policy="automatic" \
  --data-file=- <<< "ENABLED"

gcloud secrets create LIBRARIAN_WEEKLY_AUDIT_DESCRIPTION \
  --replication-policy="automatic" \
  --data-file=- <<< "Claude decides what to check and fix. Sends email only for major issues."

# ============================================
# LIBRARIAN LIMITS & BUDGET
# ============================================
gcloud secrets create LIBRARIAN_MAX_ITERATIONS \
  --replication-policy="automatic" \
  --data-file=- <<< "50"

gcloud secrets create LIBRARIAN_DEFAULT_BUDGET_USD \
  --replication-policy="automatic" \
  --data-file=- <<< "10.0"

gcloud secrets create LIBRARIAN_MIN_BUDGET_USD \
  --replication-policy="automatic" \
  --data-file=- <<< "0.1"

gcloud secrets create LIBRARIAN_MAX_BUDGET_USD \
  --replication-policy="automatic" \
  --data-file=- <<< "20.0"

gcloud secrets create LIBRARIAN_BUDGET_STEP_USD \
  --replication-policy="automatic" \
  --data-file=- <<< "0.5"

# ============================================
# LIBRARIAN UI & PAGINATION
# ============================================
gcloud secrets create LIBRARIAN_REPORTS_LIMIT \
  --replication-policy="automatic" \
  --data-file=- <<< "10"

gcloud secrets create LIBRARIAN_ACTIONS_LIMIT \
  --replication-policy="automatic" \
  --data-file=- <<< "50"

gcloud secrets create LIBRARIAN_ACTIVITY_PAGE_SIZE \
  --replication-policy="automatic" \
  --data-file=- <<< "10"

gcloud secrets create LIBRARIAN_ID_TRUNCATE_LENGTH \
  --replication-policy="automatic" \
  --data-file=- <<< "8"

gcloud secrets create LIBRARIAN_MODAL_MAX_HEIGHT \
  --replication-policy="automatic" \
  --data-file=- <<< "600"

# ============================================
# WEBAUTHN (PASSKEYS)
# ============================================
gcloud secrets create WEBAUTHN_RP_ID \
  --replication-policy="automatic" \
  --data-file=- <<< "bayit.tv"

gcloud secrets create WEBAUTHN_RP_NAME \
  --replication-policy="automatic" \
  --data-file=- <<< "Bayit Plus"

gcloud secrets create WEBAUTHN_ORIGIN \
  --replication-policy="automatic" \
  --data-file=- <<< "https://bayit.tv,https://www.bayit.tv"
```

### Grant Access to Service Accounts

```bash
# Grant access to Cloud Run service account (replace with your service account)
SERVICE_ACCOUNT="bayit-plus-backend@bayit-plus-production.iam.gserviceaccount.com"

# Librarian secrets
for SECRET in LIBRARIAN_DAILY_AUDIT_CRON LIBRARIAN_DAILY_AUDIT_TIME LIBRARIAN_DAILY_AUDIT_MODE \
  LIBRARIAN_DAILY_AUDIT_COST LIBRARIAN_DAILY_AUDIT_STATUS LIBRARIAN_DAILY_AUDIT_DESCRIPTION \
  LIBRARIAN_WEEKLY_AUDIT_CRON LIBRARIAN_WEEKLY_AUDIT_TIME LIBRARIAN_WEEKLY_AUDIT_MODE \
  LIBRARIAN_WEEKLY_AUDIT_COST LIBRARIAN_WEEKLY_AUDIT_STATUS LIBRARIAN_WEEKLY_AUDIT_DESCRIPTION \
  LIBRARIAN_MAX_ITERATIONS LIBRARIAN_DEFAULT_BUDGET_USD LIBRARIAN_MIN_BUDGET_USD \
  LIBRARIAN_MAX_BUDGET_USD LIBRARIAN_BUDGET_STEP_USD LIBRARIAN_REPORTS_LIMIT \
  LIBRARIAN_ACTIONS_LIMIT LIBRARIAN_ACTIVITY_PAGE_SIZE LIBRARIAN_ID_TRUNCATE_LENGTH \
  LIBRARIAN_MODAL_MAX_HEIGHT; do

  gcloud secrets add-iam-policy-binding $SECRET \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/secretmanager.secretAccessor"
done

# WebAuthn secrets
for SECRET in WEBAUTHN_RP_ID WEBAUTHN_RP_NAME WEBAUTHN_ORIGIN; do
  gcloud secrets add-iam-policy-binding $SECRET \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/secretmanager.secretAccessor"
done
```

### Verify Secrets Created

```bash
# List all Librarian secrets
gcloud secrets list --filter="name~LIBRARIAN"

# List all WebAuthn secrets
gcloud secrets list --filter="name~WEBAUTHN"

# View a specific secret
gcloud secrets versions access latest --secret="LIBRARIAN_DAILY_AUDIT_CRON"
```

---

## Update Sync Script

After adding secrets to Google Cloud, update `/scripts/sync-gcloud-secrets.sh` to include these new secrets in the `PAYMENT_SECRETS` array (or create a new array).

---

## Regenerate .env Files

```bash
# Sync backend secrets from GCloud
./scripts/sync-gcloud-secrets.sh backend

# Verify .env file
cat backend/.env

# Restart backend
cd backend
poetry run python -m app.local_server
```

---

## Alternative: Temporary Local Development

For local development ONLY (not production), you can temporarily copy values from `.env.example`:

```bash
# ⚠️ LOCAL DEVELOPMENT ONLY - NOT FOR PRODUCTION
cd backend
grep -E "LIBRARIAN_|WEBAUTHN_" .env.example >> .env
```

**IMPORTANT:** This is a temporary workaround. Production MUST use Google Cloud Secret Manager.

---

## Verification

After syncing secrets and restarting:

```bash
# Test backend starts without errors
cd backend
poetry run python -m app.local_server

# Verify Librarian configuration
curl http://localhost:8000/api/v1/admin/librarian/config

# Verify WebAuthn configuration
curl http://localhost:8000/api/v1/auth/webauthn/config
```

---

## References

- [Secrets Management Guide](SECRETS_MANAGEMENT.md)
- [Google Cloud Secret Manager](https://cloud.google.com/secret-manager)
- [Librarian Agent Documentation](../features/LIBRARIAN_AGENT.md)
- [WebAuthn/Passkey Setup](../features/WEBAUTHN_PASSKEYS.md)
