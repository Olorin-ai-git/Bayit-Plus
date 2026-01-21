# Mobile App i18n Status Report

## Current App State (Hebrew)

**Screenshot**: `/tmp/home-after-i18n-fix.png`

### ✅ Working Correctly

1. **Hebrew Display** - All Hebrew text rendering correctly
2. **RTL Text** - Hebrew text displays right-to-left
3. **App Name** - Shows "בית+" (localized from hardcoded "Bayit+")
4. **Bottom Tabs** - Mostly Hebrew:
   - ראשי (Home) ✅
   - רדיו (Radio) ✅
   - פודקאסטים (Podcasts) ✅
   - פרופיל (Profile) ✅
5. **Content Sections** - Hebrew headers displaying

### ❌ Issues Found

#### 1. Bottom Navigation Incomplete
**Current tabs (5 visible)**:
- ראשי (Home)
- VOD (English - not translated)
- רדיו (Radio)
- פודקאסטים (Podcasts)
- פרופיל (Profile)

**Missing tab**: שידור חי (Live TV) - only 5 tabs showing instead of 6

**Fix Required**:
```typescript
// MainTabNavigator.tsx should use t() for all tab labels
<Tab.Screen
  name="LiveTV"
  options={{ tabBarLabel: t('navigation.live') }} // Not t('navigation.liveTV')
/>
```

#### 2. VOD Tab Not Translated
Shows "VOD" in English instead of Hebrew translation

**Check**: Does `navigation.vod` key exist in he.json?

#### 3. RTL Layout Not Applied
While text displays in Hebrew RTL, the **layout** is still LTR:
- Tabs read left-to-right (should be right-to-left in Hebrew)
- Content alignment may not be properly mirrored

**Fix Required**: All screens need `useDirection` hook to flip layouts

#### 4. Mixed Language Notification
Popup shows Hebrew + English mixed content

## Translation Coverage

### Hebrew (עברית) - 2141 lines
✅ **Complete** - All keys translated

### English - 2055 lines
✅ **Complete** - All keys translated

### Spanish (Español) - 1426 lines
❌ **Incomplete** - Only 69% translated
- Missing ~629 lines of translations
- Will fall back to English for missing keys

## Required Fixes

### Priority 1: Critical (Blocks full Hebrew support)
1. ✅ Fix hardcoded "Bayit+" → DONE
2. ❌ Add RTL layout support to all 8 screens
3. ❌ Fix bottom navigation tab labels (VOD translation)
4. ❌ Fix missing 6th tab (Live TV)

### Priority 2: High (User-facing issues)
5. ❌ Complete Spanish translations (629 missing lines)
6. ❌ Test language switching (Hebrew ↔ English ↔ Spanish)

### Priority 3: Medium (Polish)
7. ❌ Fix mixed language notification popups
8. ❌ Verify all tab icons display correctly

## Screen RTL Status

| Screen | `useDirection` Hook | RTL Layout | Status |
|--------|-------------------|------------|---------|
| HomeScreenMobile | ✅ Added | ❌ Not applied | In Progress |
| LiveTVScreenMobile | ❌ Missing | ❌ Not applied | Pending |
| VODScreenMobile | ❌ Missing | ❌ Not applied | Pending |
| PlayerScreenMobile | ❌ Missing | ❌ Not applied | Pending |
| RadioScreenMobile | ❌ Missing | ❌ Not applied | Pending |
| PodcastsScreenMobile | ❌ Missing | ❌ Not applied | Pending |
| ProfileScreenMobile | ❌ Missing | ❌ Not applied | Pending |
| SearchScreenMobile | ❌ Missing | ❌ Not applied | Pending |

## Next Steps

### Immediate (To fix current app)
1. Check MainTabNavigator tab label translations
2. Verify navigation.vod key exists in all 3 languages
3. Apply RTL layout styles to all screens

### Short-term (Complete i18n)
4. Add `useDirection` hook to all 7 remaining screens
5. Apply RTL-aware styling (flexDirection, textAlign, etc.)
6. Test language switching in-app

### Long-term (Spanish support)
7. Complete Spanish translations in `/shared/i18n/locales/es.json`
8. Test Spanish language fully

## Testing Checklist

### Hebrew (עברית) - RTL
- [ ] All text displays in Hebrew
- [ ] Layout flows right-to-left
- [ ] Tab navigation reads right-to-left (currently left-to-right)
- [ ] Text alignment is right-aligned
- [ ] All 6 tabs visible and translated
- [ ] Chevrons/arrows point correctly (← instead of →)

### English - LTR
- [ ] All text displays in English
- [ ] Layout flows left-to-right
- [ ] Tab navigation reads left-to-right
- [ ] Text alignment is left-aligned
- [ ] All 6 tabs visible and translated

### Spanish (Español) - LTR
- [ ] All text displays in Spanish (no English fallbacks)
- [ ] Layout flows left-to-right
- [ ] All 6 tabs visible and translated
- [ ] Complete translation coverage

## Summary

**Current State**: 🟡 Partial i18n Support
- Hebrew text displays correctly (RTL text)
- App name localized
- Most navigation translated
- **But**: RTL layout not applied, missing tab, VOD not translated

**To Achieve**: 🟢 Full i18n Support
- Need RTL layout support in all screens
- Fix navigation translations
- Complete Spanish translations
- Test all 3 languages thoroughly

**Estimated Work**:
- RTL layout fixes: ~2-3 hours
- Spanish translations: ~4-5 hours
- Testing: ~2 hours
- **Total**: ~8-10 hours for full i18n support
