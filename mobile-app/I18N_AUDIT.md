# Mobile App Internationalization (i18n) Audit

## Summary

Auditing all mobile screens for complete i18n support across Hebrew, English, and Spanish with proper RTL/LTR layouts.

## Issues Found

### 1. Hardcoded Text

#### HomeScreenMobile.tsx
- ❌ Line 198: `<Text style={styles.headerTitle}>Bayit+</Text>`
  - **Fix**: Use `{t('common.appName')}` instead

### 2. Missing RTL/LTR Layout Support

The following screens do NOT import or use `useDirection` hook for RTL/LTR layout:

- ❌ HomeScreenMobile.tsx
- ❌ LiveTVScreenMobile.tsx
- ❌ VODScreenMobile.tsx
- ❌ PlayerScreenMobile.tsx
- ❌ RadioScreenMobile.tsx
- ❌ PodcastsScreenMobile.tsx
- ❌ ProfileScreenMobile.tsx
- ❌ SearchScreenMobile.tsx

**Required**: All screens should:
```typescript
import { useDirection } from '@bayit/shared-hooks';

const { isRTL, direction } = useDirection();

// Use in styles:
flexDirection: isRTL ? 'row-reverse' : 'row'
textAlign: isRTL ? 'right' : 'left'
```

### 3. Spanish Translation Completion

**File sizes**:
- English: 2055 lines ✅
- Hebrew: 2141 lines ✅
- Spanish: 1426 lines ❌ (69% complete)

**Missing ~629 lines** of Spanish translations.

## Required Actions

### Action 1: Fix Hardcoded Text in HomeScreenMobile
- Replace `"Bayit+"` with `{t('common.appName')}`

### Action 2: Add RTL/LTR Support to All Screens

Each screen needs:

1. **Import useDirection**:
```typescript
import { useDirection } from '@bayit/shared-hooks';
```

2. **Use in component**:
```typescript
const { isRTL, direction } = useDirection();
```

3. **Apply to layouts**:
```typescript
// Row layouts
style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}

// Text alignment
style={{ textAlign: isRTL ? 'right' : 'left' }}

// Padding/margin directional
paddingLeft -> paddingStart
paddingRight -> paddingEnd
marginLeft -> marginStart
marginRight -> marginEnd
```

### Action 3: Complete Spanish Translations

Need to translate missing keys in `/shared/i18n/locales/es.json`:

**Priority missing sections**:
- home.* keys
- profile.* keys
- search.* keys
- liveTV.* keys
- vod.* keys
- radio.* keys
- podcasts.* keys
- player.* keys
- settings.* keys

### Action 4: Add Language Switcher to Profile Screen

Add language selection in ProfileScreenMobile:
- Hebrew (עברית)
- English
- Spanish (Español)

Should trigger app re-render with new language and RTL/LTR layout.

## Testing Checklist

### Hebrew (RTL)
- [ ] All text displays in Hebrew
- [ ] Layout is right-to-left
- [ ] Navigation tabs read right-to-left
- [ ] Text alignment is right
- [ ] Icons/chevrons point correctly (< instead of >)

### English (LTR)
- [ ] All text displays in English
- [ ] Layout is left-to-right
- [ ] Navigation tabs read left-to-right
- [ ] Text alignment is left
- [ ] Icons/chevrons point correctly (> instead of <)

### Spanish (LTR)
- [ ] All text displays in Spanish
- [ ] Layout is left-to-right
- [ ] All keys have Spanish translations (no fallbacks to English)
- [ ] Text alignment is left

## Current Status

🟡 **Partial**: Screens use i18n for most text, but:
- Missing RTL/LTR layout support
- Some hardcoded text remains
- Spanish translations incomplete

## Priority

🔴 **HIGH** - RTL/LTR support is critical for Hebrew users
🟡 **MEDIUM** - Spanish translation completion
🟢 **LOW** - Minor hardcoded text fixes
