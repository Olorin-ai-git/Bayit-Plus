# Live Quotas Implementation - tvOS Compatibility Review

**Review Date**: 2026-01-23
**Reviewer**: iOS Developer / tvOS Expert
**Component**: Live Quotas System
**Status**: ⚠️ **CHANGES REQUIRED**

---

## Executive Summary

The Live Quotas implementation includes usage indicators and admin management pages. While the core functionality is solid, **critical tvOS compatibility issues exist** that will severely impact the Apple TV user experience. The implementation requires modifications for proper focus navigation, 10-foot UI compliance, and input handling on tvOS.

**Overall Assessment**: CHANGES REQUIRED - Admin pages not suitable for tvOS, usage indicators need focus support.

---

## Components Reviewed

### 1. LiveFeatureUsageIndicator Component
**File**: `web/src/components/player/LiveFeatureUsageIndicator.tsx`
**Usage**: Top-right badge showing real-time quota usage during live playback

### 2. Admin Pages
- **UserLiveQuotaPage** (`web/src/pages/admin/UserLiveQuotaPage.tsx`) - Individual user quota management with forms
- **LiveUsageAnalyticsPage** (`web/src/pages/admin/LiveUsageAnalyticsPage.tsx`) - System-wide analytics dashboard

### 3. Backend API
**File**: `backend/app/api/routes/admin/live_quotas.py`
**Endpoints**: REST API for quota management (CRUD operations)

---

## Critical Issues Identified

### 🔴 CRITICAL: Usage Indicator - No Focus Support

**Component**: `LiveFeatureUsageIndicator`
**Issue**: Badge is not focusable and lacks tvOS focus management

**Current Implementation**:
```tsx
// Position: absolute (no interaction)
<View style={styles.container}>
  <View style={[styles.badge, ...]}>
    <Clock size={12} color={...} />
    <Text style={styles.usageText}>...</Text>
  </View>
</View>
```

**Problems**:
- ❌ No `focusable` prop - cannot receive Siri Remote focus
- ❌ No press handler - cannot be tapped to show details
- ❌ No focus styling (scale, ring, highlight)
- ❌ Absolutely positioned - may trap focus in player controls
- ❌ Text too small (11-12px) for 10-foot viewing

**Impact**:
- Users cannot see detailed usage information on tvOS
- Focus navigation may skip over or get stuck
- Poor accessibility - critical information invisible

**Required Changes**:
```tsx
import { TouchableOpacity, Platform } from 'react-native'
import { useTVFocus } from '@bayit/glass-components/hooks'

export default function LiveFeatureUsageIndicator({...}) {
  const { isFocused, handleFocus, handleBlur, focusStyle } = useTVFocus({
    styleType: 'button',
    tvOnly: true
  })

  const [showDetails, setShowDetails] = useState(false)

  return (
    <TouchableOpacity
      focusable={Platform.isTV}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onPress={() => setShowDetails(!showDetails)}
      style={styles.container}
    >
      <View style={[styles.badge, isFocused && focusStyle, ...]}>
        <Clock size={Platform.isTV ? 20 : 12} color={...} />
        <Text style={[
          styles.usageText,
          Platform.isTV && styles.usageTextTV // 18-22px
        ]}>
          {currentUsage.toFixed(1)} / {totalAvailable.toFixed(0)} min
        </Text>
      </View>

      {/* Details Modal on tvOS when pressed */}
      {Platform.isTV && showDetails && (
        <GlassModal visible={showDetails} onClose={() => setShowDetails(false)}>
          <UsageDetailsPanel usageStats={usageStats} />
        </GlassModal>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  // ...existing styles
  usageTextTV: {
    fontSize: 18, // 10-foot UI compliance
    fontWeight: '700',
  },
})
```

---

### 🔴 CRITICAL: Admin Forms - TextInput on tvOS

**Component**: `UserLiveQuotaPage`
**Issue**: Multiple TextInput fields for numeric quota editing - extremely poor UX on tvOS

**Current Implementation**:
```tsx
<TextInput
  style={styles.formInput}
  value={String(formData.subtitle_minutes_per_hour || 0)}
  onChangeText={(v) => setFormData({ ...formData, subtitle_minutes_per_hour: Number(v) })}
  keyboardType="numeric"
/>
```

**Problems**:
- ❌ **No native keyboard on tvOS** - typing with Siri Remote is painful
- ❌ 6+ numeric inputs - would take 10+ minutes to edit on Apple TV
- ❌ TextArea for notes - completely unusable with remote
- ❌ No picker-style numeric input (better for TV)
- ❌ Form layout not optimized for 10-foot UI

**Impact**:
- Admin quota management is **completely unusable on tvOS**
- Users would abandon the form due to input difficulty
- Does not meet Apple TV Human Interface Guidelines

**Recommendation**:
```tsx
// Option 1: Disable admin pages on tvOS
if (Platform.isTV) {
  return (
    <AdminLayout>
      <GlassCard style={styles.notAvailableCard}>
        <Text style={styles.notAvailableText}>
          {t('admin.tvNotAvailable', 'Admin features are best accessed on web or mobile.')}
        </Text>
        <GlassButton
          variant="primary"
          onPress={() => navigate('/')}
        >
          <Text>{t('common.backToHome', 'Back to Home')}</Text>
        </GlassButton>
      </GlassCard>
    </AdminLayout>
  )
}

// Option 2: Use GlassNumericStepper for tvOS
import { GlassNumericStepper } from '@bayit/glass'

<GlassNumericStepper
  label={t('admin.liveQuotas.perHour', 'Per Hour (min)')}
  value={formData.subtitle_minutes_per_hour || 0}
  onValueChange={(v) => setFormData({ ...formData, subtitle_minutes_per_hour: v })}
  min={0}
  max={1000}
  step={5}
  focusable={Platform.isTV}
/>
```

---

### 🟡 MODERATE: Analytics Table Navigation

**Component**: `LiveUsageAnalyticsPage`
**Issue**: Data table lacks proper focus navigation

**Current Implementation**:
```tsx
<View style={styles.table}>
  <View style={styles.tableHeader}>...</View>
  {topUsers.map((user, index) => (
    <View key={user.user_id} style={styles.tableRow}>
      <Text>...</Text>
    </View>
  ))}
</View>
```

**Problems**:
- ⚠️ Table rows are non-interactive Views - cannot be focused
- ⚠️ No way to select a row for details
- ⚠️ Long tables may be difficult to navigate with remote
- ⚠️ No indication of current row on tvOS

**Impact**:
- Read-only table is acceptable but sub-optimal
- Users cannot drill down into user details from table
- Poor spatial navigation experience

**Required Changes**:
```tsx
<FlatList
  data={topUsers}
  keyExtractor={(item) => item.user_id}
  renderItem={({ item, index }) => (
    <TouchableOpacity
      focusable={Platform.isTV}
      onPress={() => navigate(`/admin/users/${item.user_id}`)}
      style={styles.tableRow}
    >
      <UserTableRow user={item} />
    </TouchableOpacity>
  )}
  contentContainerStyle={styles.tableContainer}
/>
```

---

### 🟢 ACCEPTABLE: Backend API

**Files**: `backend/app/api/routes/admin/live_quotas.py`, `shared/services/adminApi.ts`

**Assessment**: ✅ Backend implementation is platform-agnostic and correctly designed.

**Strengths**:
- ✅ RESTful API design works across all platforms
- ✅ WebSocket support for real-time stats available
- ✅ Proper error handling and validation
- ✅ No platform-specific logic (correct approach)

**No Changes Required** - Backend is solid.

---

## 10-Foot UI Compliance Analysis

### Typography
| Component | Current Size | tvOS Minimum | Status |
|-----------|--------------|--------------|--------|
| Usage Badge Text | 11px | 18-22px | ❌ FAIL |
| Usage Rollover Text | 10px | 16-18px | ❌ FAIL |
| Table Headers | 12px | 16-18px | ❌ FAIL |
| Table Cell Text | 14px | 18-22px | ⚠️ MARGINAL |
| Card Titles | 18px | 20-24px | ✅ PASS |
| Page Title | 24px | 28-32px | ✅ PASS |

**Recommendation**: Add platform-specific font sizes for tvOS.

```tsx
const TEXT_SIZES = Platform.select({
  tv: {
    small: 16,
    medium: 18,
    large: 22,
    xlarge: 28,
  },
  default: {
    small: 12,
    medium: 14,
    large: 18,
    xlarge: 24,
  },
})
```

---

### Contrast Ratios
**Measured Against Dark Backgrounds**:

| Element | Current | WCAG AA (4.5:1) | Status |
|---------|---------|-----------------|--------|
| Primary Text (#fff) | 21:1 | ✅ Pass | ✅ PASS |
| Secondary Text (#9ca3af) | 4.9:1 | ✅ Pass | ✅ PASS |
| Warning Text (#f59e0b) | 9.2:1 | ✅ Pass | ✅ PASS |
| Error Text (#ef4444) | 7.1:1 | ✅ Pass | ✅ PASS |
| Success Text (#10b981) | 8.3:1 | ✅ Pass | ✅ PASS |

**Assessment**: ✅ Color contrast meets WCAG AA - Excellent for tvOS.

---

### Spacing & Touch Targets
| Component | Current Size | tvOS Minimum | Status |
|-----------|--------------|--------------|--------|
| Usage Badge Padding | 8x4px | 16x12px | ❌ FAIL |
| Button Padding | per GlassButton | 20x12px | ✅ PASS* |
| Table Row Height | ~48px | 60-80px | ⚠️ MARGINAL |
| Card Padding | 24px | 32-40px | ✅ PASS |

*Assuming GlassButton has proper tvOS sizing.

**Recommendation**: Add Platform-specific spacing tokens.

---

## Focus Navigation Analysis

### Current Focus Flow Issues

**LiveFeatureUsageIndicator Placement**:
```
┌─────────────────────────────────────────┐
│  [Usage Badge - NOT FOCUSABLE] ←─── ❌  │
│                                         │
│         Video Player Area               │
│                                         │
│  [Control 1] [Control 2] [Control 3]   │
└─────────────────────────────────────────┘
```

**Problem**: Badge sits above player controls but is not in focus tree. Users pressing UP from controls have nowhere to go.

**Required Focus Hierarchy**:
```
┌─────────────────────────────────────────┐
│  [Usage Badge - FOCUSABLE] ←─── ✅      │
│         ↑ UP                            │
│         ↓ DOWN                          │
│  [Control 1] [Control 2] [Control 3]   │
│    ← LEFT        RIGHT →                │
└─────────────────────────────────────────┘
```

**Solution**: Make badge focusable and position it in spatial navigation tree.

---

### Admin Page Focus Traps

**UserLiveQuotaPage - Form Editing Mode**:
- ❌ **6+ TextInput fields** create focus trap
- ❌ Moving between fields with remote is tedious
- ❌ Numeric keyboard entry extremely slow
- ❌ MultiLine TextArea (notes) essentially unusable

**LiveUsageAnalyticsPage - Table Navigation**:
- ⚠️ Non-focusable rows prevent interaction
- ⚠️ No visual feedback when "focused" (since not focusable)
- ⚠️ Vertical scrolling with remote can be imprecise

---

## Platform Detection & Conditional Rendering

### Current State
❌ **No platform-specific code in any quota components**

**Issue**: Components render identically on tvOS, web, and mobile, ignoring platform-specific UX requirements.

### Required Additions

```tsx
// At top of each component
import { Platform } from 'react-native'

const isTV = Platform.isTV || Platform.OS === 'tvos'

// In UserLiveQuotaPage
if (isTV) {
  return <AdminNotAvailableOnTV />
}

// In LiveFeatureUsageIndicator
const fontSize = Platform.select({
  tv: 18,
  default: 11,
})

// In LiveUsageAnalyticsPage
<TouchableOpacity focusable={isTV} ...>
  {/* Make interactive on TV */}
</TouchableOpacity>
```

---

## WebSocket Support for Real-Time Updates

### Assessment: ✅ EXCELLENT for tvOS

**Strengths**:
- ✅ WebSocket works natively on tvOS
- ✅ Real-time usage updates without polling
- ✅ Reduces network overhead (important for TV)
- ✅ Battery-friendly on tvOS (no constant HTTP requests)

**Recommendation**: Prioritize WebSocket implementation for live quota updates on tvOS.

---

## Remote Control Input Handling

### Siri Remote Button Mapping
| Button | Expected Action | Current Support |
|--------|-----------------|-----------------|
| **Play/Pause** | Play/pause video | ✅ Handled by VideoPlayer |
| **Menu** | Exit overlay, go back | ⚠️ May conflict with admin forms |
| **Directional Pad** | Navigate UI | ⚠️ Focus issues with badge |
| **Touch Surface** | Swipe/tap gestures | ✅ Should work if focusable |
| **Siri** | Voice commands | ❌ No voice-to-text for forms |

**Critical Issue**: TextInput fields do not support Siri dictation for input - another reason admin forms are unsuitable for tvOS.

---

## Recommendations Summary

### Immediate Actions (Required for Production)

1. **LiveFeatureUsageIndicator - Add Focus Support**
   - Make badge focusable with `TouchableOpacity`
   - Integrate `useTVFocus` hook
   - Add detail modal on press (tvOS only)
   - Increase font sizes for 10-foot UI
   - Add focus styling (scale, ring)

2. **Admin Pages - Platform Gate**
   - Add `Platform.isTV` check at top of `UserLiveQuotaPage`
   - Show "Not available on tvOS" message with deep link to web
   - Or implement GlassNumericStepper for tvOS input
   - Analytics page: Make table rows focusable/pressable

3. **Typography Updates**
   - Create platform-specific size tokens
   - Update all text components with `Platform.select()`
   - Ensure 18px minimum for body text on tvOS

### Nice-to-Have Enhancements

1. **Quota Details Modal**
   - Full-screen modal on tvOS showing detailed breakdown
   - Chart visualization of usage over time
   - Remaining quota with progress bars

2. **Voice Shortcuts**
   - "Hey Siri, show my quota usage"
   - Native iOS/tvOS SiriKit integration
   - Deep linking from Siri results

3. **Top Shelf Integration**
   - Show quota usage on Apple TV home screen
   - Update TopShelfProvider with quota data
   - See: `mobile-app/ios/BayitPlus/TopShelfProvider.swift`

---

## Code Examples - Required Changes

### 1. LiveFeatureUsageIndicator.tsx (Enhanced)

```tsx
import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native'
import { Clock, AlertCircle } from 'lucide-react'
import { colors, spacing } from '@bayit/shared/theme'
import { GlassModal, GlassCard } from '@bayit/shared/ui'
import { useTVFocus } from '@bayit/glass-components/hooks'

interface UsageStats {
  subtitle_usage_current_hour: number
  subtitle_minutes_per_hour: number
  accumulated_subtitle_minutes: number
  dubbing_usage_current_hour: number
  dubbing_minutes_per_hour: number
  accumulated_dubbing_minutes: number
  estimated_cost_current_month: number
  warning_threshold_percentage: number
}

interface LiveFeatureUsageIndicatorProps {
  featureType: 'subtitle' | 'dubbing'
  usageStats: UsageStats | null
  isVisible: boolean
}

export default function LiveFeatureUsageIndicator({
  featureType,
  usageStats,
  isVisible,
}: LiveFeatureUsageIndicatorProps) {
  const [showDetails, setShowDetails] = useState(false)
  const { isFocused, handleFocus, handleBlur, focusStyle } = useTVFocus({
    styleType: 'button',
    tvOnly: true,
  })

  if (!isVisible || !usageStats) return null

  const isTV = Platform.isTV || Platform.OS === 'tvos'
  const isSubtitle = featureType === 'subtitle'
  const currentUsage = isSubtitle
    ? usageStats.subtitle_usage_current_hour
    : usageStats.dubbing_usage_current_hour
  const limit = isSubtitle
    ? usageStats.subtitle_minutes_per_hour
    : usageStats.dubbing_minutes_per_hour

  const accumulated = isSubtitle
    ? usageStats.accumulated_subtitle_minutes
    : usageStats.accumulated_dubbing_minutes

  const totalAvailable = limit + accumulated
  const usagePercentage = totalAvailable > 0 ? (currentUsage / totalAvailable) * 100 : 0
  const isWarning = usagePercentage >= 80
  const isNearLimit = usagePercentage >= 95

  return (
    <>
      <TouchableOpacity
        style={styles.container}
        focusable={isTV}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onPress={() => isTV && setShowDetails(!showDetails)}
        accessible={true}
        accessibilityLabel={`${featureType} quota: ${currentUsage.toFixed(0)} of ${totalAvailable.toFixed(0)} minutes used`}
      >
        <View
          style={[
            styles.badge,
            isTV && styles.badgeTV,
            isWarning && styles.badgeWarning,
            isNearLimit && styles.badgeError,
            isFocused && focusStyle,
          ]}
        >
          <Clock size={isTV ? 20 : 12} color={isNearLimit ? colors.error : colors.textSecondary} />
          <Text style={[styles.usageText, isTV && styles.usageTextTV, isNearLimit && styles.usageTextError]}>
            {currentUsage.toFixed(1)} / {totalAvailable.toFixed(0)} min
          </Text>
          {accumulated > 0 && (
            <Text style={[styles.rolloverText, isTV && styles.rolloverTextTV]}>
              (+{accumulated.toFixed(0)} saved)
            </Text>
          )}
          {isWarning && (
            <AlertCircle size={isTV ? 20 : 12} color={isNearLimit ? colors.error : '#f59e0b'} />
          )}
        </View>
      </TouchableOpacity>

      {/* Details Modal - tvOS Only */}
      {isTV && (
        <GlassModal visible={showDetails} onClose={() => setShowDetails(false)}>
          <GlassCard style={styles.detailsCard}>
            <Text style={styles.detailsTitle}>
              {isSubtitle ? 'Live Subtitle' : 'Live Dubbing'} Quota
            </Text>
            <View style={styles.detailsRow}>
              <Text style={styles.detailsLabel}>Current Hour Usage:</Text>
              <Text style={styles.detailsValue}>{currentUsage.toFixed(1)} min</Text>
            </View>
            <View style={styles.detailsRow}>
              <Text style={styles.detailsLabel}>Hourly Limit:</Text>
              <Text style={styles.detailsValue}>{limit} min</Text>
            </View>
            <View style={styles.detailsRow}>
              <Text style={styles.detailsLabel}>Rollover Balance:</Text>
              <Text style={[styles.detailsValue, styles.successText]}>
                +{accumulated.toFixed(0)} min
              </Text>
            </View>
            <View style={styles.detailsRow}>
              <Text style={styles.detailsLabel}>Total Available:</Text>
              <Text style={[styles.detailsValue, styles.primaryText]}>{totalAvailable.toFixed(0)} min</Text>
            </View>
            <View style={styles.detailsRow}>
              <Text style={styles.detailsLabel}>Estimated Monthly Cost:</Text>
              <Text style={styles.detailsValue}>
                ${usageStats.estimated_cost_current_month.toFixed(2)}
              </Text>
            </View>
          </GlassCard>
        </GlassModal>
      )}
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    right: 16,
    zIndex: 50,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  badgeTV: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  badgeWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  badgeError: {
    backgroundColor: 'rgba(220, 38, 38, 0.15)',
    borderColor: 'rgba(220, 38, 38, 0.3)',
  },
  usageText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  usageTextTV: {
    fontSize: 18,
    fontWeight: '700',
  },
  usageTextError: {
    color: colors.error,
  },
  rolloverText: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '500',
    marginLeft: 2,
  },
  rolloverTextTV: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 4,
  },
  detailsCard: {
    padding: 32,
    gap: 20,
    minWidth: 600,
  },
  detailsTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailsLabel: {
    fontSize: 18,
    color: colors.textSecondary,
  },
  detailsValue: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  successText: {
    color: '#10b981',
  },
  primaryText: {
    color: colors.primary,
  },
})
```

### 2. UserLiveQuotaPage.tsx (Platform Gate)

Add at the top of the component:

```tsx
export default function UserLiveQuotaPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  // Platform check - Admin forms not suitable for tvOS
  if (Platform.isTV || Platform.OS === 'tvos') {
    return (
      <AdminLayout>
        <View style={styles.centerContainer}>
          <GlassCard style={styles.notAvailableCard}>
            <AlertCircle size={48} color={colors.warning} />
            <Text style={styles.notAvailableTitle}>
              {t('admin.tvNotAvailable', 'Not Available on Apple TV')}
            </Text>
            <Text style={styles.notAvailableMessage}>
              {t(
                'admin.tvNotAvailableMessage',
                'Admin quota management requires text input and is best accessed on web or mobile devices.'
              )}
            </Text>
            <View style={styles.notAvailableActions}>
              <GlassButton variant="primary" onPress={() => navigate('/')}>
                <Text style={styles.buttonText}>{t('common.backToHome', 'Back to Home')}</Text>
              </GlassButton>
            </View>
            <Text style={styles.notAvailableHint}>
              {t('admin.accessViaWeb', 'Access admin.bayitplus.com from your computer or mobile device.')}
            </Text>
          </GlassCard>
        </View>
      </AdminLayout>
    )
  }

  // ... rest of existing component
}

// Add to StyleSheet
const additionalStyles = StyleSheet.create({
  notAvailableCard: {
    padding: 40,
    gap: 24,
    alignItems: 'center',
    maxWidth: 600,
  },
  notAvailableTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
  },
  notAvailableMessage: {
    fontSize: 18,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 28,
  },
  notAvailableActions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
  },
  notAvailableHint: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
})
```

---

## Testing Checklist

### tvOS Simulator Testing Required

- [ ] **LiveFeatureUsageIndicator**
  - [ ] Badge is focusable with Siri Remote
  - [ ] Focus ring appears correctly
  - [ ] Pressing badge shows details modal
  - [ ] Text size readable from 10 feet
  - [ ] Colors/contrast meet WCAG AA
  - [ ] No focus traps when navigating from player controls

- [ ] **UserLiveQuotaPage**
  - [ ] Platform gate shows "Not Available" screen
  - [ ] "Back to Home" button is focusable
  - [ ] Message is readable and centered
  - [ ] Navigation back to home works

- [ ] **LiveUsageAnalyticsPage**
  - [ ] Page loads without errors
  - [ ] Stats cards are readable
  - [ ] Table rows are focusable (if made interactive)
  - [ ] Scrolling with remote works smoothly
  - [ ] No horizontal scrolling required

### Physical Apple TV Testing (Recommended)

- [ ] Test on actual Apple TV 4K device
- [ ] Verify Siri Remote gestures work correctly
- [ ] Check performance with real network latency
- [ ] Verify WebSocket connections stable
- [ ] Test with multiple users/high usage

---

## Final Verdict

### Status: ⚠️ **CHANGES REQUIRED**

**Summary**:
The Live Quotas implementation is functionally sound but **fails tvOS compatibility requirements** in several critical areas. The admin forms are fundamentally unsuitable for tvOS (text input limitations), and the usage indicator lacks proper focus support.

**Blocking Issues**:
1. ❌ LiveFeatureUsageIndicator not focusable - Critical for tvOS UX
2. ❌ Admin forms use TextInput - Unusable on tvOS
3. ⚠️ Font sizes too small for 10-foot viewing
4. ⚠️ No platform-specific styling or behavior

**Required Before Production**:
1. Add focus support to LiveFeatureUsageIndicator
2. Platform-gate admin pages on tvOS OR implement alternative input methods
3. Increase font sizes for tvOS (18px minimum body text)
4. Add tvOS testing to CI/CD pipeline

**Estimated Effort**:
- LiveFeatureUsageIndicator enhancements: **4-6 hours**
- Admin page platform gating: **2-3 hours**
- Typography updates: **3-4 hours**
- Testing on tvOS Simulator: **2-3 hours**

**Total**: ~11-16 hours of development + testing

---

## Approval

- ⚠️ **CHANGES REQUIRED** for tvOS production readiness
- ✅ Backend API approved (platform-agnostic)
- ⚠️ Frontend components need tvOS-specific enhancements
- ❌ Admin forms NOT APPROVED for tvOS (must be gated)

**Signed**: iOS Developer / tvOS Expert
**Date**: 2026-01-23

---

## References

- Apple TV Human Interface Guidelines: https://developer.apple.com/design/human-interface-guidelines/tvos
- React Native tvOS Documentation: https://reactnative.dev/docs/building-for-tv
- Bayit+ Glass Components: `/packages/ui/glass-components/`
- Focus Navigation Manager: `/mobile-app/ios/BayitPlus/FocusNavigationManager.swift`
- Siri Remote Manager: `/mobile-app/ios/BayitPlus/SiriRemoteManager.swift`
