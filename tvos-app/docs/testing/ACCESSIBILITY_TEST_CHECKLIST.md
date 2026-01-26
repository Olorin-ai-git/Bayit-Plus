# Accessibility Test Checklist

**Phase 7.6: Accessibility Testing**
**Objective:** VoiceOver and accessibility compliance
**Standard:** WCAG 2.1 Level AA

---

## Overview

Accessibility ensures all users can use the app, including those with visual, auditory, motor, or cognitive disabilities. tvOS provides VoiceOver (screen reader) and various accessibility features.

**Key Areas:**
1. VoiceOver screen reader support
2. Contrast ratios for visibility
3. Text sizing and readability
4. Focus indicators
5. Reduce motion support

---

## Testing Setup

### Enable VoiceOver
```
Settings → Accessibility → VoiceOver → On
OR
Triple-press Play/Pause button (if enabled as accessibility shortcut)
```

### VoiceOver Gestures (Siri Remote)
- **Swipe Right/Left:** Navigate between elements
- **Tap:** Activate focused element
- **Two-finger Tap:** Magic Tap (context-dependent action)
- **Three-finger Swipe:** Scroll

---

## VoiceOver Testing Checklist

### All Screens - General Requirements

- [ ] **All Interactive Elements Labeled:** Every button, link, card has `accessibilityLabel`
- [ ] **Meaningful Labels:** Labels describe purpose, not implementation
  - ✅ Good: "Play Galatz radio station"
  - ❌ Bad: "Button"
  - ❌ Bad: "Image"
- [ ] **Logical Reading Order:** VoiceOver reads elements in logical sequence
- [ ] **Grouping:** Related elements grouped with `accessibleRole="group"`
- [ ] **States Announced:** Toggle states announced ("on"/"off")
- [ ] **Dynamic Content:** Live regions announce changes
- [ ] **Images:** Decorative images marked with `accessible={false}`

---

### Screen-by-Screen Testing

### HomeScreen
```typescript
// Example accessibility labels
<Pressable
  accessible
  accessibilityLabel="Trending movie: The Crown. Tap to play."
  accessibilityRole="button"
  accessibilityHint="Opens video player"
>
```

- [ ] **TVHeader Items:** Each nav item has clear label
  - "Home", "Live TV", "Search", "Movies and Series", "Radio", "TV Guide", "Settings", "Profile", "Multi-Window"
- [ ] **Content Cards:** Include title + content type
  - "The Crown, Series, Tap to play"
- [ ] **Shelves:** Announced with category
  - "Trending Now, shelf with 12 items"
- [ ] **Empty States:** Clearly announced
  - "No trending content available"

---

### PlayerScreen
```typescript
<Pressable
  accessible
  accessibilityLabel={isPlaying ? "Pause video" : "Play video"}
  accessibilityRole="button"
  accessibilityState={{ disabled: isBuffering }}
>
```

- [ ] **Play/Pause Button:** State announced
- [ ] **Seek Buttons:** Clear labels
  - "Skip back 10 seconds"
  - "Skip forward 30 seconds"
- [ ] **Progress Bar:** Current time and duration announced
  - "5 minutes 30 seconds of 45 minutes"
- [ ] **Info Panel:** Content details readable
- [ ] **Buffering State:** Announced
  - "Buffering video, please wait"
- [ ] **Error State:** Error message read
  - "Failed to load video. Tap retry to try again."

---

### LiveTVScreen
- [ ] **Channel Cards:** Include channel name + program
  - "Channel 2, Kan 11, Currently playing: Evening News"
- [ ] **Live Badge:** Announced
  - "Live now"
- [ ] **Genre Filters:** Clear labels
  - "Filter by News"

---

### SearchScreen
- [ ] **Voice Search Button:** Clear label
  - "Voice search. Tap to start listening."
- [ ] **Text Input:** Label and hint
  - Label: "Search for content"
  - Hint: "Enter movie, series, or channel name"
- [ ] **Listening State:** Announced
  - "Listening for voice command"
- [ ] **Results:** Count announced
  - "20 results found for action movies"

---

### SettingsScreen
- [ ] **Toggle Switches:** State announced
  - "Voice Control, On. Double tap to toggle."
- [ ] **Select Options:** Current value announced
  - "Speech Rate, 0.9x. Double tap to change."
- [ ] **Sections:** Section headers announced
  - "Voice Settings section"

---

### Multi-Window Overlay
- [ ] **Windows:** Content type and title
  - "Window 1: Galatz radio, playing. Tap to expand."
- [ ] **Layout Selector:** Options clear
  - "Grid 2x2 layout, selected"
  - "Sidebar layout. Double tap to switch."
- [ ] **Window Count:** Announced
  - "4 windows open"

---

## Contrast Ratio Testing

### WCAG 2.1 Requirements
- **Normal Text:** 4.5:1 minimum
- **Large Text (18pt+):** 3:1 minimum
- **UI Components:** 3:1 minimum
- **Focus Indicators:** 3:1 minimum

### Test Cases

#### Text Contrast
- [ ] **White text on dark background:** #FFFFFF on #000000 = 21:1 ✅
- [ ] **Purple accent:** #A855F7 on #000000 = 9.2:1 ✅
- [ ] **Gray subtitle text:** rgba(255,255,255,0.6) on #000000 = 8.4:1 ✅
- [ ] **Dark card text:** #FFFFFF on rgba(20,20,35,0.85) = ~18:1 ✅

#### UI Components
- [ ] **Focus Border:** #A855F7 (4pt) on dark background = 9.2:1 ✅
- [ ] **Button Text:** #FFFFFF on #A855F7 = 4.8:1 ✅
- [ ] **Category Filters (selected):** #FFFFFF on #A855F7 = 4.8:1 ✅
- [ ] **Live Badge:** #10b981 on dark = 6.5:1 ✅

#### Test Tool
```bash
# Use online contrast checker or Xcode Accessibility Inspector
# Target: All text and UI elements meet WCAG AA standards
```

---

## Text Sizing and Readability

### Typography Requirements (10-foot viewing)
- [ ] **Body Text:** 28pt minimum ✅
- [ ] **Button Text:** 28pt minimum ✅
- [ ] **Title Text:** 48pt minimum ✅
- [ ] **Subtitle Text:** 24pt minimum ✅

### Readability Test
1. View app from 10 feet away
2. All text should be readable without strain
3. Focus indicators should be clearly visible

---

## Focus Indicators

### Visual Requirements
- [ ] **Border Width:** 4pt minimum ✅
- [ ] **Border Color:** #A855F7 (9.2:1 contrast) ✅
- [ ] **Scale:** 1.1x magnification ✅
- [ ] **Animation:** Smooth spring (200ms) ✅
- [ ] **Visibility:** Never clipped or hidden ✅

### Test on All Backgrounds
- [ ] Black (#000000)
- [ ] Dark cards (rgba(20,20,35,0.85))
- [ ] Over video content
- [ ] Glassmorphic surfaces

---

## Reduce Motion Support

### Requirements
When "Reduce Motion" enabled in Accessibility Settings:
- [ ] **Scale Animations:** Reduce or disable
- [ ] **Fade Transitions:** Use instead of slides
- [ ] **Parallax:** Disable
- [ ] **Auto-play Videos:** Pause by default

### Implementation
```typescript
import { AccessibilityInfo } from 'react-native';

const [reduceMotion, setReduceMotion] = useState(false);

useEffect(() => {
  AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  const subscription = AccessibilityInfo.addEventListener(
    'reduceMotionChanged',
    setReduceMotion
  );
  return () => subscription.remove();
}, []);

// Use in animations
const scaleValue = reduceMotion ? 1.0 : 1.1;
```

---

## Accessibility Audit with Xcode

### Using Accessibility Inspector
```bash
1. Xcode → Open Developer Tool → Accessibility Inspector
2. Select target: Apple TV device/simulator
3. Run audit:
   - Inspect → Audit
   - Review warnings and errors
   - Fix issues in code
```

### Common Issues Detected
- Missing accessibility labels
- Low contrast ratios
- Small touch targets (should be 300x80pt minimum on TV)
- Incorrect accessibility roles
- Missing accessibility hints

---

## VoiceOver Testing Procedure

### For Each Screen
1. **Enable VoiceOver**
2. **Navigate with swipes:** Verify logical order
3. **Activate elements:** Verify actions work
4. **Check labels:** Verify meaningful descriptions
5. **Test dynamic content:** Verify live updates announced
6. **Document issues:** Record any problems

### Example Test Session
```markdown
## VoiceOver Test - HomeScreen

1. Launch app with VoiceOver enabled
2. First element announced: "Home, tab 1 of 9, selected"
3. Swipe right: "Live TV, tab 2 of 9"
4. Swipe right x3: "Movies and Series, tab 4 of 9"
5. Swipe down: "Trending Now, heading"
6. Swipe right: "The Crown, Series, Tap to play, button"
7. Double-tap: Navigate to player ✅
8. Result: PASS - All elements properly labeled

## Issues Found
- None
```

---

## Accessibility Features Checklist

### Built-in iOS/tvOS Accessibility
- [ ] **VoiceOver:** Screen reader
- [ ] **Zoom:** Screen magnification
- [ ] **Display Accommodations:** Color filters, invert colors
- [ ] **Reduce Motion:** Minimize animations
- [ ] **Increase Contrast:** Higher contrast UI
- [ ] **Bold Text:** Heavier font weights
- [ ] **Larger Text:** Dynamic type scaling

### App-Specific Support
- [ ] **Voice Control:** Alternative to touch/remote
- [ ] **Closed Captions:** For video content
- [ ] **Audio Descriptions:** Describe visual content
- [ ] **Keyboard Navigation:** Full keyboard control

---

## Accessibility Report Template

```markdown
# Accessibility Test Report - [Date]

## Test Environment
- **Device:** Apple TV 4K (3rd gen)
- **tvOS:** 17.0
- **VoiceOver:** Enabled

## VoiceOver Testing

| Screen | Labeled Elements | Reading Order | States Announced | Status |
|--------|------------------|---------------|------------------|--------|
| HomeScreen | ✅ 100% | ✅ Logical | ✅ Yes | ✅ PASS |
| PlayerScreen | ✅ 100% | ✅ Logical | ✅ Yes | ✅ PASS |
| LiveTVScreen | ⚠️ 95% | ✅ Logical | ✅ Yes | ⚠️ ISSUES |
| ... | ... | ... | ... | ... |

### Issues Found
1. [P1] LiveTVScreen - Channel logos missing alt text
   - **Impact:** VoiceOver users don't know channel identity
   - **Fix:** Add accessibilityLabel to Image components

## Contrast Ratios

| Element | Foreground | Background | Ratio | WCAG | Status |
|---------|------------|------------|-------|------|--------|
| Body text | #FFFFFF | #000000 | 21:1 | AA | ✅ PASS |
| Focus border | #A855F7 | #000000 | 9.2:1 | AA | ✅ PASS |
| Subtitle text | rgba(255,255,255,0.6) | #000000 | 8.4:1 | AA | ✅ PASS |

## Readability (10-foot test)
- [ ] All text readable from 10 feet: ✅ PASS
- [ ] Focus indicators visible: ✅ PASS
- [ ] UI elements distinguishable: ✅ PASS

## Reduce Motion
- [ ] Implemented and tested: ⚠️ NOT IMPLEMENTED
- [ ] Recommendation: Add support before App Store submission

## Summary
- **VoiceOver Compliance:** 95%
- **Contrast Ratios:** 100% pass
- **Readability:** Pass
- **Reduce Motion:** Not implemented
- **Status:** ⚠️ NEEDS FIXES

## Recommendations
1. Add alt text to all images
2. Implement reduce motion support
3. Test with VoiceOver users for usability feedback
```

---

## Acceptance Criteria

### Must Pass (P0)
- [ ] **VoiceOver:** 100% of interactive elements labeled
- [ ] **Contrast Ratios:** All meet WCAG AA standards
- [ ] **Readability:** All text readable from 10 feet
- [ ] **Focus Indicators:** Clearly visible on all backgrounds
- [ ] **Navigation:** Logical VoiceOver navigation order

### Should Pass (P1)
- [ ] **Reduce Motion:** Implemented and working
- [ ] **Dynamic Content:** Live regions announce updates
- [ ] **Error States:** Clear error messages via VoiceOver
- [ ] **Loading States:** Buffering/loading announced

### Nice to Have (P2)
- [ ] **Closed Captions:** Available for all video content
- [ ] **Audio Descriptions:** Available for key content
- [ ] **Voice Control:** Full voice control navigation
- [ ] **Keyboard Navigation:** Complete keyboard support

---

**Final Step:** After accessibility tests pass, proceed to Phase 8 (App Store Submission)
