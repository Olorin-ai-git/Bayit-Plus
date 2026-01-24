# Audit Recovery System - Deployment Guide

**Status:** Deployment Guide
**Author:** Claude Code
**Date:** 2026-01-24
**Last Updated:** 2026-01-24

## Overview

This guide covers deploying the Audit Recovery System to all environments: local development, staging, and production.

## Prerequisites

- Google Cloud SDK (`gcloud`) installed and authenticated
- Access to `bayit-plus` GCP project
- Permission to create/update GCP secrets
- Backend repository cloned locally

## Configuration Values

The audit recovery system uses three configuration settings:

| Setting | Environment Variable | Default | Description |
|---------|---------------------|---------|-------------|
| **Stuck Timeout** | `AUDIT_STUCK_TIMEOUT_MINUTES` | 30 | Minutes before audit considered stuck |
| **No Activity Timeout** | `AUDIT_NO_ACTIVITY_TIMEOUT_MINUTES` | 15 | Minutes without activity = suspicious |
| **Check Interval** | `AUDIT_HEALTH_CHECK_INTERVAL_SECONDS` | 300 | How often to check (5 minutes) |

## Deployment Steps

### 1. Local Development

**Option A: Using .env file (Recommended)**

The settings are already added to your `.env` file:

```bash
# Already in .env
AUDIT_STUCK_TIMEOUT_MINUTES=30
AUDIT_NO_ACTIVITY_TIMEOUT_MINUTES=15
AUDIT_HEALTH_CHECK_INTERVAL_SECONDS=300
```

Restart your backend:
```bash
poetry run uvicorn app.main:app --reload
```

**Option B: Using Docker Compose**

The settings are already added to `docker-compose.yml`:

```bash
docker-compose up -d backend
```

### 2. Google Cloud Secret Manager

Add the secrets to GCP Secret Manager (one-time setup):

```bash
cd /path/to/bayit-plus/backend
./scripts/production/deployment/add_audit_recovery_secrets.sh
```

This script will:
- Create three new secrets in GCP Secret Manager
- Set default values (30, 15, 300)
- Add labels for organization (category=librarian)
- Skip if secrets already exist

**Verify secrets were created:**

```bash
gcloud secrets list --project=bayit-plus --filter='labels.category=librarian'
```

**Expected output:**
```
NAME                                      CREATED              REPLICATION_POLICY  LOCATIONS
bayit-audit-health-check-interval-seconds 2026-01-24T...      automatic           -
bayit-audit-no-activity-timeout-minutes   2026-01-24T...      automatic           -
bayit-audit-stuck-timeout-minutes         2026-01-24T...      automatic           -
```

### 3. Retrieve Secrets Script

The `retrieve_secrets.sh` script has been updated to fetch these secrets:

```bash
./retrieve_secrets.sh > .env.production
```

The script now includes:
```bash
echo "# LIBRARIAN AUDIT RECOVERY"
echo "AUDIT_STUCK_TIMEOUT_MINUTES=$(get_secret bayit-audit-stuck-timeout-minutes || echo '30')"
echo "AUDIT_NO_ACTIVITY_TIMEOUT_MINUTES=$(get_secret bayit-audit-no-activity-timeout-minutes || echo '15')"
echo "AUDIT_HEALTH_CHECK_INTERVAL_SECONDS=$(get_secret bayit-audit-health-check-interval-seconds || echo '300')"
```

**Note**: The `|| echo` fallback ensures the system works even if secrets don't exist (uses defaults).

### 4. Cloud Run Deployment

**If using Cloud Run, add environment variables:**

```bash
gcloud run services update bayit-backend \
  --project=bayit-plus \
  --region=us-central1 \
  --update-env-vars="AUDIT_STUCK_TIMEOUT_MINUTES=30,AUDIT_NO_ACTIVITY_TIMEOUT_MINUTES=15,AUDIT_HEALTH_CHECK_INTERVAL_SECONDS=300"
```

**Or create a `cloudrun.yaml` file:**

```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: bayit-backend
spec:
  template:
    spec:
      containers:
      - image: gcr.io/bayit-plus/backend:latest
        env:
        - name: AUDIT_STUCK_TIMEOUT_MINUTES
          value: "30"
        - name: AUDIT_NO_ACTIVITY_TIMEOUT_MINUTES
          value: "15"
        - name: AUDIT_HEALTH_CHECK_INTERVAL_SECONDS
          value: "300"
```

Deploy:
```bash
gcloud run services replace cloudrun.yaml --project=bayit-plus --region=us-central1
```

### 5. Kubernetes/GKE Deployment

**Add to your ConfigMap:**

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: bayit-backend-config
data:
  AUDIT_STUCK_TIMEOUT_MINUTES: "30"
  AUDIT_NO_ACTIVITY_TIMEOUT_MINUTES: "15"
  AUDIT_HEALTH_CHECK_INTERVAL_SECONDS: "300"
```

**Or use Secrets:**

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: bayit-backend-secrets
type: Opaque
data:
  AUDIT_STUCK_TIMEOUT_MINUTES: MzA=  # Base64 encoded "30"
  AUDIT_NO_ACTIVITY_TIMEOUT_MINUTES: MTU=  # Base64 encoded "15"
  AUDIT_HEALTH_CHECK_INTERVAL_SECONDS: MzAw  # Base64 encoded "300"
```

Reference in Deployment:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: bayit-backend
spec:
  template:
    spec:
      containers:
      - name: backend
        envFrom:
        - configMapRef:
            name: bayit-backend-config
        - secretRef:
            name: bayit-backend-secrets
```

## Customizing Values

### Production Recommendations

Based on your audit patterns, you may want to adjust:

**For long-running AI audits:**
```bash
AUDIT_STUCK_TIMEOUT_MINUTES=60          # 1 hour before stuck
AUDIT_NO_ACTIVITY_TIMEOUT_MINUTES=30    # 30 minutes no activity
AUDIT_HEALTH_CHECK_INTERVAL_SECONDS=600 # Check every 10 minutes
```

**For fast audits:**
```bash
AUDIT_STUCK_TIMEOUT_MINUTES=15          # 15 minutes before stuck
AUDIT_NO_ACTIVITY_TIMEOUT_MINUTES=5     # 5 minutes no activity
AUDIT_HEALTH_CHECK_INTERVAL_SECONDS=120 # Check every 2 minutes
```

**For cost optimization (reduce checks):**
```bash
AUDIT_HEALTH_CHECK_INTERVAL_SECONDS=900 # Check every 15 minutes
```

### Update GCP Secrets

To change a value in production:

```bash
# Update stuck timeout to 60 minutes
echo -n '60' | gcloud secrets versions add bayit-audit-stuck-timeout-minutes \
  --project=bayit-plus \
  --data-file=-

# Update check interval to 10 minutes (600 seconds)
echo -n '600' | gcloud secrets versions add bayit-audit-health-check-interval-seconds \
  --project=bayit-plus \
  --data-file=-
```

Then restart your backend to pick up the new values.

## Verification

### Check Configuration is Loaded

```bash
# SSH into your backend container/pod
kubectl exec -it bayit-backend-pod -- bash

# Or for Cloud Run
gcloud run services proxy bayit-backend --project=bayit-plus

# Check environment variables
env | grep AUDIT_
```

**Expected output:**
```
AUDIT_STUCK_TIMEOUT_MINUTES=30
AUDIT_NO_ACTIVITY_TIMEOUT_MINUTES=15
AUDIT_HEALTH_CHECK_INTERVAL_SECONDS=300
```

### Check Service is Running

```bash
# Check logs for startup message
kubectl logs bayit-backend-pod | grep "Audit recovery"

# Or for Cloud Run
gcloud logging read "resource.type=cloud_run_revision AND textPayload=~'Audit recovery'" \
  --project=bayit-plus \
  --limit=10
```

**Expected log entries:**
```
[INFO] Audit recovery monitoring started
[INFO] AuditRecoveryService initialized: stuck_timeout=30min, no_activity_timeout=15min, check_interval=300s
```

### Test Recovery Works

1. Start an audit from the UI
2. Note the audit ID
3. Stop the backend forcefully (kill process)
4. Restart backend
5. Wait 5-15 minutes (depending on your settings)
6. Check audit status - should be marked as "failed"

**Or test manually via API:**

```bash
# Check audit health
curl -X GET https://your-backend-url/admin/librarian/audit-health/{audit_id} \
  -H "Authorization: Bearer YOUR_TOKEN"

# Manually trigger recovery
curl -X POST https://your-backend-url/admin/librarian/scan-stuck-audits \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Monitoring

### Check for Recovered Audits

Query your MongoDB database:

```javascript
db.audit_reports.find({
  "summary.crash_detected": true
}).sort({ "audit_date": -1 }).limit(10)
```

### Monitor Recovery Logs

```bash
# Cloud Logging
gcloud logging read 'resource.type=cloud_run_revision AND textPayload=~"Recovering stuck audit"' \
  --project=bayit-plus \
  --limit=50 \
  --format=json

# Or tail logs
kubectl logs -f bayit-backend-pod | grep "recover"
```

### Set Up Alerts (Optional)

Create a Cloud Monitoring alert for frequent recoveries:

```yaml
displayName: High Audit Recovery Rate
conditions:
  - displayName: >5 recoveries per hour
    conditionThreshold:
      filter: |
        resource.type="cloud_run_revision"
        textPayload=~"Successfully recovered audit"
      comparison: COMPARISON_GT
      thresholdValue: 5
      duration: 3600s
```

## Rollback

If you need to disable audit recovery monitoring:

**Option 1: Set very high timeouts (effectively disable)**

```bash
# Update secrets
echo -n '999999' | gcloud secrets versions add bayit-audit-stuck-timeout-minutes \
  --project=bayit-plus --data-file=-

# Restart backend
```

**Option 2: Remove from deployment (requires code change)**

Comment out in `app/main.py`:
```python
# await audit_recovery_service.start_monitoring()
```

Redeploy.

## Troubleshooting

### Secrets Not Found

**Symptom:** Logs show using default values

**Solution:**
```bash
# Verify secrets exist
gcloud secrets list --project=bayit-plus | grep audit

# If missing, run setup script
./scripts/production/deployment/add_audit_recovery_secrets.sh
```

### Recovery Not Working

**Symptom:** Audits stay stuck forever

**Check 1: Is monitoring running?**
```bash
# Check logs for startup message
grep "Audit recovery monitoring started" backend.log
```

**Check 2: Are settings loaded?**
```bash
env | grep AUDIT_
```

**Check 3: Manual recovery**
```bash
curl -X POST https://your-backend/admin/librarian/scan-stuck-audits
```

### Too Many False Positives

**Symptom:** Healthy audits marked as stuck

**Solution:** Increase timeouts:
```bash
# For long-running audits, increase to 60 minutes
echo -n '60' | gcloud secrets versions add bayit-audit-stuck-timeout-minutes \
  --project=bayit-plus --data-file=-
```

## Files Modified

All files have been updated to include audit recovery settings:

- ✅ `.env` - Local development settings
- ✅ `.env.example` - Template with documentation
- ✅ `retrieve_secrets.sh` - GCP secret retrieval
- ✅ `docker-compose.yml` - Docker environment
- ✅ `scripts/production/deployment/add_audit_recovery_secrets.sh` - Setup script

## Support

For issues or questions:
1. Check system logs for error messages
2. Verify configuration is loaded correctly
3. Test manual recovery via API
4. Review audit execution logs in database

## Related Documentation

- [Audit Recovery System](AUDIT_RECOVERY_SYSTEM.md) - Complete system documentation
- Backend Documentation Index - `/docs/README.md`
