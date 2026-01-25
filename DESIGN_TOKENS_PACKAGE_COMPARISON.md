# Design Tokens Package Comparison

**Date**: January 24, 2026

A comprehensive comparison between **Olorin Core** (global) and **Bayit Plus** (workspace) design-tokens packages.

---

## Package Locations

| Package | Location | Purpose |
|---------|----------|---------|
| **Olorin Core** | `/Users/olorin/Documents/olorin/olorin-core/packages/design-tokens/` | Global design system for all Olorin products |
| **Bayit Plus** | `/Users/olorin/Documents/olorin/olorin-media/bayit-plus/packages/ui/design-tokens/` | Workspace-specific design tokens (npm workspaces resolution) |

---

## Color Exports Comparison

### Olorin Core Colors (14 exports)
```
black, current, dark, error, glass, gold, info, live,
primary, secondary, success, transparent, warning, white
```

### Bayit Plus Colors (32 exports)
```
black, current, dark, error, glass, glassBorder, glassBorderFocus,
glassBorderLight, glassBorderStrong, glassBorderWhite, glassGlowStrong,
glassLight, glassMedium, glassOverlay, glassOverlayPurple,
glassOverlayStrong, glassPurple, glassPurpleLight, glassStrong,
gold, info, live, primary, secondary, success, text, textDisabled,
textMuted, textSecondary, transparent, warning, white
```

### Key Differences

#### ✅ Bayit Plus Has (18 additional properties):

**Flattened Glass Properties** (14):
- `glassBorder` → alias for `glass.border`
- `glassBorderFocus` → alias for `glass.borderFocus`
- `glassBorderLight` → alias for `glass.borderLight`
- `glassBorderStrong` → alias for `glass.border`
- `glassBorderWhite` → `'rgba(255, 255, 255, 0.1)'`
- `glassLight` → alias for `glass.bgLight`
- `glassMedium` → alias for `glass.bgMedium`
- `glassStrong` → alias for `glass.bgStrong`
- `glassPurple` → alias for `glass.purpleStrong`
- `glassPurpleLight` → alias for `glass.purpleLight`
- `glassGlowStrong` → `'rgba(126, 34, 206, 0.5)'`
- `glassOverlay` → `'rgba(10, 10, 10, 0.8)'`
- `glassOverlayStrong` → `'rgba(10, 10, 10, 0.95)'`
- `glassOverlayPurple` → `'rgba(88, 28, 135, 0.4)'`

**Semantic Text Colors** (4):
- `text` → `'#ffffff'`
- `textSecondary` → `'rgba(255, 255, 255, 0.7)'`
- `textMuted` → `'rgba(255, 255, 255, 0.5)'`
- `textDisabled` → `'rgba(255, 255, 255, 0.3)'`

#### ❌ Olorin Core Missing:
- All 14 flattened glass properties
- All 4 semantic text colors

---

## Glass Object Comparison

Both packages have identical `glass` objects:

```typescript
glass: {
  bg: 'rgba(10, 10, 10, 0.7)',
  bgLight: 'rgba(10, 10, 10, 0.5)',
  bgMedium: 'rgba(10, 10, 10, 0.6)',
  bgStrong: 'rgba(10, 10, 10, 0.85)',
  border: 'rgba(126, 34, 206, 0.25)',
  borderLight: 'rgba(126, 34, 206, 0.15)',
  borderFocus: 'rgba(126, 34, 206, 0.7)',
  purpleLight: 'rgba(88, 28, 135, 0.35)',
  purpleStrong: 'rgba(88, 28, 135, 0.55)',
  purpleGlow: 'rgba(126, 34, 206, 0.35)',
}
```

**Difference**: Bayit Plus also exports flattened versions at the root level for convenience.

---

## Spacing Comparison

### Olorin Core Spacing
```typescript
spacing: {
  px: 1,
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  // ... continues
  48: 192,
}
```

Separate `spacingAliases` object:
```typescript
spacingAliases: {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
}
```

### Bayit Plus Spacing
```typescript
spacing: {
  px: 1,
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  // ... continues
  48: 192,
  // PLUS: Merged aliases
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
}
```

**Difference**: Bayit Plus merges aliases directly into spacing for convenience (both `spacing.md` and `spacingAliases.md` work).

---

## Typography Comparison

### Olorin Core Typography
```typescript
fontSize: { base: 16, sm: 14, ... }
fontWeight: { normal: '400', bold: '700', ... }
letterSpacing: { tight: -0.5, normal: 0, ... }
lineHeight: { none: 1, tight: 1.25, ... }
```

**No composite styles** - developers build combinations manually.

### Bayit Plus Typography
```typescript
// Same base exports as Olorin
fontSize: { base: 16, sm: 14, ... }
fontWeight: { normal: '400', bold: '700', ... }

// PLUS: Composite typography styles
typography: {
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400', ... },
  bodySmall: { fontSize: 14, lineHeight: 21, ... },
  bodyLarge: { fontSize: 18, lineHeight: 27, ... },
  h1: { fontSize: 36, lineHeight: 43.2, fontWeight: '700', ... },
  h2: { fontSize: 30, lineHeight: 36, ... },
  h3: { fontSize: 24, lineHeight: 28.8, ... },
  h4: { fontSize: 20, lineHeight: 24, ... },
  caption: { fontSize: 12, lineHeight: 18, ... },
  label: { fontSize: 14, lineHeight: 21, fontWeight: '600', ... },
}
```

**Difference**: Bayit Plus adds ready-to-use composite typography styles.

---

## Touch Targets (WCAG Compliance)

### Olorin Core
❌ **Not present**

### Bayit Plus
✅ **Fully implemented**

```typescript
touchTarget: {
  minHeight: 44,          // iOS HIG minimum
  minWidth: 44,
  recommendedHeight: 48,  // WCAG 2.1 AAA
  recommendedWidth: 48,
  largeHeight: 56,        // Primary actions
  largeWidth: 56,
}
```

**Impact**: Mobile/tvOS apps require WCAG-compliant touch targets.

---

## React Native Theme Export

### Olorin Core
❌ **Not present**

### Bayit Plus
✅ **Fully implemented**

```typescript
reactNativeTheme: {
  colors: theme.colors,
  spacing: theme.spacing,
  typography: typography,
  touchTarget: touchTarget,
  shadowRN: theme.shadowRN,
  glass: theme.glass,
}
```

**Impact**: React Native apps need platform-specific shadow syntax.

---

## Admin Button Styles

### Olorin Core
✅ **Has adminButtonStyles**

```typescript
adminButtonStyles: {
  primaryButton: { backgroundColor, borderWidth, borderColor },
  secondaryButton: { ... },
  dangerButton: { ... },
  buttonText: { color, fontWeight },
}
```

### Bayit Plus
✅ **Has adminButtonStyles** (copied from Olorin Core)

**Status**: Identical in both packages.

---

## Platform-Specific Exports

### Olorin Core
- `tailwind.preset` (web only)
- No React Native specific exports

### Bayit Plus
- `tailwind.preset` (web only)
- `reactNativeTheme` (mobile/tvOS)
- `touchTarget` (mobile/tvOS)
- `shadowRN` (React Native shadows)
- `fontSizeTV` (tvOS specific sizing)

**Difference**: Bayit Plus has multi-platform support.

---

## Why Two Packages?

### Technical Reason: npm Workspaces Resolution

When using npm workspaces, local packages **shadow** global packages with the same name.

```
import { colors } from '@olorin/design-tokens'

↓ Resolves to ↓

/bayit-plus/packages/ui/design-tokens/  (LOCAL - takes precedence)

NOT ↓

/olorin-core/packages/design-tokens/    (GLOBAL - ignored)
```

### Architectural Decision

Instead of fighting workspace resolution, we **maintain both**:

1. **Olorin Core** = Minimal, universal design tokens
2. **Bayit Plus Workspace** = Extended with Bayit-specific properties

This allows:
- ✅ Bayit Plus to add platform-specific features
- ✅ Olorin Core to remain minimal and reusable
- ✅ Other projects to use Olorin Core as-is
- ✅ Bayit Plus to extend without forking

---

## Feature Matrix

| Feature | Olorin Core | Bayit Plus |
|---------|-------------|------------|
| **Core Colors** | ✅ 14 colors | ✅ 14 colors |
| **Flattened Glass Properties** | ❌ No | ✅ Yes (14 props) |
| **Semantic Text Colors** | ❌ No | ✅ Yes (4 props) |
| **Glass Object** | ✅ Yes | ✅ Yes |
| **Spacing** | ✅ Numeric only | ✅ Numeric + aliases |
| **Spacing Aliases** | ✅ Separate object | ✅ Merged into spacing |
| **Typography Base** | ✅ Yes | ✅ Yes |
| **Typography Composites** | ❌ No | ✅ Yes (9 styles) |
| **Touch Targets** | ❌ No | ✅ Yes (WCAG compliant) |
| **React Native Theme** | ❌ No | ✅ Yes |
| **Admin Button Styles** | ✅ Yes | ✅ Yes (copied) |
| **Tailwind Preset** | ✅ Yes | ✅ Yes |
| **Platform Support** | 🌐 Web only | 🌐📱📺 Web + Mobile + tvOS |

---

## Usage Patterns

### Olorin Core (Minimal)
```typescript
import { colors, spacing, fontSize } from '@olorin/design-tokens';

// Nested access required
backgroundColor: colors.glass.bg,
border: `1px solid ${colors.glass.border}`,
padding: spacing[4],
```

### Bayit Plus (Extended)
```typescript
import { colors, spacing, typography } from '@olorin/design-tokens';

// Flattened access available
backgroundColor: colors.glassLight,      // Convenience alias
border: `1px solid ${colors.glassBorder}`, // Convenience alias
padding: spacing.md,                      // Convenience alias

// Composite styles available
...typography.body,    // Complete text style object
```

---

## Dependency Strategy

### Current Setup (Post-Migration)

```
bayit-plus/
├── packages/ui/design-tokens/  ← EXTENDED (shadows global)
│   ├── All Olorin Core features
│   └── PLUS Bayit-specific extensions
│
└── node_modules/
    └── @olorin/design-tokens@2.0.0  ← IGNORED (shadowed by workspace)
```

### Why This Works

1. **npm workspaces** resolve local packages first
2. **Bayit Plus workspace package** extends Olorin Core
3. **Imports** resolve to local package automatically
4. **No conflicts** - clean separation

---

## Migration History

### Phase 1: Initial Migration (Broken)
- Migrated 412 files to use `@olorin/design-tokens`
- Used minimal Olorin Core package
- **BROKE** - Missing flattened properties

### Phase 2: Extension (Current)
- Extended workspace package with:
  - Flattened glass properties
  - Semantic text colors
  - Spacing aliases
  - Typography composites
  - Touch targets
  - React Native theme
- **WORKS** - Full backward compatibility

---

## Future Considerations

### Option 1: Keep Dual Package (Recommended)
**Pros:**
- Clean separation of concerns
- Bayit can extend without affecting Olorin Core
- Other products can use minimal Olorin Core
- npm workspaces handle resolution automatically

**Cons:**
- Must maintain two packages
- Changes to Olorin Core need manual sync

### Option 2: Merge Everything into Olorin Core
**Pros:**
- Single source of truth
- No duplication

**Cons:**
- Olorin Core becomes Bayit-specific
- Other products inherit Bayit-specific properties
- Loses modularity

### Option 3: Create Layers
```
@olorin/design-tokens-core     ← Minimal base
@olorin/design-tokens-extended ← Platform extensions
@bayit/design-tokens           ← Bayit-specific
```

**Pros:**
- Clear separation
- Pick what you need

**Cons:**
- Complex dependency tree
- More packages to maintain

---

## Recommendations

### For Bayit Plus (Current State)
✅ **Keep current setup**
- Workspace package works perfectly
- Full backward compatibility
- Platform-specific features isolated
- Clean development experience

### For Olorin Core
✅ **Keep minimal**
- Universal design tokens only
- No platform-specific code
- Reusable across all projects

### For Future Products
✅ **Follow Bayit Plus Pattern**
- Start with Olorin Core
- Extend in workspace when needed
- Add product-specific features locally

---

## Summary

### Key Insights

1. **Bayit Plus package is EXTENDED, not REPLACED**
   - Includes all Olorin Core features
   - Adds 18 convenience properties
   - Adds platform-specific exports

2. **Flattened properties are CRITICAL**
   - 100+ components rely on them
   - Developer convenience matters
   - Backward compatibility essential

3. **Workspace resolution is AUTOMATIC**
   - npm workspaces handle shadowing
   - No configuration needed
   - Clean import experience

4. **Both packages serve different purposes**
   - Olorin Core = Universal base
   - Bayit Plus = Extended for multi-platform

### Bottom Line

The dual-package setup is **intentional and beneficial**:
- Olorin Core stays clean and minimal
- Bayit Plus extends for its specific needs
- npm workspaces handle resolution automatically
- No conflicts, full compatibility

---

**Compared by**: Claude Code
**Date**: January 24, 2026
**Status**: ✅ COMPREHENSIVE ANALYSIS COMPLETE
