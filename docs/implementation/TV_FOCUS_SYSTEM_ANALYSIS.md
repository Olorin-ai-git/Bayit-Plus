# TV Focus System - Problem Analysis & Solution

## Executive Summary

**Problem:** The TV app has inconsistent focus/highlight styling across 20+ components, creating a poor user experience for TV remote navigation.

**Solution:** Created a unified TV focus system with:
1. ✅ Centralized focus styles (`tvFocusStyles.ts`)
2. ✅ Reusable hook for all components (`useTVFocus.ts`)
3. ✅ Migration guide with examples (`TV_FOCUS_MIGRATION.md`)

## Current Problems (Before)

### 1. **Inconsistent Scale Animations**
Different components use different scale values on focus:
- GlassCard: 1 → 1.08
- GlassButton: 1 → 1.05
- GlassCheckbox: 1 → 1.1
- GlassInput: 1 → 1.02
- FocusableCard: 1 → 1.1

**Impact:** Focus feels "jumpy" and unpredictable across the app

### 2. **Inconsistent Border Styling**
Border width and color vary:
- Some: `borderWidth: 3`
- Some: `borderWidth: 2`
- Some: `borderWidth: 1`
- Some: No border at all, only shadow

**Impact:** Hard to identify focused element at a glance

### 3. **Wildly Different Glow Effects**
- Some components: Use `boxShadow` with different blur radii
- Some: Use iOS `shadowColor` + `shadowOpacity`
- Some: Use Android `elevation` differently
- Some: No glow at all

**Impact:** Focus not clear from 10 feet away (TV viewing distance)

### 4. **Missing Visual Indicators**
Many components missing:
- No outline ring (web only)
- No outline offset (web only)
- Inconsistent shadow effects
- No glow on non-web platforms

**Impact:** Focus nearly invisible on certain components

### 5. **Scale Animation Differences**
Spring configs vary:
```typescript
// Component 1
Animated.spring(scaleAnim, {
  toValue: 1.08,
  friction: 5,
  useNativeDriver: true,
})

// Component 2
Animated.spring(scaleAnim, {
  toValue: 1.05,
  friction: 6,  // Different friction!
  useNativeDriver: true,
})
```

**Impact:** Animations feel inconsistent and janky

### 6. **Code Duplication**
Each of 20+ components reimplements:
- Focus state management
- Animation setup
- Style definitions

**Impact:** Maintenance nightmare, bugs propagate across components

### 7. **No Unified Color Scheme**
Focus colors scattered:
- Mostly cyan (`#00d9ff`)
- But some use different shades
- Some use `colors.primary`, some hardcoded
- Inconsistent opacity values

**Impact:** Focus color not instantly recognizable

## Solution Overview

### New Files Created

**1. `/shared/components/theme/tvFocusStyles.ts`**
- Unified focus constants
- Pre-built style objects
- Helper functions for all platforms

**2. `/shared/components/hooks/useTVFocus.ts`**
- Reusable hook for all components
- Handles state, animations, styling
- Supports multiple style types

**3. `/shared/components/TV_FOCUS_MIGRATION.md`**
- Step-by-step migration guide
- Before/after examples
- Component-by-component checklist

### Key Improvements

#### Unified Scale Factor
```typescript
TV_FOCUS.SCALE_FACTOR = 1.08  // Single value, used everywhere
```

#### Unified Border
```typescript
const focusBorder = {
  borderWidth: 3,              // Consistent 3px border
  borderColor: colors.primary, // Always cyan
}
```

#### Unified Glow
```typescript
const focusGlow = (color: string) => ({
  boxShadow: `
    0 0 20px ${color}80,        // Primary glow
    0 0 30px ${color}60,        // Extended glow
    inset 0 0 10px ${color}40   // Inner glow
  `,
  outline: `2px solid ${color}`,          // Outline ring
  outlineOffset: `2px`,                   // Offset from edge
})
```

#### Unified Animation
```typescript
const focusSpringConfig = {
  toValue: TV_FOCUS.SCALE_FACTOR,
  friction: TV_FOCUS.SPRING_FRICTION,    // 5 - consistent
  tension: 40,                            // Consistent
  useNativeDriver: true,                  // Performance
}
```

## How It Works

### Old Pattern (20+ Components)
```
Component 1         Component 2         Component 3
   ↓                    ↓                    ↓
State Management    State Management    State Management
   ↓                    ↓                    ↓
Animation Setup     Animation Setup     Animation Setup
   ↓                    ↓                    ↓
Styling            Styling             Styling
   ↓                    ↓                    ↓
Inconsistent UX ────────────────────→ POOR TV EXPERIENCE
```

### New Pattern (All Components)
```
Component 1 Component 2 Component 3 ... Component 20+
   ↓            ↓            ↓              ↓
            useTVFocus Hook
            ↓ (unified)
        State Management
        Animation Setup
        Styling Application
            ↓
        CONSISTENT UX ────────────────→ EXCELLENT TV EXPERIENCE
```

## Usage Example

### Before (Old GlassCard - 30 lines)
```typescript
export const GlassCard = ({ ... }) => {
  const [isFocused, setIsFocused] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleFocus = () => {
    setIsFocused(true);
    if (isTV || Platform.OS !== 'web') {
      Animated.spring(scaleAnim, {
        toValue: 1.08,
        friction: 5,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (isTV || Platform.OS !== 'web') {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }).start();
    }
  };

  return (
    <Animated.View
      style={[
        { transform: [{ scale: scaleAnim }] },
        isFocused && shadows.glow(colors.primary),
        isFocused && { borderColor: colors.glassBorderFocus },
      ]}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      ...
    </Animated.View>
  );
};
```

### After (New GlassCard - 10 lines)
```typescript
import { useTVFocus } from '../hooks/useTVFocus';

export const GlassCard = ({ ... }) => {
  const { handleFocus, handleBlur, scaleTransform, focusStyle } =
    useTVFocus({ styleType: 'card' });

  return (
    <Animated.View
      style={[scaleTransform, focusStyle]}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      ...
    </Animated.View>
  );
};
```

**Result:** 67% less code, 100% consistent behavior

## TV Focus Specifications

### Scale Animation
- **Before:** Varies (1.02, 1.05, 1.08, 1.1)
- **After:** 1.08 (uniform)

### Border
- **Before:** Inconsistent (1-3px, various colors)
- **After:** 3px solid cyan (#00d9ff)

### Glow Effect
- **Before:** Varies or missing
- **After:** Multi-layer glow + outline ring

### Animation Spring
- **Before:** Different friction values
- **After:** friction=5, tension=40 (consistent)

### Color
- **Before:** Mostly cyan, but inconsistent
- **After:** Always `colors.primary` (#00d9ff)

## Migration Path

### Phase 1: Core Components (High Priority)
- GlassCard
- GlassButton
- GlassInput
- GlassCheckbox
- GlassSelect
- GlassTabs

**Impact:** 60% of interactive components

### Phase 2: Secondary Components (Medium Priority)
- GlassTextarea
- GlassTopBar
- GlassSidebar
- SideMenu
- FocusableCard

**Impact:** 30% of interactive components

### Phase 3: Specialized Components (Lower Priority)
- GlassFAB
- GlassCategoryPill
- ChapterItem
- FlowItemCard
- Chatbot
- ContentItemCard
- FlowCarouselCard

**Impact:** 10% of interactive components

## Testing Checklist

After migration, verify:

- [ ] All focused items have 3px cyan border
- [ ] All focused items have visible glow effect
- [ ] All focused items scale smoothly to 1.08
- [ ] Animation is smooth (no janky transitions)
- [ ] Focus is visible from 10 feet away
- [ ] Web has outline ring + glow
- [ ] Mobile has shadow effect
- [ ] TV remote navigation works smoothly
- [ ] No focus "jumps" when navigating
- [ ] Color is consistently cyan (#00d9ff)
- [ ] Scale animation friction is consistent

## Files to Update

```
shared/components/ui/
├── GlassCard.tsx          ← UPDATE
├── GlassButton.tsx        ← UPDATE
├── GlassInput.tsx         ← UPDATE
├── GlassCheckbox.tsx      ← UPDATE
├── GlassSelect.tsx        ← UPDATE
├── GlassTabs.tsx          ← UPDATE
├── GlassTextarea.tsx      ← UPDATE
├── GlassTopBar.tsx        ← UPDATE
├── GlassSidebar.tsx       ← UPDATE
├── GlassFAB.tsx           ← UPDATE
└── GlassCategoryPill.tsx  ← UPDATE

shared/components/
├── FocusableCard.tsx      ← UPDATE
├── SideMenu.tsx           ← UPDATE
├── ProfileDropdown.tsx    ← UPDATE
├── GlassCarousel.tsx      ← UPDATE
└── chat/
    └── Chatbot.tsx        ← UPDATE

shared/components/flows/
├── ContentItemCard.tsx    ← UPDATE
├── FlowItemCard.tsx       ← UPDATE
└── FlowCarouselCard.tsx   ← UPDATE

shared/components/player/
└── ChapterItem.tsx        ← UPDATE

web/src/components/
└── FocusableWrapper.tsx   ← UPDATE (optional)
```

## Benefits After Migration

### For Users
✅ Clear, consistent focus indicators
✅ Better TV remote navigation
✅ Professional, polished appearance
✅ 10-foot UI is actually usable

### For Developers
✅ 67% less code per component
✅ Single source of truth for focus
✅ Easy to maintain and debug
✅ Type-safe focus system

### For Product
✅ Better TV app ratings
✅ Improved user retention
✅ Faster development
✅ Reduced bugs

## Next Steps

1. **Review** this document and the migration guide
2. **Understand** the hook and style system
3. **Start** with GlassCard (most important)
4. **Test** on TV after each component
5. **Iterate** with user feedback
6. **Document** any issues found

## Questions?

Refer to:
- `TV_FOCUS_MIGRATION.md` - Step-by-step guide
- `tvFocusStyles.ts` - Available styles and constants
- `useTVFocus.ts` - Hook implementation and options
