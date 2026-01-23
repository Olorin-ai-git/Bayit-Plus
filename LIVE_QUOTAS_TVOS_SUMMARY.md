# Live Quotas - tvOS Compatibility Summary

**Status**: ⚠️ **CHANGES REQUIRED**
**Full Review**: See `/docs/reviews/LIVE_QUOTAS_TVOS_REVIEW.md`

---

## Critical Issues

### 🔴 Usage Indicator - Not Focusable
**File**: `web/src/components/player/LiveFeatureUsageIndicator.tsx`

**Problem**: Badge cannot receive Siri Remote focus
- No `focusable` prop
- No press handler
- Text too small (11px → needs 18px for TV)
- Missing focus styling

**Fix**: Add `TouchableOpacity`, `useTVFocus` hook, detail modal, platform-specific styling

---

### 🔴 Admin Forms - TextInput Unusable
**File**: `web/src/pages/admin/UserLiveQuotaPage.tsx`

**Problem**: 6+ TextInput fields cannot be used with Siri Remote
- No tvOS keyboard
- Typing with remote is painful
- MultiLine TextArea completely unusable

**Fix**: Platform-gate admin pages on tvOS with "Not Available" screen

---

### 🟡 Analytics Table - Non-Interactive
**File**: `web/src/pages/admin/LiveUsageAnalyticsPage.tsx`

**Problem**: Table rows are non-focusable Views
- Cannot select rows
- No drill-down into user details
- Poor spatial navigation

**Fix**: Make rows focusable with `TouchableOpacity`

---

## Required Changes (Summary)

1. **LiveFeatureUsageIndicator** (4-6 hours)
   - Add `TouchableOpacity` wrapper
   - Integrate `useTVFocus` hook
   - Create detail modal for tvOS
   - Update font sizes: 11px → 18px, 10px → 16px
   - Add focus styling

2. **UserLiveQuotaPage** (2-3 hours)
   - Add `Platform.isTV` check at top
   - Render "Not Available on Apple TV" screen
   - Provide "Back to Home" button
   - Add deep link hint to web version

3. **LiveUsageAnalyticsPage** (3-4 hours)
   - Make table rows focusable/pressable
   - Add navigation to user detail pages
   - Ensure smooth scrolling with remote

4. **Typography Updates** (3-4 hours)
   - Create platform-specific size tokens
   - Update all text: `Platform.select({ tv: 18, default: 12 })`
   - Ensure 18px minimum for body text on tvOS

**Total Effort**: 11-16 hours + testing

---

## Testing Requirements

### tvOS Simulator
- [ ] Usage indicator focusable and readable
- [ ] Admin pages show platform gate
- [ ] Analytics table navigable
- [ ] No focus traps
- [ ] Text readable from 10 feet

### Physical Apple TV (Recommended)
- [ ] Siri Remote gestures work
- [ ] WebSocket connections stable
- [ ] Performance acceptable

---

## Approval Status

| Component | Status | Notes |
|-----------|--------|-------|
| **Backend API** | ✅ APPROVED | Platform-agnostic, well-designed |
| **Usage Indicator** | ⚠️ CHANGES REQUIRED | Needs focus support |
| **Admin Forms** | ❌ NOT APPROVED | Must be gated on tvOS |
| **Analytics** | ⚠️ CHANGES REQUIRED | Make interactive |

---

## Quick Code Snippets

### Usage Indicator - Add Focus
```tsx
import { TouchableOpacity, Platform } from 'react-native'
import { useTVFocus } from '@bayit/glass-components/hooks'

const { isFocused, handleFocus, handleBlur, focusStyle } = useTVFocus({ styleType: 'button', tvOnly: true })

<TouchableOpacity focusable={Platform.isTV} onFocus={handleFocus} onBlur={handleBlur}>
  <View style={[styles.badge, isFocused && focusStyle]}>
    <Text style={Platform.isTV ? styles.textTV : styles.text}>...</Text>
  </View>
</TouchableOpacity>
```

### Admin Pages - Platform Gate
```tsx
if (Platform.isTV) {
  return (
    <AdminLayout>
      <GlassCard style={styles.notAvailableCard}>
        <AlertCircle size={48} color={colors.warning} />
        <Text style={styles.title}>Not Available on Apple TV</Text>
        <Text style={styles.message}>
          Admin quota management requires text input and is best accessed on web or mobile.
        </Text>
        <GlassButton onPress={() => navigate('/')}>Back to Home</GlassButton>
      </GlassCard>
    </AdminLayout>
  )
}
```

---

**Full Details**: `/docs/reviews/LIVE_QUOTAS_TVOS_REVIEW.md`
