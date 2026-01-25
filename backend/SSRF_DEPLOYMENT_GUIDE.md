# SSRF Protection - Deployment Guide

This guide explains how to configure SSRF (Server-Side Request Forgery) protection domain whitelists for production deployments using Google Cloud Secret Manager.

## Table of Contents

- [Overview](#overview)
- [Environment Variable Configuration](#environment-variable-configuration)
- [Google Cloud Secret Manager Setup](#google-cloud-secret-manager-setup)
- [Local Development](#local-development)
- [Production Deployment](#production-deployment)
- [Customizing Domain Whitelists](#customizing-domain-whitelists)
- [Troubleshooting](#troubleshooting)

---

## Overview

SSRF protection uses domain whitelists to control which external domains the backend can make HTTP requests to. This prevents attackers from using the backend to access internal resources or unauthorized external services.

**5 Whitelist Categories:**

1. **ALLOWED_IMAGE_DOMAINS** - Image downloads (TMDB, Google, YouTube thumbnails)
2. **ALLOWED_AUDIO_DOMAINS** - Podcast/audio downloads
3. **ALLOWED_SUBTITLE_DOMAINS** - Subtitle file downloads
4. **ALLOWED_EPG_DOMAINS** - Electronic Program Guide data
5. **ALLOWED_SCRAPER_DOMAINS** - Content scraping (RSS feeds, YouTube, etc.)

---

## Environment Variable Configuration

### Format Options

Domain whitelists can be configured using either:

**1. JSON Array (Recommended for Secret Manager)**
```bash
ALLOWED_IMAGE_DOMAINS='["image.tmdb.org","api.themoviedb.org","storage.googleapis.com"]'
```

**2. Comma-Separated String**
```bash
ALLOWED_IMAGE_DOMAINS=image.tmdb.org,api.themoviedb.org,storage.googleapis.com
```

### Default Values

If not configured, sensible defaults are used:

- **Images**: 6 domains (TMDB, Google, YouTube)
- **Audio**: 19 domains (major podcast platforms)
- **Subtitles**: 3 domains (OpenSubtitles, GCS)
- **EPG**: 8 domains (Israeli TV, GitHub, IPTV-Org)
- **Scrapers**: 15 domains (YouTube, podcast feeds, GCS)

See `app/core/config.py` for full default lists.

---

## Google Cloud Secret Manager Setup

### Prerequisites

1. **Google Cloud SDK installed**
   ```bash
   # Install gcloud CLI
   # https://cloud.google.com/sdk/docs/install
   ```

2. **Authenticated with GCP**
   ```bash
   gcloud auth login
   gcloud config set project bayit-plus
   ```

3. **Secret Manager API enabled**
   ```bash
   gcloud services enable secretmanager.googleapis.com
   ```

---

### Initial Upload (One-Time Setup)

Upload all 5 SSRF domain whitelists to Secret Manager:

```bash
cd backend
./upload_ssrf_secrets.sh
```

**What this does:**
- Creates 5 secrets in GCP Secret Manager
- Uses default domain lists (production-ready)
- Adds labels for organization (`category=ssrf-protection`)

**Output:**
```
╔════════════════════════════════════════════════════════════════╗
║  Uploading SSRF Domain Whitelists to GCP Secret Manager       ║
╚════════════════════════════════════════════════════════════════╝

Processing: bayit-allowed-image-domains
✓ Created new secret: bayit-allowed-image-domains

Processing: bayit-allowed-audio-domains
✓ Created new secret: bayit-allowed-audio-domains

...

╔════════════════════════════════════════════════════════════════╗
║  SSRF Domain Whitelists Upload Complete                       ║
╚════════════════════════════════════════════════════════════════╝
```

---

### Verify Secrets

List all SSRF-related secrets:

```bash
gcloud secrets list --filter="labels.category=ssrf-protection" --project=bayit-plus
```

View a specific secret:

```bash
gcloud secrets versions access latest --secret="bayit-allowed-image-domains" --project=bayit-plus
```

---

## Local Development

### Option 1: Retrieve from Secret Manager

Pull all secrets (including SSRF) from GCP:

```bash
cd backend
./retrieve_secrets.sh > .env
```

### Option 2: Use .env.example Defaults

Copy example configuration:

```bash
cd backend
cp .env.example .env
# Edit .env and customize ALLOWED_*_DOMAINS as needed
```

### Option 3: Override Specific Whitelists

Keep defaults but override one category:

```bash
# .env
ALLOWED_IMAGE_DOMAINS='["image.tmdb.org","yourdomain.com"]'
# All other whitelists use defaults
```

---

## Production Deployment

### Google Cloud Run

**Automatic Secret Mounting:**

Update `cloudbuild.yaml` or deployment script:

```yaml
steps:
  - name: 'gcr.io/google.com/cloudsdks/cloud-sdk'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        gcloud run deploy bayit-backend \
          --image gcr.io/${PROJECT_ID}/bayit-backend \
          --region us-central1 \
          --platform managed \
          --set-secrets="ALLOWED_IMAGE_DOMAINS=bayit-allowed-image-domains:latest,\
                         ALLOWED_AUDIO_DOMAINS=bayit-allowed-audio-domains:latest,\
                         ALLOWED_SUBTITLE_DOMAINS=bayit-allowed-subtitle-domains:latest,\
                         ALLOWED_EPG_DOMAINS=bayit-allowed-epg-domains:latest,\
                         ALLOWED_SCRAPER_DOMAINS=bayit-allowed-scraper-domains:latest"
```

**Manual Deployment:**

```bash
gcloud run deploy bayit-backend \
  --image gcr.io/bayit-plus/bayit-backend:latest \
  --region us-central1 \
  --platform managed \
  --set-secrets="ALLOWED_IMAGE_DOMAINS=bayit-allowed-image-domains:latest,ALLOWED_AUDIO_DOMAINS=bayit-allowed-audio-domains:latest,ALLOWED_SUBTITLE_DOMAINS=bayit-allowed-subtitle-domains:latest,ALLOWED_EPG_DOMAINS=bayit-allowed-epg-domains:latest,ALLOWED_SCRAPER_DOMAINS=bayit-allowed-scraper-domains:latest"
```

### Docker Compose

```yaml
services:
  backend:
    environment:
      ALLOWED_IMAGE_DOMAINS: ${ALLOWED_IMAGE_DOMAINS:-}
      ALLOWED_AUDIO_DOMAINS: ${ALLOWED_AUDIO_DOMAINS:-}
      ALLOWED_SUBTITLE_DOMAINS: ${ALLOWED_SUBTITLE_DOMAINS:-}
      ALLOWED_EPG_DOMAINS: ${ALLOWED_EPG_DOMAINS:-}
      ALLOWED_SCRAPER_DOMAINS: ${ALLOWED_SCRAPER_DOMAINS:-}
```

---

## Customizing Domain Whitelists

### Adding a New Domain

**Method 1: Update Secret Manager**

```bash
# Current value
CURRENT=$(gcloud secrets versions access latest --secret="bayit-allowed-image-domains" --project=bayit-plus)

# Add new domain (example: adding "cdn.example.com")
NEW='["image.tmdb.org","api.themoviedb.org","storage.googleapis.com","cdn.example.com"]'

# Upload new version
echo "$NEW" | gcloud secrets versions add bayit-allowed-image-domains --data-file=- --project=bayit-plus
```

**Method 2: Edit upload_ssrf_secrets.sh**

```bash
# Edit backend/upload_ssrf_secrets.sh
IMAGE_DOMAINS='["image.tmdb.org","api.themoviedb.org","cdn.example.com"]'

# Re-run upload
./upload_ssrf_secrets.sh
```

**Method 3: Local .env Override**

```bash
# .env (local development only)
ALLOWED_IMAGE_DOMAINS='["image.tmdb.org","cdn.example.com"]'
```

### Removing a Domain

Update the JSON array without the domain:

```bash
NEW='["image.tmdb.org","api.themoviedb.org"]'
echo "$NEW" | gcloud secrets versions add bayit-allowed-image-domains --data-file=- --project=bayit-plus
```

### Adding Subdomains

The whitelist supports both exact and subdomain matching:

- `example.com` allows `example.com` and `*.example.com`
- `api.example.com` allows only `api.example.com`

Example:
```bash
# This allows both feeds.buzzsprout.com AND www.buzzsprout.com
ALLOWED_AUDIO_DOMAINS='["buzzsprout.com"]'
```

---

## Troubleshooting

### 1. Blocked Request Error

**Log Message:**
```
ERROR [image_storage] SSRF Protection: Domain 'cdn.example.com' not in whitelist
```

**Solution:**
Add `cdn.example.com` to the appropriate whitelist:

```bash
# For images
gcloud secrets versions access latest --secret="bayit-allowed-image-domains" | \
  jq '. + ["cdn.example.com"]' | \
  gcloud secrets versions add bayit-allowed-image-domains --data-file=-
```

### 2. Secret Not Found

**Error:**
```
Secret [bayit-allowed-image-domains] not found
```

**Solution:**
Run initial upload:

```bash
./upload_ssrf_secrets.sh
```

### 3. Empty Whitelist (Using Defaults)

**Log Message:**
```
WARNING [ssrf_protection] No allowed domains configured - URL validation skipped
```

**This is OK** - The system uses sensible defaults from `config.py`.

To explicitly configure:
```bash
./upload_ssrf_secrets.sh
./retrieve_secrets.sh > .env
```

### 4. JSON Parsing Error

**Error:**
```
Failed to parse ALLOWED_IMAGE_DOMAINS as JSON
```

**Solution:**
Ensure proper JSON format:

```bash
# ✓ CORRECT
ALLOWED_IMAGE_DOMAINS='["domain1.com","domain2.com"]'

# ✗ WRONG (missing quotes)
ALLOWED_IMAGE_DOMAINS=[domain1.com,domain2.com]

# ✗ WRONG (single quotes inside)
ALLOWED_IMAGE_DOMAINS="['domain1.com','domain2.com']"
```

### 5. Subdomain Not Matching

**Issue:**
`api.example.com` blocked even though `example.com` is in whitelist.

**Explanation:**
The whitelist supports subdomain matching:
- ✓ `example.com` in whitelist → allows `api.example.com`
- ✓ `api.example.com` in whitelist → allows only `api.example.com`

**No action needed** - this is correct behavior.

---

## Monitoring

### Check Blocked Requests

```bash
# Cloud Logging (GCP)
gcloud logging read "resource.type=cloud_run_revision AND textPayload=~'SSRF Protection'" \
  --limit 50 --format json

# Local logs
grep "SSRF Protection" logs/backend.log
```

### Audit Secret Access

```bash
# Who accessed SSRF secrets
gcloud logging read "protoPayload.serviceName=secretmanager.googleapis.com" \
  --filter="protoPayload.resourceName:allowed" \
  --limit 20
```

---

## Best Practices

1. **Use JSON format** in Secret Manager (easier to parse, validate)
2. **Start with defaults** - The provided defaults cover common use cases
3. **Add domains incrementally** - Only add what you need
4. **Document custom domains** - Comment why each domain was added
5. **Review quarterly** - Remove unused domains
6. **Monitor logs** - Watch for legitimate blocked requests
7. **Version secrets** - Secret Manager keeps all versions (rollback if needed)

---

## Secret Manager Commands Reference

```bash
# List all secrets
gcloud secrets list --project=bayit-plus

# Create new secret
echo '["domain1.com"]' | gcloud secrets create my-secret --data-file=- --project=bayit-plus

# Update secret (add new version)
echo '["domain1.com","domain2.com"]' | gcloud secrets versions add my-secret --data-file=- --project=bayit-plus

# View latest secret
gcloud secrets versions access latest --secret=my-secret --project=bayit-plus

# View secret history
gcloud secrets versions list my-secret --project=bayit-plus

# Rollback to previous version
gcloud secrets versions access 2 --secret=my-secret --project=bayit-plus | \
  gcloud secrets versions add my-secret --data-file=-

# Delete secret
gcloud secrets delete my-secret --project=bayit-plus
```

---

## Related Documentation

- **Implementation Details**: `SSRF_PROTECTION_UPDATES.md`
- **Configuration Reference**: `app/core/config.py`
- **SSRF Utilities**: `app/core/ssrf_protection.py`
- **Deployment Guide**: `docs/deployment/DEPLOYMENT_GUIDE.md`

---

## Support

If you encounter issues with SSRF configuration:

1. Check logs for blocked requests
2. Verify Secret Manager permissions
3. Ensure secrets are properly formatted (JSON arrays)
4. Review this guide's troubleshooting section
5. Test locally with `.env` before deploying to production
