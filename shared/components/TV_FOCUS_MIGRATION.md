# TV Focus System - Migration Guide

This guide explains the new unified TV focus system and how to migrate components to use it for a consistent TV experience.

## Overview

The TV focus system provides:
- ✅ **Unified styling** - Same look and feel across all components
- ✅ **Consistent animations** - Scale, glow, borders applied uniformly
- ✅ **Better UX** - Clear, prominent focus indicators for 10-foot UI
- ✅ **Code reuse** - Centralized styles and hooks reduce duplication

## Key Files

### 1. **tvFocusStyles.ts**
`/shared/components/theme/tvFocusStyles.ts`

Provides:
- `TV_FOCUS` constants (scale, border, glow settings)
- `focusBorder`, `focusGlow`, `focusShadow` helpers
- `cardFocusedStyle`, `buttonFocusedStyle`, `inputFocusedStyle` ready-to-use styles
- `webOutlineStyle` for extra web focus visibility

### 2. **useTVFocus Hook**
`/shared/components/hooks/useTVFocus.ts`

Provides:
- Unified focus state management
- Animation handling
- Style application based on component type
- Options for custom callbacks

## Migration Steps

### Before (Old Pattern)

```typescript
import { useState } from 'react';
import { Animated, View } from 'react-native';

export const OldCard = () => {
  const [isFocused, setIsFocused] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleFocus = () => {
    setIsFocused(true);
    Animated.spring(scaleAnim, {
      toValue: 1.08,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={[
        { transform: [{ scale: scaleAnim }] },
        isFocused && {
          borderWidth: 3,
          borderColor: '#00d9ff',
          boxShadow: '0 0 20px rgba(0, 217, 255, 0.3)',
        },
      ]}
      onFocus={handleFocus}
      onBlur={handleBlur}
    />
  );
};
```

### After (New Unified Pattern)

```typescript
import { Animated, View } from 'react-native';
import { useTVFocus } from '../hooks/useTVFocus';

export const NewCard = () => {
  const { isFocused, handleFocus, handleBlur, scaleTransform, focusStyle } =
    useTVFocus({ styleType: 'card' });

  return (
    <Animated.View
      style={[scaleTransform, focusStyle]}
      onFocus={handleFocus}
      onBlur={handleBlur}
    />
  );
};
```

## Migration Checklist

Components to migrate (in priority order):

### High Priority (Core Components)
- [ ] `GlassCard.tsx` - PRIMARY CARD COMPONENT
- [ ] `GlassButton.tsx` - PRIMARY BUTTON COMPONENT
- [ ] `GlassInput.tsx` - PRIMARY INPUT COMPONENT
- [ ] `GlassCheckbox.tsx`
- [ ] `GlassSelect.tsx`
- [ ] `GlassTabs.tsx`

### Medium Priority (Secondary Components)
- [ ] `GlassTextarea.tsx`
- [ ] `GlassTopBar.tsx`
- [ ] `GlassSidebar.tsx`
- [ ] `SideMenu.tsx`
- [ ] `FocusableCard.tsx`

### Lower Priority (Specialized Components)
- [ ] `GlassFAB.tsx`
- [ ] `GlassCategoryPill.tsx`
- [ ] `ChapterItem.tsx`
- [ ] `FlowItemCard.tsx`
- [ ] `Chatbot.tsx`
- [ ] `ContentItemCard.tsx`
- [ ] `FlowCarouselCard.tsx`

## Migration Pattern By Component Type

### Pattern 1: Simple Card Component

**Before:**
```typescript
const [isFocused, setIsFocused] = useState(false);
const scaleAnim = useRef(new Animated.Value(1)).current;

const handleFocus = () => {
  setIsFocused(true);
  Animated.spring(scaleAnim, { toValue: 1.08, ... }).start();
};

const handleBlur = () => {
  setIsFocused(false);
  Animated.spring(scaleAnim, { toValue: 1, ... }).start();
};

<Animated.View
  style={[
    { transform: [{ scale: scaleAnim }] },
    isFocused && styles.cardFocused,
  ]}
  onFocus={handleFocus}
  onBlur={handleBlur}
/>
```

**After:**
```typescript
const { handleFocus, handleBlur, scaleTransform, focusStyle } =
  useTVFocus({ styleType: 'card' });

<Animated.View
  style={[scaleTransform, focusStyle]}
  onFocus={handleFocus}
  onBlur={handleBlur}
/>
```

### Pattern 2: Button Component

**Before:**
```typescript
const [isFocused, setIsFocused] = useState(false);

const handleFocus = () => {
  setIsFocused(true);
  // ... animation
};

<TouchableOpacity
  style={[
    styles.button,
    isFocused && styles.buttonFocused,
  ]}
  onFocus={handleFocus}
  onBlur={handleBlur}
/>
```

**After:**
```typescript
const { handleFocus, handleBlur, focusStyle } =
  useTVFocus({ styleType: 'button' });

<TouchableOpacity
  style={[styles.button, focusStyle]}
  onFocus={handleFocus}
  onBlur={handleBlur}
/>
```

### Pattern 3: Input Component

**Before:**
```typescript
const [isFocused, setIsFocused] = useState(false);

const handleFocus = () => {
  setIsFocused(true);
  // ... styling
};

<TextInput
  style={[
    styles.input,
    isFocused && {
      borderColor: colors.primary,
      borderWidth: 2,
    },
  ]}
  onFocus={handleFocus}
  onBlur={handleBlur}
/>
```

**After:**
```typescript
const { handleFocus, handleBlur, focusStyle } =
  useTVFocus({ styleType: 'input' });

<TextInput
  style={[styles.input, focusStyle]}
  onFocus={handleFocus}
  onBlur={handleBlur}
/>
```

## Focus Style Types

```typescript
type FocusStyleType = 'card' | 'button' | 'input' | 'outline' | 'none';
```

- **'card'**: For card components - border + glow
- **'button'**: For buttons - border + glow
- **'input'**: For text inputs - subtle border glow
- **'outline'**: For web outline styling - prominent outline ring
- **'none'**: No focus styling applied

## Hook Options

```typescript
const { ... } = useTVFocus({
  styleType: 'card',        // Type of styling ('card', 'button', etc.)
  animated: true,            // Enable scale animations
  onFocus: () => {},         // Custom focus callback
  onBlur: () => {},          // Custom blur callback
  tvOnly: false,             // Only apply on TV
});
```

## Key Constants (tvFocusStyles.ts)

```typescript
TV_FOCUS = {
  SCALE_FACTOR: 1.08,        // How much to scale on focus
  BORDER_WIDTH: 3,           // Border thickness when focused
  BORDER_COLOR: cyan,        // Focus color (#00d9ff)
  GLOW_RADIUS: 20,           // Glow shadow blur radius
  OUTLINE_WIDTH: 2,          // Outline thickness (web)
  OUTLINE_OFFSET: 2,         // Outline offset from border
  ANIMATION_DURATION: 150,   // Animation time in ms
  SPRING_FRICTION: 5,        // Spring animation friction
}
```

## Return Values from Hook

```typescript
const {
  isFocused,      // boolean - whether component has focus
  handleFocus,    // () => void - call on onFocus
  handleBlur,     // () => void - call on onBlur
  scaleAnim,      // Animated.Value - raw animation value
  focusStyle,     // object - ready-to-apply focus styles
  scaleTransform, // { transform: [...] } - for Animated.View
} = useTVFocus();
```

## Examples

### Example 1: Simple Card

```typescript
import { Animated, View } from 'react-native';
import { useTVFocus } from '../hooks/useTVFocus';
import styles from './Card.styles';

export const Card = ({ title, onPress }) => {
  const { handleFocus, handleBlur, scaleTransform, focusStyle } =
    useTVFocus({ styleType: 'card' });

  return (
    <Animated.View
      style={[styles.container, scaleTransform, focusStyle]}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onPress={onPress}
    >
      <Text>{title}</Text>
    </Animated.View>
  );
};
```

### Example 2: Button with Custom Callback

```typescript
import { TouchableOpacity } from 'react-native';
import { useTVFocus } from '../hooks/useTVFocus';

export const Button = ({ title, onPress }) => {
  const { handleFocus, handleBlur, focusStyle } = useTVFocus({
    styleType: 'button',
    onFocus: () => console.log('Button focused'),
    onBlur: () => console.log('Button blurred'),
  });

  return (
    <TouchableOpacity
      style={[styles.button, focusStyle]}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onPress={onPress}
    >
      <Text>{title}</Text>
    </TouchableOpacity>
  );
};
```

### Example 3: Input with TV-Only Focus

```typescript
import { TextInput } from 'react-native';
import { useTVFocus } from '../hooks/useTVFocus';

export const Input = (props) => {
  const { handleFocus, handleBlur, focusStyle } = useTVFocus({
    styleType: 'input',
    tvOnly: true,  // Only apply on TV
  });

  return (
    <TextInput
      style={[styles.input, focusStyle]}
      onFocus={handleFocus}
      onBlur={handleBlur}
      {...props}
    />
  );
};
```

## Testing Focus on TV/Web

### For Web Development
```typescript
// Add focus styles in CSS for testing
element:focus {
  border: 3px solid #00d9ff;
  box-shadow: 0 0 20px rgba(0, 217, 255, 0.6);
  outline: 2px solid #00d9ff;
  outline-offset: 2px;
}
```

### For TV Testing
- Use remote arrow keys to navigate
- Should see smooth scale animation + glow effect
- Focus should be clearly visible from 10 feet away

## Common Issues & Solutions

### Issue: Focus not showing on TV

**Solution:** Ensure component has `onFocus` and `onBlur` handlers:
```typescript
const { handleFocus, handleBlur } = useTVFocus();

// ✅ Correct
<View onFocus={handleFocus} onBlur={handleBlur} />

// ❌ Wrong - no handlers
<View />
```

### Issue: Inconsistent animations

**Solution:** Use the hook instead of custom animations:
```typescript
// ✅ Correct - uses unified hook
const { scaleTransform } = useTVFocus();

// ❌ Wrong - custom animation with different values
const scale = useRef(new Animated.Value(1));
Animated.spring(scale, { toValue: 1.05 }); // Different scale value
```

### Issue: Different focus colors per component

**Solution:** Always use `colors.primary` from hook:
```typescript
// ✅ Correct - uses TV_FOCUS colors
const { focusStyle } = useTVFocus({ styleType: 'card' });

// ❌ Wrong - custom color
const customStyle = {
  borderColor: '#ff0000',  // Wrong color for TV focus
};
```

## Performance Considerations

- Hook creates minimal overhead
- Animations use `useNativeDriver: true` for performance
- No re-renders on every focus event
- Memoized spring configs avoid recreation

## Accessibility

The unified system ensures:
- Clear, high-contrast focus indicators
- Prominent outlines for keyboard navigation
- Scale feedback for visual confirmation
- Works with spatial navigation library

## Future Enhancements

Planned improvements:
- [ ] Focus pulse animation option
- [ ] Custom focus glow colors per component
- [ ] Focus sound effects on TV
- [ ] Focus history/breadcrumb for navigation
- [ ] Theme variations (light/dark focus)
