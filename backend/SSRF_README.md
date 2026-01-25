# SSRF Protection - Quick Start Guide

## What is SSRF Protection?

SSRF (Server-Side Request Forgery) protection prevents attackers from using your backend to access internal resources or unauthorized external services. This implementation uses **domain whitelisting** to control which external domains the backend can make HTTP requests to.

## Quick Start (3 Steps)

### 1. Upload Secrets to GCP (Production)

```bash
cd backend
./upload_ssrf_secrets.sh
```

This uploads 5 domain whitelists to Google Cloud Secret Manager with production-ready defaults.

### 2. Configure Locally (Development)

```bash
# Option A: Retrieve from GCP
./retrieve_secrets.sh > .env

# Option B: Use .env.example
cp .env.example .env
```

### 3. Verify Configuration

```bash
poetry run python verify_ssrf_config.py
```

Expected output:
```
✅ All SSRF protection checks PASSED
```

## Files Overview

### Scripts
- **upload_ssrf_secrets.sh** - Upload domain whitelists to GCP Secret Manager
- **retrieve_secrets.sh** - Download all secrets (including SSRF) from GCP
- **verify_ssrf_config.py** - Test SSRF configuration

### Documentation
- **SSRF_DEPLOYMENT_GUIDE.md** - Complete deployment guide (READ THIS FIRST)
- **SSRF_PROTECTION_UPDATES.md** - Implementation details
- **.env.example** - Configuration examples

### Code
- **app/core/config.py** - Configuration with default domain lists
- **app/core/ssrf_protection.py** - Validation utilities
- **app/services/image_storage.py** - Example service using SSRF protection

## Environment Variables

Configure 5 domain whitelists:

```bash
# JSON array format (recommended)
ALLOWED_IMAGE_DOMAINS='["image.tmdb.org","storage.googleapis.com"]'
ALLOWED_AUDIO_DOMAINS='["anchor.fm","spotify.com"]'
ALLOWED_SUBTITLE_DOMAINS='["api.opensubtitles.com"]'
ALLOWED_EPG_DOMAINS='["www.kan.org.il","api.mako.co.il"]'
ALLOWED_SCRAPER_DOMAINS='["youtube.com","podcasts.apple.com"]'

# OR comma-separated format
ALLOWED_IMAGE_DOMAINS=image.tmdb.org,storage.googleapis.com

# OR leave empty to use defaults
ALLOWED_IMAGE_DOMAINS=
```

## Default Domains

If not configured, the system uses these defaults:

- **Images**: 6 domains (TMDB, Google, YouTube)
- **Audio**: 19 domains (major podcast platforms)
- **Subtitles**: 3 domains (OpenSubtitles, GCS)
- **EPG**: 8 domains (Israeli TV, GitHub, IPTV-Org)
- **Scrapers**: 15 domains (YouTube, podcast feeds)

See `app/core/config.py` for complete lists.

## Common Tasks

### Add a Custom Domain

**Method 1: Update GCP Secret**

```bash
# View current domains
gcloud secrets versions access latest --secret=bayit-allowed-image-domains --project=bayit-plus

# Add new domain
echo '["image.tmdb.org","api.themoviedb.org","cdn.example.com"]' | \
  gcloud secrets versions add bayit-allowed-image-domains --data-file=- --project=bayit-plus
```

**Method 2: Update .env (Local)**

```bash
# .env
ALLOWED_IMAGE_DOMAINS='["image.tmdb.org","cdn.example.com"]'
```

### Deploy to Cloud Run

```bash
gcloud run deploy bayit-backend \
  --image gcr.io/bayit-plus/bayit-backend:latest \
  --set-secrets="ALLOWED_IMAGE_DOMAINS=bayit-allowed-image-domains:latest,\
                 ALLOWED_AUDIO_DOMAINS=bayit-allowed-audio-domains:latest,\
                 ALLOWED_SUBTITLE_DOMAINS=bayit-allowed-subtitle-domains:latest,\
                 ALLOWED_EPG_DOMAINS=bayit-allowed-epg-domains:latest,\
                 ALLOWED_SCRAPER_DOMAINS=bayit-allowed-scraper-domains:latest"
```

### Monitor Blocked Requests

```bash
# Local logs
grep "SSRF Protection" logs/backend.log

# Cloud Logging
gcloud logging read "textPayload=~'SSRF Protection'" --limit 50
```

## Troubleshooting

### Error: "Domain not in whitelist"

```
ERROR [image_storage] SSRF Protection: Domain 'cdn.example.com' not in whitelist
```

**Solution:** Add the domain to the appropriate whitelist (see "Add a Custom Domain" above)

### Error: "Secret not found"

```
Secret [bayit-allowed-image-domains] not found
```

**Solution:** Run `./upload_ssrf_secrets.sh` to create secrets in GCP

### Warning: "No domains configured"

```
WARNING [ssrf_protection] No allowed domains configured - URL validation skipped
```

**This is OK** - The system uses sensible defaults. To explicitly configure, run:
```bash
./upload_ssrf_secrets.sh
./retrieve_secrets.sh > .env
```

## Security Features

✓ **Domain Whitelisting** - Only trusted domains allowed
✓ **Subdomain Support** - `example.com` allows `api.example.com`
✓ **Localhost Blocking** - 127.0.0.1 and localhost automatically blocked
✓ **Internal IP Blocking** - Private IP ranges blocked
✓ **Protocol Validation** - Only HTTP/HTTPS allowed
✓ **Comprehensive Logging** - All blocked requests logged
✓ **Backward Compatible** - Uses defaults if not configured

## Need Help?

1. **Read the full guide**: `SSRF_DEPLOYMENT_GUIDE.md`
2. **Check implementation details**: `SSRF_PROTECTION_UPDATES.md`
3. **Run verification**: `poetry run python verify_ssrf_config.py`
4. **Check logs**: `grep "SSRF Protection" logs/backend.log`

---

**Quick Reference Card**

| Task | Command |
|------|---------|
| Upload secrets | `./upload_ssrf_secrets.sh` |
| Download secrets | `./retrieve_secrets.sh > .env` |
| Verify config | `poetry run python verify_ssrf_config.py` |
| View secret | `gcloud secrets versions access latest --secret=bayit-allowed-image-domains --project=bayit-plus` |
| Update secret | `echo '[...]' \| gcloud secrets versions add bayit-allowed-image-domains --data-file=-` |
| List SSRF secrets | `gcloud secrets list --filter="labels.category=ssrf-protection"` |
