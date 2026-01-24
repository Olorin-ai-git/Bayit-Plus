---
name: glass-ux-design
description: Glassmorphic dark-mode UI design system using React Native StyleSheet. Use this skill when building any UI components, dashboards, applications, or interfaces. Enforces dark mode, glassmorphism effects, animated sidebars, modals, draggable splitters, and custom components. Never use native browser components. Always import the Glass component library.
---

# Glass UX Design System

Build all interfaces with this glassmorphic dark-mode design system. **Always use components from `assets/glass-components.jsx`** as the foundation.

## Core Principles

1. **Dark mode only** - All backgrounds use dark grays/blacks (`#111827`, `#0f172a`, `#18181b`)
2. **Glassmorphism everywhere** - Frosted glass effects on all containers, cards, modals, sidebars
3. **StyleSheet only for React Native** - Use `StyleSheet.create()` for all styling, no inline styles, no CSS files, no styled-components
4. **No native components** - Replace all native form elements with custom Glass variants
5. **Animation required** - All interactive elements must animate using React Native's Animated API

## Glass Effect Recipe

Apply to all containers, cards, panels:
```jsx
import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  glassContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
  },
});

<View style={styles.glassContainer}>
  {/* Content */}
</View>
```

Pressed states (use Pressable):
```jsx
<Pressable
  style={({ pressed }) => [
    styles.glassContainer,
    pressed && styles.glassContainerPressed
  ]}
>
  {/* Content */}
</Pressable>

const styles = StyleSheet.create({
  glassContainerPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
});
```

## Required Components

### GlassSidebar
- Collapsible with smooth width animation
- Semi-transparent with blur
- Icon + text navigation items
- Active state with glow effect

### GlassModal  
- Backdrop blur on overlay
- Scale + fade entrance animation
- Frosted glass container
- Close on backdrop click

### GlassSplitter
- Draggable divider between panels
- Cursor feedback on hover/drag
- Smooth resize with requestAnimationFrame
- Min/max width constraints

### GlassInput / GlassSelect / GlassButton
- Replace ALL native form elements
- Consistent glass styling
- Focus rings with glow
- Smooth transitions

## Implementation Steps

1. Copy components from `assets/glass-components.jsx` into project
2. Import required components and React Native modules
3. Create StyleSheet with dark background: `backgroundColor: '#0f172a'`
4. Build layouts using Glass components exclusively with StyleSheet.create()
5. Use React Native's Animated API for all animations

## Animation Patterns

```jsx
import { Animated } from 'react-native';

// Fade in animation
const fadeAnim = useRef(new Animated.Value(0)).current;

useEffect(() => {
  Animated.timing(fadeAnim, {
    toValue: 1,
    duration: 300,
    useNativeDriver: true,
  }).start();
}, []);

<Animated.View style={{ opacity: fadeAnim }}>
  {/* Content */}
</Animated.View>

// Scale on press
const scaleAnim = useRef(new Animated.Value(1)).current;

const handlePressIn = () => {
  Animated.spring(scaleAnim, {
    toValue: 0.95,
    useNativeDriver: true,
  }).start();
};

const handlePressOut = () => {
  Animated.spring(scaleAnim, {
    toValue: 1,
    useNativeDriver: true,
  }).start();
};

<Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
  {/* Content */}
</Animated.View>

// Slide from left (sidebar)
const slideAnim = useRef(new Animated.Value(-300)).current;

Animated.timing(slideAnim, {
  toValue: 0,
  duration: 300,
  useNativeDriver: true,
}).start();

<Animated.View style={{ transform: [{ translateX: slideAnim }] }}>
  {/* Sidebar */}
</Animated.View>
```

## Color Palette

| Purpose | Value | StyleSheet |
|---------|-------|------------|
| Background | Dark gray/black | `backgroundColor: '#0f172a'` or `'#111827'` |
| Glass surface | Semi-transparent white | `backgroundColor: 'rgba(255, 255, 255, 0.05)'` to `'rgba(255, 255, 255, 0.1)'` |
| Border | Semi-transparent white | `borderColor: 'rgba(255, 255, 255, 0.1)'` to `'rgba(255, 255, 255, 0.2)'` |
| Text primary | White | `color: '#ffffff'` |
| Text secondary | Gray | `color: '#9ca3af'` |
| Accent | Blue or Purple | `color: '#60a5fa'` or `'#c084fc'` |
| Shadow | Black with opacity | `shadowColor: '#000', shadowOpacity: 0.5` |

## Example Structure

```jsx
import { View, StyleSheet } from 'react-native';

<View style={styles.container}>
  <GlassSidebar />
  <GlassSplitter />
  <View style={styles.main}>
    <GlassCard>
      <GlassInput placeholder="Search..." />
      <GlassButton>Submit</GlassButton>
    </GlassCard>
  </View>
  <GlassModal isOpen={open} onClose={() => setOpen(false)}>
    Modal content
  </GlassModal>
</View>

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    minHeight: '100%',
  },
  main: {
    flex: 1,
    padding: 24,
  },
});
```
