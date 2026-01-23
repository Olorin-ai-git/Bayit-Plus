# V8 Trivia Feature - tvOS Compliance Review
**Reviewer**: tvOS Expert Agent
**Date**: 2026-01-23
**Status**: CHANGES REQUIRED

---

## Executive Summary

The V8 Trivia Feature demonstrates **strong tvOS awareness** with:
- ✅ Proper font size constants (29pt minimum, 32pt body)
- ✅ Well-designed `getTvStyles()` functions
- ✅ Correct `Platform.isTV || Platform.OS === 'tvos'` detection
- ✅ Proper `hasTVPreferredFocus` implementation on all buttons
- ✅ TriviaCard component correctly applies tvStyles to ALL text elements

**However**, **CRITICAL VIOLATIONS** exist in **TriviaSettingsSection** and related sub-components where tvOS font size overrides are **not defined or applied**.

---

## 1. Font Size Compliance Analysis

### ✅ COMPLIANT: triviaStyles.ts (Player Component)

**Constants** (lines 10-12):
```typescript
const TV_MIN_FONT_SIZE = 29   // ✅ Correct
const TV_BODY_FONT_SIZE = 32  // ✅ Correct
const TV_HEADER_FONT_SIZE = 29 // ✅ Correct
```

**getTvStyles() Function** (lines 21-26):
```typescript
export const getTvStyles = (isTV: boolean): TvTextStyles => ({
  headerText: isTV ? { fontSize: TV_HEADER_FONT_SIZE } : {},        // ✅ 29pt
  categoryText: isTV ? { fontSize: TV_MIN_FONT_SIZE } : {},         // ✅ 29pt
  factText: isTV ? { fontSize: TV_BODY_FONT_SIZE, lineHeight: 42 } : {}, // ✅ 32pt
  relatedPersonText: isTV ? { fontSize: TV_MIN_FONT_SIZE } : {},    // ✅ 29pt
})
```

**Component Implementation** (TriviaCard.tsx):
```typescript
// ✅ Line 35: headerText correctly applies tvStyles
<Text style={[styles.headerText, tvStyles.headerText]}>

// ✅ Line 55: categoryText correctly applies tvStyles
<Text style={[styles.categoryText, tvStyles.categoryText]}>

// ✅ Line 62-63: factText correctly applies tvStyles
<Text style={[styles.factText, isHebrew && styles.factTextRTL, tvStyles.factText]}>

// ✅ Line 73: relatedPersonText correctly applies tvStyles
<Text style={[styles.relatedPersonText, tvStyles.relatedPersonText]}>
```

**Result**: ✅ **FULLY COMPLIANT** - All text in TriviaCard uses ≥29pt on tvOS

---

### ❌ VIOLATION: triviaSettingsStyles.ts (Settings Components)

**Constants** (lines 10-11):
```typescript
const TV_MIN_FONT_SIZE = 29   // ✅ Correct
const TV_BODY_FONT_SIZE = 32  // ✅ Correct
```

**getTvStyles() Function** (lines 18-21):
```typescript
export const getTvStyles = (isTV: boolean): TvStyles => ({
  text: isTV ? { fontSize: TV_BODY_FONT_SIZE } : {},      // ✅ 32pt
  smallText: isTV ? { fontSize: TV_MIN_FONT_SIZE } : {},  // ✅ 29pt
  // ❌ MISSING: headerTitle override
  // ❌ MISSING: sectionTitle override
})
```

**Base Styles with NO TV Override**:

| Style Property | Line | Base Size | Used In Component | TV Override? | Status |
|---------------|------|-----------|-------------------|--------------|--------|
| `headerTitle` | 48-52 | **16pt** | TriviaSettingsSection.tsx:59 | ❌ NO | ❌ VIOLATION |
| `settingLabel` | 66-70 | **14pt** | TriviaToggleRow.tsx:40 | ✅ YES (tvStyles.text) | ✅ COMPLIANT |
| `settingDescription` | 72-75 | **12pt** | TriviaToggleRow.tsx:49 | ✅ YES (tvStyles.smallText) | ✅ COMPLIANT |
| `sectionTitle` | 95-101 | **12pt** | All selector components | ❌ NO | ❌ VIOLATION |

---

### ❌ VIOLATION: Component Implementation Issues

**TriviaSettingsSection.tsx** (line 59):
```typescript
// ❌ VIOLATION: headerTitle uses base 16pt, NO tvStyles applied
<Text style={styles.headerTitle}>{t('trivia.settings.title')}</Text>
```

**TriviaFrequencySelector.tsx** (line 35):
```typescript
// ❌ VIOLATION: sectionTitle uses base 12pt, tvStyles.smallText applied but NO override exists in getTvStyles for sectionTitle
<Text style={[styles.sectionTitle, isHebrew && styles.textRTL, tvStyles.smallText]}>
```

**TriviaDurationSelector.tsx** (line 36):
```typescript
// ❌ VIOLATION: Same as above - sectionTitle 12pt base, tvStyles.smallText doesn't override it
<Text style={[styles.sectionTitle, isHebrew && styles.textRTL, tvStyles.smallText]}>
```

**TriviaCategorySelector.tsx** (line 35):
```typescript
// ❌ VIOLATION: Same as above
<Text style={[styles.sectionTitle, isHebrew && styles.textRTL, tvStyles.smallText]}>
```

**Analysis**: The components apply `tvStyles.smallText` (29pt) to sectionTitle, which **should work** IF React Native merges styles properly (array merging applies right-to-left precedence). However, this is **fragile** and should be explicitly defined in getTvStyles().

---

## 2. Platform Detection Compliance

### ✅ COMPLIANT: All Components Use Correct TV Detection

All 6 components properly detect tvOS:
```typescript
const isTV = Platform.isTV || Platform.OS === 'tvos'  // ✅ Correct
```

**Files verified**:
- ✅ TriviaCard.tsx (line 23)
- ✅ TriviaOverlay.tsx (line 42)
- ✅ TriviaToggleRow.tsx (line 26)
- ✅ TriviaFrequencySelector.tsx (line 28)
- ✅ TriviaDurationSelector.tsx (line 29)
- ✅ TriviaCategorySelector.tsx (line 28)

---

## 3. Container & Layout Compliance

### ✅ COMPLIANT: TV-Specific Container Styles

**triviaStyles.ts** (lines 40-44):
```typescript
containerTV: {
  maxWidth: 480,   // ✅ 50% larger than base (320px)
  bottom: 160,     // ✅ 33% more clearance (120px → 160px)
  left: 48,        // ✅ 3x margin (16px → 48px)
}
```

**triviaStyles.ts** (lines 57-60):
```typescript
glassCardTV: {
  padding: 24,      // ✅ 2x padding (12px → 24px)
  borderRadius: 16, // ✅ 33% larger radius (12px → 16px)
}
```

**Result**: ✅ **COMPLIANT** - Proper 10-foot UI spacing and sizing

---

## 4. Focus Navigation Compliance

### ✅ COMPLIANT: hasTVPreferredFocus Implementation

All interactive elements properly implement tvOS focus:

**TriviaCard.tsx** (line 48):
```typescript
<GlassButton
  hasTVPreferredFocus={isTV}  // ✅ Dismiss button receives focus
/>
```

**TriviaFrequencySelector.tsx** (line 50):
```typescript
hasTVPreferredFocus={frequency === freq.id}  // ✅ Selected frequency
```

**TriviaDurationSelector.tsx** (line 51):
```typescript
hasTVPreferredFocus={duration === dur}  // ✅ Selected duration
```

**TriviaCategorySelector.tsx** (line 54):
```typescript
hasTVPreferredFocus={isSelected && categories.indexOf(cat.id) === 0}
// ✅ First selected category receives focus
```

**GlassButton Verification**:
- ✅ `hasTVPreferredFocus` prop exists in GlassButton interface (line 31)
- ✅ Prop properly passed through to underlying Pressable (lines 236, 256)

**Result**: ✅ **FULLY COMPLIANT** - Focus navigation properly implemented

---

## 5. Icon Size Analysis

### ⚠️ PARTIAL COMPLIANCE: Icon Sizes Below Recommended Minimum

**TriviaCard.tsx Icons**:
```typescript
<Lightbulb size={isTV ? 24 : 16} />     // ⚠️ 24pt borderline for 10-foot UI
<X size={isTV ? 24 : 18} />             // ⚠️ 24pt borderline for 10-foot UI
<ChevronRight size={isTV ? 18 : 14} />  // ❌ 18pt too small for 10-foot UI
```

**Settings Component Icons**:
```typescript
<Clock size={isTV ? 20 : 16} />   // ❌ 20pt below 24pt recommended minimum
<Timer size={isTV ? 20 : 16} />   // ❌ 20pt below 24pt recommended minimum
<Folder size={isTV ? 20 : 16} />  // ❌ 20pt below 24pt recommended minimum
```

**TriviaSettingsSection.tsx** (line 58):
```typescript
<Lightbulb size={20} color="#FCD34D" />  // ❌ NO TV SCALING - fixed 20pt
```

**Apple HIG Recommendation**: Icons in 10-foot UI should be ≥24pt for optimal visibility.

---

## REQUIRED CHANGES

### CRITICAL (Must Fix Before Production):

#### 1. Add Missing TV Font Size Overrides to getTvStyles()

**File**: `/web/src/components/settings/trivia/triviaSettingsStyles.ts`

**Current** (lines 18-21):
```typescript
export const getTvStyles = (isTV: boolean): TvStyles => ({
  text: isTV ? { fontSize: TV_BODY_FONT_SIZE } : {},
  smallText: isTV ? { fontSize: TV_MIN_FONT_SIZE } : {},
})
```

**Required Change**:
```typescript
interface TvStyles {
  text: TextStyle
  smallText: TextStyle
  headerTitle: TextStyle  // ADD THIS
  sectionTitle: TextStyle // ADD THIS
}

export const getTvStyles = (isTV: boolean): TvStyles => ({
  text: isTV ? { fontSize: TV_BODY_FONT_SIZE } : {},      // 32pt
  smallText: isTV ? { fontSize: TV_MIN_FONT_SIZE } : {},  // 29pt
  headerTitle: isTV ? { fontSize: TV_BODY_FONT_SIZE } : {}, // 32pt (ADD THIS)
  sectionTitle: isTV ? { fontSize: TV_MIN_FONT_SIZE } : {}, // 29pt (ADD THIS)
})
```

#### 2. Apply TV Styles to TriviaSettingsSection headerTitle

**File**: `/web/src/components/settings/trivia/TriviaSettingsSection.tsx`

**Current** (line 59):
```typescript
<Text style={styles.headerTitle}>{t('trivia.settings.title')}</Text>
```

**Required Change**:
```typescript
// Add tvStyles import at top
import { triviaSettingsStyles as styles, getTvStyles } from './triviaSettingsStyles'

// Add TV detection
const isTV = Platform.isTV || Platform.OS === 'tvos'
const tvStyles = getTvStyles(isTV)

// Update Text component (line 59)
<Text style={[styles.headerTitle, tvStyles.headerTitle]}>
  {t('trivia.settings.title')}
</Text>
```

#### 3. Verify Selector Components Apply sectionTitle Override

The selector components (TriviaFrequencySelector, TriviaDurationSelector, TriviaCategorySelector) currently apply `tvStyles.smallText` to sectionTitle. After adding `tvStyles.sectionTitle` to getTvStyles(), update these components:

**Current**:
```typescript
<Text style={[styles.sectionTitle, isHebrew && styles.textRTL, tvStyles.smallText]}>
```

**Recommended Change**:
```typescript
<Text style={[styles.sectionTitle, isHebrew && styles.textRTL, tvStyles.sectionTitle]}>
```

This makes the intent explicit and ensures proper override regardless of style merge order.

---

### RECOMMENDED (High Priority):

#### 4. Increase Icon Sizes for 10-Foot UI

**TriviaCard.tsx** (lines 34, 41, 72):
```typescript
<Lightbulb size={isTV ? 28 : 16} />     // 24pt minimum, 28pt recommended
<X size={isTV ? 28 : 18} />             // 24pt minimum, 28pt recommended
<ChevronRight size={isTV ? 24 : 14} />  // 18pt → 24pt minimum
```

**Selector Components** (TriviaFrequencySelector, TriviaDurationSelector, TriviaCategorySelector):
```typescript
<Clock size={isTV ? 24 : 16} />   // 20pt → 24pt minimum
<Timer size={isTV ? 24 : 16} />   // 20pt → 24pt minimum
<Folder size={isTV ? 24 : 16} />  // 20pt → 24pt minimum
```

**TriviaSettingsSection.tsx** (line 58):
```typescript
// ADD TV DETECTION
const isTV = Platform.isTV || Platform.OS === 'tvos'

// UPDATE ICON
<Lightbulb size={isTV ? 28 : 20} color="#FCD34D" />
```

---

### OPTIONAL (Code Quality Enhancement):

#### 5. Add Development-Mode Font Size Validation

Add runtime checks to catch future violations:

**File**: `/web/src/components/settings/trivia/triviaSettingsStyles.ts`

```typescript
// Add after getTvStyles() function
if (__DEV__) {
  export const validateTvFontSizes = (isTV: boolean) => {
    if (!isTV) return

    const violations: string[] = []
    Object.entries(triviaSettingsStyles).forEach(([key, style]) => {
      if (style.fontSize && style.fontSize < 29) {
        violations.push(`${key}: ${style.fontSize}pt (minimum: 29pt)`)
      }
    })

    if (violations.length > 0) {
      console.warn(
        '[tvOS Compliance] Font sizes below 29pt detected:\n',
        violations.join('\n')
      )
    }
  }
}
```

Call in component mount (development only):
```typescript
useEffect(() => {
  if (__DEV__ && isTV) {
    validateTvFontSizes(isTV)
  }
}, [isTV])
```

---

## APPROVAL STATUS

**STATUS**: ❌ **CHANGES REQUIRED**

### Reason

While the **TriviaCard component is FULLY COMPLIANT** with excellent tvOS implementation, the **TriviaSettingsSection and related selector components have CRITICAL VIOLATIONS**:

1. **headerTitle** (16pt base) has NO TV override defined or applied
2. **sectionTitle** (12pt base) relies on implicit style merging rather than explicit override
3. **Icons in TriviaSettingsSection** do not scale for TV (fixed 20pt)
4. **Icon sizes across all components** are below recommended 24pt minimum

### Blocking Issues

**Must Fix Before Production**:
- ❌ Add `headerTitle` and `sectionTitle` to getTvStyles() in triviaSettingsStyles.ts
- ❌ Apply tvStyles.headerTitle in TriviaSettingsSection.tsx line 59
- ❌ Add TV detection to TriviaSettingsSection for icon scaling

**Recommended for Optimal UX**:
- ⚠️ Increase all TV icon sizes to ≥24pt (preferably 28pt for primary actions)

---

## VERIFICATION CHECKLIST

After implementing CRITICAL changes, verify on **tvOS Simulator (Apple TV 4K, tvOS 17+)**:

- [ ] Launch Bayit+ app on tvOS Simulator
- [ ] Navigate to video player
- [ ] Enable trivia in settings
- [ ] **Verify Trivia Overlay**:
  - [ ] All text readable from 10 feet (use 10-foot test: stand back from monitor)
  - [ ] Focus navigation works (Siri Remote swipes)
  - [ ] Dismiss button receives focus
  - [ ] Icon sizes visible at distance
- [ ] **Verify Trivia Settings Panel**:
  - [ ] "Trivia Settings" header text ≥29pt
  - [ ] Section titles ("Frequency", "Categories", etc.) ≥29pt
  - [ ] Lightbulb icon scales for TV
  - [ ] All GlassButton focus states work
  - [ ] Focus flows naturally between buttons
- [ ] **Test RTL (Hebrew)**:
  - [ ] All text properly aligned right
  - [ ] Focus navigation respects RTL direction
- [ ] **Capture Screenshots**:
  - [ ] Trivia overlay during playback
  - [ ] Trivia settings panel (collapsed)
  - [ ] Trivia settings panel (expanded)
  - [ ] Focus states on buttons

---

## FILES REVIEWED

### ✅ Fully Compliant (No Changes Needed):
1. `/web/src/components/player/trivia/triviaStyles.ts`
2. `/web/src/components/player/trivia/TriviaCard.tsx`
3. `/web/src/components/player/trivia/TriviaOverlay.tsx`
4. `/web/src/components/settings/trivia/TriviaToggleRow.tsx`

### ❌ Requires Changes:
1. `/web/src/components/settings/trivia/triviaSettingsStyles.ts` - Add headerTitle, sectionTitle to getTvStyles()
2. `/web/src/components/settings/trivia/TriviaSettingsSection.tsx` - Apply tvStyles, add TV icon scaling
3. `/web/src/components/settings/trivia/TriviaFrequencySelector.tsx` - Use tvStyles.sectionTitle (optional but recommended)
4. `/web/src/components/settings/trivia/TriviaDurationSelector.tsx` - Use tvStyles.sectionTitle (optional but recommended)
5. `/web/src/components/settings/trivia/TriviaCategorySelector.tsx` - Use tvStyles.sectionTitle (optional but recommended)

### ⚠️ Icon Size Recommendations (All Files):
- Increase all TV icon sizes to ≥24pt across all trivia components

---

**Once the CRITICAL changes are implemented, this feature will be PRODUCTION-READY for tvOS.**

---

**Signed**: tvOS Expert Agent
**Date**: 2026-01-23
**Review Iteration**: 1
