# Deployment Runbook - Bayit+ Web Platform
**Version**: 1.0
**Last Updated**: 2026-01-22
**Platform**: Firebase Hosting + Cloud Run Backend
**Build Tool**: Webpack 5

---

## Table of Contents
1. [Pre-Deployment Checklist](#1-pre-deployment-checklist)
2. [Environment Setup](#2-environment-setup)
3. [Staging Deployment](#3-staging-deployment)
4. [Production Deployment](#4-production-deployment)
5. [Post-Deployment Verification](#5-post-deployment-verification)
6. [Rollback Procedure](#6-rollback-procedure)
7. [Monitoring & Alerts](#7-monitoring--alerts)
8. [Troubleshooting](#8-troubleshooting)
9. [Emergency Contacts](#9-emergency-contacts)

---

## 1. Pre-Deployment Checklist

### 1.1 Code Readiness

**Verify Before Deployment**:
```bash
# Check branch status
git status
git log --oneline | head -5

# Ensure on correct branch
git branch --show-current  # Should be 'main' for production

# Pull latest changes
git pull origin main

# Check for uncommitted changes
git diff-index --quiet HEAD || echo "⚠️ Uncommitted changes detected"
```

**Checklist**:
- [ ] All code changes committed and pushed
- [ ] Code review approved (if required)
- [ ] All tests passing locally
- [ ] No merge conflicts
- [ ] Branch up-to-date with main

### 1.2 Build Verification

```bash
# Clean previous builds
rm -rf dist/

# Run production build
npm run build

# Verify build success
if [ -d "dist" ] && [ "$(ls -A dist)" ]; then
  echo "✅ Build successful"
else
  echo "❌ Build failed - do not proceed"
  exit 1
fi

# Check bundle size
du -sh dist/
# Expected: ~366 MiB total, ~7 MiB JS

# Verify critical files exist
ls -lh dist/index.html
ls -lh dist/main.*.js
ls -lh dist/vendors.*.js
```

**Checklist**:
- [ ] Build completes without errors
- [ ] No TypeScript compilation errors
- [ ] Bundle size within acceptable limits (<400 MiB total)
- [ ] Source maps generated (*.map files present)
- [ ] All assets copied correctly

### 1.3 Security Audit

```bash
# Run security audit
npm audit --production

# Fix critical/high vulnerabilities
npm audit fix

# Verify no high/critical issues remain
npm audit --production --audit-level=moderate
```

**Checklist**:
- [ ] No critical vulnerabilities
- [ ] No high vulnerabilities
- [ ] Moderate vulnerabilities reviewed and accepted
- [ ] Dependencies up-to-date

### 1.4 Environment Configuration

```bash
# Check environment files exist
ls -la .env .env.example

# Verify production environment variables
cat .env | grep -v "^#" | grep -v "^$"
```

**Required Variables for Production**:
```bash
VITE_APP_MODE=production
VITE_API_URL=https://bayit-plus-backend-[hash]-ue.a.run.app/api/v1
VITE_STRIPE_PUBLIC_KEY=pk_live_...
VITE_PICOVOICE_ACCESS_KEY=[key]
VITE_SENTRY_DSN=https://...
VITE_SENTRY_ENVIRONMENT=production
VITE_SENTRY_RELEASE=[git-sha-or-version]
VITE_LOG_LEVEL=warn
```

**Checklist**:
- [ ] `.env` file configured for production
- [ ] `VITE_APP_MODE=production`
- [ ] Production API URL configured
- [ ] Sentry environment set to `production`
- [ ] Sentry release version set
- [ ] No development credentials present
- [ ] Log level appropriate for production (`warn` or `error`)

### 1.5 Backend Readiness

```bash
# Check backend deployment status
gcloud run services describe bayit-plus-backend --region=us-east1 --format="value(status.url)"

# Test backend health endpoint
curl -I $(gcloud run services describe bayit-plus-backend --region=us-east1 --format="value(status.url)")/health

# Expected: HTTP/2 200
```

**Checklist**:
- [ ] Backend service deployed and running
- [ ] Backend health check returns 200 OK
- [ ] Backend API accessible from internet
- [ ] Database connections working
- [ ] Cloud Storage accessible

### 1.6 Firebase Configuration

```bash
# Check Firebase CLI installed
firebase --version

# Login to Firebase (if not already)
firebase login

# List Firebase projects
firebase projects:list

# Set project
firebase use bayit-plus

# Verify hosting target
firebase target:apply hosting web bayit-plus
```

**Checklist**:
- [ ] Firebase CLI installed and authenticated
- [ ] Correct Firebase project selected (`bayit-plus`)
- [ ] Hosting target configured
- [ ] Deployment permissions verified

---

## 2. Environment Setup

### 2.1 Development Environment

```bash
# Development .env
VITE_APP_MODE=demo
VITE_API_URL=http://localhost:8000/api/v1
VITE_STRIPE_PUBLIC_KEY=pk_test_...
VITE_PICOVOICE_ACCESS_KEY=[key]
VITE_SENTRY_DSN=[dsn]
VITE_SENTRY_ENVIRONMENT=development
VITE_LOG_LEVEL=info
VITE_DEV_DEFAULT_EMAIL=[optional]
VITE_DEV_DEFAULT_PASSWORD=[optional]
```

**Run Development Server**:
```bash
npm run dev
# Opens http://localhost:3000
```

### 2.2 Staging Environment

```bash
# Staging .env (or .env.staging)
VITE_APP_MODE=production
VITE_API_URL=https://bayit-plus-backend-staging-[hash]-ue.a.run.app/api/v1
VITE_STRIPE_PUBLIC_KEY=pk_test_...  # Use test key for staging
VITE_PICOVOICE_ACCESS_KEY=[key]
VITE_SENTRY_DSN=[dsn]
VITE_SENTRY_ENVIRONMENT=staging
VITE_SENTRY_RELEASE=[git-sha]
VITE_LOG_LEVEL=info
```

**Deploy to Staging**:
```bash
# Copy staging config
cp .env.staging .env

# Build
npm run build

# Deploy to preview channel
npm run deploy:preview
# Or manually:
firebase hosting:channel:deploy staging --only web
```

### 2.3 Production Environment

```bash
# Production .env
VITE_APP_MODE=production
VITE_API_URL=https://bayit-plus-backend-[hash]-ue.a.run.app/api/v1
VITE_STRIPE_PUBLIC_KEY=pk_live_51SotiEPvIqPxCVRtIv5wA0yZCGzAvXynXMnRR4cn7qLaiJrzL2YytoP1QKTjs3cLcJGgFGWJGlIn4etYqiWoF7N0009kuzqNUY
VITE_PICOVOICE_ACCESS_KEY=Iiy+q/LvJfsreqidNuIdjQoJXHtkNUhh9HAABKR7jVxJVwObYbEpYA==
VITE_SENTRY_DSN=https://cf75c674a6980b83e7eed8ee5e227a2a@o4510740497367040.ingest.us.sentry.io/4510740503265280
VITE_SENTRY_ENVIRONMENT=production
VITE_SENTRY_RELEASE=[git-sha]
VITE_LOG_LEVEL=warn
```

**Critical**: Never commit production `.env` to version control. Use GCP Secret Manager or Firebase Environment Config.

---

## 3. Staging Deployment

### 3.1 Deploy to Staging

**Step-by-Step**:

```bash
# 1. Switch to staging branch (optional)
git checkout staging
git pull origin staging

# 2. Configure staging environment
cp .env.staging .env

# 3. Clean and build
rm -rf dist/
npm run build

# 4. Deploy to Firebase preview channel
firebase hosting:channel:deploy staging --only web

# Example output:
# ✔  hosting:channel: Channel URL (bayit-plus-web): https://bayit-plus--staging-[random].web.app [expires 2026-02-21 00:00:00]
```

**Staging URL**:
- Channel: `https://bayit-plus--staging-[hash].web.app`
- Expires: 30 days from deployment

### 3.2 Staging Verification

**Automated Tests**:
```bash
# Run Playwright tests against staging
PLAYWRIGHT_BASE_URL=https://bayit-plus--staging-[hash].web.app npm run test:e2e
```

**Manual Smoke Tests**:

1. **Homepage Load** ✅
   - Navigate to staging URL
   - Verify homepage loads without errors
   - Check console for JavaScript errors
   - Verify images and assets load

2. **Authentication Flow** ✅
   - Navigate to /login
   - Test sign in with test account
   - Verify redirect to homepage after login
   - Test logout

3. **Content Browsing** ✅
   - Browse VOD content
   - Browse radio stations
   - Browse podcasts
   - Verify thumbnails load
   - Check metadata displays correctly

4. **Video Player** ✅
   - Play a video
   - Test play/pause controls
   - Test seek functionality
   - Test volume controls
   - Test fullscreen mode
   - Test subtitle toggle (if available)

5. **Search** ✅
   - Use search bar
   - Enter query
   - Verify results load
   - Test result click

6. **User Profile** ✅
   - Navigate to user profile
   - Verify profile data loads
   - Test profile editing
   - Verify changes save

7. **Subscription Flow** ✅
   - Navigate to /subscribe
   - Select a plan
   - Enter test card (Stripe test mode)
   - Complete payment flow
   - Verify subscription activated

8. **Admin Panel** ✅ (if applicable)
   - Login as admin user
   - Navigate to /admin
   - Verify dashboard loads
   - Test admin functions

9. **Responsive Design** ✅
   - Test mobile viewport (375px)
   - Test tablet viewport (768px)
   - Test desktop viewport (1920px)
   - Verify layouts adapt correctly

10. **Cross-Browser** ✅
    - Test Chrome (latest)
    - Test Firefox (latest)
    - Test Safari (latest)
    - Test Edge (latest)

### 3.3 Staging Sign-off

**Checklist**:
- [ ] All smoke tests pass
- [ ] No console errors
- [ ] API connectivity working
- [ ] Authentication working
- [ ] Payment flow working (test mode)
- [ ] No visual regressions
- [ ] Performance acceptable
- [ ] Sentry shows no new errors

**Sign-off Required**:
- [ ] QA Team approval
- [ ] Product Owner approval
- [ ] Technical Lead approval

---

## 4. Production Deployment

### 4.1 Pre-Production Final Checks

**Critical Verification**:
```bash
# 1. Verify on main branch
git branch --show-current  # Must be 'main'

# 2. Verify no uncommitted changes
git status

# 3. Tag release
git tag -a v1.0.0 -m "Production release: 100% TailwindCSS migration"
git push origin v1.0.0

# 4. Configure production environment
cp .env.production .env

# 5. Update Sentry release
export SENTRY_RELEASE=$(git rev-parse --short HEAD)
sed -i '' "s/VITE_SENTRY_RELEASE=.*/VITE_SENTRY_RELEASE=$SENTRY_RELEASE/" .env

# 6. Verify production configuration
cat .env | grep -E "VITE_APP_MODE|VITE_API_URL|VITE_SENTRY_ENVIRONMENT"
```

**Expected Output**:
```
VITE_APP_MODE=production
VITE_API_URL=https://bayit-plus-backend-[hash]-ue.a.run.app/api/v1
VITE_SENTRY_ENVIRONMENT=production
```

### 4.2 Production Build

```bash
# Clean previous builds
rm -rf dist/

# Run production build
npm run build

# Verify build output
echo "Build completed at $(date)"
du -sh dist/
ls -lh dist/ | head -20

# Verify critical files
if [ ! -f "dist/index.html" ]; then
  echo "❌ Missing index.html - abort deployment"
  exit 1
fi

echo "✅ Build verification passed"
```

### 4.3 Production Deployment

**Deployment Command**:
```bash
# Deploy to production Firebase Hosting
npm run deploy

# Or manually:
firebase deploy --only hosting:web

# Expected output:
# ✔  Deploy complete!
# Project Console: https://console.firebase.google.com/project/bayit-plus/overview
# Hosting URL: https://bayit-plus.web.app
```

**Deployment Timeline**:
- Build: ~1-3 minutes
- Upload: ~2-5 minutes
- CDN propagation: ~5-10 minutes
- **Total**: ~10-15 minutes

### 4.4 Immediate Post-Deployment Checks

**Within 5 minutes of deployment**:

```bash
# 1. Check deployment status
firebase hosting:releases:list --limit 5

# 2. Verify production URL accessible
curl -I https://bayit-plus.web.app/
# Expected: HTTP/2 200

# 3. Check Sentry for immediate errors
# Navigate to: https://sentry.io/organizations/[org]/issues/
# Filter: environment:production, last 15 minutes

# 4. Check backend logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=bayit-plus-backend" --limit 50 --format json

# 5. Monitor Firebase Hosting dashboard
# Navigate to: https://console.firebase.google.com/project/bayit-plus/hosting
```

**Critical Metrics** (within first 5 minutes):
- [ ] Homepage returns 200 OK
- [ ] No 500 errors in logs
- [ ] Sentry error rate <5% increase
- [ ] CDN hit rate >90%
- [ ] API connectivity working

---

## 5. Post-Deployment Verification

### 5.1 Smoke Tests (Within 15 minutes)

**Automated Health Checks**:
```bash
#!/bin/bash
# smoke-test.sh

BASE_URL="https://bayit-plus.web.app"

# Test 1: Homepage loads
echo "Test 1: Homepage"
curl -f -s -o /dev/null -w "%{http_code}" $BASE_URL/
# Expected: 200

# Test 2: Static assets
echo "Test 2: Static Assets"
curl -f -s -o /dev/null -w "%{http_code}" $BASE_URL/favicon.ico
# Expected: 200

# Test 3: API proxy
echo "Test 3: API Proxy"
curl -f -s -o /dev/null -w "%{http_code}" $BASE_URL/api/health
# Expected: 200

# Test 4: SPA routing
echo "Test 4: SPA Routing"
curl -f -s -o /dev/null -w "%{http_code}" $BASE_URL/login
# Expected: 200 (returns index.html)

echo "✅ All smoke tests passed"
```

**Manual Smoke Tests**:
1. ✅ Open https://bayit-plus.web.app/
2. ✅ Verify homepage loads
3. ✅ Check browser console (no errors)
4. ✅ Test login flow
5. ✅ Play a video
6. ✅ Test search
7. ✅ Check mobile view
8. ✅ Test admin panel (if applicable)

### 5.2 Performance Validation (Within 30 minutes)

**Lighthouse Audit**:
```bash
# Install Lighthouse CLI (if not installed)
npm install -g lighthouse

# Run Lighthouse audit
lighthouse https://bayit-plus.web.app/ --output html --output-path ./lighthouse-report.html

# View report
open lighthouse-report.html
```

**Target Scores**:
- Performance: **>90** (acceptable >80)
- Accessibility: **>90**
- Best Practices: **>90**
- SEO: **>90**

**Core Web Vitals**:
```bash
# Check Core Web Vitals in Chrome DevTools
# 1. Open https://bayit-plus.web.app/ in Chrome
# 2. Open DevTools (F12)
# 3. Navigate to Lighthouse tab
# 4. Run audit
```

**Target Metrics**:
- FCP (First Contentful Paint): **<1.5s**
- LCP (Largest Contentful Paint): **<2.5s**
- FID (First Input Delay): **<100ms**
- CLS (Cumulative Layout Shift): **<0.1**

### 5.3 Full Regression Tests (Within 1 hour)

**Test Suite Execution**:
```bash
# Run Playwright e2e tests against production
PLAYWRIGHT_BASE_URL=https://bayit-plus.web.app npm run test:e2e

# Run visual regression tests (if available)
npm run test:visual

# Generate test report
npm run test:report
```

**Manual Regression Checklist**:
- [ ] **Authentication**
  - [ ] Login with email/password
  - [ ] Login with social providers (if applicable)
  - [ ] Register new account
  - [ ] Password reset flow
  - [ ] Logout
- [ ] **Content Browsing**
  - [ ] Homepage content loads
  - [ ] VOD page displays videos
  - [ ] Radio page displays stations
  - [ ] Podcasts page displays episodes
  - [ ] Filters work correctly
  - [ ] Sorting works correctly
- [ ] **Video Player**
  - [ ] Video loads and plays
  - [ ] Play/pause controls work
  - [ ] Seek/scrub works
  - [ ] Volume controls work
  - [ ] Fullscreen mode works
  - [ ] Subtitles toggle works
  - [ ] Quality selection works (if applicable)
  - [ ] Chapter navigation works (if applicable)
- [ ] **Search**
  - [ ] Search bar accessible
  - [ ] Search returns results
  - [ ] Result click navigates correctly
  - [ ] Search history (if applicable)
- [ ] **User Profile**
  - [ ] Profile page loads
  - [ ] Profile editing works
  - [ ] Avatar upload works
  - [ ] Preferences save correctly
- [ ] **Subscription/Payment**
  - [ ] Subscription page displays plans
  - [ ] Plan selection works
  - [ ] Stripe payment form loads
  - [ ] Payment processing works
  - [ ] Subscription activation works
  - [ ] Receipt/confirmation displayed
- [ ] **Admin Panel** (if applicable)
  - [ ] Admin dashboard accessible
  - [ ] Content management works
  - [ ] User management works
  - [ ] Analytics display correctly
  - [ ] Librarian agent controls work
- [ ] **Responsive Design**
  - [ ] Mobile (375px) layout correct
  - [ ] Tablet (768px) layout correct
  - [ ] Desktop (1920px) layout correct
  - [ ] Touch interactions work (mobile)
  - [ ] Keyboard navigation works (desktop)
- [ ] **Cross-Browser**
  - [ ] Chrome (latest)
  - [ ] Firefox (latest)
  - [ ] Safari (latest)
  - [ ] Edge (latest)
  - [ ] Mobile Safari (iOS)
  - [ ] Chrome Mobile (Android)

### 5.4 Monitoring Dashboard Setup

**Sentry Dashboard**:
```
URL: https://sentry.io/organizations/[org]/issues/
Filters:
  - environment:production
  - timeframe: last 24 hours
  - sort: frequency
```

**Firebase Hosting Dashboard**:
```
URL: https://console.firebase.google.com/project/bayit-plus/hosting
Metrics:
  - Requests per minute
  - Bandwidth usage
  - CDN cache hit rate
  - Error rate
```

**Cloud Run (Backend) Dashboard**:
```
URL: https://console.cloud.google.com/run
Service: bayit-plus-backend
Metrics:
  - Request count
  - Request latency
  - Error rate
  - CPU utilization
  - Memory utilization
```

---

## 6. Rollback Procedure

### 6.1 When to Rollback

**Immediate Rollback Criteria** (Critical):
- [ ] Error rate >20% increase
- [ ] Payment processing completely broken
- [ ] Authentication completely broken
- [ ] Homepage returns 500 errors
- [ ] Critical security vulnerability discovered
- [ ] Data corruption detected

**Consider Rollback** (High Priority):
- [ ] Error rate 10-20% increase
- [ ] Key features broken (video player, search)
- [ ] Performance degradation >50%
- [ ] Mobile app completely broken
- [ ] Admin panel inaccessible

**Monitor but Don't Rollback** (Low Priority):
- [ ] Error rate <10% increase
- [ ] Minor UI glitches
- [ ] Non-critical features broken
- [ ] Performance degradation <20%
- [ ] Low-traffic pages affected

### 6.2 Firebase Hosting Rollback

**Quick Rollback (Recommended)**:
```bash
# View recent deployments
firebase hosting:releases:list --limit 5

# Rollback to previous deployment
firebase hosting:rollback

# Verify rollback
curl -I https://bayit-plus.web.app/
```

**Rollback Timeline**:
- Command execution: ~10 seconds
- CDN propagation: ~2-5 minutes
- Full rollback: **~5 minutes**

**Rollback to Specific Version**:
```bash
# List all releases
firebase hosting:releases:list

# Rollback to specific release
firebase hosting:rollback [RELEASE_ID]
```

### 6.3 Git Revert Rollback

**For Code-Level Issues**:
```bash
# 1. Identify problematic commit
git log --oneline | head -10

# 2. Create revert commit
git revert [commit-sha]

# 3. Push revert commit
git push origin main

# 4. Rebuild and redeploy
npm run build
npm run deploy

# 5. Monitor deployment
firebase hosting:releases:list
```

**Rollback Timeline**:
- Git revert: ~1 minute
- Build: ~2 minutes
- Deploy: ~5 minutes
- CDN propagation: ~5 minutes
- **Total**: **~15 minutes**

### 6.4 Migration Rollback (EMERGENCY ONLY)

**⚠️ WARNING**: Only use if TailwindCSS migration caused critical issues

```bash
# This will restore all StyleSheet.create code
# NOT RECOMMENDED - migration is thoroughly tested

# Rollback all components
find src -name "*.legacy.tsx" | while read file; do
  original="${file%.legacy.tsx}.tsx"
  echo "Rolling back: $original"
  mv "$file" "$original"
done

# Rebuild
npm run build

# Redeploy
npm run deploy
```

**Migration Rollback Timeline**: ~20 minutes

### 6.5 Post-Rollback Actions

**After Rollback Completes**:

1. **Verify Rollback Success**:
   ```bash
   # Check current deployment
   firebase hosting:releases:list --limit 1

   # Test rolled-back version
   curl -I https://bayit-plus.web.app/

   # Check Sentry error rate
   # Should decrease within 5-10 minutes
   ```

2. **Communicate Status**:
   - [ ] Notify team in Slack/Discord
   - [ ] Update status page (if applicable)
   - [ ] Email stakeholders (if major incident)
   - [ ] Post incident report (after resolution)

3. **Root Cause Analysis**:
   - [ ] Identify what went wrong
   - [ ] Review logs and error reports
   - [ ] Determine fix approach
   - [ ] Create action items
   - [ ] Schedule fix deployment

4. **Prevent Recurrence**:
   - [ ] Add test coverage for failure scenario
   - [ ] Update deployment checklist
   - [ ] Improve monitoring/alerting
   - [ ] Update documentation

---

## 7. Monitoring & Alerts

### 7.1 Real-Time Monitoring

**Sentry Error Tracking**:
```
URL: https://sentry.io/organizations/[org]/issues/
Filters: environment:production

Alerts:
  - Error rate >100/hour
  - New error type detected
  - Performance degradation >30%
```

**Firebase Hosting Monitoring**:
```
URL: https://console.firebase.google.com/project/bayit-plus/hosting

Metrics:
  - Requests/minute
  - Error rate (4xx, 5xx)
  - CDN cache hit rate
  - Bandwidth usage
```

**Cloud Run Backend Monitoring**:
```
URL: https://console.cloud.google.com/run/detail/us-east1/bayit-plus-backend

Metrics:
  - Request latency (p50, p95, p99)
  - Error rate
  - CPU utilization
  - Memory utilization
  - Container instance count
```

### 7.2 Alert Configuration

**Critical Alerts** (Immediate Response):
- [ ] Error rate >1000 errors/hour
- [ ] 5xx error rate >5%
- [ ] API latency >5s (p99)
- [ ] Payment failures >20%
- [ ] Authentication failures >20%

**High Priority Alerts** (Response within 30 minutes):
- [ ] Error rate 500-1000 errors/hour
- [ ] 5xx error rate 2-5%
- [ ] API latency 3-5s (p99)
- [ ] Payment failures 10-20%
- [ ] Page load time >5s

**Medium Priority Alerts** (Response within 2 hours):
- [ ] Error rate 100-500 errors/hour
- [ ] 5xx error rate 1-2%
- [ ] API latency 2-3s (p99)
- [ ] Payment failures 5-10%
- [ ] Performance score drop >10 points

### 7.3 Monitoring Checklist (First 24 Hours)

**Hour 1** (Every 15 minutes):
- [ ] Check Sentry dashboard
- [ ] Monitor Firebase Hosting metrics
- [ ] Review Cloud Run logs
- [ ] Check error rate trend
- [ ] Verify no critical alerts

**Hours 2-8** (Every hour):
- [ ] Review Sentry issues
- [ ] Check performance metrics
- [ ] Monitor user reports
- [ ] Verify payment processing
- [ ] Check API health

**Hours 8-24** (Every 4 hours):
- [ ] Daily Sentry summary
- [ ] Performance trend analysis
- [ ] User feedback review
- [ ] Backend health check
- [ ] Resource utilization review

---

## 8. Troubleshooting

### 8.1 Common Issues

#### Issue 1: Deployment Fails with "Permission Denied"

**Symptoms**:
```
Error: Permission denied
Firebase deployment failed
```

**Resolution**:
```bash
# Re-authenticate
firebase login

# Verify project access
firebase projects:list

# Set correct project
firebase use bayit-plus

# Retry deployment
firebase deploy --only hosting:web
```

#### Issue 2: Build Fails with "Out of Memory"

**Symptoms**:
```
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
```

**Resolution**:
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"

# Clean cache
rm -rf node_modules/.cache

# Retry build
npm run build
```

#### Issue 3: Assets Not Loading (404)

**Symptoms**:
- Images return 404
- JS/CSS files return 404
- Console errors: "Failed to load resource"

**Resolution**:
```bash
# Verify assets copied during build
ls -la dist/assets/

# Check webpack config
# File: webpack.config.cjs
# Verify CopyWebpackPlugin patterns

# Rebuild
rm -rf dist/
npm run build

# Verify files exist
ls -la dist/assets/images/
```

#### Issue 4: API Calls Failing (CORS)

**Symptoms**:
```
Access to fetch at 'https://backend.com/api' from origin 'https://bayit-plus.web.app' has been blocked by CORS policy
```

**Resolution**:
```bash
# Check backend CORS configuration
# Backend should allow: https://bayit-plus.web.app

# Verify API URL in .env
grep VITE_API_URL .env

# Check Firebase rewrite rules
cat ../firebase.json | grep -A5 "rewrites"

# Test API directly
curl -I https://bayit-plus-backend-[hash]-ue.a.run.app/api/health
```

#### Issue 5: Page Loads Blank (White Screen)

**Symptoms**:
- Homepage loads but shows nothing
- Console error: "Uncaught SyntaxError" or "Uncaught ReferenceError"

**Resolution**:
```bash
# Check browser console for errors
# Common causes:
# 1. Missing environment variables
# 2. JavaScript syntax error
# 3. Module loading failure

# Verify environment variables
cat .env

# Check build output for errors
npm run build 2>&1 | grep -i error

# Test in incognito mode (cache issue)
# Test in different browser
```

### 8.2 Rollback Decision Tree

```
Error Detected
    ↓
Is error rate >20%? ─── YES ─── IMMEDIATE ROLLBACK
    ↓ NO
Is payment broken? ─── YES ─── IMMEDIATE ROLLBACK
    ↓ NO
Is auth broken? ─── YES ─── IMMEDIATE ROLLBACK
    ↓ NO
Is error rate 10-20%? ─── YES ─── Consider rollback + investigate
    ↓ NO
Is key feature broken? ─── YES ─── Investigate + fix + hotfix deploy
    ↓ NO
Monitor and create ticket
```

### 8.3 Emergency Hotfix Procedure

**For Critical Bugs Post-Deployment**:

```bash
# 1. Create hotfix branch
git checkout -b hotfix/critical-bug main

# 2. Apply fix (minimal changes only)
# Edit necessary files

# 3. Test locally
npm run build
# Manual testing

# 4. Commit and push
git add .
git commit -m "hotfix: Fix critical bug [JIRA-XXX]"
git push origin hotfix/critical-bug

# 5. Merge to main (fast-track approval)
git checkout main
git merge hotfix/critical-bug
git push origin main

# 6. Deploy immediately
npm run build
npm run deploy

# 7. Monitor deployment
# Watch Sentry for 15 minutes
```

**Hotfix Timeline**: Target <30 minutes from bug discovery to deployed fix.

---

## 9. Emergency Contacts

### 9.1 Team Contacts

**On-Call Rotation**:
| Role | Primary | Backup | Phone |
|------|---------|--------|-------|
| Frontend Lead | [Name] | [Name] | [Phone] |
| Backend Lead | [Name] | [Name] | [Phone] |
| DevOps Engineer | [Name] | [Name] | [Phone] |
| Product Owner | [Name] | [Name] | [Phone] |

### 9.2 External Services

**Firebase Support**:
- Console: https://console.firebase.google.com/support
- Community: https://firebase.google.com/support
- Status: https://status.firebase.google.com/

**Sentry Support**:
- Dashboard: https://sentry.io/support/
- Status: https://status.sentry.io/

**Stripe Support**:
- Dashboard: https://dashboard.stripe.com/support
- Emergency: https://support.stripe.com/
- Status: https://status.stripe.com/

**Google Cloud Support**:
- Console: https://console.cloud.google.com/support
- Status: https://status.cloud.google.com/

### 9.3 Escalation Path

**Level 1** (First Response - Target: <15 minutes):
- On-call frontend engineer
- Check monitoring dashboards
- Assess severity
- Attempt immediate fix or rollback

**Level 2** (Escalation - Target: <30 minutes):
- Frontend lead + Backend lead
- DevOps engineer
- Coordinate cross-team response
- Communication to stakeholders

**Level 3** (Major Incident - Target: <1 hour):
- CTO/Technical Director
- Product Owner
- Customer support team
- Public communication plan

---

## 10. Post-Deployment Checklist

### 10.1 Immediate (0-1 Hour)

- [ ] Production URL accessible
- [ ] Homepage loads without errors
- [ ] Authentication working
- [ ] Video player working
- [ ] API connectivity verified
- [ ] Sentry showing normal error rate
- [ ] No critical alerts triggered

### 10.2 Short-term (1-8 Hours)

- [ ] All smoke tests passed
- [ ] Performance metrics acceptable
- [ ] Full regression tests passed
- [ ] No user-reported issues
- [ ] Payment flow working
- [ ] Admin panel accessible
- [ ] Mobile app integration working

### 10.3 Long-term (8-24 Hours)

- [ ] Performance trend normal
- [ ] Error rate stable
- [ ] User engagement metrics normal
- [ ] No resource exhaustion
- [ ] Monitoring dashboards reviewed
- [ ] Incident report created (if applicable)
- [ ] Lessons learned documented

---

## Appendix A: Quick Reference Commands

```bash
# Build
npm run build

# Deploy to staging
firebase hosting:channel:deploy staging --only web

# Deploy to production
npm run deploy

# Rollback
firebase hosting:rollback

# Check deployment status
firebase hosting:releases:list

# Run tests
npm test
npm run test:e2e

# Security audit
npm audit
npm audit fix

# Check bundle size
du -sh dist/
```

---

## Appendix B: Deployment History Log

**Log Format**:
```
Date: YYYY-MM-DD HH:MM
Version: vX.Y.Z
Deployer: [Name]
Environment: staging/production
Status: success/failed/rolled-back
Notes: [Any relevant notes]
```

**Example**:
```
Date: 2026-01-22 14:30
Version: v1.0.0
Deployer: John Doe
Environment: production
Status: success
Notes: 100% TailwindCSS migration complete. No issues reported.
```

---

**Runbook Version**: 1.0
**Last Updated**: 2026-01-22
**Next Review**: 2026-02-22
**Owner**: Frontend Team
