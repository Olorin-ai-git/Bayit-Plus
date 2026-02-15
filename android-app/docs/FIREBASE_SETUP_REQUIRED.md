# 🔥 Firebase Configuration Required

## Critical Issue Found

**Both email/password and Google Sign-In are failing because Firebase is not configured for the Android app.**

### Current State:
- ❌ `google-services.json` file is missing
- ❌ Firebase plugins are disabled in `app/build.gradle.kts`
- ❌ Firebase Authentication not initialized
- ✅ iOS app has Firebase configured (GoogleService-Info.plist exists)

### Error Messages:
- Email/Password Sign-In: **"Invalid API key"**
- Google Sign-In: **"No Google credentials available"** (even with account added)

## 🔧 How to Fix:

### Step 1: Download google-services.json from Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your **Bayit-Plus** project (Project ID: `bayit-plus`)
3. Click the ⚙️ (Settings) icon → **Project settings**
4. Scroll down to **Your apps**
5. Find or add Android app:
   - If it exists: Click the Android icon → Download `google-services.json`
   - If not: Click **Add app** → **Android**
     - Package name: `tv.bayit.plus`
     - App nickname: `Bayit+ Android`
     - Debug signing certificate SHA-1: `DA:C1:0E:9D:FC:6C:01:24:22:24:13:08:6E:E6:E7:BD:30:CE:BF:85`
     - Click **Register app**
     - Download `google-services.json`

### Step 2: Add google-services.json to Android App

```bash
# Copy the downloaded file to:
cp ~/Downloads/google-services.json android-app/app/google-services.json
```

### Step 3: Enable Firebase Plugins

Edit `app/build.gradle.kts`:

```kotlin
plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.serialization)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.ksp)
    alias(libs.plugins.hilt)
    alias(libs.plugins.google.services)  // ← Uncomment this
    // alias(libs.plugins.firebase.crashlytics)  // ← Keep this commented for now
}
```

### Step 4: Rebuild and Test

```bash
cd android-app
./gradlew clean
./gradlew :app:assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
./scripts/test-google-signin.sh
```

## Why This is Critical:

Firebase Authentication requires:
1. ✅ Firebase SDK dependencies (already in build.gradle)
2. ❌ **google-services.json configuration file (MISSING)**
3. ❌ **Google Services plugin enabled (DISABLED)**

Without these, FirebaseAuth cannot initialize, causing all authentication to fail.

## Verification Checklist:

After completing the steps:
- [ ] `google-services.json` exists in `app/` directory
- [ ] `google.services` plugin enabled in `app/build.gradle.kts`
- [ ] App builds successfully
- [ ] Firebase initialization log shows: "Firebase initialized successfully"
- [ ] Email/password sign-in works
- [ ] Google Sign-In works (after Google OAuth propagation)

## Quick Test Commands:

```bash
# Check if google-services.json exists
ls -la app/google-services.json

# Check if Firebase is configured
grep -A 2 "google.services" app/build.gradle.kts

# Test Firebase initialization
adb logcat -c
adb shell am start -n tv.bayit.plus.debug/tv.bayit.plus.MainActivity
sleep 2
adb logcat -d | grep -i "firebase"
```

## Related Files:
- `core/core-auth/src/main/java/tv/bayit/plus/core/auth/FirebaseAuthService.kt` - Auth implementation
- `app/src/main/java/tv/bayit/plus/BayitPlusApplication.kt` - Firebase initialization
- iOS equivalent: `ios-app/BayitPlusApp/App/GoogleService-Info.plist` (for reference)
