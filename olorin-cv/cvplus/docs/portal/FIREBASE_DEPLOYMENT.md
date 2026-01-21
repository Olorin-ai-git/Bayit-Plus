# Firebase Deployment Guide

## Important: Use Firebase Hosting, NOT App Hosting

The error you're seeing is from Firebase App Hosting, which is for full-stack Next.js/Angular apps. For your React SPA, use regular Firebase Hosting.

## Correct Deployment Steps

### 1. First Time Setup
```bash
# Login to Firebase
firebase login

# Select your project
firebase use klainert-1973
```

### 2. Build Your React App
```bash
# Make sure you're in the root directory
cd /Users/gklainert/Documents/Klainert/klainert-web-portal

# Build the React app
npm run build
```

### 3. Deploy to Firebase

#### Deploy Everything
```bash
firebase deploy
```

#### Deploy Individual Services
```bash
# Just hosting (your React app)
firebase deploy --only hosting

# Just functions (your backend APIs)
firebase deploy --only functions

# Just Firestore rules
firebase deploy --only firestore
```

## What Gets Deployed

1. **Hosting**: Your React app from the `build` folder
2. **Functions**: Backend APIs from the `functions` folder
3. **Firestore**: Database rules and indexes

## Deployment URLs

After deployment, your app will be available at:
- https://klainert-1973.web.app
- https://klainert-1973.firebaseapp.com

Your functions will be at:
- https://us-central1-klainert-1973.cloudfunctions.net/api

## Troubleshooting

### If you get "Project not found" error:
```bash
firebase projects:list
firebase use <your-project-id>
```

### If functions deployment fails:
```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

### To test locally before deploying:
```bash
# Start emulators
firebase emulators:start

# In another terminal, start React dev server
npm start
```

## GitHub Actions Deployment (Optional)

You can automate deployment with GitHub Actions. Create `.github/workflows/firebase-deploy.yml`:

```yaml
name: Deploy to Firebase

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          channelId: live
          projectId: klainert-1973
```