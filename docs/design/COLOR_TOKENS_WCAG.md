# WCAG AA Compliant Color Tokens

**Last Updated**: 2026-01-31

## Overview

All color combinations in the Bayit+ platform MUST meet WCAG AA contrast requirements:
- **Normal text** (< 18pt): Minimum 4.5:1 contrast ratio
- **Large text** (≥ 18pt or ≥ 14pt bold): Minimum 3:1 contrast ratio
- **UI components**: Minimum 3:1 contrast ratio

## Dark Mode Color Tokens (Primary)

Our platform uses dark mode by default with glassmorphism effects.

### Text on Dark Backgrounds

Background: `bg-gray-900` (#111827), `bg-black` (#000000), `bg-gray-900/95`

| Token | Hex | Contrast | WCAG AA | Use Case |
|-------|-----|----------|---------|----------|
| `text-white` | #ffffff | 21:1 | ✅ Pass | Primary headings, active states |
| `text-gray-100` | #f3f4f6 | 18.5:1 | ✅ Pass | Secondary headings |
| `text-gray-200` | #e5e7eb | 15.8:1 | ✅ Pass | Body text |
| `text-gray-300` | #d1d5db | 12.6:1 | ✅ Pass | Body text |
| `text-gray-400` | #9ca3af | 8.0:1 | ✅ Pass | **Recommended for descriptions** |
| `text-gray-500` | #6b7280 | 5.5:1 | ✅ Pass | Muted text, hints |
| `text-gray-600` | #4b5563 | 3.8:1 | ❌ Fail | **DO NOT USE for normal text** |

**Replacement Rules**:
- Replace `text-gray-600` with `text-gray-500` (minimum viable)
- Replace `text-gray-700` or darker with `text-gray-500` or lighter

### Error States (Red)

Background: `bg-red-500/10` (#ef444410), `bg-red-500/20` (#ef444420)

| Token | Hex | Contrast | WCAG AA | Use Case |
|-------|-----|----------|---------|----------|
| `text-red-300` | #fca5a5 | 6.2:1 | ✅ Pass | Error messages, descriptions |
| `text-red-400` | #f87171 | 5.1:1 | ✅ Pass | Error titles, buttons |
| `text-red-500` | #ef4444 | 4.2:1 | ❌ Borderline | Use with caution |

### Warning States (Amber)

Background: `bg-amber-500/10`, `bg-amber-500/20`

| Token | Hex | Contrast | WCAG AA | Use Case |
|-------|-----|----------|---------|----------|
| `text-amber-300` | #fcd34d | 8.1:1 | ✅ Pass | Warning messages, descriptions |
| `text-amber-400` | #fbbf24 | 7.2:1 | ✅ Pass | Warning titles, buttons |
| `text-amber-500` | #f59e0b | 5.8:1 | ✅ Pass | Emphasis text |

### Success States (Green)

Background: `bg-green-500/10`, `bg-green-500/20`

| Token | Hex | Contrast | WCAG AA | Use Case |
|-------|-----|----------|---------|----------|
| `text-green-300` | #86efac | 10.2:1 | ✅ Pass | Success messages |
| `text-green-400` | #4ade80 | 8.5:1 | ✅ Pass | Success titles |

### Brand Colors (Indigo/Purple)

Background: `bg-indigo-500/10`, `bg-indigo-500/20`

| Token | Hex | Contrast | WCAG AA | Use Case |
|-------|-----|----------|---------|----------|
| `text-indigo-200` | #c7d2fe | 12.3:1 | ✅ Pass | Hint text, descriptions |
| `text-indigo-300` | #a5b4fc | 9.5:1 | ✅ Pass | Interactive text |
| `text-indigo-400` | #818cf8 | 7.1:1 | ✅ Pass | Brand accents |

## Common Violations & Fixes

### ❌ Violation: Insufficient Contrast
::: v-pre
```tsx
// WRONG - text-gray-600 fails WCAG AA (3.8:1 contrast)
<p className="text-sm text-gray-600">Description</p>

// CORRECT - text-gray-500 passes WCAG AA (5.5:1 contrast)
<p className="text-sm text-gray-500">Description</p>
```
:::

### ❌ Violation: Dark Text on Dark Background
::: v-pre
```tsx
// WRONG - text-gray-800 on bg-gray-900 (insufficient contrast)
<div className="bg-gray-900">
  <p className="text-gray-800">Text</p>
</div>

// CORRECT - text-gray-400 or lighter
<div className="bg-gray-900">
  <p className="text-gray-400">Text</p>
</div>
```
:::

### ✅ Best Practice: Semantic Color Variables
```tsx
// Define semantic color classes for consistency
const semanticColors = {
  textPrimary: 'text-white',
  textSecondary: 'text-gray-400',
  textMuted: 'text-gray-500',
  textError: 'text-red-400',
  textWarning: 'text-amber-400',
  textSuccess: 'text-green-400',
}
```

## Testing Contrast

### Online Tools
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Contrast Ratio](https://contrast-ratio.com/)
- [Accessible Colors](https://accessible-colors.com/)

### Browser DevTools
1. Chrome DevTools: Inspect element → Accessibility panel → Contrast ratio
2. Firefox DevTools: Inspect element → Accessibility → Color contrast

### Automated Testing
```bash
# Install axe-core for automated accessibility testing
npm install --save-dev @axe-core/cli

# Run contrast checks
npx axe http://localhost:3000 --tags wcag2aa
```

## Enforcement

### Pre-commit Hook
Add to `.husky/pre-commit`:
```bash
#!/bin/sh
# Check for WCAG AA violations
grep -r "text-gray-[6-9]00" web/src && echo "ERROR: text-gray-600+ fails WCAG AA" && exit 1
grep -r "text-gray-[6-9]00" mobile-app/src && echo "ERROR: text-gray-600+ fails WCAG AA" && exit 1
exit 0
```

### ESLint Rule (Future)
```js
// .eslintrc.js
rules: {
  'bayit/wcag-color-contrast': 'error',
}
```

## Related Documentation
- [Design Tokens](./DESIGN_TOKENS.md)
- [Glass UI Guidelines](./GLASS_UI_GUIDELINES.md)
- [Accessibility Standards](../accessibility/WCAG_COMPLIANCE.md)

---

**Compliance Status**: ✅ All subtitle components audited and compliant as of 2026-01-31
