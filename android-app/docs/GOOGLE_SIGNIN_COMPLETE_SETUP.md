# Complete Google Sign-In Setup for Bayit+ Android

## Root Cause Analysis

Google Sign-In fails because:
1. Emulator/device doesn't have a Google account signed in
2. Android app's SHA-1 fingerprint not registered in Google Cloud Console

## Step 1: Get Your SHA-1 Fingerprint

Your **debug SHA-1 fingerprint** is:
```
DA:C1:0E:9D:FC:6C:01:24:22:24:13:08:6E:E6:E7:BD:30:CE:BF:85
```

To verify or get it again:
```bash
cd android-app
./gradlew signingReport | grep SHA1
```

## Step 2: Configure Google Cloud Console

### 2.1 Access Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your **Bayit+** project
3. Navigate to: **APIs & Services** > **Credentials**

### 2.2 Configure OAuth 2.0 Consent Screen (if not done)
1. Go to **OAuth consent screen**
2. Select **External** or **Internal** user type
3. Fill in:
   - App name: **Bayit+**
   - User support email: your email
   - Developer contact: your email
4. Add scopes: `email`, `profile`, `openid`
5. Save and continue

### 2.3 Create Android OAuth Client (if doesn't exist)
1. Click **Create Credentials** > **OAuth 2.0 Client ID**
2. Application type: **Android**
3. Name: `Bayit+ Android App`
4. Package name: `tv.bayit.plus`
5. SHA-1 certificate fingerprint: `DA:C1:0E:9D:FC:6C:01:24:22:24:13:08:6E:E6:E7:BD:30:CE:BF:85`
6. Click **Create**

### 2.4 Current Configuration
**Android OAuth Client ID (Configured):**
```
624470113582-pp6df76npktigs51mntra26cktositd3.apps.googleusercontent.com
```

This Client ID should already have your SHA-1 fingerprint configured in Google Cloud Console.

## Step 3: Add Google Account to Emulator

### Option A: Add via Settings (Recommended)
1. Open **Settings** app on emulator
2. Navigate to **Passwords & accounts**
3. Tap **Add account** > **Google**
4. Sign in with a Google account
5. Follow the prompts to complete setup

### Option B: Add via Command Line
```bash
adb shell am start -a android.settings.ADD_ACCOUNT_SETTINGS
```
Then follow the same steps as Option A.

### Option C: Use a Pre-configured Emulator
Create a new emulator with Google APIs:
1. Open Android Studio > **Device Manager**
2. Create new device with **Google APIs** system image (not Google Play)
3. Start the emulator
4. Add Google account via Settings

## Step 4: Verify Setup

### 4.1 Check Google Account
```bash
# Should show Google accounts
adb shell dumpsys account | grep -i "name=" | grep -i "google"
```

### 4.2 Test Google Sign-In
1. Launch Bayit+ app
2. Tap **Sign in with Google**
3. Select a Google account
4. Grant permissions
5. Should successfully sign in!

## Step 5: For Release Builds

When building for release, you'll need:

1. **Get release SHA-1**:
```bash
keytool -list -v -keystore /path/to/release.keystore -alias release
```

2. **Add to Google Cloud Console**:
   - Edit the Android OAuth Client
   - Add release SHA-1 fingerprint
   - Save

## Troubleshooting

### "No Google account found on device"
- Add a Google account via Settings > Passwords & accounts > Add account

### "Error 10" (Developer Error)
- SHA-1 fingerprint not added to Google Cloud Console
- Package name mismatch (should be `tv.bayit.plus`)
- Wrong OAuth Client ID type

### "Error 12" (Cancelled by user)
- User cancelled the sign-in flow
- This is normal behavior

### "Error 7" (Network error)
- Check internet connection
- Ensure emulator has network access

### Still Not Working?
1. Verify the Server Client ID in `gradle.properties`
2. Check that both Android and Web OAuth clients exist in Google Cloud Console
3. Ensure OAuth consent screen is configured
4. Try creating a fresh emulator with Google APIs

## Current Configuration Status

- ✅ Server Client ID configured in `gradle.properties`
- ✅ Error handling implemented
- ⚠️  SHA-1 needs to be added to Google Cloud Console (see Step 2.3)
- ⚠️  Google account needs to be added to emulator (see Step 3)

## Next Steps

1. Add SHA-1 fingerprint to Google Cloud Console (Step 2.3)
2. Add Google account to emulator (Step 3)
3. Test sign-in (Step 4.2)
4. ✅ Success!
