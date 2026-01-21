# Bayit+ iOS Mobile App - Testing Guide

Comprehensive testing guide for all iOS features implemented in Phases 1-4.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Phase 1: Foundation](#phase-1-foundation)
3. [Phase 2: PiP Widgets + Voice](#phase-2-pip-widgets--voice)
4. [Phase 3: Advanced Voice Features](#phase-3-advanced-voice-features)
5. [Phase 4: Proactive AI + iOS Features](#phase-4-proactive-ai--ios-features)
6. [Voice Command Reference](#voice-command-reference)
7. [Known Issues & Troubleshooting](#known-issues--troubleshooting)

---

## Prerequisites

### Required Hardware
- iPhone 11 or newer (iOS 14+)
- iPad Air 3 or newer (iPadOS 14+)
- For CarPlay testing: CarPlay-compatible vehicle or CarPlay dongle

### Required Accounts
- Apple Developer Account (for testing on device)
- Bayit+ test account credentials

### Setup Steps

1. **Clone repository**
   ```bash
   cd /Users/olorin/Documents/Bayit-Plus/mobile-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd ios && pod install && cd ..
   ```

3. **Open in Xcode**
   ```bash
   open ios/BayitPlus.xcworkspace
   ```

4. **Configure signing**
   - Select BayitPlus target
   - Go to Signing & Capabilities
   - Select your development team
   - Ensure provisioning profile is valid

5. **Add CarPlay entitlement** (if available)
   - See [CARPLAY_SETUP.md](./CARPLAY_SETUP.md)

6. **Build and run**
   - Select iPhone simulator or physical device
   - Press Cmd+R to build and run

---

## Phase 1: Foundation

### 1.1 App Launch

**Test**: Cold start
- Expected: App launches within 2 seconds
- Expected: No crash on launch
- Expected: Splash screen displays (if configured)

**Test**: Warm start
- Background app → Foreground
- Expected: App resumes instantly
- Expected: Last state is preserved

### 1.2 Navigation

**Test**: Tab bar navigation
- Tap each tab: Home, Live TV, VOD, Radio, Podcasts, Profile
- Expected: Smooth transitions (<300ms)
- Expected: Content loads correctly on each tab

**Test**: Stack navigation
- Navigate: Home → Player → Back
- Expected: Navigation animations smooth
- Expected: Back button works correctly

**Test**: Modal navigation
- Open search modal → Close
- Expected: Modal slides up/down smoothly
- Expected: Background is dimmed

### 1.3 RTL Support (Hebrew)

**Test**: Language switching
- Open app in English
- Navigate to Settings → Language → Hebrew
- Expected: All text switches to Hebrew
- Expected: Layout reverses (RTL)
- Expected: Tab bar icon order reverses
- Expected: Navigation animations reverse

**Test**: Hebrew content display
- Browse Hebrew content titles
- Expected: Hebrew text renders correctly
- Expected: Text alignment is right-aligned
- Expected: No mixed LTR/RTL issues

### 1.4 Responsive Design

**Test**: iPhone (Portrait)
- Test on iPhone 14 Pro (6.1")
- Expected: Single column layout
- Expected: Content fits screen without horizontal scrolling

**Test**: iPhone (Landscape)
- Rotate to landscape
- Expected: Layout adapts (possibly 2 columns)
- Expected: Controls remain accessible

**Test**: iPad (Portrait)
- Test on iPad Air (10.9")
- Expected: 2-column grid layout
- Expected: Larger fonts and spacing

**Test**: iPad (Landscape)
- Rotate to landscape
- Expected: 3-column grid layout (if applicable)
- Expected: Sidebar navigation (optional)

---

## Phase 2: PiP Widgets + Voice

### 2.1 PiP Widget Creation

**Test**: Open PiP widget from menu
- Navigate to Home → Browse widgets → Select "Channel 13" → Add
- Expected: Widget appears as floating overlay
- Expected: Widget shows live stream thumbnail
- Expected: Widget controls visible (minimize, close, mute)

**Test**: Multiple widgets
- Add second widget (e.g., Radio Galatz)
- Expected: Both widgets visible
- Expected: Only one audio active at a time
- Expected: Z-index ordering correct (active on top)

### 2.2 PiP Widget Gestures

**Test**: Pan gesture (drag widget)
1. Long press on widget
2. Drag around screen
3. Expected: Widget follows finger smoothly (60fps)
4. Expected: Widget respects safe area (notch, home indicator)

**Test**: Edge snapping
1. Drag widget near screen edge
2. Release
3. Expected: Widget snaps to nearest edge with spring animation
4. Expected: Widget stays within safe area

**Test**: Pinch gesture (resize)
1. Pinch-to-zoom on widget
2. Expected: Widget resizes smoothly
3. Expected: Respects min size (150x85) and max size (iPhone: 350x197, iPad: 520x300)

**Test**: Double tap (minimize/expand)
1. Double tap widget
2. Expected: Widget minimizes to small pill (80x80)
3. Double tap again
4. Expected: Widget expands to full size

### 2.3 PiP Widget Content Types

**Test**: Live TV widget
- Add Channel 13 widget
- Expected: HLS stream plays
- Expected: Video plays smoothly (no buffering)
- Expected: Controls work (play/pause, mute)

**Test**: Podcast widget
- Add podcast widget
- Expected: Audio plays with album art
- Expected: Background audio continues when app backgrounds

**Test**: Radio widget
- Add Radio Galatz widget
- Expected: Live radio stream plays
- Expected: Station logo displays

### 2.4 Voice Command Integration (Basic)

**Test**: Voice button visible
- Launch app
- Expected: Floating microphone button visible (bottom-right)
- Expected: Button animates (pulse effect)

**Test**: Tap to speak
1. Tap voice button
2. Expected: iOS permission prompt (first time)
3. Grant permission
4. Expected: Button color changes (blue = listening)
5. Expected: Waveform animation appears
6. Say: "Play Channel 13"
7. Expected: Command processed
8. Expected: TTS response: "Playing Channel 13"
9. Expected: Player opens with Channel 13

**Test**: Voice widget control
1. Open Channel 12 widget
2. Tap voice button
3. Say: "Mute the widget"
4. Expected: Widget mutes
5. Say: "Close all widgets"
6. Expected: All widgets close

---

## Phase 3: Advanced Voice Features

### 3.1 Wake Word Detection

**Test**: Enable wake word
1. First launch → Voice onboarding appears
2. Complete onboarding
3. Expected: Wake word detection enabled

**Test**: Hebrew wake word
1. Say: "היי בית" (Hey Bayit)
2. Expected: App starts listening (without tapping button)
3. Expected: Blue listening indicator appears
4. Say: "תפתח ערוץ 13" (Open Channel 13)
5. Expected: Channel 13 plays

**Test**: English wake word
1. Say: "Hey Bayit"
2. Expected: App starts listening
3. Say: "Play Galatz radio"
4. Expected: Radio plays

**Test**: Spanish wake word (if supported)
1. Say: "Oye Bayit"
2. Expected: App starts listening

**Test**: False positive rejection
1. Say similar phrase: "Hey baby" or "Hey David"
2. Expected: Wake word NOT triggered
3. Expected: No listening state activated

### 3.2 Text-to-Speech (TTS)

**Test**: Hebrew TTS
1. Say: "מתי שבת?" (When is Shabbat?)
2. Expected: TTS responds in Hebrew with Shabbat time
3. Expected: Voice sounds natural (not robotic)

**Test**: English TTS
1. Say: "What time is it?"
2. Expected: TTS responds in English with current time

**Test**: TTS speed adjustment
1. Navigate to Settings → Voice → Speech Rate
2. Adjust to 1.5x
3. Trigger voice command
4. Expected: TTS speaks faster

**Test**: TTS interruption
1. Trigger long TTS response
2. Say wake word again mid-response
3. Expected: TTS stops immediately
4. Expected: New listening session starts

### 3.3 Voice Onboarding

**Test**: First-time flow
1. Fresh install → Launch app
2. Expected: Voice onboarding screen appears
3. Step 1: Welcome → Tap "Continue"
4. Step 2: Permissions → Tap "Grant Permissions"
5. Expected: iOS permission prompts (microphone + speech)
6. Grant both
7. Step 3: Test wake word → Say "Hey Bayit"
8. Expected: Detection confirmed with checkmark
9. Step 4: Complete → Tap "Start Using Voice"
10. Expected: Onboarding dismisses, app ready

**Test**: Skip onboarding
1. Fresh install → Launch app
2. On onboarding screen → Tap "Skip"
3. Expected: Onboarding dismisses
4. Expected: Voice features disabled
5. Can enable later in Settings

### 3.4 Home Screen Widgets

**Test**: Add widget to Home Screen
1. On iOS Home Screen → Long press → Tap "+" (top-left)
2. Search "Bayit+"
3. Select "Live Channel" widget (systemMedium)
4. Tap "Add Widget"
5. Expected: Widget appears on Home Screen
6. Expected: Shows current live stream thumbnail + title

**Test**: Widget data update
1. Open Bayit+ app
2. Play different content
3. Background app
4. Return to Home Screen
5. Expected: Widget updates with new content (within 15 minutes)

**Test**: Widget tap deep link
1. Tap Home Screen widget
2. Expected: Bayit+ app opens
3. Expected: Navigates to content shown in widget
4. Expected: Content starts playing

### 3.5 Deep Linking

**Test**: URL scheme - Live channel
1. In Safari, enter: `bayitplus://live/channel_13`
2. Expected: Bayit+ opens
3. Expected: Channel 13 starts playing

**Test**: URL scheme - Search
1. In Safari, enter: `bayitplus://search?query=comedy`
2. Expected: Bayit+ opens
3. Expected: Search screen with "comedy" results

**Test**: Universal link (if configured)
1. In Safari, enter: `https://bayit.tv/live/channel_13`
2. Expected: Bayit+ opens (not Safari)
3. Expected: Content plays

---

## Phase 4: Proactive AI + iOS Features

### 4.1 Proactive Voice Suggestions

**Test**: Time-based suggestion (Morning)
1. Set device time to 6:00 AM (or wait until morning)
2. Open app
3. Expected (after 5 seconds): Suggestion banner appears
4. Expected message: "Good morning! Ready for your morning ritual?"
5. Expected: TTS speaks suggestion
6. Tap checkmark button
7. Expected: Navigates to Morning Ritual screen

**Test**: Time-based suggestion (Shabbat)
1. Set device time to Friday 5:00 PM
2. Open app
3. Expected: Suggestion appears
4. Expected message: "Shabbat is approaching! Would you like to watch candle lighting preparation?"

**Test**: Context-based suggestion
1. Open app with no widgets active
2. Expected: Suggestion appears
3. Expected message: "Would you like to add a live TV widget to your screen?"
4. Tap checkmark
5. Expected: Widget gallery opens

**Test**: Presence-based suggestion
1. Background app for 5+ minutes
2. Foreground app
3. Expected (after 2 seconds): Suggestion appears
4. Expected message: "Welcome back! Would you like to continue watching?"

**Test**: Dismiss suggestion
1. Wait for any suggestion to appear
2. Tap X button
3. Expected: Suggestion dismisses with animation
4. Expected: TTS stops (if speaking)

**Test**: Suggestion auto-dismiss
1. Wait for suggestion to appear
2. Don't interact
3. Expected (after 30 seconds): Suggestion auto-dismisses

### 4.2 Siri Shortcuts Integration

**Test**: Siri intent - Play content
1. Activate Siri (Hey Siri or button)
2. Say: "Play Channel 13 on Bayit Plus"
3. Expected: Bayit+ opens
4. Expected: Channel 13 starts playing

**Test**: Siri intent - Search
1. Activate Siri
2. Say: "Search for comedy on Bayit Plus"
3. Expected: Bayit+ opens
4. Expected: Search screen with "comedy" results

**Test**: Intent donation
1. Play any content in app
2. Trigger it multiple times (3-5 times)
3. Activate Siri and say: "Play [that content]"
4. Expected: Siri suggests "On Bayit Plus" as completion
5. Expected: Intent executes correctly

**Test**: Add to Siri shortcut
1. In app, tap content → Share sheet → "Add to Siri"
2. Record custom phrase: "Play my favorite show"
3. Save
4. Activate Siri and say: "Play my favorite show"
5. Expected: Content plays in Bayit+

### 4.3 CarPlay Integration

**Prerequisites**: CarPlay simulator or physical CarPlay head unit

**Test**: CarPlay connection
1. Connect iPhone to CarPlay (simulator: I/O → External Displays → CarPlay)
2. Expected: Bayit+ appears in CarPlay app list
3. Tap Bayit+ icon
4. Expected: App opens in CarPlay display

**Test**: CarPlay tabs
1. Open Bayit+ in CarPlay
2. Expected: Tab bar with 3 tabs visible:
   - Live Radio
   - Podcasts
   - Favorites
3. Tap each tab
4. Expected: Content list appears

**Test**: Play radio in CarPlay
1. Open Live Radio tab
2. Tap "Galatz"
3. Expected: Radio starts playing through car speakers
4. Expected: Now Playing screen appears
5. Expected: Playback controls work (pause, play)

**Test**: Voice commands in CarPlay
1. While in CarPlay, say: "Hey Bayit, play Galatz radio"
2. Expected: Radio starts playing
3. Expected: Now Playing updates

**Test**: Background audio in CarPlay
1. Play radio in Bayit+ CarPlay
2. Switch to another CarPlay app (Maps, Music)
3. Expected: Bayit+ audio continues in background
4. Expected: Can control from Now Playing screen

**Test**: Disconnect CarPlay
1. While playing content, disconnect CarPlay
2. Expected: Content continues playing on iPhone
3. Expected: App transitions to phone UI smoothly

### 4.4 Emotional Intelligence

**Test**: Frustration detection (repeated commands)
1. Tap voice button
2. Say: "Play Channel 13"
3. Expected: Plays normally
4. Stop playback
5. Say: "Play Channel 13" again
6. Expected: Plays normally
7. Say: "Play Channel 13" a third time
8. Expected: TTS responds with empathy: "אני מבין שזה מתסכל. Playing Channel 13. בואו ננסה משהו אחר?" (I understand this is frustrating. Playing Channel 13. Let's try something else?)

**Test**: Hesitation detection
1. Tap voice button
2. Say: "אממ... אולי... תפתח... לא יודע... ערוץ 13" (Umm... maybe... open... I don't know... Channel 13)
3. Expected: Command processes correctly
4. Expected: TTS adds clarifying question: "Playing Channel 13. האם זה מה שחיפשת?" (Is this what you were looking for?)

**Test**: Help suggestion (high frustration)
1. Issue 4-5 failed commands in a row
2. Expected: System detects high frustration
3. Expected: TTS offers help: "אפשר לומר לי בפשטות: מה תרצה לראות?" (You can tell me simply: what would you like to watch?)

**Test**: Adaptive speech rate
1. Trigger low frustration scenario
2. Expected: TTS speaks at normal rate
3. Trigger high frustration scenario
4. Expected: TTS speaks slower (rate - 0.2)

### 4.5 Multi-Turn Conversations

**Test**: Contextual reference - "Play that"
1. Open Home screen (featured content visible)
2. Say: "Hey Bayit"
3. Say: "Play that"
4. Expected: Plays first visible content (first card on screen)
5. Expected: TTS confirms: "Playing [content name]"

**Test**: Search refinement
1. Say: "Find comedy shows"
2. Expected: Search screen opens with results
3. Say: "Show the top 3"
4. Expected: Results filter to top 3
5. Say: "Play the first one"
6. Expected: First comedy show plays

**Test**: Content reference - "Play it again"
1. Say: "Play Channel 13"
2. Channel plays
3. Stop playback
4. Say: "Play it again"
5. Expected: Channel 13 plays again (references last mentioned content)

**Test**: Volume control (contextual)
1. Play any content
2. Say: "Make it louder"
3. Expected: Volume increases
4. Say: "Lower the volume"
5. Expected: Volume decreases

**Test**: Add to favorites (contextual)
1. Play Channel 13
2. Say: "Add to favorites"
3. Expected: Channel 13 added to favorites (no need to specify what)
4. Expected: TTS confirms: "Added Channel 13 to your favorites"

---

## Voice Command Reference

### Navigation Commands

| Hebrew | English | Action |
|--------|---------|--------|
| לך הביתה | Go to home | Navigate to HomeScreen |
| הצג שידורים חיים | Show live TV | Navigate to LiveTVScreen |
| פתח פודקאסטים | Open podcasts | Navigate to PodcastsScreen |
| הצג פרופיל | Show my profile | Navigate to ProfileScreen |
| חזור | Go back | Navigate back |

### Content Control

| Hebrew | English | Action |
|--------|---------|--------|
| תפעיל ערוץ 13 | Play Channel 13 | Open live channel |
| חפש קומדיה | Search for comedy | Open SearchScreen |
| המשך לצפות | Continue watching | Resume last content |
| הצג מגמות | Show what's trending | Navigate to trending |
| תפעיל רדיו גלצ | Play Galatz radio | Open radio station |

### Widget Control

| Hebrew | English | Action |
|--------|---------|--------|
| פתח ווידג'ט ערוץ 13 | Open Channel 13 widget | Add PiP widget |
| סגור ווידג'ט | Close widget | Close active widget |
| השתק ווידג'ט | Mute widget | Mute widget audio |
| סגור את כל הווידג'טים | Close all widgets | Close all PiP widgets |

### Playback Control

| Hebrew | English | Action |
|--------|---------|--------|
| נגן | Play | Start playback |
| עצור | Pause | Pause playback |
| דלג קדימה | Skip forward | Seek +10s |
| דלג אחורה | Skip back | Seek -10s |
| הגבר ווליום | Volume up | Increase volume |
| הנמך ווליום | Volume down | Decrease volume |

### Personalization

| Hebrew | English | Action |
|--------|---------|--------|
| הוסף לרשימת צפייה | Add to watchlist | Add to watchlist |
| סמן כמועדף | Mark as favorite | Add to favorites |
| הורד את זה | Download this | Download content |
| הסר מרשימה | Remove from list | Remove from watchlist |

### System

| Hebrew | English | Action |
|--------|---------|--------|
| עבור לעברית | Switch to Hebrew | Change language |
| עבור לאנגלית | Switch to English | Change language |
| פתח הגדרות | Open settings | Navigate to Settings |
| מה השעה? | What time is it? | TTS time |
| מתי שבת? | When is Shabbat? | TTS Zmanim |

---

## Known Issues & Troubleshooting

### Wake Word Detection Not Working

**Symptoms**: App doesn't respond to "Hey Bayit"

**Solutions**:
1. Check microphone permission (Settings → Bayit+ → Microphone)
2. Check speech recognition permission
3. Restart wake word detection (Settings → Voice → Toggle off/on)
4. Reduce background noise
5. Speak clearly at normal volume

### Widget Not Updating

**Symptoms**: Home Screen widget shows old data

**Solutions**:
1. Open app to refresh data
2. Remove and re-add widget
3. Check network connection
4. Wait 15 minutes (widget refresh interval)

### CarPlay Not Appearing

**Symptoms**: Bayit+ not in CarPlay app list

**Solutions**:
1. Verify CarPlay entitlement in Xcode
2. Check Info.plist has UIApplicationSceneManifest
3. Rebuild app (Clean Build Folder + Build)
4. Restart CarPlay simulator
5. Disconnect/reconnect physical CarPlay

### Voice Commands Not Recognized

**Symptoms**: Voice commands fail or misunderstood

**Solutions**:
1. Check language setting matches voice (Hebrew/English)
2. Speak clearly and wait for beep
3. Reduce background noise
4. Check network connection (for command processing)
5. Try simpler command phrasing

### TTS Not Speaking

**Symptoms**: No audio response from voice commands

**Solutions**:
1. Check device volume (not muted)
2. Check TTS settings (Settings → Voice → Enable TTS)
3. Check audio session (close other audio apps)
4. Restart app

### Siri Shortcuts Not Working

**Symptoms**: Siri says "I can't do that"

**Solutions**:
1. Check Siri permission (Settings → Bayit+ → Siri & Search)
2. Re-donate intent (use feature in app 3+ times)
3. Delete and re-add shortcut
4. Restart Siri (toggle off/on in iOS Settings)

---

## Performance Benchmarks

Target performance metrics:

| Metric | Target | Acceptable |
|--------|--------|------------|
| App launch (cold) | < 2s | < 3s |
| Navigation transition | < 300ms | < 500ms |
| Voice command latency | < 1s | < 2s |
| Wake word detection | < 500ms | < 1s |
| TTS response time | < 800ms | < 1.5s |
| Widget drag (FPS) | 60fps | 45fps+ |
| Memory usage (iPhone) | < 150MB | < 200MB |
| Memory usage (iPad) | < 200MB | < 300MB |
| Battery drain (audio) | < 5%/hr | < 8%/hr |
| Battery drain (video) | < 10%/hr | < 15%/hr |

---

## Test Coverage Summary

**Phase 1 Foundation**: ✅ Complete
- App launch, navigation, RTL, responsive design

**Phase 2 PiP Widgets + Voice**: ✅ Complete
- Widget creation, gestures, content types, basic voice

**Phase 3 Advanced Voice**: ✅ Complete
- Wake word, TTS, onboarding, Home widgets, deep linking

**Phase 4 Proactive AI + iOS Features**: ✅ Complete
- Proactive suggestions, Siri, CarPlay, emotional intelligence, multi-turn conversations

**Remaining Phases**: ⏳ Pending
- Phase 5: SharePlay (synchronized viewing)
- Phase 6: Polish & optimization
- Phase 7: App Store submission
