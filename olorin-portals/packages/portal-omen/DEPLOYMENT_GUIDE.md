# Portal-Omen Deployment Guide

## 🎯 Overview

This guide walks you through deploying Portal-Omen to Firebase Hosting at https://olorin-omen.web.app

**Production Approval Status**: ✅ APPROVED by all 13 reviewers (Grade: A-)

---

## 📋 Pre-Deployment Checklist

### 1. Update Environment Variables

Edit `/packages/portal-omen/.env` and replace placeholder values:

```bash
# EmailJS Configuration (REQUIRED)
# Get these from https://dashboard.emailjs.com/
REACT_APP_EMAILJS_SERVICE_ID=YOUR_SERVICE_ID_HERE     # ⚠️ UPDATE THIS
REACT_APP_EMAILJS_TEMPLATE_ID=YOUR_TEMPLATE_ID_HERE   # ⚠️ UPDATE THIS
REACT_APP_EMAILJS_PUBLIC_KEY=YOUR_PUBLIC_KEY_HERE     # ⚠️ UPDATE THIS

# Contact Information (verify these are correct)
REACT_APP_CONTACT_EMAIL=omen@olorin.ai
REACT_APP_CONTACT_PHONE=+1 (201) 397-9142
REACT_APP_CONTACT_PHONE_HREF=+12013979142
REACT_APP_CONTACT_ADDRESS=Teaneck, NJ, USA
REACT_APP_CONTACT_HOURS=Mon - Fri: 9AM - 6PM EST
```

**To get EmailJS credentials:**
1. Go to https://dashboard.emailjs.com/
2. Create/sign into your account
3. Create an Email Service (Gmail, Outlook, etc.)
4. Create an Email Template with these template variables:
   - `{{from_name}}`
   - `{{from_email}}`
   - `{{company}}`
   - `{{phone}}`
   - `{{use_case}}`
   - `{{interest}}`
   - `{{message}}`
   - `{{portal}}`
5. Copy the Service ID, Template ID, and Public Key to your .env file

### 2. Verify Firebase Configuration

Check that these files exist and are correct:

- ✅ `.firebaserc` - Project: olorin-ai, Target: portal-omen → olorin-omen
- ✅ `firebase.json` - Target: portal-omen, Public: build, CSP headers configured
- ✅ `.env` - All environment variables set

---

## 🏗️ Build Process

### 1. Install Dependencies

```bash
cd /Users/olorin/Documents/olorin/olorin-portals/packages/portal-omen
npm install
```

### 2. Build Production Bundle

```bash
npm run build
```

**Expected Output:**
- Build completes without errors
- Build size under 500KB gzipped
- No TypeScript errors
- No ESLint warnings

**Build Output Location:** `/packages/portal-omen/build/`

### 3. Test Build Locally (Optional)

```bash
npx serve -s build -l 3304
```

Then visit http://localhost:3304 to verify:
- All pages load correctly
- Language switcher works (EN ⇄ HE)
- RTL layout renders properly for Hebrew
- Contact form displays (don't test submission yet - EmailJS needs production domain)
- No console errors
- Animations work smoothly

---

## 🚀 Deployment

### 1. Deploy to Firebase Hosting

```bash
firebase deploy --only hosting:portal-omen
```

**Expected Output:**
```
=== Deploying to 'olorin-ai'...

i  deploying hosting
i  hosting[olorin-omen]: beginning deploy...
i  hosting[olorin-omen]: found 15 files in build
✔  hosting[olorin-omen]: file upload complete
i  hosting[olorin-omen]: finalizing version...
✔  hosting[olorin-omen]: version finalized
i  hosting[olorin-omen]: releasing new version...
✔  hosting[olorin-omen]: release complete

✔  Deploy complete!

Project Console: https://console.firebase.google.com/project/olorin-ai/overview
Hosting URL: https://olorin-omen.web.app
```

### 2. Deployment Complete

Your site is now live at:
- **Primary URL**: https://olorin-omen.web.app
- **Secondary URL**: https://olorin-omen.firebaseapp.com

---

## ✅ Post-Deployment Verification

### 1. Functional Testing

Visit https://olorin-omen.web.app and verify:

**Hero Section:**
- [ ] Headline "WEAR YOUR WORDS." displays correctly
- [ ] Omen device image loads and animates (breathing effect)
- [ ] CTA button "EQUIP THE ARTIFACT" is clickable
- [ ] Particle background animates smoothly

**Demo Section:**
- [ ] "HOW IT WORKS" title visible
- [ ] Wizard animation cycles through states (Speaking → Thinking → Result)
- [ ] Translation text appears: "NICE TO MEET YOU"
- [ ] User and viewer perspectives both render

**Tech Specs Section:**
- [ ] "FORGED IN SILICON" title visible
- [ ] Three spec cards display: Display, Core, Array
- [ ] Cards have glassmorphism effect
- [ ] Hover states work (scale + glow)

**Footer CTA:**
- [ ] "THE FUTURE OF DIPLOMACY" title visible
- [ ] "PRE-ORDER THE ARTIFACT" button functional
- [ ] Device image displays on pedestal

**Contact Page** (`/contact`):
- [ ] Contact form displays all fields
- [ ] Select dropdowns show translated options
- [ ] Contact information shows correct values from .env
- [ ] Submit button works
- [ ] **Test Form Submission**: Fill out form and submit
  - Should see success message
  - Check your email inbox for the contact form submission
  - If fails, check browser console for EmailJS errors

**Internationalization:**
- [ ] Language switcher visible in top-right
- [ ] Switch to Hebrew - layout flips to RTL
- [ ] All text translates to Hebrew
- [ ] Gradients flow correctly in RTL
- [ ] Switch back to English - layout returns to LTR
- [ ] Language preference persists on refresh

**Mobile Testing** (use Chrome DevTools Device Mode):
- [ ] iPhone SE (320px) - no horizontal scroll, touch targets ≥44px
- [ ] iPhone 15 (375px) - proper layout, readable text
- [ ] iPad (768px) - tablet layout, proper spacing
- [ ] Desktop (1920px) - desktop layout, animations smooth

### 2. Security Headers Verification

Open browser DevTools (F12) → Network tab → Reload page → Click on the main document request → Check Headers:

**Verify these headers are present:**
```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https://fonts.googleapis.com https://fonts.gstatic.com; connect-src 'self' https://api.emailjs.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests

X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

### 3. Performance Testing

Run Lighthouse audit in Chrome DevTools:

**Target Scores (WCAG 2.1 AA Compliance):**
- Performance: ≥90
- Accessibility: ≥95
- Best Practices: ≥90
- SEO: ≥95

**Core Web Vitals:**
- First Contentful Paint (FCP): <1.5s
- Largest Contentful Paint (LCP): <2.5s
- Cumulative Layout Shift (CLS): <0.1

### 4. Accessibility Testing

**Keyboard Navigation:**
- [ ] Press Tab - focus indicators visible
- [ ] Navigate through all interactive elements
- [ ] Press Enter on CTA buttons - they activate
- [ ] No keyboard traps

**Screen Reader (VoiceOver on Mac / NVDA on Windows):**
- [ ] Enable screen reader
- [ ] Navigate through page
- [ ] Verify ARIA labels announce correctly
- [ ] Image alt text is descriptive
- [ ] Section headings are announced

**Reduced Motion:**
- [ ] Enable "Reduce Motion" in OS settings
- [ ] Reload page
- [ ] Verify animations are disabled or slowed
- [ ] Particle background still works (static or minimal motion)

---

## 🐛 Troubleshooting

### Issue: Build Fails with TypeScript Errors

**Solution:**
```bash
npm run build 2>&1 | tee build-errors.log
# Check build-errors.log for specific TypeScript errors
# Fix errors in source files
npm run build
```

### Issue: Contact Form Submission Fails

**Symptoms:**
- Form shows error message after submission
- Browser console shows CORS or network errors

**Solutions:**

1. **Verify EmailJS Configuration:**
   - Check .env has correct Service ID, Template ID, Public Key
   - Verify EmailJS template exists and is active
   - Check EmailJS dashboard for error logs

2. **Verify CSP Headers:**
   - Open DevTools → Network tab
   - Check main document response headers
   - Confirm `connect-src 'self' https://api.emailjs.com` is present
   - If missing, redeploy with `firebase deploy --only hosting:portal-omen`

3. **Test EmailJS Directly:**
   ```javascript
   // Open browser console on deployed site
   emailjs.send('YOUR_SERVICE_ID', 'YOUR_TEMPLATE_ID', {
     from_name: 'Test',
     from_email: 'test@test.com',
     message: 'Test message'
   }, 'YOUR_PUBLIC_KEY')
   .then(() => console.log('SUCCESS'))
   .catch(err => console.error('ERROR:', err));
   ```

### Issue: Deployment Fails with "Target not found"

**Symptoms:**
```
Error: HTTP Error: 404, Requested entity was not found.
```

**Solution:**
1. Verify .firebaserc has correct target mapping:
   ```json
   {
     "targets": {
       "olorin-ai": {
         "hosting": {
           "portal-omen": ["olorin-omen"]
         }
       }
     }
   }
   ```

2. Verify firebase.json has target specified:
   ```json
   {
     "hosting": {
       "target": "portal-omen",
       ...
     }
   }
   ```

3. List available sites:
   ```bash
   firebase hosting:sites:list
   ```

4. If olorin-omen doesn't exist, create it:
   ```bash
   firebase hosting:sites:create olorin-omen
   ```

### Issue: Language Switcher Not Working

**Symptoms:**
- Clicking language switcher does nothing
- Language doesn't persist on refresh

**Solutions:**

1. **Check localStorage:**
   - Open DevTools → Application tab → Local Storage
   - Look for `i18nextLng` key
   - If missing, check browser console for i18n errors

2. **Verify translation files loaded:**
   - Open DevTools → Network tab
   - Reload page
   - Check for `omen.en.json` and `omen.he.json` in requests
   - If 404 errors, check build output includes these files in `build/locales/`

3. **Clear cache and reload:**
   - Press Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
   - If still not working, open Incognito/Private window

### Issue: Animations Laggy on Mobile

**Symptoms:**
- Particle background stutters
- Breathing animation choppy
- Overall sluggish performance

**Solutions:**

1. **Check device tier detection:**
   - Open DevTools → Console
   - Check for device memory and cores:
     ```javascript
     console.log(navigator.deviceMemory, navigator.hardwareConcurrency);
     ```
   - Low values (<4GB RAM, <4 cores) should reduce particle count

2. **Verify reduced motion:**
   - Enable "Reduce Motion" in OS settings
   - Animations should simplify or disable

3. **Check particle count:**
   - Inspect .env values:
     ```bash
     REACT_APP_PARTICLE_COUNT_MOBILE=15  # Should be low
     REACT_APP_PARTICLE_COUNT_DESKTOP=50
     ```
   - Reduce mobile count if needed and redeploy

### Issue: RTL Layout Broken

**Symptoms:**
- Hebrew text displays left-to-right
- Layout doesn't flip for RTL
- Components overlap incorrectly

**Solutions:**

1. **Verify dir attribute:**
   - Inspect `<html>` element
   - Should have `dir="rtl"` when Hebrew selected
   - If missing, check App.tsx i18n integration

2. **Check logical properties:**
   - RTL uses `end-4` not `right-4`
   - If you see `right-*` or `left-*` classes, they should be `start-*` or `end-*`

3. **Test gradient direction:**
   - Hebrew gradients should use `gradient-to-l`
   - English gradients should use `gradient-to-r`

---

## 📊 Monitoring

### Firebase Hosting Console

View deployment metrics at:
https://console.firebase.google.com/project/olorin-ai/hosting/sites/olorin-omen

**Key Metrics:**
- Total requests
- Data transfer
- Bandwidth usage
- Error rate

### Web Vitals Monitoring

In production, Web Vitals are logged to console (development mode only). For production monitoring, integrate with Google Analytics or similar:

```typescript
// src/index.tsx already has:
if (process.env.NODE_ENV === 'development') {
  reportWebVitals(console.log);
}

// For production, replace with:
reportWebVitals(sendToAnalytics);
```

---

## 🔄 Updating the Site

### To Deploy Updates:

1. Make code changes
2. Test locally: `npm start`
3. Build: `npm run build`
4. Deploy: `firebase deploy --only hosting:portal-omen`

### To Roll Back:

```bash
# View deployment history
firebase hosting:releases:list --only portal-omen

# Rollback to previous version
firebase hosting:rollback --only portal-omen
```

---

## 📞 Support

**If you encounter issues:**

1. Check browser console for errors (F12 → Console tab)
2. Check Firebase Hosting logs in Firebase Console
3. Review this troubleshooting guide
4. Verify all environment variables are set correctly
5. Ensure you're using the latest build

**Configuration Files:**
- Firebase Config: `/packages/portal-omen/.firebaserc`
- Hosting Config: `/packages/portal-omen/firebase.json`
- Environment: `/packages/portal-omen/.env`
- Dependencies: `/packages/portal-omen/package.json`

---

## ✅ Deployment Complete!

Once all verification steps pass, your Portal-Omen site is live and production-ready at:

**🌐 https://olorin-omen.web.app**

Congratulations! 🎉
