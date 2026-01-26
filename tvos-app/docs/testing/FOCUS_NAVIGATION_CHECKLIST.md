# Focus Navigation Test Checklist

**Phase 7.4: Focus Navigation Audit**
**Objective:** Zero focus traps, logical navigation flow
**Target:** 100% pass rate

---

## Overview

Focus navigation is critical for tvOS apps. Users navigate with Siri Remote directional pad (D-pad), and any focus trap or illogical focus order creates a poor experience.

**Key Principles:**
1. **No Focus Traps:** User can always escape any screen/component
2. **Logical Order:** Focus moves naturally (left-right, top-bottom)
3. **Visible Indicators:** Focus state always visible (4pt purple border + 1.1x scale)
4. **Menu Button Returns:** Menu button always returns to parent/previous screen
5. **Preferred Focus:** First interactive element focused on screen load

---

## Testing Methodology

### For Each Screen
1. Navigate to screen
2. Test all 4 directions (↑ ↓ ← →)
3. Test Menu button
4. Test Select button on all focusable elements
5. Test Play/Pause button (if media present)
6. Document any issues

### Focus Trap Definition
A focus trap occurs when:
- User cannot move focus away from element/group
- Directional navigation doesn't respond
- Only way out is force-quit app
- Menu button doesn't work

---

## Screen-by-Screen Checklist

### HomeScreen
**Focusable Elements:** TVHeader (9 items), Content Shelves (5+ shelves x 5-6 items each)

- [ ] **Initial Focus:** First item in TVHeader (Home icon)
- [ ] **Arrow Up:** From shelves → TVHeader navigation
- [ ] **Arrow Down:** From TVHeader → First content shelf
- [ ] **Arrow Left/Right:** Navigate within shelf
- [ ] **Horizontal Scrolling:** Shelf scrolls when reaching edge
- [ ] **Menu Button:** No-op (already at home) or app switcher
- [ ] **Select on Card:** Navigate to detail/player
- [ ] **No Focus Traps:** Can reach all items

**Special Cases:**
- [ ] Empty shelf states focusable
- [ ] Loading states don't block navigation
- [ ] MultiWindowManager overlay navigation

---

### PlayerScreen
**Focusable Elements:** Controls (Play/Pause, Seek -10s, Seek +30s, Exit), Info button

- [ ] **Initial Focus:** Play/Pause button (center)
- [ ] **Controls Visible:** Appear on any remote button press
- [ ] **Controls Auto-Hide:** Hide after 5s of inactivity
- [ ] **Arrow Left:** Seek -10s button
- [ ] **Arrow Right:** Seek +30s button
- [ ] **Arrow Up:** Exit button
- [ ] **Arrow Down:** Progress bar
- [ ] **Menu Button:** Exit player, return to previous screen
- [ ] **Play/Pause Button:** Toggle playback immediately
- [ ] **Info Button:** Show/hide info panel
- [ ] **Info Panel Focus:** Focus on close button when panel opens
- [ ] **Info Panel Close:** Return focus to player controls

**Special Cases:**
- [ ] Buffering state doesn't trap focus
- [ ] Error state has retry button focused
- [ ] Loading state shows spinner, allows exit

---

### LiveTVScreen
**Focusable Elements:** TVHeader (9 items), Genre filters (6 items), Channel grid (5x4 = 20 items)

- [ ] **Initial Focus:** First channel card
- [ ] **Arrow Up:** From grid row 1 → filters → TVHeader
- [ ] **Arrow Down:** From TVHeader → filters → grid
- [ ] **Arrow Left/Right:** Navigate grid horizontally
- [ ] **Grid Navigation:** 5x4 grid logical (row-by-row)
- [ ] **Select on Channel:** Navigate to PlayerScreen
- [ ] **Menu Button:** Return to HomeScreen
- [ ] **No Focus Traps:** Can reach all 20 channels
- [ ] **Filter Selection:** Updates grid, maintains focus context

**Special Cases:**
- [ ] Empty grid (no channels) has message focused
- [ ] Loading state allows navigation to other screens

---

### SearchScreen
**Focusable Elements:** TVHeader, Voice search button, TextInput, Category filters, Results grid (6 columns)

- [ ] **Initial Focus:** Voice search button (hasTVPreferredFocus)
- [ ] **Arrow Down:** Voice → TextInput → Filters → Results
- [ ] **Arrow Up:** Results → Filters → TextInput → Voice → TVHeader
- [ ] **Keyboard Focus:** Text input brings up keyboard, focus on keys
- [ ] **Keyboard Dismiss:** Menu button dismisses keyboard, returns to input
- [ ] **Filter Selection:** Updates results, maintains focus
- [ ] **Results Grid:** 6 columns, logical navigation
- [ ] **Select on Result:** Navigate to detail/player
- [ ] **Menu Button:** Clear search or return to previous screen
- [ ] **Voice Search:** Triggers listening, updates search query

**Special Cases:**
- [ ] Empty results message focusable
- [ ] Listening state shows indicator, allows cancel

---

### VODScreen
**Focusable Elements:** TVHeader, Category filters (7 items), Content grid (6 columns)

- [ ] **Initial Focus:** First content card
- [ ] **Arrow Up:** Grid → Filters → TVHeader
- [ ] **Arrow Down:** TVHeader → Filters → Grid
- [ ] **Arrow Left/Right:** Navigate grid horizontally
- [ ] **Grid Navigation:** 6 columns logical
- [ ] **Select on Card:** Navigate to PlayerScreen
- [ ] **Menu Button:** Return to HomeScreen
- [ ] **Filter Selection:** Updates grid content
- [ ] **No Focus Traps:** Can reach all items

---

### RadioScreen
**Focusable Elements:** TVHeader, Genre filters (6 items), Station grid (6 columns)

- [ ] **Initial Focus:** First station card
- [ ] **Arrow Navigation:** Same as VODScreen
- [ ] **Select on Station:** Navigate to PlayerScreen
- [ ] **Playing Badge:** Visible on active station
- [ ] **No Focus Traps:** All stations reachable

---

### EPGScreen
**Focusable Elements:** TVHeader, Time slots (24 items), Program grid (2 columns)

- [ ] **Initial Focus:** Current hour time slot
- [ ] **Arrow Up:** Programs → Time slots → TVHeader
- [ ] **Arrow Down:** TVHeader → Time slots → Programs
- [ ] **Time Slot Selection:** Updates program grid, maintains focus
- [ ] **Program Cards:** 2 columns, logical navigation
- [ ] **Select on Program:** Navigate to PlayerScreen (if live)
- [ ] **Menu Button:** Return to HomeScreen
- [ ] **Live Badge:** Visible on current programs

---

### SettingsScreen
**Focusable Elements:** TVHeader, Settings sections (3 sections x 3-5 items each)

- [ ] **Initial Focus:** First setting (Voice Control toggle)
- [ ] **Arrow Up/Down:** Navigate between settings
- [ ] **Arrow Left/Right:** No effect (single column)
- [ ] **Select on Toggle:** Switch state
- [ ] **Select on Select:** Show picker modal
- [ ] **Menu Button:** Return to HomeScreen
- [ ] **No Focus Traps:** Can reach all settings

---

### ProfileScreen
**Focusable Elements:** TVHeader, Profile options (4 items)

- [ ] **Initial Focus:** First option (Watch History)
- [ ] **Arrow Up/Down:** Navigate options
- [ ] **Select on Option:** Navigate to target screen
- [ ] **Menu Button:** Return to HomeScreen
- [ ] **Avatar:** Not focusable (display only)

---

### FavoritesScreen
**Focusable Elements:** TVHeader, Category filters (6 items), Favorites grid (6 columns)

- [ ] **Arrow Navigation:** Same as VODScreen
- [ ] **Empty State:** Message focused, allows navigation away

---

### PodcastsScreen
**Focusable Elements:** TVHeader, Category filters (7 items), Podcast grid (6 columns)

- [ ] **Arrow Navigation:** Same as VODScreen
- [ ] **Play Overlay:** Visible on focused podcast

---

### ChildrenScreen
**Focusable Elements:** TVHeader, Age filters (4 items), Type filters (5 items), Content grid (6 columns)

- [ ] **Initial Focus:** First content card
- [ ] **Arrow Navigation:** Two filter rows, then grid
- [ ] **Safe Mode Badge:** Not focusable (display only)
- [ ] **Educational Badge:** Not focusable (display only)

---

### FlowsScreen
**Focusable Elements:** TVHeader, Category filters (7 items), Flow grid (4 columns)

- [ ] **Initial Focus:** First flow card
- [ ] **Arrow Navigation:** 4 columns (larger cards)
- [ ] **Play Overlay:** Visible on focused flow

---

### JudaismScreen
**Focusable Elements:** TVHeader, Category filters (7 items), Holiday filters (8 items), Content grid (6 columns)

- [ ] **Initial Focus:** First content card
- [ ] **Arrow Navigation:** Two filter rows, then grid

---

## Multi-Window Focus Testing

### MultiWindowManager Overlay
**Focusable Elements:** 4 windows, Layout selector button

- [ ] **Initial Focus:** First window
- [ ] **Arrow Navigation:** Between 4 windows (2x2 grid)
- [ ] **Select on Window:** Expand window
- [ ] **Menu Button:** Close overlay, return to main screen
- [ ] **Layout Button:** Open layout selector

---

### WindowLayoutSelector Modal
**Focusable Elements:** 3 layout options (Grid, Sidebar, Fullscreen)

- [ ] **Initial Focus:** Current layout
- [ ] **Arrow Left/Right:** Navigate layouts
- [ ] **Select:** Apply layout, close modal
- [ ] **Menu Button:** Cancel, close modal

---

## Cross-Screen Focus Testing

### TVHeader Navigation (All Screens)
**9 Navigation Items:** Home, Live TV, Search, VOD, Radio, EPG, Settings, Profile, Multi-Window

- [ ] **Arrow Left/Right:** Navigate items horizontally
- [ ] **Arrow Down:** From header to screen content
- [ ] **Arrow Up:** From content to header
- [ ] **Select:** Navigate to selected screen
- [ ] **Current Screen:** Highlighted in header
- [ ] **Focus Ring:** Visible on all items

---

## Focus Indicator Validation

### Visual Requirements
- [ ] **Border:** 4pt solid purple (#A855F7)
- [ ] **Scale:** 1.1x magnification
- [ ] **Transition:** Smooth (200ms spring animation)
- [ ] **Contrast:** 3:1 minimum with background
- [ ] **Visibility:** Always visible, never clipped

### Test on All Backgrounds
- [ ] Black background (#000000)
- [ ] Dark cards (rgba(20,20,35,0.85))
- [ ] Glassmorphic surfaces
- [ ] Over video content
- [ ] During loading states

---

## Automated Focus Testing Script

```bash
#!/bin/bash
# Focus Navigation Automated Test
# Tests basic focus flow on each screen

echo "Starting Focus Navigation Tests..."

# Test HomeScreen
echo "Testing HomeScreen..."
# Simulate: Launch app → Arrow Down → Arrow Right x3 → Select
# Expected: Navigate to 4th content item

# Test PlayerScreen
echo "Testing PlayerScreen..."
# Simulate: Launch player → Wait 5s → Press any button → Arrow Left
# Expected: Controls appear, focus on seek back

# Test LiveTVScreen
echo "Testing LiveTVScreen..."
# Simulate: Navigate to Live TV → Arrow Down x2 → Arrow Right x4
# Expected: Focus on channel grid row 2, column 5

# ... Continue for all screens

echo "Focus tests complete. Review results above."
```

---

## Known Focus Issues & Workarounds

### Issue 1: Modal Focus Restoration
**Problem:** When closing modal, focus doesn't return to trigger element
**Workaround:** Manually set focus with `ref.current.focus()`
**Status:** Fixed in MultiWindowContainer.tsx

### Issue 2: Horizontal List Edge
**Problem:** Focus gets stuck at list edge during fast scrolling
**Workaround:** Implement wrap-around or disable edge clamping
**Status:** Monitoring

---

## Pass Criteria

### Must Pass (P0)
- [ ] **Zero Focus Traps:** 100% of screens allow escape
- [ ] **Menu Button:** Works on all screens
- [ ] **Focus Visible:** All focus states clearly indicated
- [ ] **hasTVPreferredFocus:** First element focused on load
- [ ] **Logical Order:** Focus follows natural reading order

### Should Pass (P1)
- [ ] **Focus Restoration:** Returns to correct element after modal
- [ ] **Animation Smooth:** Focus transitions at 60fps
- [ ] **Grid Navigation:** All grid layouts work correctly
- [ ] **Filter Navigation:** All filter bars work

### Nice to Have (P2)
- [ ] **Wrap-Around:** Focus wraps at edges
- [ ] **Smart Focus:** Focus remembers last position
- [ ] **Voice Navigation:** Voice commands move focus correctly

---

## Test Execution Log

```markdown
## Focus Navigation Audit - [Date]
**Tester:** [Name]
**Device:** Apple TV 4K (3rd gen)

| Screen | Focus Traps | Menu Button | Preferred Focus | Navigation | Status |
|--------|-------------|-------------|-----------------|------------|--------|
| HomeScreen | ✅ None | ✅ Works | ✅ Works | ✅ Pass | ✅ PASS |
| PlayerScreen | ✅ None | ✅ Works | ✅ Works | ✅ Pass | ✅ PASS |
| LiveTVScreen | ❌ Grid row 3 | ✅ Works | ✅ Works | ⚠️ Issue | ❌ FAIL |
| ... | ... | ... | ... | ... | ... |

### Issues Found
1. [P1] LiveTVScreen - Focus trap in grid row 3, column 5
   - **Cause:** Missing focusable prop on card
   - **Fix:** Add `accessible={true}` to Pressable

### Summary
- **Screens Tested:** 14
- **Passed:** 13
- **Failed:** 1
- **Focus Traps Found:** 1
- **Status:** ⚠️ NEEDS FIX
```

---

**Next Steps:** After focus navigation passes, proceed to Performance Testing (Phase 7.5)
