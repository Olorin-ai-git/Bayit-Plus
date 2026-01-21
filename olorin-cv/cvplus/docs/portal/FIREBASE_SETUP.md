# Firebase Setup Guide for Gil Klainert Portfolio

## Prerequisites
- Firebase CLI installed ✅
- Google account for Firebase Console

## Setup Steps

### 1. Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Name it: `gil-klainert-portfolio` (or your preference)
4. Enable Google Analytics (optional)

### 2. Enable Required Services
In Firebase Console, enable:
- **Authentication** (for future use)
- **Firestore Database** (click "Create Database" → Start in production mode)
- **Hosting**
- **Functions** (requires Blaze plan - pay as you go, but has generous free tier)

### 3. Get Your Firebase Config
1. In Firebase Console, go to Project Settings
2. Under "Your apps", click "Add app" → Web app
3. Register app with a nickname
4. Copy the Firebase config object

### 4. Update Local Configuration

1. Update `.firebaserc` with your project ID:
```json
{
  "projects": {
    "default": "your-actual-project-id"
  }
}
```

2. Create `.env.local` in your root directory:
```
REACT_APP_FIREBASE_API_KEY=your-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-auth-domain
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-storage-bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
REACT_APP_FIREBASE_APP_ID=your-app-id
```

### 5. Install Dependencies
```bash
# Install functions dependencies
cd functions
npm install
cd ..

# Install Firebase SDK in main project
npm install firebase
```

### 6. Login and Initialize
```bash
# Login to Firebase
firebase login

# Initialize (if needed)
firebase init

# When prompted, select:
# - Firestore
# - Functions
# - Hosting
# - Use existing project
# - Use default files created
```

### 7. Deploy

```bash
# Build your React app first
npm run build

# Deploy everything
firebase deploy

# Or deploy specific services
firebase deploy --only hosting
firebase deploy --only functions
firebase deploy --only firestore
```

### 8. Update Your Services

Update `/src/services/chatService.ts` to use Firebase Functions URL:
```typescript
const API_URL = process.env.NODE_ENV === 'production' 
  ? 'https://us-central1-YOUR-PROJECT-ID.cloudfunctions.net/api'
  : 'http://localhost:5001/YOUR-PROJECT-ID/us-central1/api';
```

## Local Development

```bash
# Start Firebase emulators
firebase emulators:start

# In another terminal, start React dev server
npm start
```

## Pricing
- **Hosting**: Free tier includes 10GB storage, 360MB/day bandwidth
- **Firestore**: Free tier includes 50K reads, 20K writes, 20K deletes per day
- **Functions**: Free tier includes 125K invocations, 40K GB-seconds per month

## Next Steps
1. Set up GitHub Actions for automatic deployment
2. Configure custom domain
3. Set up monitoring and analytics
4. Implement actual AI integration in Functions

## Troubleshooting
- If deployment fails, check Firebase Console for quota limits
- Ensure you're on Blaze plan for Functions
- Check function logs: `firebase functions:log`