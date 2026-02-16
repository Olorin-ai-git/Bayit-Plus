# Live AI Features Testing Guide - Android App

## Prerequisites

### 1. Backend Services Running
The Live AI features require WebSocket connections to the backend. Ensure backend is running:

```bash
cd /Users/olorin/Documents/Projects/olorin/olorin-media/bayit-plus/backend
poetry run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Network Configuration
Verify the app can reach the backend:
- Emulator: Use `10.0.2.2:8000` for localhost
- Physical device: Use your machine's IP address

### 3. Authentication
Ensure you're logged in with a Bayit+ account that has:
- Active subscription (for Live TV access)
- AI credits balance (for Live features)

---

## Test Plan

### Phase 1: Installation & Launch Verification

**✅ Completed:**
1. App built successfully: `./gradlew :app:assembleDebug`
2. App installed on emulator: `./gradlew :app:installDebug`
3. App launched: `adb shell am start -n tv.bayit.plus/.MainActivity`

### Phase 2: Live TV Navigation

**Steps:**
1. From home screen, tap "Live TV" tab in bottom navigation
2. Select any live channel (e.g., "Channel 13")
3. Player opens in fullscreen

**Expected Results:**
- ✅ Video playback starts
- ✅ Player controls appear (play/pause, seek bar)
- ✅ AI Features sparkle button visible in control panel

### Phase 3: AI Features Panel

**Steps:**
1. Tap the sparkle icon (AutoAwesome) at bottom of screen
2. Panel should expand horizontally

**Expected Results:**
- ✅ Panel slides open showing 3 feature buttons
- ✅ Language badge shows current language (e.g., "EN")
- ✅ Three toggles visible:
  - Live Translate (ClosedCaption icon)
  - Dubbing (GraphicEq icon)
  - Trivia (Lightbulb icon)
- ✅ All buttons are 48dp touch targets
- ✅ Panel uses glassmorphism styling

### Phase 4: Live Subtitles Feature

**Steps:**
1. Tap "Live Translate" toggle
2. Wait 1-2 seconds for WebSocket connection

**Expected Results:**
- ✅ Button turns primary color (enabled state)
- ✅ Button shows "connecting" state briefly
- ✅ Subtitle overlay appears at bottom-center
- ✅ Translated text shows in primary language
- ✅ Original Hebrew text shows below in smaller font
- ✅ Cues auto-dismiss after 5 seconds
- ✅ Glassmorphic background (0.85 alpha)
- ✅ RTL support for Hebrew text

**Error Cases to Test:**
- ✅ Quota exceeded: Error overlay shows with clear message
- ✅ Connection failed: Reconnecting status with attempt counter
- ✅ Network loss: Auto-reconnect with exponential backoff

### Phase 5: Live Dubbing Feature

**Steps:**
1. Ensure subtitles are OFF (mutual exclusivity)
2. Tap "Dubbing" toggle
3. Wait for connection

**Expected Results:**
- ✅ Subtitle toggle automatically disables (mutual exclusivity enforced)
- ✅ Dubbing button turns primary color
- ✅ Transcript overlay appears at bottom-center
- ✅ Overlay shows translated dubbing transcript
- ✅ Overlays auto-dismiss after 4 seconds
- ✅ Audio playback streams in background (if backend provides audio URLs)

**Mutual Exclusivity Test:**
- ✅ Tap "Live Translate" while dubbing active
- ✅ Dubbing should stop automatically
- ✅ Subtitles should start

### Phase 6: Live Trivia Feature

**Steps:**
1. Tap "Trivia" toggle
2. Wait for trivia facts to appear

**Expected Results:**
- ✅ Trivia button turns primary color
- ✅ Trivia card slides in from top-right
- ✅ Card shows:
  - Category icon with color (Person=blue, Movie=purple, etc.)
  - "AI Trivia" header
  - Fact text in selected language
  - Progress bar counting down
  - Related person name (if available)
  - "Tell me more" button (if hasFollowUp = true)
- ✅ Auto-dismisses after displayDuration (default 15s)
- ✅ Progress bar animates smoothly (10fps)
- ✅ Tap close button to dismiss early
- ✅ Tap "Tell me more" to request follow-up fact
- ✅ Facts don't repeat (shownFactIds deduplication)

### Phase 7: Language Switching

**Steps:**
1. Enable any feature (e.g., subtitles)
2. Tap language badge (shows current language code)
3. Language picker modal appears

**Expected Results:**
- ✅ Modal shows 8 supported languages
- ✅ Current language has checkmark
- ✅ Each language shows: code (e.g., "EN") + name ("English")
- ✅ Select new language (e.g., Spanish)
- ✅ Active features disconnect and reconnect with new language
- ✅ Subtitle text now in Spanish
- ✅ Language badge updates to "ES"

### Phase 8: Error Handling

**Backend Off Test:**
1. Stop backend server
2. Try to enable any feature

**Expected:**
- ✅ "Connection failed" error overlay appears
- ✅ Reconnection attempts shown (1/5, 2/5, etc.)
- ✅ After 5 failed attempts: "Connection failed after 5 attempts"
- ✅ Error overlay has retry button

**Rate Limit Test:**
1. Backend sends >100 messages/second
2. Feature should terminate with rate limit error

**Expected:**
- ✅ Connection stops
- ✅ Error message: "Rate limit exceeded"
- ✅ User can retry after cooldown

### Phase 9: Security Validation

**WebSocket URL Test:**
```bash
adb logcat | grep "WebSocket"
```

**Expected in logs:**
- ✅ All URLs use `wss://` protocol
- ✅ Language codes validated before insertion
- ✅ Channel IDs properly URI-encoded
- ✅ Fresh auth tokens on reconnection

**Message Validation Test:**

**Expected:**
- ✅ Messages >100KB rejected
- ✅ Rate limit enforced at 100 msg/sec
- ✅ Malformed JSON caught and logged
- ✅ No crashes on invalid messages

### Phase 10: Resource Cleanup

**Steps:**
1. Enable all three features
2. Press back button to exit player

**Expected:**
- ✅ All WebSocket connections disconnect
- ✅ No memory leaks (check logcat for WebSocketManager disconnect messages)
- ✅ State resets to initial (re-enter player shows clean state)
- ✅ Timers cancelled (no auto-dismiss jobs running)

**Verify in logcat:**
```bash
adb logcat | grep "WebSocket disconnected"
```

Should see 3 disconnect messages for active features.

---

## Accessibility Testing

### TalkBack Test
1. Enable TalkBack: Settings → Accessibility → TalkBack
2. Navigate to Live TV player
3. Swipe to explore controls

**Expected:**
- ✅ "Expand AI features panel" announced for sparkle button
- ✅ "Enable Live Translate" announced for subtitle toggle
- ✅ "Enable Dubbing" announced for dubbing toggle
- ✅ "Enable Trivia" announced for trivia toggle
- ✅ "Dismiss trivia fact" announced for close button
- ✅ "Hebrew, selected" announced for selected language

### Touch Target Test
Use "Pointer Location" in Developer Options to verify:
- ✅ All buttons have ≥48dp touch area
- ✅ Visual appearance smaller but touch area padded

---

## Performance Testing

### Memory Test
```bash
adb shell dumpsys meminfo tv.bayit.plus
```

**Monitor:**
- Memory growth during 10-minute live TV session
- WebSocket connection count stays ≤ 3
- No memory leaks after exiting player

### Network Test
```bash
adb logcat | grep "WebSocket\|Reconnect"
```

**Verify:**
- ✅ Reconnection uses exponential backoff
- ✅ Max 5 reconnect attempts enforced
- ✅ Fresh tokens fetched on reconnect

---

## Known Limitations

1. **Dubbing audio playback:** Currently only displays transcript text. Audio URL support requires ExoPlayer integration (future enhancement).

2. **Split subtitle mode:** Not implemented in this version (future enhancement).

3. **Backend dependency:** Features require live backend WebSocket endpoints. Won't work offline.

4. **Language initialization:** Current language defaults to "en" in coordinator - should fetch from user preferences (requires preferences repository integration).

---

## Success Criteria

All features must:
- ✅ Connect to WebSocket successfully
- ✅ Display overlays in correct positions
- ✅ Auto-dismiss at correct intervals
- ✅ Handle errors gracefully
- ✅ Clean up resources on exit
- ✅ Meet accessibility standards
- ✅ Enforce mutual exclusivity (subtitles/dubbing)
- ✅ Support all 8 languages
- ✅ Prevent security vulnerabilities

---

## Troubleshooting

### "Connection failed" error
- Check backend is running on port 8000
- Verify network connectivity
- Check auth token is valid

### No overlays appearing
- Check WebSocket messages in logcat
- Verify backend is sending subtitle/dubbing/trivia messages
- Check for message parsing errors

### Features not toggling
- Check for JavaScript errors in logcat
- Verify mutual exclusivity is working (subtitles and dubbing can't both be on)

### Rate limit errors
- Backend may be sending too many messages
- Check backend logs for message frequency
- Verify 100 msg/sec limit is appropriate

---

## Next Steps After Manual Testing

1. Write automated UI tests using Compose Test
2. Write integration tests with MockWebServer
3. Performance profiling with Android Profiler
4. Submit for final panel approval
