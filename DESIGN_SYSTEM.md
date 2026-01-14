# Bayit+ Design System
## Unified Purple/Black Glassmorphic Theme

**Version:** 2.0  
**Last Updated:** January 14, 2026

---

## 🎨 Design Philosophy

Bayit+ uses a **unified glassmorphic design system** based on purple and black colors. The design creates a premium, modern feel with:

- **Purple as the primary brand color** - Sophisticated and memorable
- **Pure black backgrounds** - Maximum contrast and OLED-friendly
- **Glassmorphic effects** - Depth and visual hierarchy through transparency
- **Consistent spacing and typography** - Harmonious across all platforms

---

## 🌈 Color Palette

### Primary Colors (Purple)

```typescript
primary: {
  50:  '#faf5ff'  // Lightest tint
  100: '#f3e8ff'
  200: '#e9d5ff'
  300: '#d8b4fe'  // Light purple (primaryLighter)
  400: '#c084fc'  // Medium purple (primaryLight)
  500: '#a855f7'  // ⭐ Main brand purple (DEFAULT)
  600: '#9333ea'
  700: '#7e22ce'  // Dark purple (primaryDark)
  800: '#6b21a8'
  900: '#581c87'
  950: '#3b0764'  // Darkest shade
}
```

**Usage:**
- `primary` (#a855f7) - Primary buttons, links, active states
- `primaryLight` (#c084fc) - Hover states, highlights
- `primaryDark` (#7e22ce) - Pressed states, darker accents

### Secondary Colors (Deep Purple)

```typescript
secondary: {
  500: '#d946ef'  // ⭐ Main secondary (DEFAULT)
  600: '#c026d3'  // Standard secondary
  700: '#a21caf'  // Dark secondary
  800: '#86198f'
  900: '#701a75'
}
```

**Usage:**
- `secondary` (#c026d3) - Secondary actions, radio buttons, less prominent features
- `secondaryLight` (#e879f9) - Subtle accents

### Background Colors (Black)

```typescript
background: {
  DEFAULT: '#000000'  // ⭐ Pure black
  950:     '#0a0a0a'  // backgroundLight - Subtle elevation
  900:     '#171717'  // backgroundLighter - Cards, panels
  800:     '#262626'  // backgroundElevated - Elevated surfaces
}
```

**Usage:**
- `background` (#000000) - Main app background
- `backgroundLight` (#0a0a0a) - Slight elevation (1dp)
- `backgroundLighter` (#171717) - Cards, modals (2dp)
- `backgroundElevated` (#262626) - Elevated components (4dp)

### Glassmorphic Effects

```typescript
glass: {
  // Backgrounds
  bg:            'rgba(10, 10, 10, 0.7)'    // ⭐ Default glass
  bgLight:       'rgba(10, 10, 10, 0.5)'    // Lighter glass
  bgMedium:      'rgba(10, 10, 10, 0.6)'    // Medium glass
  bgStrong:      'rgba(10, 10, 10, 0.85)'   // Strong glass
  bgPurple:      'rgba(59, 7, 100, 0.4)'    // Purple-tinted glass
  bgPurpleLight: 'rgba(107, 33, 168, 0.3)'  // Light purple glass
  
  // Borders
  border:        'rgba(168, 85, 247, 0.2)'  // ⭐ Default purple border
  borderLight:   'rgba(168, 85, 247, 0.1)'  // Subtle border
  borderStrong:  'rgba(168, 85, 247, 0.4)'  // Strong border
  borderFocus:   'rgba(168, 85, 247, 0.6)'  // Focused state
  borderWhite:   'rgba(255, 255, 255, 0.1)' // White for contrast
  
  // Overlays
  overlay:       'rgba(0, 0, 0, 0.5)'       // Standard overlay
  overlayStrong: 'rgba(0, 0, 0, 0.8)'       // Strong overlay
  overlayPurple: 'rgba(59, 7, 100, 0.6)'    // Purple overlay
  
  // Effects
  glow:          'rgba(168, 85, 247, 0.3)'  // Purple glow
  glowStrong:    'rgba(168, 85, 247, 0.5)'  // Strong glow
  highlight:     'rgba(216, 180, 254, 0.15)' // Subtle highlight
}
```

**Usage:**
- Use `glass.bg` for cards, panels, modals
- Use `glass.border` for all borders
- Use `glass.glow` for focus states and hover effects
- Apply `backdrop-filter: blur(20px)` for true glassmorphic effect

### Text Colors

```typescript
text: {
  DEFAULT:   '#ffffff'  // ⭐ Primary text (white)
  secondary: '#a3a3a3'  // Secondary text (gray-400)
  muted:     '#737373'  // Muted text (gray-500)
  dimmed:    '#525252'  // Dimmed text (gray-600)
}
```

### Status Colors

```typescript
success: '#10b981'  // Green
warning: '#f59e0b'  // Amber
error:   '#ef4444'  // Red
live:    '#ef4444'  // Red (for live indicators)
gold:    '#fbbf24'  // Gold (for premium features)
```

---

## 📐 Spacing Scale

Consistent spacing based on 4px base unit:

```typescript
spacing: {
  xs:  4px   // Tight spacing
  sm:  8px   // Small spacing
  md:  16px  // ⭐ Default spacing
  lg:  24px  // Large spacing
  xl:  32px  // Extra large spacing
  xxl: 48px  // Maximum spacing
}
```

**Usage:**
- Use `md` (16px) as default for most spacing
- Use `sm` (8px) for compact layouts
- Use `lg` (24px) for section spacing
- Use `xl` (32px) for page-level spacing

---

## 🔲 Border Radius

```typescript
borderRadius: {
  sm:   4px   // Small radius (buttons, badges)
  md:   8px   // ⭐ Default radius (cards, inputs)
  lg:   12px  // Large radius (modals, panels)
  xl:   16px  // Extra large radius (hero sections)
  full: 9999px // Fully rounded (pills, avatars)
}
```

---

## 🔤 Typography

### Font Sizes

```typescript
fontSize: {
  xs:  12px  // Small text, captions
  sm:  14px  // Secondary text
  md:  16px  // ⭐ Body text (default)
  lg:  18px  // Subheadings
  xl:  20px  // Headings
  xxl: 24px  // Large headings
  xxxl: 32px // Hero text
}
```

### Font Weights

```typescript
fontWeight: {
  normal: '400'  // Body text
  medium: '500'  // Emphasis
  semibold: '600' // ⭐ Headings (default)
  bold: '700'    // Strong emphasis
}
```

### Font Family

- **Primary:** System font stack (San Francisco, Segoe UI, Roboto)
- **Hebrew:** Heebo (preloaded via Google Fonts)

---

## 🎭 Glassmorphic Components

### GlassCard

**Standard card with glassmorphic background:**

```tsx
<GlassCard>
  <Text>Content</Text>
</GlassCard>
```

**Properties:**
- Background: `glass.bg` with `backdrop-filter: blur(20px)`
- Border: `1px solid glass.border`
- Border radius: `borderRadius.lg` (12px)
- Padding: `spacing.md` (16px)

### GlassButton

**Primary button:**

```tsx
<GlassButton
  title="Click Me"
  variant="primary"
  onPress={handlePress}
/>
```

**Variants:**
- `primary` - Purple background (#a855f7) with white text
- `secondary` - Transparent with purple border
- `ghost` - No background, purple text

### GlassInput

**Input field with glassmorphic styling:**

```tsx
<GlassInput
  placeholder="Enter text..."
  value={value}
  onChangeText={setValue}
/>
```

**Properties:**
- Background: `glass.bgLight`
- Border: `1px solid glass.border`
- Focus border: `glass.borderFocus` with glow effect
- Padding: `spacing.md`

### GlassModal

**Modal with glassmorphic overlay:**

```tsx
<GlassModal isOpen={isOpen} onClose={onClose}>
  <Text>Modal content</Text>
</GlassModal>
```

**Properties:**
- Overlay: `glass.overlayStrong` with `backdrop-filter: blur(10px)`
- Content background: `glass.bgStrong`
- Border: `glass.borderStrong`

---

## 🎨 Component Patterns

### Cards

```tsx
// Content card
<GlassCard style={styles.card}>
  <Image source={{ uri: thumbnail }} style={styles.thumbnail} />
  <View style={styles.content}>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.subtitle}>{subtitle}</Text>
  </View>
</GlassCard>

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.glass,
    borderColor: colors.glassBorder,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  content: {
    padding: spacing.md,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
```

### Buttons

```tsx
// Primary button
<Pressable
  style={[styles.button, styles.buttonPrimary]}
  onPress={onPress}
>
  <Text style={styles.buttonText}>Action</Text>
</Pressable>

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
  },
  buttonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
});
```

### Tables

```tsx
<GlassTable
  columns={columns}
  data={data}
  isRTL={isRTL}
  pagination={pagination}
  onPageChange={handlePageChange}
/>
```

**Styling:**
- Header: `glass.bgLight` with `glass.borderLight` bottom border
- Rows: Transparent with `glass.borderLight` separator
- Hover: `glass.highlight` background
- Focus: `glass.borderFocus` border with glow

---

## 🌐 Platform-Specific Guidelines

### Web

- Use CSS `backdrop-filter: blur(20px)` for glassmorphic effects
- Support both light and dark mode (though dark is primary)
- Ensure WCAG AA contrast ratios (4.5:1 for text)

### Mobile (React Native)

- Use `BlurView` component for glassmorphic backgrounds
- Optimize for touch targets (minimum 44x44 points)
- Consider performance on older devices

### TV (React Native TV)

- Increase font sizes by 1.5x for 10-foot UI
- Use larger spacing (multiply by 1.5x)
- Ensure focus states are highly visible
- Support D-pad navigation

### tvOS

- Follow Apple TV design guidelines
- Use parallax effects for depth
- Support Siri Remote gestures

---

## ✅ Best Practices

### DO ✅

- **Use the shared theme** - Import from `@bayit/shared/theme`
- **Use glassmorphic components** - GlassCard, GlassButton, GlassModal
- **Maintain consistency** - Use design tokens for all colors and spacing
- **Layer glass effects** - Create depth with varying opacity
- **Use purple for interactivity** - Buttons, links, active states
- **Test on dark backgrounds** - Ensure glass effects are visible

### DON'T ❌

- **Don't use hardcoded colors** - Always use theme colors
- **Don't mix color systems** - Stick to purple/black palette
- **Don't overuse glass effects** - Too much blur hurts performance
- **Don't use pure white backgrounds** - Breaks glassmorphic aesthetic
- **Don't create custom spacing** - Use the spacing scale
- **Don't ignore RTL** - Support right-to-left languages

---

## 📦 Component Library

All glassmorphic components are available in `shared/components/ui/`:

- `GlassCard` - Cards with glassmorphic background
- `GlassButton` - Buttons with variants
- `GlassInput` - Input fields
- `GlassSelect` - Dropdown selects
- `GlassModal` - Modals and dialogs
- `GlassTable` - Data tables
- `GlassView` - Generic glass container
- `GlassBadge` - Status badges
- `GlassToggle` - Toggle switches

---

## 🔧 Implementation

### Importing the Theme

```typescript
import { colors, spacing, borderRadius, fontSize } from '@bayit/shared/theme';
```

### Using in StyleSheet

```typescript
const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.glass,
    borderColor: colors.glassBorder,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.text,
  },
});
```

### Using in Web CSS

```css
.glass-card {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-md);
  backdrop-filter: blur(20px);
}
```

---

## 🎯 Migration Guide

### From Old Theme to New Theme

**Color Replacements:**

| Old Color | New Color | Usage |
|-----------|-----------|-------|
| `#00d9ff` (cyan) | `colors.primary` (#a855f7) | Primary actions |
| `#3b82f6` (blue) | `colors.secondary` (#c026d3) | Secondary actions |
| `#0f172a` (slate) | `colors.background` (#000000) | Backgrounds |
| `rgba(26, 26, 46, 0.7)` | `colors.glass` | Glass backgrounds |
| `rgba(0, 217, 255, 0.5)` | `colors.glassBorderFocus` | Focus states |

**Component Updates:**

1. Replace all hardcoded colors with theme colors
2. Update glass effects to use new purple-tinted variants
3. Ensure borders use `glassBorder` instead of white
4. Update focus states to use purple glow

---

## 📱 Examples

### Complete Card Example

```tsx
import { View, Text, Image, StyleSheet } from 'react-native';
import { GlassCard } from '@bayit/shared/ui';
import { colors, spacing, borderRadius, fontSize } from '@bayit/shared/theme';

export const ContentCard = ({ title, subtitle, thumbnail }) => (
  <GlassCard style={styles.card}>
    <Image source={{ uri: thumbnail }} style={styles.image} />
    <View style={styles.content}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  </GlassCard>
);

const styles = StyleSheet.create({
  card: {
    width: 200,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  content: {
    padding: spacing.md,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
```

---

## 🚀 Next Steps

1. **Audit existing components** - Replace hardcoded colors
2. **Update custom styles** - Use theme tokens
3. **Test glassmorphic effects** - Ensure performance
4. **Document custom components** - Add to style guide
5. **Create Figma library** - Design system in Figma

---

## 📞 Support

For questions or suggestions about the design system:
- Create an issue in the repository
- Contact the design team
- Review component documentation in `/shared/components/ui/`

---

**Last Updated:** January 14, 2026  
**Version:** 2.0  
**Maintained by:** Bayit+ Design Team
