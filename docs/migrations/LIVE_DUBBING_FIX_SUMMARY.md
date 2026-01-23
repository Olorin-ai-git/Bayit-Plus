# Live Dubbing Controls Fix Summary

## Issue
Live channels were not showing the Live Dubbing button, even though the frontend components were correctly implemented.

## Root Cause
The backend API endpoint `/live/{channel_id}/dubbing/availability` was returning `available: false` for non-premium users, which prevented the `DubbingControls` component from rendering at all.

## Solution

### 1. Backend API Fix
**File**: `backend/app/api/routes/live_dubbing.py` (line 126-137)

**Changed**:
```python
# OLD: Only returned available=true for premium users
user_eligible = current_user.subscription_tier in ["premium", "family"]
return DubbingAvailabilityResponse(
    available=user_eligible,  # ❌ Blocked non-premium users from seeing button
    ...
)
```

**To**:
```python
# NEW: Always return available=true if channel supports dubbing
return DubbingAvailabilityResponse(
    available=True,  # ✅ Show button to all users
    ...
)
```

**Rationale**: The frontend `DubbingControls` component already has logic to show "⭐ Premium" for non-premium users (like `RecordButton` and `LiveSubtitleControls` do). The `available` flag should indicate "channel technically supports dubbing", not "user can use dubbing".

### 2. Enable Dubbing for All Channels
**Script**: `backend/scripts/enable_live_dubbing.py`

Ran script to enable dubbing for all 6 live channels:
- כאן 11
- קשת 12
- רשת 13
- ערוץ 14
- i24NEWS Hebrew
- כאן חינוכית

Each channel now has:
```python
supports_live_dubbing: True
dubbing_source_language: "he"
available_dubbing_languages: ["en", "es", "ar", "ru", "fr", "de"]
dubbing_sync_delay_ms: 600
```

## Expected Behavior

### Live Channels (isLive=true)
Player controls show:
- ✅ **Live Translate** button (LiveSubtitleControls) - 🌐 Globe icon
- ✅ **Live Dubbing** button (DubbingControls) - 💬 Speech bubble icon
- ✅ **Record** button (RecordButton) - ⭕ Circle/Square icon
- ✅ **Settings** button - ⚙️ Gear icon with language badge (🇺🇸/🇪🇸/etc.)

Settings panel shows:
- **Translate To** - Language selector for Live Translation (closes panel after selection)
- **Quality** - Video quality options

Language Badge:
- Displays selected translation language flag on Settings button
- Default language: English (🇺🇸)
- Updates automatically when language is changed
- Only visible for live channels

### VOD Content (movies/series, isLive=false)
Player controls show:
- ✅ **Subtitles** button (SubtitleControls) - CC icon
- ✅ **Settings** button

Settings panel shows:
- **Playback Speed** - Speed controls (0.5x to 2x)
- **Quality** - Video quality options

## Premium Feature Behavior

All three premium buttons (Live Translate, Live Dubbing, Record) show to all users:
- **Non-premium users**: Button shows "⭐ Premium" and triggers upgrade modal when clicked
- **Premium/Family users**: Button is functional and shows feature name

## Component Architecture

```
VideoPlayer (web/src/components/player/VideoPlayer.tsx)
├── Conditional render props based on isLive:
│   ├── !isLive → renderSubtitleControls() → SubtitleControls
│   ├── isLive → renderLiveSubtitleControls() → LiveSubtitleControls
│   ├── isLive → renderDubbingControls() → DubbingControls
│   └── isLive → renderRecordButton() → RecordButton
│
└── PlayerControls → RightControls
    └── Renders all provided render props

DubbingControls (web/src/components/player/dubbing/DubbingControls.tsx)
├── Checks: if (!isAvailable) return null
├── Premium check: isPremium ? "Live Dubbing" : "⭐ Premium"
└── Uses StyleSheet (React Native Web compatible)
```

## Files Modified

1. **backend/app/api/routes/live_dubbing.py** - Fixed availability logic
2. **backend/scripts/enable_live_dubbing.py** - Created script (NEW)
3. **web/src/components/player/dubbing/DubbingControls.tsx** - Changed icon from speaker (Volume2/VolumeX) to speech bubble (MessageSquare)
4. **web/src/components/player/SettingsPanel.tsx** - Panel closes automatically after selecting language
5. **web/src/components/player/controls/RightControls.tsx** - Added language badge to Settings button
6. **web/src/components/player/controls/playerControlsStyles.ts** - Added badge styles
7. **web/src/components/player/PlayerControls.tsx** - Pass liveSubtitleLang prop
8. **web/src/components/player/VideoPlayer.tsx** - Pass liveSubtitleLang to PlayerControls

## Files Already Correct (No Changes Needed)

✅ **Frontend**:
- `web/src/components/player/VideoPlayer.tsx` - Conditional rendering logic correct
- `web/src/components/player/PlayerControls.tsx` - Passes render props correctly
- `web/src/components/player/controls/RightControls.tsx` - Renders all controls correctly
- `web/src/components/player/dubbing/DubbingControls.tsx` - Premium check logic correct
- `web/src/components/player/LiveSubtitleControls.tsx` - Already using StyleSheet
- `web/src/components/player/RecordButton.tsx` - Already using StyleSheet
- `web/src/components/player/SettingsPanel.tsx` - Shows correct options per content type

✅ **Backend**:
- `backend/app/models/content.py` - LiveChannel model has dubbing fields
- `backend/app/api/router_registry.py` - Route registered correctly

## Testing Checklist

### Live Channel Player
- [ ] Navigate to a live channel (e.g., `/live/6963bff4abb3ca055cdd8474`)
- [ ] Verify three premium buttons visible: Live Translate, Live Dubbing, Record
- [ ] Click Settings button
- [ ] Verify "Translate To" section shows language options
- [ ] Verify NO "Playback Speed" section (live channels don't have speed control)

### VOD Player
- [ ] Navigate to a movie or series (e.g., `/watch/vod/[content_id]`)
- [ ] Verify Subtitles button visible (NOT Live Translate or Live Dubbing)
- [ ] Click Settings button
- [ ] Verify "Playback Speed" section shows speed options
- [ ] Verify NO "Translate To" section (VOD uses regular subtitles)

### Premium vs Non-Premium
- [ ] **Non-premium account**: Buttons show "⭐ Premium", clicking opens upgrade modal
- [ ] **Premium/Family account**: Buttons are functional, show feature name

## Related Documentation

- **Live Dubbing Service**: `web/src/services/liveDubbingService.ts`
- **Live Dubbing Hook**: `web/src/components/player/hooks/useLiveDubbing.ts`
- **Backend API**: `backend/app/api/routes/live_dubbing.py`
- **WebSocket Handler**: `backend/app/api/routes/websocket_live_dubbing.py`

## Future Enhancements

1. **Per-Channel Configuration**: Admin UI to enable/disable dubbing per channel
2. **Voice Selection**: Allow users to choose from available ElevenLabs voices
3. **Dubbing Analytics**: Track usage, latency, and quality metrics
4. **Custom Sync Delay**: Per-user or per-channel sync delay adjustment
5. **Offline Dubbing**: Pre-generate dubbed audio for recorded content

## Notes

- All components now use `StyleSheet.create()` for React Native Web compatibility
- Settings panel correctly shows different options based on content type (live vs VOD)
- "Translate To" in Settings is for Live Translation, not regular subtitles (correct)
- Backend returns available=true if channel supports dubbing, regardless of user subscription
- Frontend handles premium checks and shows upgrade prompts appropriately
