# Firebase Deployment Guide

## 🔐 Firebase Authentication Required

Your Firebase credentials have expired. Before deploying, you need to re-authenticate.

### Step 1: Re-authenticate with Firebase

```bash
firebase login --reauth
```

This will:
1. Open your browser
2. Ask you to sign in with Google
3. Grant Firebase CLI access
4. Save credentials for future deployments

### Step 2: Deploy Web App

Once authenticated, deploy the web app:

```bash
firebase deploy --only hosting:web
```

Or from the project root:

```bash
cd /Users/olorin/Documents/Bayit-Plus
firebase deploy --only hosting:web
```

---

## 📦 What Will Be Deployed

**Target:** `web` (bayit-plus-web)
**Source:** `web/dist/`
**Build Status:** ✅ Already built (2.61 MiB bundle)

**Files:**
- `index.html` (1.8 KiB)
- `bundle.d29ea72599c3fd41faad.js` (2.6 MiB)
- `logo.png` (20 KiB)
- Fonts and voice recognition models

---

## 🎯 Firebase Configuration

### Project Details

**Firebase Project:** `bayit-plus`

**Hosting Targets:**
1. **Web App** (`web` target)
   - Site: `bayit-plus-web`
   - Deploy directory: `web/dist/`
   - URL: Will be shown after deployment

2. **TV App** (`tv` target)
   - Site: `bayit-plus`
   - Deploy directory: `tv-app/dist/`
   - URL: Will be shown after deployment

### Configuration Files

**`firebase.json`:**
```json
{
  "hosting": [
    {
      "target": "web",
      "public": "web/dist",
      "rewrites": [{"source": "**", "destination": "/index.html"}],
      "headers": [/* Caching rules */]
    },
    {
      "target": "tv",
      "public": "tv-app/dist",
      "rewrites": [{"source": "**", "destination": "/index.html"}],
      "headers": [/* Caching rules */]
    }
  ]
}
```

**`.firebaserc`:**
```json
{
  "projects": {
    "default": "bayit-plus"
  },
  "targets": {
    "bayit-plus": {
      "hosting": {
        "web": ["bayit-plus-web"],
        "tv": ["bayit-plus"]
      }
    }
  }
}
```

---

## 🚀 Deployment Commands

### Deploy Only Web App
```bash
firebase deploy --only hosting:web
```

### Deploy Only TV App
```bash
# First build the TV app (if not already done)
cd tv-app
npm run build:web

# Then deploy
cd ..
firebase deploy --only hosting:tv
```

### Deploy Both Apps
```bash
firebase deploy --only hosting
```

### Deploy with Preview
```bash
firebase hosting:channel:deploy preview --only web
```

---

## 📝 Post-Deployment Steps

### 1. Get Deployment URL

After deployment completes, Firebase will show:
```
✔  Deploy complete!

Project Console: https://console.firebase.google.com/project/bayit-plus/overview
Hosting URL: https://bayit-plus-web.web.app
```

### 2. Update CORS Configuration

Add the new Firebase URL to your backend CORS origins:

```bash
# Get current CORS origins
gcloud secrets versions access latest --secret="bayit-cors-origins" --project=israeli-radio-475c9

# Update to include Firebase URL
echo '["http://localhost:3000","https://bayit-plus-web.web.app","https://bayit-plus-backend-624470113582.us-east1.run.app"]' | gcloud secrets versions add bayit-cors-origins --data-file=- --project=israeli-radio-475c9
```

### 3. Update Google OAuth Redirect URIs

Add the Firebase hosting URL to Google OAuth:

1. Go to: https://console.cloud.google.com/apis/credentials?project=israeli-radio-475c9
2. Click your OAuth 2.0 Client ID
3. Add to "Authorized redirect URIs":
   - `https://bayit-plus-web.web.app/auth/google/callback`
4. Add to "Authorized JavaScript origins":
   - `https://bayit-plus-web.web.app`
5. Click "SAVE"

### 4. Test the Deployment

Visit your deployment URL and test:
- [ ] App loads correctly
- [ ] API calls work (check Network tab)
- [ ] Google OAuth login works
- [ ] Content displays properly
- [ ] All features functional

---

## 🔧 Common Issues & Solutions

### Issue: "Firebase login required"
**Solution:**
```bash
firebase login --reauth
```

### Issue: "Permission denied"
**Solution:**
Make sure you're logged in with the correct Google account that has access to the `bayit-plus` Firebase project.

### Issue: "No targets found"
**Solution:**
Check that `.firebaserc` exists and has the correct configuration.

### Issue: "Build directory not found"
**Solution:**
Build the app first:
```bash
cd web
npm run build
cd ..
```

### Issue: "CORS errors after deployment"
**Solution:**
Update backend CORS configuration to include Firebase hosting URL.

---

## 📊 Monitoring & Analytics

### View Deployment History
```bash
firebase hosting:channel:list
```

### View Usage Stats
Visit: https://console.firebase.google.com/project/bayit-plus/hosting

### Check Logs
Visit: https://console.firebase.google.com/project/bayit-plus/logs

---

## 🎨 Custom Domain (Optional)

### Add Custom Domain to Firebase Hosting

1. Go to: https://console.firebase.google.com/project/bayit-plus/hosting/sites
2. Click on "Add custom domain"
3. Enter your domain (e.g., `app.bayit.tv`)
4. Follow DNS verification steps
5. Firebase will provision SSL certificate automatically

### Update DNS Records

Add the following DNS records to your domain:

```
Type: A
Name: app
Value: (Firebase will provide IP addresses)

Type: AAAA
Name: app
Value: (Firebase will provide IPv6 addresses)
```

---

## 🔄 Automated Deployments (CI/CD)

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Firebase

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '20'

      - name: Install dependencies
        run: |
          cd web
          npm install

      - name: Build
        run: |
          cd web
          npm run build

      - name: Deploy to Firebase
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          projectId: bayit-plus
          target: web
```

### Generate Service Account

```bash
firebase login:ci
# Copy the token and add it to GitHub secrets as FIREBASE_SERVICE_ACCOUNT
```

---

## 📱 Quick Reference

```bash
# Re-authenticate
firebase login --reauth

# Deploy web app
firebase deploy --only hosting:web

# Deploy TV app
firebase deploy --only hosting:tv

# Deploy both
firebase deploy --only hosting

# Preview deployment
firebase hosting:channel:deploy preview --only web

# List projects
firebase projects:list

# Switch project
firebase use bayit-plus

# View current project
firebase use
```

---

## ✅ Deployment Checklist

Before deploying:
- [x] Web app is built (`web/dist/` exists)
- [x] Firebase is configured
- [ ] Firebase authentication is valid
- [ ] Backend CORS includes Firebase URL
- [ ] Google OAuth includes Firebase redirect URI

After deploying:
- [ ] Test deployment URL
- [ ] Verify API connectivity
- [ ] Test Google login
- [ ] Check all features work
- [ ] Monitor Firebase console for errors

---

## 🆘 Need Help?

- **Firebase Console:** https://console.firebase.google.com/project/bayit-plus
- **Firebase CLI Docs:** https://firebase.google.com/docs/cli
- **Hosting Docs:** https://firebase.google.com/docs/hosting

**Current Status:** Ready to deploy! Just run `firebase login --reauth` then `firebase deploy --only hosting:web`
