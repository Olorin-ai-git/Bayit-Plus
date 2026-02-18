# Android UI Features Implementation Progress

## Completed Features ✅

### 1. Hero Carousel Enhancements ✅
**Files modified:**
- `HomeSections.kt`

**Changes:**
- Added "Watch Now" and "More Info" buttons to hero carousel cards
- Added "NEW" badge on the first carousel item (top-left corner with yellow/warning background)
- Buttons are side-by-side with equal weight
- "Watch Now" is primary button, "More Info" is secondary

**Implementation details:**
```kotlin
// Added Box wrapper around CachedAsyncImage for badge positioning
// NEW badge shows only when page == 0 (first item)
// Two GlassButton components in a Row with weight(1f) each
```

### 2. Radio Stations: Current Song/Show Display ✅
**Files modified:**
- `ContentRows.kt`
- `GlassContentCard.kt` (design system)

**Changes:**
- Extended `GlassContentCard` with optional `subtitle` and `badge` parameters
- Radio stations now display current song or current show as subtitle
- Subtitle appears below the station name in smaller, secondary text color

**Implementation details:**
```kotlin
// RadioStationItem already has currentSong and currentShow fields
// subtitle = station.currentSong ?: station.currentShow
// GlassContentCard now supports Column layout for title + subtitle
```

### 3. Live TV: Current Show Title + LIVE Badge ✅
**Files modified:**
- `ContentRows.kt`
- `GlassContentCard.kt` (design system)

**Changes:**
- Live TV channels now display current show title as subtitle
- Added red "LIVE" badge in top-right corner of channel cards
- Badge has error semantic color (red) to indicate live status

**Implementation details:**
```kotlin
// LiveChannelItem already has currentShow field
// subtitle = channel.currentShow
// badge = "LIVE" (displayed in top-right with red background)
```

### GlassContentCard Design System Enhancement ✅
**File:** `designsystem/src/main/java/tv/bayit/plus/designsystem/component/GlassContentCard.kt`

**New parameters:**
- `subtitle: String? = null` - Optional subtitle text below title
- `badge: String? = null` - Optional badge text in top-right corner

**Layout changes:**
- Badge: Top-right corner, red background, bold text
- Title/Subtitle: Bottom gradient area, Column layout
- Title: 1 line max, SemiBold weight
- Subtitle: 1 line max, secondary text color, smaller font

---

## Remaining Features (5 of 8)

### 4. Navigation: Language Selector ⏸️
**What's needed:**
- Dropdown/menu to switch between 10 languages
- Current language indicator (globe icon + 2-letter code)
- Languages: English, Hebrew, Spanish, French, Russian, Portuguese, Yiddish, Arabic, German, Italian
- Store selection in preferences
- Reload UI when language changes

**Files to create/modify:**
- New: `LanguageSelector.kt` composable
- Modify: `HomeContent.kt` or navigation bar component
- Integration: Connect to localization system

### 5. Navigation: Profile Avatar ⏸️
**What's needed:**
- 32px circular avatar in top navigation
- Load from user profile photo URL
- Placeholder icon if no photo
- Click opens profile menu/drawer

**Files to create/modify:**
- New: `ProfileAvatar.kt` composable
- Modify: Navigation bar component
- Integration: Connect to user authentication state

### 6. Shabbat Mode Banner ⏸️
**What's needed:**
- Port from tvOS `TVShabbatBannerView.swift`
- Full-width banner between header and hero carousel
- Shows during Shabbat (Friday sunset to Saturday night)
- Countdown to candle lighting or end of Shabbat
- Dismissible by user
- Purple/blue glass morphism background
- Candle icon

**Files to create:**
- New: `ShabbatBanner.kt` composable
- New: `ShabbatService.kt` or use existing Shabbat API
- Modify: `HomeContent.kt` to include banner

**Reference implementation:**
```swift
// From ios-app/BayitPlusTVApp/TVShabbatBannerView.swift
// - Checks if currently Shabbat
// - Shows countdown timer
// - Glass morphism with candle imagery
// - Dismissible with X button
```

### 7. Morning Ritual Check ⏸️
**What's needed:**
- Full-screen overlay when `ritualService.shouldShow()` returns true
- Only for authenticated users
- Interactive ritual experience (prayer, blessing, etc.)
- Dismissible after completion
- Modal/dialog presentation

**Files to create:**
- New: `MorningRitualDialog.kt` composable
- Integration: Check ritual status on home screen load
- API: `GET /api/v1/ritual/status` (already exists)

**Implementation approach:**
1. On HomeScreen load, check if user is authenticated
2. If authenticated, call `ritualService.shouldShow()`
3. If true, show full-screen MorningRitualDialog
4. After dismissal, mark ritual as completed for the day

### 8. RTL Layout Support ⏸️
**What's needed:**
- Right-to-left layout for Hebrew language
- Automatic layout mirroring when locale is Hebrew (he)
- Text alignment changes (right-aligned for RTL)
- Icon/image mirroring where appropriate

**Files to modify:**
- `AndroidManifest.xml` - Add `android:supportsRtl="true"`
- All composables - Ensure proper RTL handling with CompositionLocal
- Design system components - Verify RTL support

**Implementation approach:**
1. Add RTL support to manifest:
```xml
<application
    android:supportsRtl="true"
    ...>
```
2. Use `LocalLayoutDirection` to detect RTL
3. Update spacing/padding logic where needed
4. Test with Hebrew language selected

---

## Implementation Priority

Based on user impact and complexity:

1. **RTL Support** (Highest Priority, Medium Complexity)
   - Required for Hebrew users
   - Affects all UI components
   - Foundational change

2. **Navigation: Profile Avatar** (High Priority, Low Complexity)
   - Essential for authenticated experience
   - Quick to implement
   - Improves navigation UX

3. **Navigation: Language Selector** (High Priority, Medium Complexity)
   - Enables language switching
   - Affects all localized content
   - Medium implementation effort

4. **Shabbat Mode Banner** (Medium Priority, Medium Complexity)
   - Important for Jewish observance
   - Time-sensitive feature
   - Requires Shabbat time calculations

5. **Morning Ritual** (Low Priority, High Complexity)
   - Nice-to-have feature
   - Complex interactive experience
   - Lower user engagement expected

---

## Testing Checklist

### Completed Features

**Hero Carousel:**
- [x] "Watch Now" and "More Info" buttons render
- [ ] "Watch Now" button navigates to player
- [ ] "More Info" button navigates to detail page (TODO: wire up)
- [x] "NEW" badge appears on first item only
- [x] Badge has correct styling (yellow background, top-left)
- [x] Buttons are responsive and side-by-side

**Radio Stations:**
- [ ] Current song displays when available
- [ ] Current show displays as fallback
- [ ] Subtitle text is truncated at 1 line
- [ ] Secondary text color is applied
- [ ] No subtitle shows when both fields are null

**Live TV:**
- [ ] Current show title displays
- [ ] "LIVE" badge appears in top-right
- [ ] Badge has red background
- [ ] Subtitle truncates correctly

### Remaining Features

**RTL Support:**
- [ ] Hebrew layout mirrors correctly
- [ ] Text aligns right in Hebrew
- [ ] Icons/images mirror appropriately
- [ ] Navigation elements reverse

**Profile Avatar:**
- [ ] Avatar loads from user profile
- [ ] Placeholder shows when no photo
- [ ] Clicking opens profile menu
- [ ] Avatar is 32px circular

**Language Selector:**
- [ ] All 10 languages listed
- [ ] Current language highlighted
- [ ] Changing language reloads UI
- [ ] Selection persists across sessions

**Shabbat Banner:**
- [ ] Appears during Shabbat hours
- [ ] Hidden outside Shabbat
- [ ] Countdown timer accurate
- [ ] Dismissible and stays dismissed
- [ ] Styled with glass morphism

**Morning Ritual:**
- [ ] Shows only for authenticated users
- [ ] Appears at correct times
- [ ] Interactive ritual works
- [ ] Dismissible
- [ ] Marks as completed

---

## Summary

**Completed:** 3 of 8 features (38%)
**Remaining:** 5 features

**Next Steps:**
1. Implement RTL support (foundational)
2. Add profile avatar to navigation
3. Create language selector component
4. Port Shabbat banner from tvOS
5. Implement morning ritual dialog
