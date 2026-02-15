# Deep Linking Setup Guide

**Status:** Ready for Implementation
**Date:** 2026-02-14
**Platforms:** iOS, Android

## Overview

Deep linking allows users to open specific content in the Bayit+ app from external sources like emails, SMS, web browsers, and other apps. This guide covers the complete setup for both iOS (Universal Links) and Android (App Links).

## URL Schemes

### Custom URL Scheme
```
bayit://[path]
```

### Universal Links (iOS) / App Links (Android)
```
https://bayit.tv/[path]
https://m.bayit.tv/[path]
```

## Supported Deep Link Routes

| Route | Example | Destination |
|-------|---------|-------------|
| Movie | `bayit://movie/123` | Movie Detail Screen |
| Series | `bayit://series/456` | Series Detail Screen |
| Audiobook | `bayit://audiobook/789` | Audiobook Detail Screen |
| Audiobook Player | `bayit://audiobook/789/play?chapter=2` | Audiobook Player (Chapter 2) |
| Podcast | `bayit://podcast/abc` | Podcast Detail Screen |
| Podcast Episode | `bayit://podcast/abc/episode/xyz` | Podcast Player Screen |
| Play Content | `bayit://play/123?type=vod&t=300` | Video Player (at 5:00) |
| EPG | `bayit://epg/channel-1` | EPG Screen for Channel |
| Live TV | `bayit://live/channel-1` | Live TV Player |
| Beta 500 | `bayit://beta500` | Beta 500 Credits Dashboard |
| Favorites | `bayit://favorites` | Favorites Screen |
| Downloads | `bayit://downloads` | Downloads Screen |

## iOS Configuration

### 1. Add URL Scheme to Info.plist

Edit `mobile-app/ios/BayitPlusMobile/Info.plist`:

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLName</key>
    <string>tv.bayit.app</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>bayit</string>
    </array>
  </dict>
</array>
```

### 2. Configure Universal Links

#### Add Associated Domains Entitlement

Edit `mobile-app/ios/BayitPlusMobile/BayitPlusMobile.entitlements`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.developer.associated-domains</key>
  <array>
    <string>applinks:bayit.tv</string>
    <string>applinks:m.bayit.tv</string>
  </array>
</dict>
</plist>
```

#### Enable Associated Domains in Xcode

1. Open `mobile-app/ios/BayitPlusMobile.xcworkspace` in Xcode
2. Select the BayitPlusMobile target
3. Go to "Signing & Capabilities" tab
4. Click "+ Capability" and add "Associated Domains"
5. Add domains:
   - `applinks:bayit.tv`
   - `applinks:m.bayit.tv`

### 3. Create apple-app-site-association File

Host this file at `https://bayit.tv/.well-known/apple-app-site-association` and `https://m.bayit.tv/.well-known/apple-app-site-association`:

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAM_ID.tv.bayit.app",
        "paths": [
          "/movie/*",
          "/series/*",
          "/audiobook/*",
          "/podcast/*",
          "/play/*",
          "/epg/*",
          "/live/*",
          "/beta500",
          "/favorites",
          "/downloads"
        ]
      }
    ]
  },
  "webcredentials": {
    "apps": ["TEAM_ID.tv.bayit.app"]
  }
}
```

**Important:** Replace `TEAM_ID` with your actual Apple Team ID (found in Apple Developer Portal).

### 4. Handle Universal Links in AppDelegate

Edit `mobile-app/ios/BayitPlusMobile/AppDelegate.mm`:

```objective-c
#import <React/RCTLinkingManager.h>

// Add this method
- (BOOL)application:(UIApplication *)application
   continueUserActivity:(NSUserActivity *)userActivity
     restorationHandler:(void (^)(NSArray<id<UIUserActivityRestoring>> * _Nullable))restorationHandler
{
  return [RCTLinkingManager application:application
                   continueUserActivity:userActivity
                     restorationHandler:restorationHandler];
}

// Also add this for custom URL schemes
- (BOOL)application:(UIApplication *)application
   openURL:(NSURL *)url
   options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options
{
  return [RCTLinkingManager application:application openURL:url options:options];
}
```

## Android Configuration

### 1. Add Intent Filters to AndroidManifest.xml

Edit `mobile-app/android/app/src/main/AndroidManifest.xml`:

```xml
<activity
  android:name=".MainActivity"
  android:label="@string/app_name"
  android:configChanges="keyboard|keyboardHidden|orientation|screenLayout|screenSize|smallestScreenSize|uiMode"
  android:launchMode="singleTask"
  android:windowSoftInputMode="adjustResize"
  android:exported="true">

  <!-- Default launcher -->
  <intent-filter>
    <action android:name="android.intent.action.MAIN" />
    <category android:name="android.intent.category.LAUNCHER" />
  </intent-filter>

  <!-- Custom URL Scheme -->
  <intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="bayit" />
  </intent-filter>

  <!-- App Links (HTTPS) -->
  <intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data
      android:scheme="https"
      android:host="bayit.tv"
      android:pathPrefix="/movie" />
    <data
      android:scheme="https"
      android:host="bayit.tv"
      android:pathPrefix="/series" />
    <data
      android:scheme="https"
      android:host="bayit.tv"
      android:pathPrefix="/audiobook" />
    <data
      android:scheme="https"
      android:host="bayit.tv"
      android:pathPrefix="/podcast" />
    <data
      android:scheme="https"
      android:host="bayit.tv"
      android:pathPrefix="/play" />
    <data
      android:scheme="https"
      android:host="bayit.tv"
      android:pathPrefix="/epg" />
    <data
      android:scheme="https"
      android:host="bayit.tv"
      android:pathPrefix="/live" />
    <data
      android:scheme="https"
      android:host="bayit.tv"
      android:path="/beta500" />
    <data
      android:scheme="https"
      android:host="bayit.tv"
      android:path="/favorites" />
    <data
      android:scheme="https"
      android:host="bayit.tv"
      android:path="/downloads" />
  </intent-filter>

  <!-- Mobile domain -->
  <intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data
      android:scheme="https"
      android:host="m.bayit.tv" />
  </intent-filter>
</activity>
```

### 2. Create assetlinks.json File

Host this file at `https://bayit.tv/.well-known/assetlinks.json` and `https://m.bayit.tv/.well-known/assetlinks.json`:

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "tv.bayit.app",
      "sha256_cert_fingerprints": [
        "RELEASE_KEYSTORE_SHA256_FINGERPRINT"
      ]
    }
  }
]
```

**Get SHA256 Fingerprint:**

```bash
# For debug keystore
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android

# For release keystore
keytool -list -v -keystore /path/to/release.keystore -alias bayit-release
```

Copy the SHA256 fingerprint (format: `AA:BB:CC:...`) and replace colons with nothing.

## Backend Configuration

### Web Server Setup

Configure your web server to serve the association files:

#### Nginx Configuration

```nginx
server {
  listen 443 ssl;
  server_name bayit.tv m.bayit.tv;

  # Serve apple-app-site-association
  location /.well-known/apple-app-site-association {
    default_type application/json;
    add_header Content-Type application/json;
    alias /var/www/bayit/.well-known/apple-app-site-association;
  }

  # Serve assetlinks.json
  location /.well-known/assetlinks.json {
    default_type application/json;
    add_header Content-Type application/json;
    alias /var/www/bayit/.well-known/assetlinks.json;
  }

  # Rest of your config...
}
```

#### Firebase Hosting Configuration

Add to `firebase.json`:

```json
{
  "hosting": {
    "rewrites": [
      {
        "source": "/.well-known/apple-app-site-association",
        "destination": "/.well-known/apple-app-site-association"
      },
      {
        "source": "/.well-known/assetlinks.json",
        "destination": "/.well-known/assetlinks.json"
      }
    ],
    "headers": [
      {
        "source": "/.well-known/**",
        "headers": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ]
      }
    ]
  }
}
```

## Testing

### iOS Testing

#### Test Custom URL Scheme

```bash
# In iOS Simulator
xcrun simctl openurl booted "bayit://movie/123"

# On device via Safari
# Navigate to: bayit://movie/123
```

#### Test Universal Links

```bash
# In iOS Simulator
xcrun simctl openurl booted "https://bayit.tv/movie/123"

# Verify association file
curl https://bayit.tv/.well-known/apple-app-site-association
```

#### Debug Universal Links

1. Open Settings app on device
2. Go to Developer settings
3. Enable "Associated Domains Development"
4. Clear Safari cache
5. Test link in Notes app (not Safari - Safari has smart app banner logic)

### Android Testing

#### Test Custom URL Scheme

```bash
# Via ADB
adb shell am start -W -a android.intent.action.VIEW -d "bayit://movie/123" tv.bayit.app

# Test in Chrome
# Navigate to: bayit://movie/123
```

#### Test App Links

```bash
# Via ADB
adb shell am start -W -a android.intent.action.VIEW -d "https://bayit.tv/movie/123" tv.bayit.app

# Verify association file
curl https://bayit.tv/.well-known/assetlinks.json

# Check App Links verification status
adb shell pm get-app-links tv.bayit.app
```

## Email & Marketing Templates

### Example Email Deep Link

```html
<a href="https://bayit.tv/movie/top-gun-maverick">Watch Top Gun: Maverick on Bayit+</a>
```

### Example Push Notification

```json
{
  "notification": {
    "title": "New Episode Available",
    "body": "Season 2, Episode 5 of 'The Chosen' is now streaming"
  },
  "data": {
    "type": "series",
    "id": "the-chosen-s2e5",
    "deepLink": "https://bayit.tv/series/the-chosen?episode=s2e5"
  }
}
```

### Social Media Share Links

```
Twitter: https://bayit.tv/movie/123?utm_source=twitter
Facebook: https://bayit.tv/series/456?utm_source=facebook
WhatsApp: https://bayit.tv/audiobook/789?utm_source=whatsapp
```

## Analytics Tracking

Track deep link attribution:

```typescript
import { deepLinkingService } from '@/services'
import analytics from '@react-native-firebase/analytics'

deepLinkingService.addListener((route) => {
  analytics().logEvent('deep_link_opened', {
    screen: route.screen,
    params: JSON.stringify(route.params),
    timestamp: new Date().toISOString(),
  })
})
```

## Security Considerations

1. **Validate all input** - Deep link parameters should be validated before navigation
2. **Rate limiting** - Prevent abuse by rate limiting deep link processing
3. **Authentication** - Some routes should require authentication before navigation
4. **HTTPS only** - Universal Links and App Links must use HTTPS
5. **Domain verification** - Ensure association files are properly configured

## Troubleshooting

### iOS Universal Links Not Working

1. **Check association file:** Ensure it's accessible at `https://bayit.tv/.well-known/apple-app-site-association`
2. **Verify Team ID:** Make sure TEAM_ID in association file matches your Apple Developer account
3. **Clear cache:** Delete app, restart device, reinstall app
4. **Test in Notes app:** Safari has special handling that may interfere with testing
5. **Check entitlements:** Verify Associated Domains capability is enabled

### Android App Links Not Working

1. **Verify SHA256:** Ensure fingerprint in assetlinks.json matches your keystore
2. **Check autoVerify:** Intent filter must have `android:autoVerify="true"`
3. **Test with ADB:** Use `adb shell pm get-app-links` to check verification status
4. **Clear defaults:** Go to Settings → Apps → Bayit+ → Open by default → Clear defaults
5. **Wait for verification:** Android may take a few minutes to verify App Links after installation

## Next Steps

1. **Configure iOS entitlements** - Add Associated Domains capability
2. **Update AndroidManifest.xml** - Add intent filters for deep linking
3. **Deploy association files** - Upload to web server or Firebase Hosting
4. **Test on devices** - Verify deep links work on both platforms
5. **Update marketing materials** - Use deep links in emails, notifications, social media
6. **Monitor analytics** - Track deep link usage and conversion rates

## References

- [Apple Universal Links Documentation](https://developer.apple.com/ios/universal-links/)
- [Android App Links Documentation](https://developer.android.com/training/app-links)
- [React Native Linking API](https://reactnative.dev/docs/linking)
