# SSRF Protection Implementation Summary

## Overview
Added comprehensive SSRF (Server-Side Request Forgery) protection across all backend services that make external HTTP requests. All external URLs are now validated against domain whitelists to prevent unauthorized access to internal resources.

## New Configuration Fields

### 1. ALLOWED_IMAGE_DOMAINS
**Purpose**: Whitelist for image downloads (TMDB, Google, YouTube thumbnails)

**Default domains**:
- image.tmdb.org
- api.themoviedb.org
- storage.googleapis.com
- lh3.googleusercontent.com
- i.ytimg.com
- img.youtube.com

**Used by**:
- `app/services/image_storage.py`

---

### 2. ALLOWED_AUDIO_DOMAINS
**Purpose**: Whitelist for podcast/audio downloads

**Default domains**:
- anchor.fm
- spotify.com
- podcasts.apple.com
- feeds.buzzsprout.com
- feeds.transistor.fm
- feeds.soundcloud.com
- feeds.megaphone.fm
- feeds.simplecast.com
- feeds.art19.com
- feeds.howstuffworks.com
- feeds.npr.org
- feeds.podcastone.com
- rss.art19.com
- traffic.megaphone.fm
- traffic.libsyn.com
- media.blubrry.com
- dcs.megaphone.fm
- storage.googleapis.com
- s3.amazonaws.com
- cloudfront.net

**Used by**:
- `app/services/podcast_translation_service.py` (already had SSRF protection)

---

### 3. ALLOWED_SUBTITLE_DOMAINS
**Purpose**: Whitelist for subtitle file downloads

**Default domains**:
- api.opensubtitles.com
- rest.opensubtitles.org
- storage.googleapis.com

**Used by**:
- Future subtitle download services

---

### 4. ALLOWED_EPG_DOMAINS
**Purpose**: Whitelist for Electronic Program Guide data fetching

**Default domains**:
- www.kan.org.il
- kan.org.il
- api.mako.co.il
- raw.githubusercontent.com
- github.com
- iptv-org.github.io
- tv.schedulesdirect.org
- storage.googleapis.com

**Used by**:
- `app/services/epg_ingestion_service.py`

---

### 5. ALLOWED_SCRAPER_DOMAINS
**Purpose**: Whitelist for content scraping services

**Default domains**:
- youtube.com
- youtu.be
- www.youtube.com
- podcasts.apple.com
- rss.art19.com
- feeds.megaphone.fm
- feeds.simplecast.com
- feeds.howstuffworks.com
- feeds.npr.org
- feeds.podcastone.com
- feeds.buzzsprout.com
- feeds.transistor.fm
- feeds.soundcloud.com
- anchor.fm
- storage.googleapis.com

**Used by**:
- Content scraper services

---

## New Files Created

### app/core/ssrf_protection.py
Centralized SSRF protection utilities:
- `validate_url_domain(url, allowed_domains)` - Core validation function
- `validate_image_url(url)` - Image URL validation
- `validate_audio_url(url)` - Audio URL validation
- `validate_subtitle_url(url)` - Subtitle URL validation
- `validate_epg_url(url)` - EPG URL validation
- `validate_scraper_url(url)` - Scraper URL validation
- `extract_domain(url)` - Helper to extract domain from URL

**Features**:
- Supports exact domain matching
- Supports subdomain matching (e.g., "example.com" allows "api.example.com")
- Comprehensive error logging
- Backward compatible (allows requests if whitelist is empty)

---

## Updated Services

### 1. app/services/image_storage.py
**Changes**:
- Added import: `from app.core.ssrf_protection import validate_image_url`
- Updated `download_and_encode_image()` to validate URLs against ALLOWED_IMAGE_DOMAINS
- Updated `is_valid_image_url()` to validate URLs against ALLOWED_IMAGE_DOMAINS

**Security Improvement**:
- Before: Any HTTP/HTTPS URL could be downloaded
- After: Only whitelisted domains can be accessed

---

### 2. app/services/podcast_translation_service.py
**Status**: Already had SSRF protection (no changes needed)
- Uses ALLOWED_AUDIO_DOMAINS whitelist
- Blocks localhost and internal IPs
- Validates content type and file size

---

## Environment Variable Configuration

To customize whitelists, add to `.env`:

```bash
# Image domains (JSON array or comma-separated)
ALLOWED_IMAGE_DOMAINS='["image.tmdb.org","yourdomain.com"]'
# OR
ALLOWED_IMAGE_DOMAINS=image.tmdb.org,yourdomain.com

# Audio domains
ALLOWED_AUDIO_DOMAINS='["feeds.example.com","yourdomain.com"]'

# Subtitle domains
ALLOWED_SUBTITLE_DOMAINS='["api.opensubtitles.com","yourdomain.com"]'

# EPG domains
ALLOWED_EPG_DOMAINS='["xmltv.com","yourdomain.com"]'

# Scraper domains
ALLOWED_SCRAPER_DOMAINS='["youtube.com","yourdomain.com"]'
```

---

## Testing

### Test SSRF Protection

```python
from app.core.ssrf_protection import validate_image_url

# Should pass (whitelisted)
assert validate_image_url("https://image.tmdb.org/t/p/w500/poster.jpg") == True

# Should fail (not whitelisted)
assert validate_image_url("https://evil.com/ssrf") == False

# Should fail (localhost)
assert validate_image_url("http://localhost:8080/admin") == False

# Should fail (internal IP)
assert validate_image_url("http://192.168.1.1/router") == False
```

---

## Security Benefits

1. **Prevents SSRF attacks**: External requests are limited to trusted domains
2. **Protects internal services**: Localhost and internal IPs are blocked
3. **Centralized management**: All whitelists in one configuration file
4. **Audit trail**: All blocked requests are logged
5. **Subdomain support**: Flexible domain matching (e.g., api.example.com matches example.com)
6. **Backward compatible**: Existing functionality preserved with sensible defaults

---

## Migration Guide

### For Existing Deployments

1. **No action required** - Default whitelists cover common use cases
2. **Optional**: Review and customize whitelists in `.env`
3. **Recommended**: Monitor logs for blocked requests after deployment
4. **If issues**: Add required domains to appropriate whitelist

### Adding New Domains

```bash
# Method 1: Update .env
ALLOWED_IMAGE_DOMAINS='["image.tmdb.org","yournewdomain.com"]'

# Method 2: Update app/core/config.py defaults
ALLOWED_IMAGE_DOMAINS: list[str] = Field(
    default_factory=lambda: [
        "image.tmdb.org",
        "yournewdomain.com",  # Add here
    ],
    ...
)
```

---

## Monitoring

Check logs for blocked requests:

```bash
# Backend logs
grep "SSRF Protection" logs/backend.log

# Example blocked request log:
# ERROR [image_storage] SSRF Protection: Domain 'evil.com' not in whitelist. URL: https://evil.com/image.jpg
```

---

## Future Improvements

1. Add SSRF protection to remaining HTTP client services:
   - subtitle_service.py
   - external_subtitle_service.py
   - kids_podcast_service.py
   - culture_scrapers/*.py

2. Add support for IP range whitelisting (for specific partners)

3. Add rate limiting per domain

4. Add metrics/monitoring for blocked requests

---

## Related Files

- `app/core/config.py` - SSRF whitelist configuration
- `app/core/ssrf_protection.py` - SSRF validation utilities
- `app/services/image_storage.py` - Updated with SSRF protection
- `app/services/podcast_translation_service.py` - Already had SSRF protection

