# CarPlay Setup Guide

CarPlay integration allows Bayit+ users to access audio content (live radio, podcasts) while driving with hands-free voice control.

## Requirements

### 1. Apple Developer Account
- CarPlay requires a **paid Apple Developer Program membership** ($99/year)
- Free developer accounts cannot use CarPlay

### 2. CarPlay Entitlement

You must request the CarPlay entitlement from Apple:

1. Go to [Apple Developer Portal](https://developer.apple.com/)
2. Navigate to **Certificates, Identifiers & Profiles**
3. Select your App ID (`tv.bayit.plus`)
4. Enable **CarPlay** capability
5. Request the entitlement (Apple reviews this - can take a few days)

### 3. Xcode Configuration

Once you have the entitlement:

1. Open `BayitPlus.xcworkspace` in Xcode
2. Select the **BayitPlus** target
3. Go to **Signing & Capabilities** tab
4. Click **+ Capability**
5. Add **CarPlay** capability
6. The entitlement should show as enabled (blue checkmark)

### 4. Add CarPlay Framework

1. Select the **BayitPlus** target in Xcode
2. Go to **Build Phases** → **Link Binary With Libraries**
3. Click **+** button
4. Search for and add **CarPlay.framework**

### 5. Add Files to Xcode Project

The following files need to be added to your Xcode project:

**Native CarPlay Files:**
- `/mobile-app/ios/BayitPlus/CarPlayModule.swift`
- `/mobile-app/ios/BayitPlus/CarPlayModule.m`
- `/mobile-app/ios/BayitPlus/CarPlaySceneDelegate.swift`

**Steps:**
1. Right-click on **BayitPlus** folder in Xcode navigator
2. Select **Add Files to "BayitPlus"...**
3. Select the three CarPlay files
4. Ensure **"Copy items if needed"** is checked
5. Click **Add**

## Info.plist Configuration

The Info.plist has already been configured with:

```xml
<key>UIApplicationSceneManifest</key>
<dict>
  <key>UISceneConfigurations</key>
  <dict>
    <key>CPTemplateApplicationSceneSessionRoleApplication</key>
    <array>
      <dict>
        <key>UISceneConfigurationName</key>
        <string>CarPlay</string>
        <key>UISceneDelegateClassName</key>
        <string>$(PRODUCT_MODULE_NAME).CarPlaySceneDelegate</string>
      </dict>
    </array>
  </dict>
</dict>
```

## Testing CarPlay

### Simulator Testing

1. Open Xcode and select **iPhone 14 Pro** (or newer) simulator
2. In the simulator menu: **I/O** → **External Displays** → **CarPlay**
3. A CarPlay window will appear
4. Run the app - it should appear in CarPlay display

### Real Device Testing

**Option 1: Physical CarPlay Head Unit**
- Connect iPhone to car via USB or Wireless CarPlay
- App will appear in CarPlay interface if entitlement is approved

**Option 2: CarPlay Dongle**
- Purchase a CarPlay dongle ($50-150)
- Connect iPhone and test

## CarPlay Features

### Available in CarPlay:
- **Live Radio** - Browse and play live radio stations (Galatz, Galei Tzahal, etc.)
- **Podcasts** - Browse podcast shows and episodes
- **Favorites** - Quick access to saved content
- **Now Playing** - Full playback controls
- **Voice Commands** - Hands-free control via Siri or in-app voice

### Audio-Only Restriction
CarPlay only supports **audio content** for safety reasons:
- Video content is automatically disabled when CarPlay is active
- Only radio stations and podcasts are available
- Live TV channels are hidden in CarPlay mode

## Voice Control in CarPlay

Users can control playback using voice commands:

**Hebrew Commands:**
- "היי בית, תפעיל רדיו גלצ" → "Hey Bayit, play Galatz radio"
- "עצור" → "Stop"
- "המשך" → "Continue"

**English Commands:**
- "Hey Bayit, play Galatz radio"
- "Pause"
- "Resume"
- "Play next podcast"

## React Native Integration

### Using CarPlay in Your Code

```typescript
import { useCarPlay } from './src/hooks';

function MyComponent() {
  const {
    isConnected,
    isPlaying,
    playContent
  } = useCarPlay();

  const handlePlayRadio = () => {
    playContent({
      id: 'galatz',
      title: 'Galatz Radio',
      artist: 'Live Radio',
      type: 'radio',
    });
  };

  return (
    <View>
      {isConnected && <Text>CarPlay Connected</Text>}
      <Button onPress={handlePlayRadio} title="Play Radio" />
    </View>
  );
}
```

### Updating Now Playing Info

```typescript
import { carPlayService } from './src/services';

// Update currently playing content
await carPlayService.updateNowPlaying({
  title: 'Channel 13 News',
  artist: 'Bayit+',
  duration: 3600,
  position: 120,
});
```

## Troubleshooting

### "CarPlay entitlement not found"
- Ensure you've requested and received CarPlay entitlement from Apple
- Check that the entitlement is enabled in Xcode Signing & Capabilities
- Clean build folder (Cmd+Shift+K) and rebuild

### "CarPlay window not appearing in simulator"
- Restart Xcode and simulator
- Check Info.plist has UIApplicationSceneManifest configuration
- Ensure CarPlay capability is added to target

### "Module 'CarPlay' not found"
- Add CarPlay.framework to **Link Binary With Libraries**
- Clean and rebuild project

### "App doesn't appear in CarPlay interface"
- Check Info.plist for CPTemplateApplicationSceneSessionRoleApplication
- Verify CarPlaySceneDelegate is added to Xcode project
- Ensure bridging header includes RCT imports

## Production Checklist

Before releasing to App Store with CarPlay:

- [ ] CarPlay entitlement approved by Apple
- [ ] CarPlay capability enabled in Xcode
- [ ] Tested in CarPlay simulator
- [ ] Tested with real CarPlay head unit or dongle
- [ ] Audio playback works correctly
- [ ] Now Playing info updates properly
- [ ] Voice commands work in car environment
- [ ] App icons optimized for CarPlay display
- [ ] App Store screenshots include CarPlay interface
- [ ] App Store description mentions CarPlay support

## Additional Resources

- [Apple CarPlay Documentation](https://developer.apple.com/carplay/)
- [CarPlay App Programming Guide](https://developer.apple.com/carplay/documentation/)
- [CarPlay Audio Template](https://developer.apple.com/design/human-interface-guidelines/carplay)
