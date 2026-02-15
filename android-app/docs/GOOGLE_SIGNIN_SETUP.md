# Google Sign-In Setup for Bayit+ Android

## Overview
The Bayit+ Android app uses Google's Credential Manager API for Google Sign-In authentication. This guide helps you configure the OAuth 2.0 Client ID.

## Prerequisites
- Access to Google Cloud Console
- Bayit+ project set up in Google Cloud

## Steps to Configure

### 1. Get OAuth 2.0 Client ID

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Bayit+ project
3. Navigate to: **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth 2.0 Client ID**
5. Select **Android** as the application type
6. Fill in the required information:
   - **Name**: Bayit+ Android App
   - **Package name**: `tv.bayit.plus` (or `tv.bayit.plus.debug` for debug builds)
   - **SHA-1 certificate fingerprint**: Get this from your keystore (see below)

### 2. Get SHA-1 Fingerprint

#### For Debug Builds
```bash
cd android-app
./gradlew signingReport
```

Look for the SHA-1 under the `debug` variant.

#### For Release Builds
```bash
keytool -list -v -keystore /path/to/your/keystore.jks -alias your-alias
```

### 3. Configure gradle.properties

1. Open `android-app/gradle.properties`
2. Replace the placeholder with your actual Client ID:
   ```properties
   bayit.google.clientId=YOUR_ACTUAL_CLIENT_ID.apps.googleusercontent.com
   ```

### 4. Rebuild the App

```bash
cd android-app
./gradlew clean build
```

## Testing

1. Launch the app
2. Navigate to the Login screen
3. Tap "Sign in with Google"
4. Select a Google account
5. Grant permissions
6. You should be redirected to the home screen

## Troubleshooting

### Button Does Nothing
- Check that `bayit.google.clientId` is configured in `gradle.properties`
- Ensure the Client ID matches the one in Google Cloud Console
- Verify the SHA-1 fingerprint is correct for your build variant

### "No Google account found on device"
- Add a Google account to your Android device/emulator
- Go to: Settings > Accounts > Add Account > Google

### "Google Sign-In failed" Error
- Check Logcat for detailed error messages
- Verify the Client ID is correct
- Ensure OAuth consent screen is configured in Google Cloud Console
- Check that the app package name matches the one in the OAuth client

## Current Configuration Status

The Google Sign-In button has been implemented with proper error handling. When configuration is missing or sign-in fails, the user will see an error message.

## Related Files

- `core/core-auth/src/main/java/tv/bayit/plus/core/auth/GoogleSignInHelper.kt` - Sign-in implementation
- `app/src/main/java/tv/bayit/plus/navigation/BayitNavHost.kt` - Navigation integration
- `feature/feature-auth/src/main/java/tv/bayit/plus/feature/auth/login/LoginScreen.kt` - UI implementation
- `gradle.properties` - Configuration file
