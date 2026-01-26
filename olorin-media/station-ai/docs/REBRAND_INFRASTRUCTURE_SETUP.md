# Station-AI Rebrand - Infrastructure Setup Guide

**Last Updated:** 2026-01-22
**Status:** Pre-Production Checklist

This document outlines all infrastructure and security setup required for the Station-AI → Station-AI rebrand.

---

## Table of Contents

1. [DNS & SSL Configuration](#dns--ssl-configuration)
2. [Firebase Project Configuration](#firebase-project-configuration)
3. [Environment Variables Setup](#environment-variables-setup)
4. [Security Configuration](#security-configuration)
5. [User Communication](#user-communication)
6. [Rollback Procedures](#rollback-procedures)

---

## 1. DNS & SSL Configuration

### 1.1 Domain Registration

**Action Required:** Register the following domains in your DNS provider (Cloudflare, Route53, etc.)

| Domain | Purpose | Status |
|--------|---------|--------|
| `marketing.station.olorin.ai` | Marketing portal | ⏳ Pending |
| `station.olorin.ai` | Main application | ⏳ Pending |
| `api.station.olorin.ai` | API endpoint | ⏳ Pending |
| `demo.station.olorin.ai` | Demo environment | ⏳ Pending |

### 1.2 DNS Records

**Create A/AAAA Records:**

```dns
# Marketing Portal (Firebase Hosting)
marketing.station.olorin.ai.  A      199.36.158.100
marketing.station.olorin.ai.  AAAA   2001:4860:4802:38::15

# Main Application (Firebase Hosting)
station.olorin.ai.            A      199.36.158.100
station.olorin.ai.            AAAA   2001:4860:4802:38::15

# API Endpoint (Cloud Run or App Engine)
api.station.olorin.ai.        CNAME  ghs.googlehosted.com.
```

**Verification:**
```bash
# Wait 24-48 hours for propagation, then verify:
dig marketing.station.olorin.ai +short
dig station.olorin.ai +short
dig api.station.olorin.ai +short
```

### 1.3 SSL Certificates

**Option A: Firebase Hosting (Recommended)**
- Firebase auto-provisions SSL via Let's Encrypt
- Add custom domains in Firebase Console:
  1. Go to Firebase Console → Hosting
  2. Click "Add custom domain"
  3. Enter `marketing.station.olorin.ai`
  4. Follow DNS verification steps
  5. Wait for SSL provisioning (1-24 hours)

**Option B: Manual Let's Encrypt**
```bash
# If using custom server
certbot certonly --dns-cloudflare \
  -d marketing.station.olorin.ai \
  -d station.olorin.ai \
  -d api.station.olorin.ai
```

### 1.4 301 Redirects (Old → New Domains)

**Firebase Hosting Configuration** (`firebase.json`):
```json
{
  "hosting": {
    "redirects": [
      {
        "source": "**",
        "destination": "https://marketing.station.olorin.ai",
        "type": 301,
        "regex": "^https://marketing\\.radio\\.olorin\\.ai/(.*)$"
      },
      {
        "source": "**",
        "destination": "https://station.olorin.ai",
        "type": 301,
        "regex": "^https://radio\\.olorin\\.ai/(.*)$"
      }
    ]
  }
}
```

**Verification:**
```bash
curl -I https://marketing.station.olorin.ai
# Should return: Location: https://marketing.station.olorin.ai
```

---

## 2. Firebase Project Configuration

### 2.1 Project Decision

**Recommendation:** Keep existing project `israeli-radio-475c9` for zero-downtime deployment.

**Pros:**
- ✅ No data migration needed
- ✅ No downtime
- ✅ Existing auth tokens remain valid
- ✅ GCS bucket remains accessible

**Cons:**
- ⚠️ Project ID still references old name (cosmetic only)

**Alternative:** Create new project `station-ai-prod`
- Requires full data migration
- Requires new OAuth credentials
- Estimated downtime: 2-4 hours

**Decision:** [ ] Keep `israeli-radio-475c9` (Recommended)
**Alternative:** [ ] Create `station-ai-prod` (Future Phase 2)

### 2.2 Firebase Auth Domain Whitelist

**Action Required:** Add new domains to Firebase Auth

1. Go to Firebase Console → Authentication → Settings
2. Under "Authorized domains", add:
   - `station.olorin.ai`
   - `marketing.station.olorin.ai`
   - `demo.station.olorin.ai`
3. Keep existing domains for rollback:
   - `israeli-radio-475c9.web.app`
   - `israeli-radio-475c9.firebaseapp.com`

### 2.3 OAuth Provider Configuration

**Update OAuth Redirect URIs:**

**Google OAuth:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Select OAuth 2.0 Client ID
3. Add authorized redirect URIs:
   - `https://station.olorin.ai/auth/callback`
   - `https://marketing.station.olorin.ai/auth/callback`
4. Keep old URIs for rollback period (30 days)

**Other Providers (if applicable):**
- Update Facebook, GitHub, Twitter OAuth settings
- Add new callback URLs

---

## 3. Environment Variables Setup

### 3.1 Firebase Secrets Manager

**Set Production Secrets:**
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Set secrets
firebase functions:secrets:set JWT_SECRET
firebase functions:secrets:set ANTHROPIC_API_KEY
firebase functions:secrets:set TWILIO_AUTH_TOKEN
firebase functions:secrets:set GOOGLE_CLIENT_SECRET

# Verify
firebase functions:secrets:access JWT_SECRET
```

### 3.2 GCP Secret Manager (Alternative)

```bash
# Create secrets
echo -n "your-jwt-secret" | gcloud secrets create STATION_AI_JWT_SECRET \
  --data-file=- \
  --replication-policy="automatic"

# Grant access to service account
gcloud secrets add-iam-policy-binding STATION_AI_JWT_SECRET \
  --member="serviceAccount:firebase-adminsdk@israeli-radio-475c9.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### 3.3 Environment File Setup

**Copy template:**
```bash
cd olorin-media/israeli-radio-manager
cp .env.station-ai.example .env

# Edit with actual values
nano .env
```

**Verify no secrets in code:**
```bash
# Scan for hardcoded secrets
grep -r "sk-" backend/
grep -r "AIza" backend/
grep -r "mongodb+srv://" backend/
# Should return NO results (all in .env)
```

---

## 4. Security Configuration

### 4.1 CORS Configuration

**Update Backend** (`backend/app/main.py`):
```python
# BEFORE (overly permissive)
allow_methods=["*"]
allow_origins=["*"]

# AFTER (restricted)
allow_origins=[
    "https://station.olorin.ai",
    "https://marketing.station.olorin.ai",
    "http://localhost:3000",  # Dev only
    "http://localhost:5173",  # Dev only
]
allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"]
allow_max_age=3600  # Cache preflight for 1 hour
```

### 4.2 Content Security Policy (CSP)

**Add to `public/index.html`:**
```html
<meta http-equiv="Content-Security-Policy"
  content="default-src 'self';
  script-src 'self' 'unsafe-inline' https://apis.google.com https://www.gstatic.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self' data:;
  connect-src 'self' https://station.olorin.ai https://firebaseapp.com https://firestore.googleapis.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';">
```

### 4.3 HSTS Headers

**Firebase `hosting.json`:**
```json
{
  "headers": [{
    "source": "**",
    "headers": [{
      "key": "Strict-Transport-Security",
      "value": "max-age=63072000; includeSubDomains; preload"
    }, {
      "key": "X-Content-Type-Options",
      "value": "nosniff"
    }, {
      "key": "X-Frame-Options",
      "value": "DENY"
    }, {
      "key": "X-XSS-Protection",
      "value": "1; mode=block"
    }, {
      "key": "Referrer-Policy",
      "value": "strict-origin-when-cross-origin"
    }]
  }]
}
```

### 4.4 Rate Limiting

**Verify rate limiter configured:**
```python
# backend/app/middleware/rate_limiter.py
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["100/15minutes"]
)
```

---

## 5. User Communication

### 5.1 Email Announcement Draft

**Subject:** Introducing Station-AI: Your Station-AI is Getting a New Name! 🎙️

**Body:**
```
Dear [User Name],

We're excited to announce that Station-AI is evolving! 🎉

**What's Changing:**
- New Name: Station-AI
- New Website: marketing.station.olorin.ai
- Same Great Features: All your content, schedules, and AI automation remain intact

**What's Staying the Same:**
- Your login credentials
- All your radio content and settings
- AI-powered automation
- 24/7 broadcast capabilities

**When:**
The transition will happen on [DATE] at [TIME] EST. You may experience a brief interruption (< 5 minutes) during the update.

**Action Required:**
None! Simply visit station.olorin.ai after [DATE] and log in as usual.

**Questions?**
Contact our support team at support@olorin.ai

Thank you for being part of our journey!

The Olorin.ai Team
```

### 5.2 In-App Announcement Banner

**Component:** `frontend/src/components/RebrandBanner.tsx`
```tsx
<div className="bg-purple-600 text-white px-4 py-3 text-center">
  <p className="font-bold">🎙️ We're Now Station-AI!</p>
  <p className="text-sm">
    Same great features, new name. Update your bookmarks to
    <a href="https://station.olorin.ai" className="underline ml-1">
      station.olorin.ai
    </a>
  </p>
  <button onClick={dismissBanner} className="text-xs underline mt-2">
    Dismiss
  </button>
</div>
```

### 5.3 Support Documentation Updates

**Update Help Center Articles:**
- [ ] "Getting Started with Station-AI" (formerly "Station-AI Setup")
- [ ] "How to Schedule Content" (update screenshots)
- [ ] "AI Automation Guide" (update brand references)
- [ ] "Troubleshooting Guide" (update URLs)

---

## 6. Rollback Procedures

### 6.1 DNS Rollback

**If new domains fail:**
```bash
# Revert DNS records to old values
# Keep old A/AAAA records active for 72 hours
```

### 6.2 Firebase Hosting Rollback

```bash
# Rollback to previous version
firebase hosting:rollback

# Or deploy specific version
firebase hosting:clone SOURCE_SITE_ID:CHANNEL_ID DESTINATION_SITE_ID:live
```

### 6.3 Git Rollback

```bash
# If code changes cause issues
git reset --hard HEAD~5  # Back to before rebrand commits
git push --force origin main

# Or revert specific commits
git revert <commit-hash>
```

### 6.4 Health Check Before Considering Rollback

**Verify All Green Before Declaring Success:**
- [ ] Main site loads (https://station.olorin.ai)
- [ ] Marketing portal loads (https://marketing.station.olorin.ai)
- [ ] API responds (https://api.station.olorin.ai/health)
- [ ] Firebase Auth works (login/logout)
- [ ] Database connections work (MongoDB queries succeed)
- [ ] GCS storage accessible (audio files load)
- [ ] No console errors on frontend
- [ ] No 5xx errors in logs

**If ANY check fails:** Initiate rollback immediately.

---

## Pre-Flight Checklist

**Complete before deployment:**
- [ ] DNS records configured (allow 24-48 hours propagation)
- [ ] SSL certificates requested/provisioned
- [ ] Firebase Auth domains whitelisted
- [ ] OAuth redirect URIs updated
- [ ] Environment variables set in Secret Manager
- [ ] CORS origins restricted to production domains
- [ ] CSP and HSTS headers configured
- [ ] Rate limiting enabled
- [ ] User announcement email drafted and scheduled
- [ ] In-app banner component created
- [ ] Support documentation updated
- [ ] Rollback procedure tested in staging
- [ ] Monitoring and alerting configured

**Estimated Setup Time:** 2-4 hours (excluding DNS propagation)

---

## Contact & Support

For questions or issues during setup:
- **Technical Lead:** [Your Name]
- **Email:** support@olorin.ai
- **Slack:** #station-ai-rebrand

---

**Document Version:** 1.0
**Last Reviewed:** 2026-01-22
