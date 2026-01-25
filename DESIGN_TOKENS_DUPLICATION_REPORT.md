# Design Tokens Duplication Report

**Date**: January 24, 2026  
**Status**: ❌ CRITICAL - Massive Duplication Detected

## Executive Summary

The Bayit+ codebase has **massive duplication** of design tokens across all frontend apps, violating the core principle of using the global `@olorin/design-tokens` package.

### By The Numbers

- 📊 **357 files** importing from local duplicate `@bayit/shared/theme`
- 📊 **14 files** importing from local `theme/colors`
- ✅ **Only 1 file** correctly using `@olorin/design-tokens`
- 🗂️ **10+ duplicate theme directories** across the codebase
- ❌ **tvOS app** missing `@olorin/design-tokens` dependency entirely

## Critical Issues

### 1. Package Dependencies

| App | Status | Issue |
|-----|--------|-------|
| Web | ⚠️ PARTIAL | Has dependency but not using it (357 files use local duplicates) |
| Mobile | ⚠️ PARTIAL | Has dependency but not using it |
| tvOS | ❌ MISSING | No `@olorin/design-tokens` dependency at all |

### 2. Duplicate Design Token Directories

All of these are duplicates that should be deleted:

```
❌ /shared/design-tokens/          - Full duplicate with colors, spacing, typography
❌ /shared/components/theme/        - Another duplicate
❌ /shared/theme/                   - Yet another duplicate
❌ /web/src/theme/                  - Web-specific duplicate
❌ /mobile-app/src/theme/           - Mobile-specific duplicate
❌ /tv-app/src/theme/               - TV-specific duplicate
❌ /packages/ui/glass-components/src/theme/  - Glass components duplicate
✅ /packages/ui/design-tokens/      - LOCAL workspace copy (acceptable, but should sync with global)
```

### 3. Duplicate Files Found

**Colors:**
- `/web/src/theme/colors.ts` ❌
- `/shared/design-tokens/colors.js` ❌

**Spacing:**
- `/mobile-app/src/theme/spacing.ts` ❌
- `/shared/design-tokens/spacing.js` ❌

**Typography:**
- `/mobile-app/src/theme/typography.ts` ❌
- `/shared/design-tokens/typography.js` ❌

### 4. Import Analysis

**Current (WRONG):**
```typescript
// 357 files doing this ❌
import { colors, spacing } from '@bayit/shared/theme'
import { colors } from '@/theme/colors'
import { spacing } from '../theme/spacing'
```

**Required (CORRECT):**
```typescript
// All files should do this ✅
import { colors, spacing, borderRadius } from '@olorin/design-tokens'
```

## Root Cause

The `@bayit/shared/*` path aliases in `tsconfig.json` point to local duplicate directories:

```json
"@bayit/shared/theme": ["../shared/theme"]  // ❌ Points to duplicate
```

This should instead point to or be replaced with:
```typescript
import from '@olorin/design-tokens'  // ✅ Global package
```

## Required Actions

### Phase 1: Add Missing Dependencies

1. **Add to tvOS app:**
   ```bash
   cd tvos-app
   npm install @olorin/design-tokens@2.0.0
   ```

### Phase 2: Mass Import Replacement

Replace all 357 imports from `@bayit/shared/theme` to `@olorin/design-tokens`:

```bash
# Web app (357 files)
find web/src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' \
  "s|from '@bayit/shared/theme'|from '@olorin/design-tokens'|g" {} \;

# Mobile app
find mobile-app/src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' \
  "s|from.*theme/spacing|from '@olorin/design-tokens|g" {} \;

# tvOS app
find tvos-app/src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' \
  "s|from.*theme|from '@olorin/design-tokens|g" {} \;
```

### Phase 3: Delete Duplicate Directories

```bash
# Delete all local theme duplicates
rm -rf shared/design-tokens
rm -rf shared/components/theme
rm -rf shared/theme
rm -rf web/src/theme
rm -rf mobile-app/src/theme
rm -rf tv-app/src/theme
rm -rf packages/ui/glass-components/src/theme
```

### Phase 4: Update TypeScript Config

Remove `@bayit/shared/theme` path alias from `web/tsconfig.json`:

```json
{
  "paths": {
    // ❌ REMOVE THIS
    "@bayit/shared/theme": ["../shared/theme"],
    
    // ✅ Already correct - design-tokens is a workspace package
    "@olorin/design-tokens": ["../packages/ui/design-tokens"]
  }
}
```

### Phase 5: Verification

```bash
# Verify no imports from local theme
grep -r "from '@bayit/shared/theme'" web/src mobile-app/src tvos-app/src
# Should return: (nothing)

# Verify all use @olorin/design-tokens
grep -r "from '@olorin/design-tokens'" web/src mobile-app/src tvos-app/src | wc -l
# Should return: 357+

# Verify no local theme directories exist
find . -type d -name "theme" -o -name "design-tokens" | grep -v node_modules | grep -v packages/ui/design-tokens
# Should return: (only workspace package)
```

## Impact Assessment

### Before Fix
- ❌ 357 files using local duplicates
- ❌ Inconsistent theme values across apps
- ❌ No single source of truth
- ❌ Changes require updating 10+ locations
- ❌ High risk of drift and bugs

### After Fix
- ✅ 100% of files using `@olorin/design-tokens`
- ✅ Single source of truth in global package
- ✅ Changes in one location propagate everywhere
- ✅ Consistent design system across all platforms
- ✅ Easy to maintain and update

## Next Steps

1. **Immediate**: Add `@olorin/design-tokens` to tvOS app
2. **Phase 2**: Run mass import replacement script
3. **Phase 3**: Delete duplicate directories
4. **Phase 4**: Update tsconfig path aliases
5. **Phase 5**: Run verification tests
6. **Phase 6**: Build and test all apps

## Notes

- The `/packages/ui/design-tokens/` is the LOCAL workspace copy that apps use
- This is acceptable as it's part of the workspace and can be kept in sync with global
- The issue is the OTHER 9+ duplicate directories that bypass this
