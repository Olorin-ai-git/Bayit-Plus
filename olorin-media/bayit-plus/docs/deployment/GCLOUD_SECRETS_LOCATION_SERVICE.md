# Google Cloud Secrets - Location Service Configuration

**Feature**: Reverse Geocoding via GeoNames API
**Service**: LocationService
**Status**: Required for location-based features
**Date**: 2026-01-30

## Overview

The LocationService requires GeoNames API credentials for reverse geocoding coordinates to city/state/county information. This document provides instructions for adding the required secret to Google Cloud Secret Manager.

## Required Secret

### GEONAMES_USERNAME

- **Secret Name**: `GEONAMES_USERNAME`
- **Description**: GeoNames API username for reverse geocoding
- **Type**: String
- **Required**: Yes (location features will fail without it)
- **Default**: None (must be configured)
- **Used By**: `app/services/location_service.py`

## Getting GeoNames API Credentials

1. **Register for free account**: https://www.geonames.org/login
2. **Enable web services**: https://www.geonames.org/manageaccount
3. **Get your username**: Your GeoNames username is your API key

## Adding Secret to Google Cloud

### 1. Create Secret

```bash
# Replace YOUR_GEONAMES_USERNAME with your actual username
gcloud secrets create GEONAMES_USERNAME \
  --data-file=- <<< "YOUR_GEONAMES_USERNAME" \
  --project=bayit-plus-production
```

### 2. Grant Access to Service Accounts

```bash
# Backend service account
gcloud secrets add-iam-policy-binding GEONAMES_USERNAME \
  --member="serviceAccount:bayit-plus-backend@bayit-plus-production.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=bayit-plus-production

# Cloud Run service account (if different)
gcloud secrets add-iam-policy-binding GEONAMES_USERNAME \
  --member="serviceAccount:cloud-run-backend@bayit-plus-production.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=bayit-plus-production
```

### 3. Verify Secret

```bash
# List secret versions
gcloud secrets versions list GEONAMES_USERNAME --project=bayit-plus-production

# Test access (shows metadata only, not the actual value)
gcloud secrets describe GEONAMES_USERNAME --project=bayit-plus-production
```

## Regenerate Environment Configuration

After adding the secret to Google Cloud, regenerate the `.env` files:

```bash
# From backend directory
cd /Users/olorin/Documents/olorin/olorin-media/bayit-plus/backend

# Run secrets sync script
./scripts/sync-gcloud-secrets.sh

# Verify the variable is now in .env
grep GEONAMES_USERNAME .env
```

## Restart Services

```bash
# Local development
# Stop and restart the backend server to pick up new configuration

# Production (Cloud Run)
gcloud run services update bayit-plus-backend \
  --update-secrets=GEONAMES_USERNAME=GEONAMES_USERNAME:latest \
  --project=bayit-plus-production \
  --region=us-central1
```

## Verification

Test that the location service is working:

```bash
# Test reverse geocoding endpoint
curl "http://localhost:8000/api/v1/location/reverse-geocode?latitude=40.7128&longitude=-74.0060"

# Should return JSON with city/state instead of 404
```

Expected response:
```json
{
  "city": "New York",
  "state": "New York",
  "county": "New York County",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "timestamp": "2026-01-30T10:20:27.860346Z",
  "source": "geonames"
}
```

## Service Configuration

The LocationService reads this secret via:
- **File**: `app/services/location_service.py`
- **Config**: `app/core/config.py` (loads from environment)
- **Validation**: Service logs warning if not configured

## Troubleshooting

### Warning: "GEONAMES_USERNAME not configured"

**Cause**: Secret not in environment variables
**Fix**: Follow steps above to add to GCloud and regenerate `.env`

### 404: "Could not determine location for coordinates"

**Possible Causes**:
1. GEONAMES_USERNAME not configured (check logs for warning)
2. Invalid GeoNames username
3. GeoNames API quota exceeded (free tier: 20,000 credits/day)
4. GeoNames web services not enabled on account

**Fix**:
- Verify username is correct
- Check GeoNames account status at https://www.geonames.org/manageaccount
- Ensure web services are enabled

## Rate Limits

- **GeoNames Free Tier**: 20,000 credits per day
- **Endpoint Rate Limit**: 30 requests/minute (configured in route)
- **Recommendation**: Monitor usage and upgrade GeoNames plan if needed

## Related Documentation

- [Secrets Management Guide](SECRETS_MANAGEMENT.md) - Complete workflow
- [Payment Flow Secrets](GCLOUD_SECRETS_PAYMENT_FLOW.md) - Example secrets documentation

## Security Notes

- Never commit `GEONAMES_USERNAME` to git
- Never edit `.env` files directly
- Always use Google Cloud Secret Manager as single source of truth
- Rotate credentials if compromised

## References

- GeoNames API Documentation: https://www.geonames.org/export/web-services.html
- GeoNames Registration: https://www.geonames.org/login
- GeoNames Account Management: https://www.geonames.org/manageaccount
