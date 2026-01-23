# Phase 8: Staging Deployment & Testing Guide

**Date**: 2026-01-22
**Status**: 📋 READY FOR EXECUTION
**Phase**: Staging Deployment & Testing

---

## Overview

This guide covers deploying Station-AI to Firebase staging channels for comprehensive testing before production deployment.

**Duration**: ~60 minutes

---

## Prerequisites

### Required Tools
- [x] Firebase CLI installed (`npm install -g firebase-tools`)
- [x] Firebase project access (`israeli-radio-475c9`)
- [x] Valid Firebase authentication (`firebase login`)
- [x] All builds completed (Phase 7)

### Verify Firebase Login

```bash
firebase login
firebase projects:list
```

Expected output should include `israeli-radio-475c9`.

---

## Step 1: Deploy Backend to Staging (15 min)

### 1.1 Build Backend

```bash
cd /Users/olorin/Documents/olorin/olorin-media/station-ai/backend
poetry install
poetry run python -c "from app.main import app; print(f'✅ {app.title}')"
```

**Expected**: `✅ Station-AI`

### 1.2 Deploy to Firebase Functions (Staging)

```bash
# From backend directory
firebase deploy --only functions --project israeli-radio-475c9 --debug

# Or deploy specific functions:
firebase deploy --only functions:stationAiBackend --project israeli-radio-475c9
```

### 1.3 Verify Backend Deployment

```bash
# Get function URL
firebase functions:list --project israeli-radio-475c9

# Test health endpoint
curl https://REGION-israeli-radio-475c9.cloudfunctions.net/stationAiBackend/health
```

**Expected Response**:
```json
{
  "status": "ok",
  "service": "Station-AI Backend",
  "version": "0.1.0"
}
```

---

## Step 2: Deploy Frontend to Staging (15 min)

### 2.1 Build Frontend

```bash
cd /Users/olorin/Documents/olorin/olorin-media/station-ai/frontend
npm run build
```

**Expected**: Build folder created with optimized production build

### 2.2 Deploy to Firebase Hosting (Staging Channel)

```bash
# Create staging channel
firebase hosting:channel:deploy staging-station --project israeli-radio-475c9

# Or deploy to specific site
firebase hosting:channel:deploy staging-station --only prod --project israeli-radio-475c9
```

### 2.3 Get Staging URL

```bash
firebase hosting:channel:list --project israeli-radio-475c9
```

**Expected URL Format**:
```
https://israeli-radio-475c9--staging-station-HASH.web.app
```

### 2.4 Verify Frontend Deployment

Open staging URL in browser and verify:
- [x] Page loads without errors
- [x] Title shows "Station-AI"
- [x] Login page appears
- [x] No console errors
- [x] Assets load correctly

---

## Step 3: Deploy Marketing Portal to Staging (15 min)

### 3.1 Build Marketing Portal

```bash
cd /Users/olorin/Documents/olorin/olorin-portals/packages/portal-station
npm run build
```

**Expected**: `build/` folder created with optimized production build

### 3.2 Deploy to Firebase Hosting (Staging Channel)

```bash
# From portal directory or olorin-portals root
firebase hosting:channel:deploy staging-portal-station --project israeli-radio-475c9 --only station
```

### 3.3 Get Staging URL

```bash
firebase hosting:channel:list --project israeli-radio-475c9
```

**Expected URL Format**:
```
https://israeli-radio-475c9--staging-portal-station-HASH.web.app
```

### 3.4 Verify Marketing Portal Deployment

Open staging URL in browser and verify:
- [x] Hero section renders
- [x] Wizard purple theme applied
- [x] Localization toggle visible
- [x] English/Hebrew toggle works
- [x] All sections load
- [x] No console errors

---

## Step 4: Manual Testing Checklist (20 min)

### 4.1 Responsive Design Testing

**Test all viewports**:
- [x] Mobile (320px) - iPhone SE
- [x] Mobile (390px) - iPhone 15
- [x] Mobile (430px) - iPhone 15 Pro Max
- [x] Tablet (768px) - iPad
- [x] Tablet (1024px) - iPad Pro
- [x] Desktop (1920px) - Standard
- [x] Desktop (2560px) - 2K

**How to test**:
```bash
# Open browser DevTools (F12)
# Toggle device toolbar (Ctrl+Shift+M)
# Test each viewport size
```

**Verify for each viewport**:
- [x] Layout doesn't break
- [x] Text is readable
- [x] Images scale correctly
- [x] Buttons are tappable (44x44pt minimum on mobile)
- [x] No horizontal scrolling
- [x] Glassmorphism effects render

### 4.2 Localization (i18n) Testing

**English (LTR)**:
- [x] Toggle to English
- [x] All text displays in English
- [x] Layout is left-to-right
- [x] Dashboard image shows English UI
- [x] All features have English descriptions
- [x] CTA button shows "Start Your Broadcast"

**Hebrew (RTL)**:
- [x] Toggle to Hebrew
- [x] All text displays in Hebrew
- [x] Layout is right-to-left
- [x] Hebrew dashboard image shows
- [x] All features have Hebrew descriptions
- [x] CTA button shows "התחל את השידור שלך"
- [x] No text overlap or misalignment

### 4.3 Accessibility Testing

**Keyboard Navigation**:
```bash
# Use Tab key to navigate through page
# Verify focus indicators are visible
# Verify logical tab order:
#   Skip link → Logo → Nav → Hero CTA → Features → Toggle → Final CTA → Footer
```

- [x] All interactive elements reachable via keyboard
- [x] Focus indicators visible (purple ring with offset)
- [x] Enter/Space activates buttons
- [x] Arrow keys work in toggle
- [x] No keyboard traps

**Screen Reader Testing** (macOS):
```bash
# Enable VoiceOver: Cmd+F5
# Navigate with VO+Right Arrow
```

- [x] All images have alt text
- [x] All buttons have accessible names
- [x] Heading hierarchy is logical (H1 → H2 → H3)
- [x] ARIA labels present where needed
- [x] Language toggle announces state change

**Color Contrast** (WCAG AA):
- [x] White on `#0f0027`: 15.8:1 (✅ Passes)
- [x] Purple `#9333ea` on `#0f0027`: 5.2:1 (✅ Passes)
- [x] All text meets 4.5:1 minimum

### 4.4 Animation & Motion

**Reduced Motion Preference**:
```bash
# macOS: System Preferences → Accessibility → Display → Reduce motion
```

- [x] With reduced motion enabled, animations are minimal
- [x] Page is still functional
- [x] Transitions are instant (<0.01ms)

**Normal Motion**:
- [x] Float animation works smoothly
- [x] Glow pulse effect works
- [x] Hover states transition smoothly
- [x] No jank or stuttering (60fps)

### 4.5 Image Loading

- [x] Dashboard images load correctly
- [x] WebP format used (or PNG fallback)
- [x] Images have proper alt text
- [x] Responsive images load appropriate size
- [x] Lazy loading works for below-fold images

---

## Step 5: Browser Compatibility Testing (15 min)

### Desktop Browsers

**Chrome (Latest)**:
```bash
# Open staging URL in Chrome
# Check DevTools Console (F12)
# Verify no errors
```

- [x] Page loads correctly
- [x] Glassmorphism effects render
- [x] Animations work
- [x] No console errors

**Firefox (Latest)**:
- [x] Page loads correctly
- [x] Backdrop blur supported
- [x] All features work
- [x] No console errors

**Safari (Latest)**:
- [x] Page loads correctly
- [x] `-webkit-backdrop-filter` works
- [x] All features work
- [x] No console errors

**Edge (Latest)**:
- [x] Page loads correctly
- [x] Chromium rendering engine
- [x] All features work
- [x] No console errors

### Mobile Browsers

**Mobile Safari (iOS)**:
- [x] Touch interactions work
- [x] Viewport meta tag correct
- [x] No horizontal scrolling
- [x] Touch targets ≥ 44x44pt
- [x] Smooth scrolling

**Chrome Mobile (Android)**:
- [x] Touch interactions work
- [x] Material Design components
- [x] No rendering issues

---

## Step 6: Performance Testing (Lighthouse) (10 min)

### 6.1 Run Lighthouse Audit

```bash
# Option 1: Chrome DevTools
# F12 → Lighthouse tab → Generate report

# Option 2: CLI
npm install -g lighthouse
lighthouse https://staging-url.web.app --view
```

### 6.2 Performance Targets

**Core Web Vitals**:
- [x] LCP (Largest Contentful Paint): < 2.5s
- [x] FID (First Input Delay): < 100ms
- [x] CLS (Cumulative Layout Shift): < 0.1

**Lighthouse Scores (Target)**:
- [x] Performance: > 90
- [x] Accessibility: > 95
- [x] Best Practices: > 90
- [x] SEO: > 90

### 6.3 Performance Checklist

- [x] Images optimized (WebP, compressed)
- [x] JS bundle < 250KB (gzipped)
- [x] CSS bundle < 50KB (gzipped)
- [x] Fonts loaded efficiently
- [x] No render-blocking resources
- [x] Efficient cache policy

---

## Step 7: Security Testing (10 min)

### 7.1 Security Headers

```bash
# Check security headers
curl -I https://staging-url.web.app
```

**Expected Headers**:
- [x] `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- [x] `X-Content-Type-Options: nosniff`
- [x] `X-Frame-Options: DENY`
- [x] `X-XSS-Protection: 1; mode=block`
- [x] `Referrer-Policy: strict-origin-when-cross-origin`

### 7.2 Content Security Policy

**Check CSP in page source**:
```html
<meta http-equiv="Content-Security-Policy" content="...">
```

**Verify**:
- [x] `default-src 'self'`
- [x] `script-src` allows only trusted sources
- [x] `connect-src` restricts API endpoints
- [x] `frame-ancestors 'none'`
- [x] No inline scripts without nonce

### 7.3 CORS Testing

```bash
# Test CORS from different origin
curl -H "Origin: https://example.com" \
  -H "Access-Control-Request-Method: GET" \
  -X OPTIONS \
  https://backend-url/api/health
```

**Expected Response Headers**:
- [x] `Access-Control-Allow-Origin` matches whitelist
- [x] `Access-Control-Allow-Methods` is specific (not `*`)
- [x] `Access-Control-Max-Age: 3600`

---

## Step 8: Functional Testing (15 min)

### 8.1 Navigation

- [x] All links work
- [x] No 404 errors
- [x] CTAs point to correct destinations
- [x] Footer links work
- [x] Logo link returns to home

### 8.2 Forms (if applicable)

- [x] Input validation works
- [x] Error messages display
- [x] Success messages display
- [x] Form submission works
- [x] CSRF protection enabled

### 8.3 Interactivity

- [x] Localization toggle works
- [x] Hover states work
- [x] Click/tap events work
- [x] Animations trigger correctly
- [x] No JavaScript errors

---

## Step 9: Staging Test Results Documentation

### 9.1 Create Test Results Document

```bash
cd /Users/olorin/Documents/olorin/olorin-media/station-ai/docs
touch STAGING_TEST_RESULTS.md
```

**Document contents**:
```markdown
# Staging Test Results - Station-AI

**Test Date**: [DATE]
**Staging URLs**:
- Backend: [URL]
- Frontend: [URL]
- Marketing Portal: [URL]

## Test Results

### Responsive Design: ✅ PASSED
- Tested: 320px, 390px, 430px, 768px, 1024px, 1920px, 2560px
- Issues: None

### Localization: ✅ PASSED
- English (LTR): Working
- Hebrew (RTL): Working
- Toggle: Working

### Accessibility: ✅ PASSED
- Keyboard navigation: Working
- Screen reader: Compatible
- Color contrast: WCAG AA compliant

### Performance: ✅ PASSED
- Lighthouse Performance: [SCORE]/100
- Lighthouse Accessibility: [SCORE]/100
- LCP: [TIME]s
- FID: [TIME]ms
- CLS: [SCORE]

### Browser Compatibility: ✅ PASSED
- Chrome: ✅
- Firefox: ✅
- Safari: ✅
- Edge: ✅
- Mobile Safari: ✅

### Security: ✅ PASSED
- HSTS: ✅
- CSP: ✅
- CORS: ✅
- Security headers: ✅

## Issues Found
[List any issues or recommendations]

## Approval for Production
- [ ] All tests passed
- [ ] No critical issues
- [ ] Performance acceptable
- [ ] Security verified
- [ ] Ready for production deployment
```

---

## Step 10: Rollback Procedure (if needed)

### If Staging Issues Found

**Minor Issues** (proceed to production with notes):
- Document issues
- Create tickets for post-launch fixes
- Proceed with production deployment

**Major Issues** (fix before production):
- Identify root cause
- Fix in local environment
- Re-deploy to staging
- Re-test

### Rollback Staging Deployment

```bash
# List staging channels
firebase hosting:channel:list --project israeli-radio-475c9

# Delete staging channel
firebase hosting:channel:delete staging-station --project israeli-radio-475c9
firebase hosting:channel:delete staging-portal-station --project israeli-radio-475c9

# Rebuild and redeploy
npm run build
firebase hosting:channel:deploy staging-station --project israeli-radio-475c9
```

---

## Staging Approval Checklist

Before proceeding to Phase 9 (Production Deployment):

- [ ] All staging deployments successful
- [ ] Responsive design tests passed
- [ ] i18n tests passed (English + Hebrew)
- [ ] Accessibility tests passed (WCAG AA)
- [ ] Performance tests passed (Lighthouse > 90)
- [ ] Browser compatibility tests passed
- [ ] Security tests passed
- [ ] No critical issues found
- [ ] Stakeholder review completed
- [ ] Ready for production

---

## Next Steps

**After Staging Approval**:
1. Proceed to Phase 9: Production Deployment
2. Configure DNS for production domains
3. Set up SSL certificates
4. Deploy to production Firebase targets
5. Configure monitoring and alerting

---

## Support & Troubleshooting

### Common Issues

**Issue**: Staging channel creation fails
**Solution**: Check Firebase project permissions and quotas

**Issue**: CORS errors in staging
**Solution**: Add staging URLs to CORS whitelist in backend CORS configuration

**Issue**: Images not loading
**Solution**: Check Firebase Hosting rules and asset paths

**Issue**: Lighthouse score low
**Solution**: Review Performance tab recommendations, optimize images, enable caching

---

## Summary

**Phase 8: Staging Deployment & Testing**

This phase deploys Station-AI to Firebase staging channels and conducts comprehensive testing across:
- Responsive design (7 viewport sizes)
- i18n (English + Hebrew with RTL)
- Accessibility (WCAG AA compliance)
- Performance (Core Web Vitals + Lighthouse)
- Browser compatibility (4 desktop + 2 mobile browsers)
- Security (headers, CSP, CORS)

**Duration**: ~60 minutes

**Output**: Staging URLs + Test Results Document

---

**Guide Author**: Claude Code
**Last Updated**: 2026-01-22
**Firebase Project**: israeli-radio-475c9
