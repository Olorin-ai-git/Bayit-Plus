# Multi-Window Test Scenarios

**Phase 7.3: Multi-Window Testing**
**Objective:** Test 4 concurrent windows with focus navigation
**Scope:** MultiWindowManager system

---

## Overview

The multi-window system allows 4 concurrent windows displaying live TV, radio, podcasts, and VOD content. This is adapted from the mobile app's PiP (Picture-in-Picture) system but optimized for TV with remote control navigation.

**Key Features:**
- 4 concurrent windows (vs mobile's 2)
- 3 layout modes: Grid 2x2, Sidebar, Fullscreen
- Focus navigation between windows
- Audio coordination (only 1 active)
- Remote control interactions

---

## Prerequisites

- [ ] Backend API accessible (`/widgets/system`, `/widgets/personal/:userId`)
- [ ] Content streams available (live TV, radio, podcasts, VOD)
- [ ] MultiWindowManager integrated into screens
- [ ] Focus navigation working

---

## Test Environment Setup

### Test Data Requirements
- [ ] At least 4 widget definitions in backend
- [ ] Mix of content types: 1 live channel, 1 radio, 1 podcast, 1 VOD
- [ ] All streams have valid URLs
- [ ] User subscription allows multi-window feature

### Mock Widget Data
```json
{
  "widgets": [
    {
      "id": "widget-1",
      "type": "live_channel",
      "content_id": "channel-galatz",
      "stream_url": "https://...",
      "metadata": { "title": "Galatz Radio", "logo": "..." }
    },
    {
      "id": "widget-2",
      "type": "vod",
      "content_id": "movie-123",
      "stream_url": "https://...",
      "metadata": { "title": "The Crown S1E1", "thumbnail": "..." }
    },
    {
      "id": "widget-3",
      "type": "podcast",
      "content_id": "podcast-456",
      "stream_url": "https://...",
      "metadata": { "title": "Tech Podcast Ep 5", "artwork": "..." }
    },
    {
      "id": "widget-4",
      "type": "radio",
      "content_id": "station-kan",
      "stream_url": "https://...",
      "metadata": { "title": "Kan 88", "logo": "..." }
    }
  ]
}
```

---

## Test Scenarios

### Scenario 1: Open Multi-Window Overlay

**Objective:** Display 4 windows on screen

**Steps:**
1. Navigate to HomeScreen
2. Press voice command: "Show windows" OR navigate to Multi-Window button in TVHeader
3. Select Multi-Window
4. Observe MultiWindowManager overlay appears

**Expected Results:**
- [ ] Overlay slides in from right (400ms animation)
- [ ] 4 windows displayed in current layout (default: Grid 2x2)
- [ ] Each window shows correct content type
- [ ] Focus on first window (top-left in grid)
- [ ] Main screen dimmed behind overlay
- [ ] Layout selector button visible

**Pass Criteria:** All 4 windows visible and correctly positioned

---

### Scenario 2: Focus Navigation Between Windows

**Objective:** Navigate between 4 windows using D-pad

**Steps:**
1. Open multi-window overlay (from Scenario 1)
2. Initial focus: Window 1 (top-left)
3. Press Arrow Right → Focus moves to Window 2 (top-right)
4. Press Arrow Down → Focus moves to Window 4 (bottom-right)
5. Press Arrow Left → Focus moves to Window 3 (bottom-left)
6. Press Arrow Up → Focus moves to Window 1 (top-left)
7. Test all 4 directional combinations

**Expected Results:**
- [ ] Focus moves logically between windows
- [ ] Focused window has 4pt purple border + 1.1x scale
- [ ] Unfocused windows have subtle border
- [ ] Focus animation smooth (200ms)
- [ ] No focus traps (can always move focus)

**Pass Criteria:** Focus navigation works in all 4 directions

---

### Scenario 3: Window Content Rendering

**Objective:** Verify all content types render correctly

**Test Cases:**

#### 3a: Live Channel Window
- [ ] Video player visible
- [ ] Channel logo displayed
- [ ] Program title shown
- [ ] Live badge visible (green dot)
- [ ] Audio playing (if active window)

#### 3b: VOD Window
- [ ] Video player visible
- [ ] Movie/Series thumbnail
- [ ] Title and episode info
- [ ] Progress bar (if resuming)
- [ ] Paused by default (not active)

#### 3c: Podcast Window
- [ ] Audio waveform or artwork
- [ ] Podcast title and episode
- [ ] Play/pause indicator
- [ ] Duration display
- [ ] Paused by default

#### 3d: Radio Window
- [ ] Station logo
- [ ] Station name and frequency
- [ ] "Now Playing" text
- [ ] Audio visualizer (optional)
- [ ] Audio playing (if active)

**Pass Criteria:** All 4 content types render correctly

---

### Scenario 4: Audio Coordination

**Objective:** Only 1 window plays audio at a time

**Steps:**
1. Open 4 windows (2 with audio: radio + live TV)
2. Focus on radio window → Verify radio plays
3. Focus on live TV window → Verify:
   - Radio stops playing
   - Live TV starts playing
4. Focus on podcast window (paused) → Verify:
   - Live TV keeps playing (podcast is paused)
5. Focus on VOD window (paused) → Verify:
   - Live TV keeps playing (VOD is paused)

**Expected Results:**
- [ ] Only 1 audio source active at a time
- [ ] Audio switches smoothly (no overlap)
- [ ] Previous audio stops before new starts
- [ ] Paused content doesn't auto-play on focus
- [ ] Audio continues if moving to non-audio window

**Pass Criteria:** Audio coordination works correctly, no overlapping audio

---

### Scenario 5: Window Actions (Header Controls)

**Objective:** Test window header buttons

**Test Cases:**

#### 5a: Minimize Window
- [ ] Click minimize button (- icon)
- [ ] Window minimizes to corner
- [ ] Remaining windows rearrange
- [ ] Focus moves to next window

#### 5b: Expand Window
- [ ] Click expand button (□ icon)
- [ ] Window expands to fullscreen
- [ ] Other windows hidden
- [ ] Exit button visible

#### 5c: Refresh Window
- [ ] Click refresh button (↻ icon)
- [ ] Content reloads
- [ ] Loading indicator shown
- [ ] Stream reconnects

#### 5d: Mute Window
- [ ] Click mute button (🔇 icon)
- [ ] Audio mutes (if active)
- [ ] Mute icon changes to unmute
- [ ] Other audio windows unaffected

#### 5e: Close Window
- [ ] Click close button (× icon)
- [ ] Confirmation dialog appears
- [ ] Confirm close
- [ ] Window removes from grid
- [ ] Remaining windows rearrange

**Pass Criteria:** All header controls functional

---

### Scenario 6: Layout Switching

**Objective:** Test 3 layout modes

**Test Cases:**

#### 6a: Grid 2x2 Layout
- [ ] Select "Grid 2x2" from layout selector
- [ ] All 4 windows equal size
- [ ] 2 rows × 2 columns
- [ ] Gaps between windows consistent (16pt)
- [ ] Focus navigation works in grid

#### 6b: Sidebar Layout
- [ ] Select "Sidebar" from layout selector
- [ ] 1 large window (70% width, left)
- [ ] 3 small windows (30% width, right stacked)
- [ ] Large window is active audio window
- [ ] Focus navigation works (main → sidebar)

#### 6c: Fullscreen + Minimized
- [ ] Expand any window to fullscreen
- [ ] Other 3 windows minimized to corners
- [ ] Minimized windows show thumbnail only
- [ ] Focus on minimized window expands it
- [ ] Previous fullscreen window minimizes

**Pass Criteria:** All 3 layouts work correctly

---

### Scenario 7: Window State Persistence

**Objective:** Windows persist across app restarts

**Steps:**
1. Open 4 windows with specific content
2. Switch to Sidebar layout
3. Mute one window
4. Minimize one window
5. Force quit app (double-press TV button → swipe up)
6. Relaunch app
7. Open multi-window overlay

**Expected Results:**
- [ ] Same 4 windows restored
- [ ] Layout preserved (Sidebar)
- [ ] Mute state preserved
- [ ] Minimized state preserved
- [ ] Stream positions restored (if available)

**Pass Criteria:** Window state persists correctly

---

### Scenario 8: Error Handling

**Objective:** Graceful error handling

**Test Cases:**

#### 8a: Stream Load Failure
- [ ] Open window with invalid stream URL
- [ ] Error message displays in window
- [ ] "Retry" button focused
- [ ] Other windows unaffected
- [ ] Can close failed window

#### 8b: Network Loss During Playback
- [ ] Open 4 windows with active streams
- [ ] Disconnect network
- [ ] Wait 10 seconds
- [ ] Observe behavior

**Expected:**
- [ ] Windows show "Connection lost" message
- [ ] Retry buttons appear
- [ ] No app crash
- [ ] Can close windows
- [ ] Can navigate away from overlay

#### 8c: Backend API Unavailable
- [ ] Backend API returns 500 error
- [ ] MultiWindowManager handles gracefully
- [ ] Shows "Unable to load widgets" message
- [ ] Offers retry
- [ ] Doesn't block app usage

**Pass Criteria:** All errors handled gracefully

---

### Scenario 9: Performance - 4 Concurrent Windows

**Objective:** Performance acceptable with 4 windows

**Metrics:**
1. **Memory Usage:** < 1GB with 4 windows active
2. **CPU Usage:** < 80% with 1 video + 1 audio playing
3. **Frame Rate:** 60fps during focus navigation
4. **Audio Latency:** < 100ms when switching active window

**Steps:**
1. Open 4 windows (2 video, 2 audio)
2. Profile with Instruments
3. Navigate between windows
4. Switch layouts
5. Play/pause various streams
6. Measure metrics

**Expected Results:**
- [ ] Memory stays under 1GB
- [ ] CPU under 80%
- [ ] No frame drops
- [ ] Smooth audio switching
- [ ] No memory leaks after 30 minutes

**Pass Criteria:** All performance metrics met

---

### Scenario 10: Multi-Window + Main Screen Interaction

**Objective:** Multi-window overlay doesn't break main screen

**Steps:**
1. Navigate to PlayerScreen playing video
2. Open multi-window overlay
3. Main screen video continues playing (muted)
4. Navigate in multi-window
5. Close multi-window overlay
6. Main screen video resumes with audio

**Expected Results:**
- [ ] Main screen visible behind overlay (dimmed)
- [ ] Main screen video continues playing
- [ ] Main screen audio mutes when overlay opens
- [ ] Closing overlay restores main screen audio
- [ ] Main screen state unchanged

**Pass Criteria:** Main screen and overlay coexist correctly

---

### Scenario 11: Accessibility - VoiceOver with Multi-Window

**Objective:** Multi-window accessible via VoiceOver

**Steps:**
1. Enable VoiceOver
2. Open multi-window overlay
3. Navigate with swipes

**Expected VoiceOver Announcements:**
- "Multi-window overlay, 4 windows open"
- "Window 1, Galatz Radio, playing, button. Tap to expand."
- "Window 2, The Crown, paused, button."
- "Window 3, Tech Podcast, button."
- "Window 4, Kan 88, button."
- "Layout selector, Grid 2x2 selected, button."
- "Close multi-window, button."

**Pass Criteria:** All multi-window elements properly labeled for VoiceOver

---

### Scenario 12: Edge Cases

#### 12a: No Widgets Available
- [ ] Backend returns empty widgets array
- [ ] Shows "No windows configured" message
- [ ] Offers link to settings
- [ ] Can close overlay

#### 12b: Only 1 Widget
- [ ] Only 1 widget in backend
- [ ] Shows 1 window only
- [ ] Other 3 slots empty
- [ ] Can still use layout selector
- [ ] Single window works correctly

#### 12c: Duplicate Content
- [ ] 2+ widgets with same content_id
- [ ] Each window instance independent
- [ ] Audio coordination still works
- [ ] No conflicts

#### 12d: Rapid Window Actions
- [ ] Rapidly open/close windows
- [ ] Rapidly switch layouts
- [ ] Rapidly minimize/expand
- [ ] No race conditions
- [ ] No crashes

**Pass Criteria:** All edge cases handled gracefully

---

## Test Execution Checklist

### Pre-Test
- [ ] Backend API configured and accessible
- [ ] Test content available (4+ streams)
- [ ] User account with multi-window access
- [ ] Profiling tools ready

### During Test
- [ ] Execute all 12 scenarios
- [ ] Document all issues found
- [ ] Capture screenshots of issues
- [ ] Measure performance metrics

### Post-Test
- [ ] Generate test report
- [ ] File bugs for failures
- [ ] Retest after fixes
- [ ] Sign off when all tests pass

---

## Test Report Template

```markdown
# Multi-Window Test Report - [Date]

## Test Environment
- **Device:** Apple TV 4K (3rd gen)
- **tvOS:** 17.0
- **Build:** [Version]
- **Backend:** Production/Staging

## Test Results

| Scenario | Status | Notes |
|----------|--------|-------|
| 1. Open Overlay | ✅ PASS | - |
| 2. Focus Navigation | ✅ PASS | - |
| 3. Content Rendering | ✅ PASS | All types render |
| 4. Audio Coordination | ❌ FAIL | Audio overlap when switching fast |
| 5. Window Actions | ✅ PASS | All controls work |
| 6. Layout Switching | ✅ PASS | All 3 layouts functional |
| 7. State Persistence | ⚠️ PARTIAL | Layout persists, mute state lost |
| 8. Error Handling | ✅ PASS | Graceful errors |
| 9. Performance | ✅ PASS | Memory: 880MB, CPU: 75% |
| 10. Main Screen | ✅ PASS | No conflicts |
| 11. Accessibility | ✅ PASS | VoiceOver working |
| 12. Edge Cases | ✅ PASS | All handled |

## Issues Found

### P1 - High Priority
1. [P1] Audio overlap when rapidly switching windows
   - **Cause:** Previous audio doesn't stop before new starts
   - **Fix:** Add 100ms debounce to audio switching
   - **ETA:** 1 day

### P2 - Medium Priority
2. [P2] Mute state not persisted across restarts
   - **Cause:** multiWindowStore not saving mute state to AsyncStorage
   - **Fix:** Add mute state to persisted store
   - **ETA:** 4 hours

## Performance
- Memory: 880MB (target: < 1GB) ✅
- CPU: 75% (target: < 80%) ✅
- FPS: 60fps sustained ✅
- Audio Latency: 80ms ✅

## Recommendations
1. Fix audio overlap issue (P1)
2. Persist mute state (P2)
3. Add loading skeletons for slow streams
4. Consider limiting to 3 windows on Apple TV HD

## Next Steps
1. Fix P1 issues
2. Retest scenarios 4 and 7
3. Proceed to Focus Navigation Audit (Phase 7.4)
```

---

## Acceptance Criteria

### Must Pass (P0)
- [ ] 4 windows display simultaneously
- [ ] Only 1 audio window active
- [ ] Focus navigation works correctly
- [ ] All 3 layouts functional
- [ ] No crashes or freezes
- [ ] Error handling graceful

### Should Pass (P1)
- [ ] State persists across restarts
- [ ] Performance targets met
- [ ] VoiceOver accessible
- [ ] All header controls work

### Nice to Have (P2)
- [ ] Smooth animations (60fps)
- [ ] Quick audio switching (< 100ms)
- [ ] Smart window arrangement
- [ ] Auto-minimize inactive windows

---

**Next Steps:** After multi-window testing passes, proceed to Focus Navigation Audit (Phase 7.4)
