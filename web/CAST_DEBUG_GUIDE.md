# Cast Debug Guide

## Overview

This guide explains how to use the cast debugging features to diagnose why the AirPlay or Chromecast icon is not appearing in the video player.

## Enabling Debug Mode

Set the following environment variable in `web/.env`:

```bash
VITE_DEBUG_CAST=true
```

Then restart the web development server:

```bash
cd web
npm start
```

## Debug Features

### 1. Console Logging

When debug mode is enabled, detailed logs are written to the browser console:

**CastSession logs** - Shows unified cast availability state:
```
[CastSession] Cast session state {
  enabled: true,
  featureEnabled: true,
  enableAirPlay: true,
  enableChromecast: true,
  receiverAppId: "F79FF160",
  airplayAvailable: false,
  airplayConnected: false,
  chromecastAvailable: false,
  chromecastConnected: false,
  chromecastConnecting: false,
  browser: {
    isWebKit: false,
    isChrome: true,
    userAgent: "Mozilla/5.0 ..."
  }
}
```

**AirPlayWeb logs** - Shows AirPlay availability:
```
[AirPlayWeb] AirPlay not available {
  enabled: true,
  isWebKitSupported: false,
  hasWebkitShowPlaybackTargetPicker: false,
  browser: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/..."
}
```

**ChromecastWeb logs** - Shows Chromecast SDK loading:
```
[ChromecastWeb] Loading Chromecast SDK { receiverAppId: "F79FF160" }
[ChromecastWeb] Chromecast SDK loaded successfully
[ChromecastWeb] Initializing Chromecast context { receiverAppId: "F79FF160" }
[ChromecastWeb] Context initialized
```

**CastButton logs** - Shows why the button is hidden:
```
[CastButton] Cast configured but unavailable {
  featureEnabled: true,
  enableAirPlay: true,
  enableChromecast: true,
  receiverAppId: "F79FF160",
  sessionAvailable: false
}
```

### 2. Visual Debug Indicator

When debug mode is enabled and cast is configured but unavailable (no devices found), a grayed-out cast icon with a "DEBUG" badge appears in the player controls:

- **Icon**: CastOff (diagonal line through cast icon)
- **Color**: Gray (textSecondary)
- **Badge**: "DEBUG" in orange
- **Tooltip**: "Cast Unavailable (No Devices Found)"

This allows you to visually confirm that:
1. Cast feature is properly configured
2. Cast SDK is loaded (Chromecast)
3. WebKit API is available (AirPlay)
4. But no cast devices are detected on the network

## Common Issues & Solutions

### Issue 1: No Cast Icon (Debug Mode Shows Nothing)

**Symptoms:**
- No cast icon visible (even with debug enabled)
- Console shows: `Cast configured but unavailable { sessionAvailable: false }`

**Causes:**
1. **No devices on network** - Most common
2. **Wrong browser** - AirPlay only works in Safari, Chromecast in Chrome/Edge
3. **Browser doesn't support casting**

**Solutions:**
1. **Connect a cast device:**
   - AirPlay: Connect an Apple TV or AirPlay-compatible device to the same WiFi
   - Chromecast: Connect a Chromecast or Google Cast device to the same WiFi

2. **Use the right browser:**
   - AirPlay: Use Safari on macOS/iOS
   - Chromecast: Use Chrome or Edge

3. **Check WiFi network:**
   - Ensure your computer and cast device are on the **same WiFi network**
   - Some WiFi networks block device discovery (corporate/guest networks)

### Issue 2: Apple TV on Same Network But Not Detected

**Symptoms:**
- Apple TV is on same WiFi network as Mac
- Safari browser on macOS
- Cast button shows as disabled
- Console shows: `airplayAvailable: false`

**Common Causes & Solutions:**

#### 1. Apple TV AirPlay Settings

**Check: Settings → AirPlay and HomeKit → AirPlay**
- Must be set to "Everyone" or "Anyone on the Same Network"
- **NOT** "Only People Sharing This Home"
- Turn OFF "Require Device Verification"

**Check: Settings → AirPlay and HomeKit → Allow Access**
- Set to "Everyone" or "Anyone on the Same Network"

#### 2. macOS Local Network Permission (macOS 14+ Sonoma/Sequoia)

Safari needs explicit permission to discover devices on your local network.

**System Settings → Privacy & Security → Local Network**
- Scroll down to find **Safari**
- Ensure toggle is **ON (green)**
- If Safari not listed, access a local device first to trigger permission prompt

#### 3. Network Configuration Issues

**AP Isolation / Client Isolation:**
- Some routers prevent devices from seeing each other
- Router Settings → Wireless → Disable "AP Isolation" or "Client Isolation"

**Separate 2.4GHz/5GHz Networks:**
- Check both devices on same band OR router allows cross-band communication
- Some routers isolate 2.4GHz and 5GHz networks

**Guest Network:**
- Guest networks typically block device discovery
- Move to main network

#### 4. Firewall / Security Software

**macOS Firewall:**
- System Settings → Network → Firewall
- Try disabling temporarily to test
- If it works, add Safari to allowed apps

**VPN:**
- VPN often blocks local network discovery
- Disconnect VPN to test

#### 5. Verify Device Discovery

**From Mac Terminal:**
```bash
# Check if Apple TV is visible via Bonjour
dns-sd -B _airplay._tcp

# Should show your Apple TV if discoverable
# Example output: _airplay._tcp local. [Apple TV Name]
```

**From iPhone/iPad (Control Center):**
- Swipe down for Control Center
- Tap Screen Mirroring
- If Apple TV appears: Issue is Mac-specific (permissions/firewall)
- If it doesn't appear: Issue is Apple TV/network configuration

#### 6. Quick Fixes

1. **Restart Apple TV**: Settings → System → Restart
2. **Restart Mac**: Fresh network discovery
3. **Click Cast Button**: Even when disabled, shows AirPlay picker
   - If picker shows "No AirPlay Devices" → Network/Apple TV issue
   - If picker doesn't appear → Safari/macOS permission issue

### Issue 3: Chromecast Not Detected

**Symptoms:**
- Chromecast on same network
- Using Chrome or Edge browser
- Console shows: `chromecastAvailable: false`

**Solutions:**

1. **Check browser** - Chromecast only works in Chrome/Edge (Chromium browsers)
2. **Same network** - Ensure Chromecast and computer on same WiFi
3. **Check in Google Home app** - Verify Chromecast appears there
4. **Browser extensions** - Disable ad blockers that might block Cast SDK
5. **Check console for SDK errors:**
   ```
   [ChromecastWeb] Chromecast SDK failed to load
   [ChromecastUtils] Cast SDK script failed to load from CDN
   ```

### Issue 4: Debug Indicator Shows But Works Sometimes

**Symptoms:**
- Cast icon appears then disappears
- Console shows availability changing: `airplayAvailable: true → false`

**Causes:**
- Device discovery timeout
- Device went offline/sleep mode
- Network connectivity interrupted

**Solutions:**
1. Check device is not in sleep/standby mode
2. Check WiFi signal strength
3. Move closer to WiFi router
4. Restart cast device

### Issue 3: Cast Works But Subtitles Don't Show

**Symptoms:**
- Cast connection successful
- Video plays on cast device
- Subtitles don't appear

**Cause:**
- Native text tracks not synchronized

**Solution:**
- Check `useNativeTextTracks` hook is properly configured in VideoPlayer
- Verify VTT files are accessible from cast device
- Check CORS headers on subtitle file URLs

### Issue 4: Cast Icon Appears Then Disappears

**Symptoms:**
- Cast icon briefly appears then vanishes
- Console shows availability changing: `airplayAvailable: true → false`

**Cause:**
- Device discovery timeout
- Device went offline
- Network connectivity interrupted

**Solution:**
1. Restart cast device
2. Check WiFi signal strength
3. Move closer to WiFi router
4. Check device is not in sleep/standby mode

## Debugging Checklist

Use this checklist to systematically diagnose cast issues:

- [ ] **Debug mode enabled** - `VITE_DEBUG_CAST=true` in `.env`
- [ ] **Server restarted** - Restart web dev server after changing `.env`
- [ ] **Browser console open** - DevTools → Console tab
- [ ] **Right browser** - Safari for AirPlay, Chrome/Edge for Chromecast
- [ ] **Cast device powered on** - Device is on and connected to WiFi
- [ ] **Same WiFi network** - Computer and cast device on same network
- [ ] **No ad blockers** - Disable extensions that might block Cast SDK
- [ ] **Check console logs** - Look for errors from CastSession/AirPlay/Chromecast
- [ ] **Wait for discovery** - Allow 10-30 seconds for device discovery
- [ ] **Test with video playing** - Try playing a video to trigger availability

## Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_CAST_ENABLE_AIRPLAY` | `true` | Enable AirPlay casting (Safari/WebKit) |
| `VITE_CAST_ENABLE_CHROMECAST` | `true` | Enable Chromecast casting (Chrome/Edge) |
| `VITE_CHROMECAST_RECEIVER_APP_ID` | `F79FF160` | Chromecast receiver app ID (8 chars) |
| `VITE_CAST_SYNC_INTERVAL_MS` | `1000` | Playback sync interval (500-5000ms) |
| `VITE_CAST_AUTO_SYNC` | `true` | Auto-sync playback state |
| `VITE_CAST_SDK_URL` | Google CDN | Chromecast SDK URL |
| `VITE_DEBUG_CAST` | `false` | Enable debug logging and indicators |

## Disable Debug Mode

Once you've diagnosed the issue, disable debug mode for production:

```bash
# web/.env
VITE_DEBUG_CAST=false
```

Restart the server:

```bash
npm start
```

## Support

If you're still experiencing issues after following this guide:

1. Collect debug logs from browser console
2. Include screenshot of debug indicator
3. Note browser version and operating system
4. Describe cast device model and firmware version
5. Report in the Bayit+ developer channel

## Related Files

- `web/src/components/player/hooks/useCastSession.ts` - Unified cast logic
- `web/src/components/player/hooks/useAirPlayWeb.ts` - AirPlay implementation
- `web/src/components/player/hooks/useChromecastWeb.ts` - Chromecast implementation
- `web/src/components/player/controls/CastButton.tsx` - Cast button UI
- `web/src/config/castConfig.ts` - Cast configuration
- `web/src/components/player/utils/chromecastUtils.ts` - Chromecast SDK loading
