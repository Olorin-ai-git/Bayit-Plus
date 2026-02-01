# Google Cloud Secrets - Schedules Direct EPG Integration

## Overview

This document describes the secrets required for Schedules Direct EPG integration.
Schedules Direct provides real TV schedule data for channels worldwide including Israeli channels.

## Required Secrets

### SCHEDULES_DIRECT_USERNAME

| Property | Value |
|----------|-------|
| **Secret Name** | `SCHEDULES_DIRECT_USERNAME` |
| **Description** | Schedules Direct account username |
| **Type** | string |
| **Required** | Yes |
| **Default** | None (must be provided) |

**GCloud Command:**
```bash
echo -n "YOUR_SD_USERNAME" | gcloud secrets create SCHEDULES_DIRECT_USERNAME \
  --project=bayit-plus \
  --data-file=-
```

### SCHEDULES_DIRECT_PASSWORD

| Property | Value |
|----------|-------|
| **Secret Name** | `SCHEDULES_DIRECT_PASSWORD` |
| **Description** | Schedules Direct account password (plain text - will be SHA1 hashed by service) |
| **Type** | string |
| **Required** | Yes |
| **Default** | None (must be provided) |

**GCloud Command:**
```bash
echo -n "YOUR_SD_PASSWORD" | gcloud secrets create SCHEDULES_DIRECT_PASSWORD \
  --project=bayit-plus \
  --data-file=-
```

## Grant Access to Service Accounts

After creating the secrets, grant access to the backend service account:

```bash
# Grant access to backend service account
gcloud secrets add-iam-policy-binding SCHEDULES_DIRECT_USERNAME \
  --project=bayit-plus \
  --member="serviceAccount:bayit-backend-production@bayit-plus.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding SCHEDULES_DIRECT_PASSWORD \
  --project=bayit-plus \
  --member="serviceAccount:bayit-backend-production@bayit-plus.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

## Regenerate Environment Files

After adding secrets to Google Cloud:

```bash
cd /Users/olorin/Documents/olorin/olorin-media/bayit-plus
./scripts/sync-gcloud-secrets.sh
```

## Local Development (Temporary)

For immediate local testing, you can temporarily set environment variables:

```bash
# In terminal session only (not persisted)
export SCHEDULES_DIRECT_USERNAME="olorin1973"
export SCHEDULES_DIRECT_PASSWORD="your_password_here"

# Then run the discovery script
cd backend
poetry run python -m app.scripts.discover_sd_lineups
```

## Verification

After configuration, verify the integration:

```bash
cd backend
poetry run python -m app.scripts.discover_sd_lineups
```

Expected output:
- Authentication success message
- List of available Israeli lineups/headends
- Channel mappings for each lineup

## Related Documentation

- [Secrets Management Guide](./SECRETS_MANAGEMENT.md)
- [Schedules Direct API Documentation](https://github.com/SchedulesDirect/JSON-Service/wiki)
