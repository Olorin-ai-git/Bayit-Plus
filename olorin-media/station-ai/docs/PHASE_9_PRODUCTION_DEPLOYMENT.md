# Phase 9: Production Deployment & Monitoring Guide

**Date**: 2026-01-22
**Status**: 📋 READY FOR EXECUTION
**Phase**: Production Deployment & Monitoring

---

## Overview

This guide covers deploying Station-AI to production Firebase targets with DNS configuration, SSL setup, and monitoring.

**Duration**: ~45 minutes

**Prerequisites**: Phase 8 (Staging) completed and approved

---

## Pre-Deployment Checklist

### Critical Pre-Flight Checks

- [ ] Phase 8 staging tests all passed
- [ ] Stakeholder approval obtained
- [ ] DNS provider access confirmed
- [ ] Firebase project access (`israeli-radio-475c9`)
- [ ] Backup plan documented
- [ ] Rollback procedure tested
- [ ] Team notified of deployment window

### Production Readiness Verification

```bash
# Verify all builds are production-ready
cd /Users/olorin/Documents/olorin/olorin-media/station-ai

# Backend
cd backend && poetry run python -c "from app.main import app; print(f'✅ {app.title}')"

# Frontend
cd ../frontend && ls dist/index.html && echo "✅ Frontend built"

# Marketing Portal
cd ../../olorin-portals/packages/portal-station && ls build/index.html && echo "✅ Portal built"
```

---

## Step 1: DNS & SSL Configuration (20 min)

### 1.1 DNS Records Setup

**Primary Domains**:
- `station.olorin.ai` → Frontend application
- `marketing.station.olorin.ai` → Marketing portal
- `api.station.olorin.ai` → Backend API (if separate)
- `demo.station.olorin.ai` → Demo site (optional)

**DNS Provider Configuration** (Example: Cloudflare/Route53):

```
# A Record or CNAME for Firebase Hosting
station.olorin.ai              CNAME  israeli-radio-475c9.web.app.
marketing.station.olorin.ai    CNAME  israeli-radio-475c9.web.app.

# Or A Records (get IP from Firebase)
station.olorin.ai              A      151.101.1.195
                                A      151.101.65.195
marketing.station.olorin.ai    A      151.101.1.195
                                A      151.101.65.195
```

**TTL Setting**: 300 (5 minutes) for initial deployment, increase to 3600 after verification

### 1.2 Add Custom Domains to Firebase

```bash
# Add custom domains to Firebase Hosting
firebase hosting:sites:create station-olorin --project israeli-radio-475c9
firebase hosting:sites:create marketing-station-olorin --project israeli-radio-475c9

# Or use Firebase Console:
# Firebase Console → Hosting → Add custom domain
```

**Verification Steps**:
1. Add domain in Firebase Console
2. Add TXT record for verification
3. Wait for verification (up to 24 hours, usually < 1 hour)
4. SSL certificate auto-provisioned by Firebase

### 1.3 SSL Certificate Verification

```bash
# Check SSL certificate status
curl -I https://station.olorin.ai
# Look for: `HTTP/2 200` and valid certificate

# Or use SSL Labs
# https://www.ssllabs.com/ssltest/analyze.html?d=station.olorin.ai
```

**Expected SSL Grade**: A or higher

---

## Step 2: Configure 301 Redirects (10 min)

### 2.1 Old Domain Redirects

**Redirect old URLs** to new Station-AI domains:
- `israeli-radio-475c9.web.app` → `station.olorin.ai`
- `marketing.station.olorin.ai` → `marketing.station.olorin.ai`

**Firebase Hosting Configuration** (`firebase.json`):

```json
{
  "hosting": [
    {
      "site": "israeli-radio-475c9",
      "public": "frontend/dist",
      "redirects": [
        {
          "source": "/**",
          "destination": "https://station.olorin.ai/:splat",
          "type": 301
        }
      ]
    },
    {
      "site": "olorin-station",
      "public": "frontend/dist",
      "headers": [
        {
          "source": "**",
          "headers": [
            {
              "key": "Strict-Transport-Security",
              "value": "max-age=63072000; includeSubDomains; preload"
            }
          ]
        }
      ]
    }
  ]
}
```

### 2.2 Verify Redirects

```bash
# Test redirect
curl -I https://israeli-radio-475c9.web.app

# Expected response:
# HTTP/2 301
# Location: https://station.olorin.ai/
```

---

## Step 3: Production Backend Deployment (15 min)

### 3.1 Set Production Environment Variables

```bash
# Firebase Functions environment config
cd /Users/olorin/Documents/olorin/olorin-media/station-ai/backend

# Set environment variables
firebase functions:config:set \
  app.name="Station-AI" \
  app.env="production" \
  frontend.url="https://station.olorin.ai" \
  marketing.url="https://marketing.station.olorin.ai" \
  --project israeli-radio-475c9

# Set secrets (use Firebase Secrets Manager)
firebase functions:secrets:set JWT_SECRET --project israeli-radio-475c9
firebase functions:secrets:set ANTHROPIC_API_KEY --project israeli-radio-475c9
```

### 3.2 Update CORS Configuration

**In `app/main.py`**, verify production domains in CORS whitelist:

```python
allow_origins=[
    "https://station.olorin.ai",
    "https://marketing.station.olorin.ai",
    "https://demo.station.olorin.ai",
    "https://israeli-radio-475c9.web.app",  # Keep for rollback
    "https://israeli-radio-475c9.firebaseapp.com",
    # Remove or comment out localhost entries for production
],
```

### 3.3 Deploy Backend to Production

```bash
# Deploy to Firebase Functions
firebase deploy --only functions --project israeli-radio-475c9

# Or deploy specific function
firebase deploy --only functions:stationAiBackend --project israeli-radio-475c9
```

### 3.4 Verify Backend Deployment

```bash
# Get production function URL
firebase functions:list --project israeli-radio-475c9

# Test health endpoint
curl https://us-central1-israeli-radio-475c9.cloudfunctions.net/stationAiBackend/health
```

**Expected Response**:
```json
{
  "status": "ok",
  "service": "Station-AI Backend",
  "version": "0.1.0",
  "environment": "production"
}
```

---

## Step 4: Production Frontend Deployment (10 min)

### 4.1 Update Frontend Environment Variables

**Create `.env.production`**:
```bash
VITE_API_URL=https://us-central1-israeli-radio-475c9.cloudfunctions.net/stationAiBackend
VITE_APP_NAME=Station-AI
VITE_ENVIRONMENT=production
VITE_MARKETING_URL=https://marketing.station.olorin.ai
```

### 4.2 Build Frontend for Production

```bash
cd /Users/olorin/Documents/olorin/olorin-media/station-ai/frontend
npm run build -- --mode production
```

### 4.3 Deploy to Firebase Hosting (Production)

```bash
# Deploy to production target
firebase deploy --only hosting:prod --project israeli-radio-475c9

# Verify deployment
firebase hosting:sites:list --project israeli-radio-475c9
```

### 4.4 Verify Frontend Deployment

```bash
# Open in browser
open https://station.olorin.ai

# Or check with curl
curl -I https://station.olorin.ai
```

**Verification Checklist**:
- [x] Page loads without errors
- [x] Title shows "Station-AI"
- [x] SSL certificate valid
- [x] HSTS header present
- [x] No mixed content warnings
- [x] API calls work (check DevTools Network tab)

---

## Step 5: Production Marketing Portal Deployment (10 min)

### 5.1 Build Marketing Portal for Production

```bash
cd /Users/olorin/Documents/olorin/olorin-portals/packages/portal-station
npm run build
```

### 5.2 Deploy to Firebase Hosting (Production)

```bash
# From olorin-portals root
firebase deploy --only hosting:station --project israeli-radio-475c9

# Or from portal directory
firebase deploy --only hosting --project israeli-radio-475c9
```

### 5.3 Verify Marketing Portal Deployment

```bash
# Open in browser
open https://marketing.station.olorin.ai

# Check SSL and headers
curl -I https://marketing.station.olorin.ai
```

**Verification Checklist**:
- [x] Hero section loads
- [x] Wizard purple theme visible
- [x] Localization toggle works (EN ↔ HE)
- [x] All images load (WebP format)
- [x] Glassmorphism effects render
- [x] CTAs point to correct destinations
- [x] Footer waveform animation works
- [x] No console errors

---

## Step 6: Post-Deployment Health Checks (10 min)

### 6.1 Automated Health Checks

**Create health check script** (`scripts/health-check.sh`):

```bash
#!/bin/bash

echo "Station-AI Production Health Check"
echo "===================================="

# Check backend
echo -n "Backend health: "
if curl -f -s https://us-central1-israeli-radio-475c9.cloudfunctions.net/stationAiBackend/health > /dev/null; then
  echo "✅ OK"
else
  echo "❌ FAILED"
fi

# Check frontend
echo -n "Frontend: "
if curl -f -s -I https://station.olorin.ai | grep -q "200 OK"; then
  echo "✅ OK"
else
  echo "❌ FAILED"
fi

# Check marketing portal
echo -n "Marketing Portal: "
if curl -f -s -I https://marketing.station.olorin.ai | grep -q "200 OK"; then
  echo "✅ OK"
else
  echo "❌ FAILED"
fi

# Check SSL
echo -n "SSL certificate: "
if curl -f -s -I https://station.olorin.ai | grep -q "HTTP/2"; then
  echo "✅ OK"
else
  echo "❌ FAILED"
fi

# Check redirects
echo -n "Redirects: "
if curl -s -I https://israeli-radio-475c9.web.app | grep -q "301"; then
  echo "✅ OK"
else
  echo "❌ FAILED"
fi

echo "===================================="
echo "Health check complete"
```

**Run health check**:
```bash
chmod +x scripts/health-check.sh
./scripts/health-check.sh
```

### 6.2 Database Connectivity Check

```bash
# Test MongoDB connection (from backend)
poetry run python -c "
from app.config import settings
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio

async def test():
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    try:
        await client.admin.command('ping')
        print('✅ MongoDB connection OK')
    except Exception as e:
        print(f'❌ MongoDB connection failed: {e}')
    finally:
        client.close()

asyncio.run(test())
"
```

### 6.3 Firebase Auth Check

```bash
# Verify Firebase Auth configured correctly
firebase auth:export users.json --project israeli-radio-475c9
echo "✅ Firebase Auth accessible"
rm users.json
```

---

## Step 7: Monitoring & Alerting Setup (15 min)

### 7.1 Firebase Performance Monitoring

**Enable Performance Monitoring** in Firebase Console:
1. Firebase Console → Performance
2. Enable monitoring for web and functions
3. Set up custom traces for critical paths

**Monitor**:
- Page load times
- API response times
- Function execution times
- Error rates

### 7.2 Error Tracking (Sentry/Firebase Crashlytics)

**If using Sentry**:
```javascript
// frontend/src/main.tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: "production",
  tracesSampleRate: 0.1,
});
```

**If using Firebase Crashlytics**:
```javascript
// Already configured via Firebase Admin SDK
```

### 7.3 Uptime Monitoring

**Set up external uptime monitoring**:
- [UptimeRobot](https://uptimerobot.com/) (free)
- [Pingdom](https://www.pingdom.com/)
- Google Cloud Monitoring

**Monitor these endpoints**:
- `https://station.olorin.ai` (every 5 minutes)
- `https://marketing.station.olorin.ai` (every 5 minutes)
- `https://.../stationAiBackend/health` (every 5 minutes)

**Alert conditions**:
- 5xx errors > 1% of requests
- Response time > 5 seconds
- Uptime < 99% in 24 hours

### 7.4 Set Up Alerts

**Firebase Alerts** (Firebase Console → Alerts):
- Function errors > 5% error rate
- Function execution time > 10 seconds
- Hosting bandwidth > quota

**Email Notifications**:
- Critical: Send to on-call team
- Warning: Send to dev team
- Info: Log only

---

## Step 8: User Communication (10 min)

### 8.1 Announcement Email Template

**Subject**: Station-AI is Live! 🎙️ (Formerly Station-AI)

**Body**:
```
Hi [User Name],

We're excited to announce that Station-AI has been rebranded to **Station-AI**!

🎯 What's Changed:
- New name: Station-AI (The DJ That Never Sleeps)
- New website: https://station.olorin.ai
- New marketing site: https://marketing.station.olorin.ai
- Same great features, enhanced experience

✅ What Stays the Same:
- Your account and data (no action needed)
- All existing functionality
- Same login credentials

🚀 New Features:
- Improved wizard purple theme
- Enhanced localization (English + Hebrew with RTL)
- Better accessibility (WCAG 2.1 AA compliant)
- Faster performance

📖 Need Help?
- Visit our marketing site: https://marketing.station.olorin.ai
- Contact support: support@olorin.ai

Thank you for being part of our journey!

The Station-AI Team
```

### 8.2 In-App Announcement

**Create announcement banner** (frontend):
```tsx
// components/AnnouncementBanner.tsx
<div className="bg-purple-600 text-white p-4 text-center">
  <p>
    🎉 We've rebranded! Station-AI is now <strong>Station-AI</strong>.
    <a href="/announcement" className="underline ml-2">Learn more →</a>
  </p>
</div>
```

### 8.3 Social Media Posts

**Example Tweet/LinkedIn**:
```
Introducing Station-AI 🎙️

The DJ That Never Sleeps - AI-powered radio station management for 24/7 autonomous operation.

✨ New branding
✨ Enhanced features
✨ Same powerful automation

Learn more: https://marketing.station.olorin.ai
```

---

## Step 9: Rollback Procedure (if needed)

### If Critical Issues Arise

**Severity 1: Critical (Site Down)**:
1. Immediately rollback using Firebase Hosting rollback
2. Notify team via Slack/email
3. Debug issue offline

**Severity 2: Major (Functionality Broken)**:
1. Assess impact and affected users
2. Decide: Fix forward or rollback
3. Implement fix or rollback

**Severity 3: Minor (UI Glitches)**:
1. Log issue for next deployment
2. Continue monitoring
3. Fix in next release

### Rollback Commands

```bash
# Rollback Firebase Hosting (frontend)
firebase hosting:rollback --project israeli-radio-475c9

# Rollback Firebase Functions (backend)
firebase functions:rollback --project israeli-radio-475c9

# Verify rollback
curl -I https://station.olorin.ai
```

### Rollback DNS (if needed)

```bash
# Revert DNS A/AAAA records to old values
# Update in DNS provider dashboard
# Wait for TTL expiration (5 minutes with 300 TTL)
```

---

## Step 10: Production Verification (15 min)

### 10.1 Full Smoke Test

**Backend**:
- [x] Health endpoint responds
- [x] API endpoints functional
- [x] Authentication works
- [x] Database queries work
- [x] No 5xx errors in logs

**Frontend**:
- [x] Login page loads
- [x] Authentication flow works
- [x] Dashboard loads
- [x] All features accessible
- [x] No console errors

**Marketing Portal**:
- [x] All pages load
- [x] i18n toggle works
- [x] CTAs point to correct URLs
- [x] No broken links
- [x] Images load correctly

### 10.2 Security Verification

```bash
# Check security headers
curl -I https://station.olorin.ai | grep -E "(Strict-Transport-Security|X-Content-Type-Options|X-Frame-Options)"

# Check SSL grade
# https://www.ssllabs.com/ssltest/analyze.html?d=station.olorin.ai
```

**Expected**:
- [x] SSL Labs Grade: A or higher
- [x] HSTS enabled
- [x] Security headers present
- [x] No mixed content
- [x] CSP configured

### 10.3 Performance Verification

**Run Lighthouse on production**:
```bash
lighthouse https://station.olorin.ai \
  --preset=perf \
  --output=html \
  --output-path=./reports/lighthouse-prod.html
```

**Verify targets met**:
- [x] Performance: > 90
- [x] Accessibility: > 95
- [x] Best Practices: > 90
- [x] SEO: > 90

---

## Production Deployment Checklist

### Pre-Deployment
- [ ] Phase 8 staging tests passed
- [ ] Stakeholder approval obtained
- [ ] Team notified of deployment
- [ ] Rollback procedure documented

### DNS & SSL
- [ ] DNS records configured
- [ ] Custom domains added to Firebase
- [ ] SSL certificates provisioned
- [ ] Redirects configured
- [ ] DNS propagation verified

### Deployments
- [ ] Backend deployed to production
- [ ] Frontend deployed to production
- [ ] Marketing portal deployed to production
- [ ] Environment variables set
- [ ] Secrets configured

### Verification
- [ ] All health checks passing
- [ ] Database connectivity verified
- [ ] Firebase Auth working
- [ ] CORS configured correctly
- [ ] Security headers present
- [ ] Performance targets met

### Monitoring
- [ ] Firebase Performance Monitoring enabled
- [ ] Error tracking configured
- [ ] Uptime monitoring set up
- [ ] Alerts configured
- [ ] Team notified of deployment success

### Communication
- [ ] User announcement email sent
- [ ] In-app banner deployed
- [ ] Social media posts published
- [ ] Support team briefed

---

## Next Steps

**After Production Deployment**:
1. Monitor for 24 hours continuously
2. Address any issues immediately
3. Collect user feedback
4. Plan post-launch optimizations
5. Proceed to Phase 10: Database Verification

---

## Support & Emergency Contacts

**On-Call Team**:
- Technical Lead: [contact]
- DevOps: [contact]
- Product Manager: [contact]

**Escalation**:
1. Check monitoring dashboards
2. Review error logs in Firebase Console
3. Contact on-call engineer
4. Escalate to technical lead if needed

---

## Summary

**Phase 9: Production Deployment & Monitoring**

This phase deploys Station-AI to production Firebase targets with:
- DNS configuration and SSL setup
- 301 redirects from old domains
- Production environment variables and secrets
- Comprehensive monitoring and alerting
- User communication and announcements

**Duration**: ~45 minutes

**Output**: Production deployment + Monitoring setup + User communications

---

**Guide Author**: Claude Code
**Last Updated**: 2026-01-22
**Firebase Project**: israeli-radio-475c9
**Production URLs**:
- Frontend: https://station.olorin.ai
- Marketing: https://marketing.station.olorin.ai
- API: https://us-central1-israeli-radio-475c9.cloudfunctions.net/stationAiBackend
