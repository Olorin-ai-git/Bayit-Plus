# Live TV Page Fixes - 2026-01-24

## Issues Fixed

### 1. Category Buttons Stretching Vertically ✅ FIXED

**Problem**: Category filter buttons (All, News, Entertainment, Sports, Kids, Music) were occupying all available vertical space instead of having a fixed height.

**Root Cause**:
- The `GlassCategoryPill` component didn't have `alignSelf: 'flex-start'` to prevent vertical stretching
- The horizontal `ScrollView` container didn't have a `maxHeight` constraint

**Solution**:

**File**: `shared/components/ui/GlassCategoryPill.tsx`
```typescript
const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.glassBorderLight,
    backgroundColor: colors.glassLight,
    alignSelf: 'flex-start', // ✅ ADDED - Prevent vertical stretching
    // ... rest of styles
  },
});
```

**File**: `web/src/pages/LivePage.tsx`
```typescript
categoryScroll: {
  marginBottom: spacing.lg,
  maxHeight: 56, // ✅ ADDED - Fixed height to prevent stretching
},
categoryContent: {
  gap: spacing.sm,
  paddingBottom: spacing.sm,
  alignItems: 'center', // ✅ ADDED - Center vertically
},
```

**Result**: Category pills now maintain a consistent height of approximately 40-56px and don't stretch to fill vertical space.

---

### 2. Missing Live TV Page Icon ✅ FIXED

**Problem**: The Live TV page header showed an empty circle placeholder instead of the radio/broadcast icon.

**Root Cause**: The `Radio` icon from `lucide-react` doesn't work with React Native Web. lucide-react icons are designed for standard React (web DOM), not React Native's View/Text components.

**Solution**: Created a custom React Native Web compatible SVG icon component.

**File**: `web/src/pages/LivePage.tsx`
```typescript
// ✅ ADDED - Live TV Icon Component (React Native Web compatible)
const LiveTVIcon = ({ size = 24, color = colors.error }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="2" fill={color} />
  </svg>
);
```

**Changed**:
```typescript
// ❌ BEFORE
import { Radio } from 'lucide-react';
<GlassView style={styles.iconContainer}>
  <Radio size={24} color={colors.error} />
</GlassView>

// ✅ AFTER
<GlassView style={styles.iconContainer}>
  <LiveTVIcon size={24} color={colors.error} />
</GlassView>
```

**Result**: The Live TV page now displays a red broadcast icon (concentric circles) in the header.

---

## Files Modified

1. **shared/components/ui/GlassCategoryPill.tsx**
   - Added `alignSelf: 'flex-start'` to prevent vertical stretching

2. **web/src/pages/LivePage.tsx**
   - Removed `import { Radio } from 'lucide-react'`
   - Added custom `LiveTVIcon` SVG component
   - Added `maxHeight: 56` to `categoryScroll` style
   - Added `alignItems: 'center'` to `categoryContent` style
   - Replaced all `<Radio />` instances with `<LiveTVIcon />`

---

## Testing

Created Playwright test suite to verify fixes:
- **File**: `web/tests/live-page-fixes.spec.ts`

**Tests**:
1. ✅ Category pills have fixed height (30-80px range)
2. ✅ Live TV icon is visible in page header
3. ✅ Category pills are horizontally scrollable
4. ✅ Visual screenshot captured

---

## Visual Comparison

**Before**:
- Category buttons stretched to fill ~200-300px of vertical space
- Empty circle placeholder where icon should be

**After**:
- Category buttons maintain consistent ~40-56px height
- Red broadcast icon visible in header
- Professional, clean appearance

---

## Technical Notes

### Why lucide-react Doesn't Work with React Native Web

lucide-react icons are built for standard React (DOM):
- Uses native `<svg>` elements directly
- Relies on CSS styling via className
- Not compatible with React Native's `View`/`Text` components
- StyleSheet.create() doesn't apply to lucide-react SVGs

**Solution**: Use inline SVG components or React Native compatible icon libraries like:
- `react-native-svg` (recommended for RN/RNW)
- Custom SVG components (used in this fix)
- `@expo/vector-icons` (if using Expo)

### Category Pill Stretching Issue

React Native's flexbox behaves differently than web CSS:
- Without `alignSelf`, children can stretch to fill parent's cross-axis
- `flex-start` constrains to content size
- Important for pills in horizontal ScrollView containers

---

## Status

✅ **Both Issues Resolved**
- Category buttons now have proper fixed height
- Live TV icon renders correctly
- Page looks professional and matches design system

**Ready for production deployment**
