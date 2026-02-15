# Continue Watching Widget - Implementation Guide

**Status:** Ready for Xcode Configuration
**Date:** 2026-02-14
**Platform:** iOS 14+
**Estimated Time:** 4-6 hours

## Overview

This guide walks through the complete setup of the Continue Watching widget for Bayit+. The widget displays the user's recently watched content directly on the iOS home screen with quick resume functionality.

## Prerequisites

- Xcode 14.0+
- iOS 14.0+ deployment target
- Apple Developer account (for App Groups)
- CocoaPods (for dependencies)

## Files Created

All widget files have been created in:
```
mobile-app/ios/BayitPlusWidget/
├── BayitPlusWidget.swift           # Main widget implementation
├── WidgetNetworkService.swift      # Network service for API calls
├── Info.plist                      # Widget extension configuration
└── (Assets will be added in Xcode)
```

React Native service:
```
mobile-app/src/services/widgetService.ts  # App-to-widget data sharing
```

## Step 1: Create Widget Extension in Xcode

### 1.1 Open Project in Xcode

```bash
cd mobile-app/ios
open BayitPlusMobile.xcworkspace
```

### 1.2 Add Widget Extension Target

1. In Xcode, select **File → New → Target**
2. Choose **Widget Extension**
3. Configure the extension:
   - **Product Name:** `BayitPlusWidget`
   - **Team:** Your Apple Developer team
   - **Language:** Swift
   - **Include Configuration Intent:** Unchecked (for now)
   - Click **Finish**
4. When prompted "Activate BayitPlusWidget scheme?", click **Activate**

### 1.3 Replace Generated Files

1. Delete the auto-generated `BayitPlusWidget.swift` file
2. Add the pre-created files to the widget target:
   - Right-click `BayitPlusWidget` folder → **Add Files to "BayitPlusWidget"**
   - Select `BayitPlusWidget.swift`, `WidgetNetworkService.swift`, `Info.plist`
   - Ensure "Copy items if needed" is checked
   - Target membership: **BayitPlusWidget** only

## Step 2: Configure App Groups

App Groups allow the main app and widget to share data.

### 2.1 Enable App Groups for Main App

1. Select the **BayitPlusMobile** target
2. Go to **Signing & Capabilities**
3. Click **+ Capability** → **App Groups**
4. Click **+** to add a new container
5. Enter: `group.tv.bayit.app`
6. Click **OK**

### 2.2 Enable App Groups for Widget

1. Select the **BayitPlusWidget** target
2. Go to **Signing & Capabilities**
3. Click **+ Capability** → **App Groups**
4. Select the existing `group.tv.bayit.app`

### 2.3 Verify App Group Configuration

Ensure both targets have the same App Group ID selected.

## Step 3: Configure Widget Bundle Identifier

1. Select **BayitPlusWidget** target
2. Go to **General** tab
3. Set **Bundle Identifier:** `tv.bayit.app.widget`
4. Set **iOS Deployment Target:** 14.0

## Step 4: Add Widget Assets

### 4.1 Create Widget Icon

1. Select **BayitPlusWidget** folder
2. Right-click → **New File** → **Asset Catalog**
3. Name it `Assets`
4. Add icon images:
   - 1x: 120x120px
   - 2x: 240x240px
   - 3x: 360x360px

Use the Bayit+ logo with transparent background.

### 4.2 Configure Asset Catalog

In `BayitPlusWidget` → `Assets.xcassets`:
- Add `AppIcon` for widget icon
- Add `WidgetBackground` for background images (optional)

## Step 5: Install React Native Dependencies

### 5.1 Add Package Dependency

```bash
cd mobile-app
npm install react-native-shared-group-preferences
```

### 5.2 Install iOS Pods

```bash
cd ios
pod install
```

### 5.3 Update Podfile (if needed)

Add to `mobile-app/ios/Podfile`:

```ruby
target 'BayitPlusWidget' do
  use_frameworks!
  # No React Native dependencies needed for widget
end
```

## Step 6: Configure Widget Build Settings

### 6.1 Set Widget Deployment Info

1. Select **BayitPlusWidget** target
2. Go to **Build Settings**
3. Search for "deployment target"
4. Set **iOS Deployment Target:** 14.0

### 6.2 Configure Signing

1. Select **BayitPlusWidget** target
2. Go to **Signing & Capabilities**
3. Enable **Automatically manage signing**
4. Select your **Team**

## Step 7: Update Main App to Share Data

### 7.1 Share Auth Token on Login

Edit your authentication flow to share the token with the widget:

```typescript
import { widgetService } from '@/services/widgetService'

// After successful login
const handleLoginSuccess = async (token: string) => {
  // Store token in app
  await storage.setItem('auth_token', token)

  // Share with widget
  await widgetService.shareAuthToken(token)
}
```

### 7.2 Update Continue Watching Data

Add to your video player or playback tracking:

```typescript
import { widgetService } from '@/services/widgetService'

const updatePlaybackProgress = async (
  contentId: string,
  title: string,
  type: 'movie' | 'series' | 'audiobook' | 'podcast',
  coverUrl: string | undefined,
  position: number,
  duration: number
) => {
  // Update widget data
  await widgetService.updateContinueWatchingFromPlayback(
    contentId,
    title,
    type,
    coverUrl,
    position,
    duration
  )
}
```

### 7.3 Export Widget Service

Update `mobile-app/src/services/index.ts`:

```typescript
export { widgetService } from './widgetService'
```

## Step 8: Build and Test

### 8.1 Build Widget Extension

1. Select the **BayitPlusWidget** scheme
2. Choose a simulator or device (iOS 14+)
3. Press **Cmd + B** to build

### 8.2 Run Widget

1. Select the **BayitPlusWidget** scheme
2. Press **Cmd + R** to run
3. Widget will appear in widget gallery

### 8.3 Add Widget to Home Screen

1. Long-press on iOS home screen
2. Tap **+** in top-left corner
3. Search for "Bayit+"
4. Select **Continue Watching**
5. Choose widget size (Small, Medium, or Large)
6. Tap **Add Widget**

### 8.4 Test Deep Linking

1. Add widget to home screen
2. Run main app and watch some content
3. Close app completely
4. Tap widget
5. Verify app opens to correct content with resume position

## Step 9: Debugging

### 9.1 View Widget Logs

1. Open **Console.app** on Mac
2. Connect iOS device or run simulator
3. Filter logs by "Widget:"
4. Look for network requests and data sharing logs

### 9.2 Common Issues

**Widget shows "No recent content":**
- Check if auth token is shared: `UserDefaults(suiteName: "group.tv.bayit.app")`
- Verify API endpoint is accessible
- Check widget logs for network errors

**Widget not updating:**
- Force-quit main app and widget
- Remove widget from home screen
- Re-add widget
- iOS limits widget refresh frequency

**Deep link not working:**
- Verify URL scheme in Info.plist (main app)
- Check deep linking service is initialized
- Test with `bayit://` custom URL scheme first

### 9.3 Debug Network Requests

Add to `WidgetNetworkService.swift`:

```swift
print("Widget: Requesting \(url.absoluteString)")
print("Widget: Token: \(authToken.prefix(20))...")
print("Widget: Response: \(String(data: data, encoding: .utf8) ?? "nil")")
```

## Step 10: App Store Submission

### 10.1 Update App Icons

Ensure widget icon is included in all required sizes for App Store.

### 10.2 Screenshot Widget

Apple requires widget screenshots for App Store listing:
- Small widget
- Medium widget
- Large widget
- All in light and dark mode

### 10.3 Privacy Manifest

Add `PrivacyInfo.xcprivacy` to widget target if needed.

## API Endpoint

The widget expects this API endpoint:

```
GET https://api.bayit.tv/v1/user/continue-watching
Authorization: Bearer {token}
```

**Response:**
```json
{
  "items": [
    {
      "id": "movie-123",
      "title": "The Chosen: Season 2",
      "type": "series",
      "cover_url": "https://cdn.bayit.tv/covers/chosen-s2.jpg",
      "duration": 3600,
      "position": 2340
    }
  ]
}
```

## Performance Optimization

### Network Timeouts

Widget has 10-second timeout for API requests. Backend should respond quickly.

### Image Caching

AsyncImage automatically caches images. No additional caching needed.

### Memory Limits

Widgets have strict memory limits:
- Small: 30MB
- Medium: 60MB
- Large: 60MB

Keep data minimal to avoid crashes.

## Testing Checklist

- [ ] Widget appears in widget gallery
- [ ] Small widget displays correctly
- [ ] Medium widget displays correctly
- [ ] Large widget displays correctly
- [ ] Widget shows placeholder when no content
- [ ] Widget fetches data from API
- [ ] Progress bars render correctly
- [ ] Time remaining calculates correctly
- [ ] Deep link opens app
- [ ] Deep link navigates to correct content
- [ ] Deep link includes resume position
- [ ] Widget updates after watching content
- [ ] Widget updates on timeline (every 30 min)
- [ ] Widget works in light mode
- [ ] Widget works in dark mode
- [ ] Auth token shared via App Groups
- [ ] Continue watching data shared via App Groups

## Next Steps

After widget is working:

1. **Analytics** - Track widget installations and tap-through rates
2. **A/B Testing** - Test different widget designs
3. **Additional Widgets** - Implement Live TV Schedule widget
4. **Complications** - Consider watchOS complications
5. **Lock Screen Widgets** - iOS 16+ lock screen widgets

## Troubleshooting

### Widget Not Appearing in Gallery

- Clean build folder: **Product → Clean Build Folder**
- Delete derived data: `~/Library/Developer/Xcode/DerivedData`
- Rebuild both main app and widget

### App Groups Not Working

- Check provisioning profiles include App Groups entitlement
- Verify group ID matches in both targets
- Re-generate profiles if needed

### Network Requests Failing

- Check App Transport Security settings in Info.plist
- Verify API endpoint is HTTPS
- Test endpoint with curl/Postman first

## Resources

- [Apple WidgetKit Documentation](https://developer.apple.com/documentation/widgetkit)
- [Widget Design Guidelines](https://developer.apple.com/design/human-interface-guidelines/widgets)
- [App Groups Guide](https://developer.apple.com/library/archive/documentation/General/Conceptual/ExtensibilityPG/ExtensionScenarios.html)
- [React Native Shared Group Preferences](https://github.com/KjellConnelly/react-native-shared-group-preferences)

## Support

For issues or questions:
1. Check Xcode console for error messages
2. Review widget logs in Console.app
3. Test on physical device (simulators may have limitations)
4. Consult Apple Developer Forums for WidgetKit-specific issues
