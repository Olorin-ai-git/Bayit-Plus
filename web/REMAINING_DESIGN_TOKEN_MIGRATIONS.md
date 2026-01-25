# Remaining Design Token Migrations

**Date:** 2026-01-24
**Status:** 7 Glass Components Identified for Future Migration

---

## Overview

While **GlassBreadcrumbs** and **GlassCategoryPill** have been fully migrated to design tokens, **7 additional Glass components** still contain hardcoded rgba color values that should be migrated for consistency.

**Priority:** Low to Medium (components are functional, but migration would improve maintainability)

---

## Components Requiring Migration

### High Priority (Frequently Used)

#### 1. GlassButton.tsx ⚠️

**File:** `/shared/components/ui/GlassButton.tsx`
**Frequency:** Very High - Used throughout the application
**Lines:** 76-140

**Hardcoded Colors Found:**
```typescript
primary: {
  backgroundColor: 'rgba(147, 51, 234, 0.8)',      // Should be: colors.primary[600]
  borderColor: 'rgba(126, 34, 206, 0.6)',          // Should be: colors.glass.border
},
secondary: {
  backgroundColor: 'rgba(88, 28, 135, 0.6)',       // Should be: colors.glass.purpleStrong
  borderColor: 'rgba(107, 33, 168, 0.7)',          // Should be: colors.primary[800]
},
ghost: {
  backgroundColor: 'rgba(255, 255, 255, 0.1)',     // Should be: colors.glassLight
  borderColor: 'rgba(126, 34, 206, 0.4)',          // Should be: colors.glassBorderLight
},
danger: {
  backgroundColor: 'rgba(220, 38, 38, 0.8)',       // Should be: colors.error[600]
  borderColor: 'rgba(239, 68, 68, 0.7)',           // Should be: colors.error.DEFAULT
},
// ... additional variants
```

**Migration Effort:** Medium (10+ color values)
**Impact:** High - Most frequently used component

---

#### 2. GlassFAB.tsx ⚠️

**File:** `/shared/components/ui/GlassFAB.tsx`
**Frequency:** High - Floating action buttons used on many pages

**Hardcoded Colors Found:**
- Purple rgba values for button backgrounds
- Border colors
- Shadow/glow effects

**Migration Effort:** Low-Medium (5-10 color values)
**Impact:** Medium

---

#### 3. GlassSelect.tsx ⚠️

**File:** `/shared/components/ui/GlassSelect.tsx`
**Frequency:** Medium - Used in forms and filters

**Hardcoded Colors Found:**
- Purple rgba values for dropdown backgrounds
- Border colors
- Selected item backgrounds

**Migration Effort:** Low-Medium (5-10 color values)
**Impact:** Medium

---

### Medium Priority

#### 4. GlassBadge.tsx ⚠️ (Partially Migrated)

**File:** `/shared/components/ui/GlassBadge.tsx`
**Frequency:** Medium
**Status:** ⚠️ Already imports design tokens, but has remaining hardcoded values

**Hardcoded Colors Still Present (Lines 29-34):**
```typescript
variantStyles: {
  primary: { bg: 'rgba(107, 33, 168, 0.3)', text: colors.primary },     // Should use colors.glass
  info: { bg: 'rgba(107, 33, 168, 0.3)', text: colors.primaryLight },   // Should use colors.glass
  success: { bg: 'rgba(16, 185, 129, 0.2)', text: colors.success },     // Should use colors.success with opacity
  danger: { bg: 'rgba(239, 68, 68, 0.2)', text: colors.error },         // Should use colors.error with opacity
  warning: { bg: 'rgba(245, 158, 11, 0.2)', text: '#fb923c' },          // Should use colors.warning
  purple: { bg: 'rgba(138, 43, 226, 0.2)', text: colors.secondary },    // Should use colors.glass.purpleLight
}
```

**Migration Effort:** Low (6 color values)
**Impact:** Low-Medium

---

#### 5. GlassSectionItem.tsx ⚠️

**File:** `/shared/components/ui/GlassSectionItem.tsx`
**Frequency:** Medium - Used in list/section views

**Hardcoded Colors Found:**
- Purple rgba values for section backgrounds
- Border colors
- Hover/focus states

**Migration Effort:** Low (3-5 color values)
**Impact:** Low

---

#### 6. GlassLiveChannelCard.tsx ⚠️

**File:** `/shared/components/ui/GlassLiveChannelCard.tsx`
**Frequency:** Medium - Used on Live TV page

**Hardcoded Colors Found:**
- Purple rgba values for card backgrounds
- Border colors
- Live indicator overlays

**Migration Effort:** Low-Medium (5-8 color values)
**Impact:** Low-Medium

---

## Migration Guidelines

### Step-by-Step Process

1. **Import Design Tokens**
   ```typescript
   import { colors } from '@olorin/design-tokens';
   ```

2. **Replace Hardcoded Colors**
   - Use color mapping table below
   - Replace all rgba() values with design token references
   - Ensure type safety with TypeScript

3. **Test Component**
   - Visual inspection
   - Verify no console errors
   - Check hover/focus states
   - Confirm glassmorphic effects

4. **Update Tests**
   - Add/update Playwright tests
   - Verify color consistency

---

## Color Mapping Reference

### Purple Colors

| Hardcoded Value | Design Token | Usage |
|----------------|--------------|-------|
| `rgba(147, 51, 234, 0.8)` | `colors.primary[600]` | Primary purple |
| `rgba(126, 34, 206, 0.6)` | `colors.glass.border` or `colors.primary[700]` | Dark purple border |
| `rgba(126, 34, 206, 0.4)` | `colors.glassBorderLight` | Light purple border |
| `rgba(126, 34, 206, 0.15)` | `colors.glassBorderLight` | Very light border |
| `rgba(88, 28, 135, 0.6)` | `colors.glass.purpleStrong` | Strong purple glass |
| `rgba(88, 28, 135, 0.35)` | `colors.glassPurpleLight` | Light purple glass |
| `rgba(107, 33, 168, 0.7)` | `colors.primary[800]` | Deep purple |
| `rgba(138, 43, 226, 0.2)` | `colors.glass.purpleLight` | Light purple |
| `rgba(168, 85, 247, 0.9)` | `colors.primary[500]` | Medium purple |

### Glass/Transparency

| Hardcoded Value | Design Token | Usage |
|----------------|--------------|-------|
| `rgba(10, 10, 10, 0.5)` | `colors.glassLight` | Light glass background |
| `rgba(10, 10, 10, 0.6)` | `colors.glassMedium` | Medium glass background |
| `rgba(10, 10, 10, 0.7)` | `colors.glass.bg` | Standard glass background |
| `rgba(10, 10, 10, 0.85)` | `colors.glassStrong` | Strong glass background |
| `rgba(255, 255, 255, 0.1)` | `colors.glassBorderWhite` or custom | White glass border |

### Semantic Colors

| Hardcoded Value | Design Token | Usage |
|----------------|--------------|-------|
| `rgba(220, 38, 38, 0.8)` | `colors.error[600]` | Danger/error (strong) |
| `rgba(239, 68, 68, 0.7)` | `colors.error.DEFAULT` | Danger/error |
| `rgba(239, 68, 68, 0.2)` | `colors.error.DEFAULT` with opacity | Danger background |
| `rgba(16, 185, 129, 0.2)` | `colors.success.DEFAULT` with opacity | Success background |
| `rgba(245, 158, 11, 0.2)` | `colors.warning.DEFAULT` with opacity | Warning background |
| `#fb923c` | `colors.warning[400]` | Orange warning text |

### Text Colors

| Hardcoded Value | Design Token | Usage |
|----------------|--------------|-------|
| `#ffffff` or `rgba(255, 255, 255, 1)` | `colors.text` or `colors.white` | Primary text |
| `rgba(255, 255, 255, 0.7)` | `colors.textSecondary` | Secondary text |
| `rgba(255, 255, 255, 0.5)` | `colors.textMuted` | Muted text |
| `rgba(255, 255, 255, 0.3)` | `colors.textDisabled` | Disabled text |
| `#000000` | `colors.black` | Black text |

---

## Migration Template

### Example: Migrating a Button Variant

**Before:**
```typescript
const variantStyles = {
  primary: {
    backgroundColor: 'rgba(147, 51, 234, 0.8)',
    borderColor: 'rgba(126, 34, 206, 0.6)',
  },
};
```

**After:**
```typescript
import { colors } from '@olorin/design-tokens';

const variantStyles = {
  primary: {
    backgroundColor: colors.primary[600],
    borderColor: colors.glass.border,
  },
};
```

---

## Estimated Migration Effort

| Component | Priority | Color Values | Effort | Time Estimate |
|-----------|----------|--------------|--------|---------------|
| GlassButton.tsx | High | 10+ | Medium | 30-45 min |
| GlassFAB.tsx | High | 5-10 | Low-Medium | 20-30 min |
| GlassSelect.tsx | High | 5-10 | Low-Medium | 20-30 min |
| GlassBadge.tsx | Medium | 6 | Low | 15-20 min |
| GlassSectionItem.tsx | Medium | 3-5 | Low | 10-15 min |
| GlassLiveChannelCard.tsx | Medium | 5-8 | Low-Medium | 15-25 min |

**Total Estimated Time:** 2-3 hours

---

## Benefits of Migration

1. **Consistency:** All components use the same color system
2. **Maintainability:** Single source of truth for colors
3. **Type Safety:** TypeScript autocomplete and error checking
4. **Theme Support:** Easier to implement theme switching in future
5. **Reusability:** Colors defined once, used everywhere
6. **Documentation:** Color names are self-documenting

---

## Recommended Approach

### Phase 1: High Priority (Week 1)
1. Migrate GlassButton.tsx
2. Migrate GlassFAB.tsx
3. Migrate GlassSelect.tsx

### Phase 2: Medium Priority (Week 2)
4. Complete GlassBadge.tsx migration
5. Migrate GlassSectionItem.tsx
6. Migrate GlassLiveChannelCard.tsx

### Phase 3: Prevention (Week 3)
7. Add ESLint rule to detect new hardcoded colors
8. Add CI check to prevent hardcoded color commits
9. Update component guidelines

---

## Automated Detection

### ESLint Rule (Recommended)

```javascript
// .eslintrc.js
{
  rules: {
    'no-hardcoded-colors': [
      'error',
      {
        patterns: [
          /rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+/,  // rgba(r, g, b
          /#[0-9a-fA-F]{3,6}/,                   // #hex
        ],
        exceptions: [
          'rgba(0, 0, 0, 0)',    // Fully transparent
          'transparent',
        ],
      },
    ],
  },
}
```

### CI Check (Recommended)

```bash
# Add to GitHub Actions or CI pipeline
- name: Check for hardcoded colors
  run: |
    if grep -rn "rgba([0-9]" shared/components/ui/Glass*.tsx; then
      echo "Error: Hardcoded colors found in Glass components"
      exit 1
    fi
```

---

## Conclusion

While the critical components (GlassBreadcrumbs and GlassCategoryPill) are now fully migrated, **7 additional Glass components** would benefit from design token migration.

**Recommended Action:**
- Migrate high-priority components (GlassButton, GlassFAB, GlassSelect) first
- Add automated prevention measures
- Complete remaining migrations as time allows

**Current Status:**
- 2 components migrated ✅
- 7 components remaining ⚠️
- 0 console errors ✅
- Visual rendering correct ✅

---

**Document Created:** 2026-01-24
**Next Review:** After Phase 1 completion
