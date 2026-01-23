# Semantic Scene Search Web Compatibility Review

**Date**: 2026-01-22
**Component**: Scene Search Implementation
**Platform**: React Native Web
**Status**: CHANGES REQUIRED

---

## Executive Summary

The Semantic Scene Search implementation includes well-designed scene search UI with strong accessibility features, keyboard navigation, and focus management. However, there are **3 critical issues** that must be addressed before web deployment:

1. **CRITICAL**: Native HTML `<input type="range">` in PlayerControls (accessibility violation)
2. **HIGH**: Missing dependency in useSceneSearch hook (potential infinite loops)
3. **MEDIUM**: Potential focus trap issue on web with ref cleanup

---

## Detailed Findings

### 1. CRITICAL: Native HTML `<input type="range">` Violation

**File**: `/web/src/components/player/PlayerControls.tsx` (Lines 224-245)

**Issue**:
```tsx
<input
  type="range"
  value={state.isMuted ? 0 : state.volume}
  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
    controls.handleVolumeChange(e)
  }}
  // ... ARIA attributes
/>
```

**Violation**:
- ❌ Uses native HTML `<input type="range">` element
- ❌ CLAUDE.md explicitly forbids native HTML elements
- ❌ Violates Glass Components Library requirement
- ❌ Breaks design system consistency

**Expected**:
- ✅ Should use `GlassSlider` component (if available)
- ✅ Or create a new Glass-based slider component

**Compliance Status**: **FAILS** - This is a zero-tolerance violation per CLAUDE.md

**Remediation Required**:
- [ ] Replace with GlassSlider if it exists in @bayit/glass
- [ ] If GlassSlider doesn't exist, create it following Glass design system
- [ ] Verify ARIA attributes work with replacement component

---

### 2. HIGH: Missing Dependency in useSceneSearch Hook

**File**: `/web/src/components/player/hooks/useSceneSearch.ts` (Line 128)

**Issue**:
```typescript
const search = useCallback(
  async (searchQuery?: string) => {
    // ... implementation
  },
  [query, contentId, seriesId, language, announceWithTTS, t]
  // Missing: currentIndex, results, setCurrentIndex, setResults, setLoading, setError
)
```

**Problem**:
- ❌ `search()` function uses `setCurrentIndex(0)` but it's NOT in dependency array
- ❌ `search()` uses `setResults()` but it's NOT in dependency array
- ❌ `search()` uses `setLoading()` and `setError()` but they're NOT in dependency array
- ❌ While setState functions are stable, ESLint would flag this as "exhaustive-deps" violation
- ⚠️ Could cause stale closure issues if these setters change (edge case)

**Current Dependencies**:
```typescript
[query, contentId, seriesId, language, announceWithTTS, t]
```

**Corrected Dependencies** (if using strict ESLint):
```typescript
[query, contentId, seriesId, language, announceWithTTS, t, setCurrentIndex, setResults, setLoading, setError]
```

**Note**: React's setter functions are stable and don't change, so this is technically safe, but best practice is to include them for linter compliance.

**Compliance Status**: **WARN** - Works but violates ESLint exhaustive-deps rule

**Remediation Required**:
- [ ] Enable ESLint rule: `react-hooks/exhaustive-deps`
- [ ] Add missing setState functions to dependency array
- [ ] Or add ESLint disable comment if intentional

---

### 3. MEDIUM: Potential Focus Trap Edge Case

**File**: `/web/src/components/player/SceneSearchPanel.tsx` (Lines 107-154)

**Issue**:
```typescript
useEffect(() => {
  if (Platform.OS !== 'web') return

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isOpen) return
    // ... focus trap logic
  }

  document.addEventListener('keydown', handleKeyDown)
  return () => document.removeEventListener('keydown', handleKeyDown)
}, [isOpen, onClose, goToNext, goToPrevious, results, currentIndex, onSeek, t])
```

**Problem**:
- ⚠️ Dependency array includes `results` (array) and `currentIndex` (number)
- ⚠️ If `results` is recreated each render, this hook will reinstall listeners
- ⚠️ `results` reference from parent can change, causing unnecessary listener updates
- ✅ BUT: Logic handles `isOpen` check, so listeners won't interfere when panel is closed

**Current Behavior**:
- ✅ Safe in practice because `isOpen` short-circuits the handler
- ⚠️ Not optimal - listeners are recreated when results change

**Compliance Status**: **WARN** - Safe but inefficient

**Remediation** (Optional):
```typescript
useEffect(() => {
  if (Platform.OS !== 'web') return

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isOpen) return
    // ... handler
  }

  document.addEventListener('keydown', handleKeyDown)
  return () => document.removeEventListener('keydown', handleKeyDown)
}, [isOpen, onClose, goToNext, goToPrevious, onSeek, t])
// Remove: results, currentIndex (not needed - accessed via closure)
```

---

## Accessibility Verification

### Keyboard Navigation ✅ APPROVED

**Escape**: Closes panel
```typescript
if (e.key === 'Escape') {
  e.preventDefault()
  onClose?.()
}
```
✅ **Correct**

**Arrow Down**: Next result
```typescript
else if (e.key === 'ArrowDown') {
  e.preventDefault()
  goToNext()
}
```
✅ **Correct**

**Arrow Up**: Previous result
```typescript
else if (e.key === 'ArrowUp') {
  e.preventDefault()
  goToPrevious()
}
```
✅ **Correct**

**Enter**: Seek to result
```typescript
else if (e.key === 'Enter' && results[currentIndex]) {
  e.preventDefault()
  const result = results[currentIndex]
  if (result.timestamp_seconds != null) {
    onSeek?.(result.timestamp_seconds)
  }
}
```
✅ **Correct**

**Tab**: Focus trap with proper cycling
```typescript
} else if (e.key === 'Tab') {
  const focusableElements = panel.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )
  const firstElement = focusableElements[0]
  const lastElement = focusableElements[focusableElements.length - 1]

  if (e.shiftKey && document.activeElement === firstElement) {
    e.preventDefault()
    lastElement?.focus()
  } else if (!e.shiftKey && document.activeElement === lastElement) {
    e.preventDefault()
    firstElement?.focus()
  }
}
```
✅ **Correct** - Proper focus trap implementation

---

### ARIA Labels ✅ APPROVED

**SceneSearchPanel**:
```tsx
<GlassView
  accessibilityRole="dialog"
  accessibilityLabel={t('player.sceneSearch.title')}
  data-testid="scene-search-panel"
>
```
✅ **Correct** - Dialog role with label

**Close Button**:
```tsx
<Pressable
  accessibilityRole="button"
  accessibilityLabel={t('common.close')}
>
```
✅ **Correct** - Button role with label

**Search Input**:
```tsx
<GlassInput
  accessibilityLabel={t('player.sceneSearch.inputLabel')}
/>
```
✅ **Correct** - Input labeled

**Navigation Buttons**:
```tsx
<Pressable
  accessibilityRole="button"
  accessibilityLabel={t('player.sceneSearch.previous')}
  accessibilityState={{ disabled: currentIndex === 0 }}
>
```
✅ **Correct** - Button with state

**Navigation Footer**:
```tsx
<View
  accessibilityRole="navigation"
  accessibilityLabel={t('player.sceneSearch.navigation')}
>
```
✅ **Correct** - Navigation landmark

**Live Regions**:
```tsx
<View style={styles.emptyState} accessibilityLiveRegion="polite">
  {/* Loading state */}
</View>
<View style={styles.emptyState} accessibilityLiveRegion="assertive">
  {/* Error state */}
</View>
```
✅ **Correct** - Proper live region usage

**Screen Reader Announcements**:
```typescript
function announceToScreenReader(message: string) {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const el = document.createElement('div')
    el.setAttribute('role', 'status')
    el.setAttribute('aria-live', 'polite')
    el.setAttribute('aria-atomic', 'true')
    // ... positioning for screen readers
  }
}
```
✅ **Correct** - Proper ARIA status region with screen reader positioning

---

### SceneSearchResultCard Accessibility ✅ APPROVED

**Result Card**:
```tsx
<Pressable
  accessibilityRole="button"
  accessibilityLabel={t('player.sceneSearch.result.jumpTo', {
    title: result.title,
    time: result.timestamp_formatted,
  })}
  accessibilityHint={t('player.sceneSearch.result.hint')}
  accessibilityState={{ selected: isActive }}
>
```
✅ **Correct** - Comprehensive labeling with state

---

## Responsive Design ✅ APPROVED

### Mobile (< 600px):
- Panel width: 320px (73% of screen on mobile)
- Min touch targets: 44x44pt
- Compact padding: 8-12px
- Small icons: 18-22px

✅ **Correct**

### Desktop (1200px+):
- Panel width: 320px (fixed, overlays right side)
- Min touch targets: 44x44pt
- Icons: 18-22px

✅ **Correct**

### TV (tvOS):
- Panel width: 400px
- TV touch targets: 56x56pt
- Large padding: 16-20px
- Large icons: 24-28px
- TV font sizes via `tvFontSize` tokens

✅ **Correct** - Excellent TV support

---

## Lucide Icons Rendering ✅ APPROVED

Icons used (all from lucide-react, web-compatible):
- ✅ `Search` - Line 22, 236
- ✅ `X` - Line 22, 258
- ✅ `AlertCircle` - Line 22, 301
- ✅ `ChevronLeft` - Line 22, 355
- ✅ `ChevronRight` - Line 22, 351
- ✅ `Clock` - Line 10, 66
- ✅ `Play` - Line 10, 125

All icons:
- ✅ Are imported correctly from lucide-react
- ✅ Use proper sizing (isTV ? largeSize : smallSize)
- ✅ Use proper colors from theme
- ✅ Have fallback styling

**Status**: **APPROVED**

---

## React Hooks Analysis

### useSceneSearch Hook ⚠️ CONDITIONAL APPROVAL

**Dependencies Review**:

1. **search callback** (Line 73-129):
   - ❌ ISSUE: Missing setState functions in dependency array
   - Dependencies: `[query, contentId, seriesId, language, announceWithTTS, t]`
   - Should include: `setCurrentIndex, setResults, setLoading, setError` (technically safe as they're stable, but ESLint may flag)

2. **goToResult callback** (Line 131-137):
   - ✅ Correct: `[results.length]` - only depends on length, not array reference

3. **goToNext callback** (Line 140-143):
   - ✅ Correct: `[currentIndex, results.length]`

4. **goToPrevious callback** (Line 146-149):
   - ✅ Correct: `[currentIndex]`

5. **clearResults callback** (Line 152-157):
   - ✅ Correct: `[]` - no dependencies, pure reset

6. **announceWithTTS callback** (Line 62-70):
   - ✅ Correct: `[isTTSEnabled]` - proper dependency

### SceneSearchPanel Hook Analysis ⚠️ CONDITIONAL APPROVAL

1. **Slide animation** (Line 73-80):
   - ✅ Correct: `[isOpen, slideAnim]`

2. **Focus management** (Line 86-104):
   - ✅ Correct: `[isOpen, clearResults, t]`

3. **Keyboard navigation** (Line 107-154):
   - ⚠️ WARN: `[isOpen, onClose, goToNext, goToPrevious, results, currentIndex, onSeek, t]`
   - **Issue**: `results` and `currentIndex` are in dependency array
   - **Safe in practice**: Because handler checks `isOpen` first
   - **Optimization**: Could remove `results, currentIndex` since they're only accessed via closure

4. **Scroll to current result** (Line 157-165):
   - ✅ Correct: `[currentIndex, results.length]`

5. **Handlers** (Lines 167-194):
   - ✅ All correct: Proper dependency tracking in handleSearch, handleVoiceResult, handleResultClick

**Status**: **CONDITIONAL APPROVAL** - Works but needs ESLint cleanup

---

## Console Error Analysis

### Expected: ✅ CLEAN
- ✅ No console.log statements in production code
- ✅ All errors logged via logger utility
- ✅ No uncaught exceptions thrown

### Potential Issues: ⚠️
- ⚠️ ESLint exhaustive-deps may flag search callback
- ⚠️ ESLint exhaustive-deps may flag keyboard handler

**Mitigation**: Add ESLint disable comment or fix dependencies

---

## Platform Compatibility

### Web (React) ✅ APPROVED
- ✅ Uses Platform.OS checks correctly
- ✅ Keyboard navigation implemented
- ✅ Focus management with HTMLElement refs
- ✅ document API usage guarded with typeof checks
- ✅ ARIA attributes map correctly to web

### TV (tvOS) ✅ APPROVED
- ✅ useTVFocus hooks properly implemented
- ✅ Focus indicators visible
- ✅ Large touch targets (56x56pt)
- ✅ 10-foot UI typography
- ✅ Navigation supports button focus

### Mobile ❌ UNTESTED
- Note: SceneSearchPanel uses web-specific features
- Note: Focus trap uses HTMLElement refs - may not work on native
- Note: Keyboard handlers use document.addEventListener - may not work on native
- Recommendation: Test on iOS/Android emulators

---

## File Size Analysis

| File | Lines | Status |
|------|-------|--------|
| SceneSearchPanel.tsx | 574 | ⚠️ **OVER LIMIT** (200 line max) |
| SceneSearchResultCard.tsx | 287 | ⚠️ **OVER LIMIT** (200 line max) |
| useSceneSearch.ts | 175 | ✅ Under limit |
| PlayerControls.tsx | 437 | ⚠️ **OVER LIMIT** (200 line max) |

**Issue**: Multiple files exceed 200-line limit per CLAUDE.md

**Status**: **REFACTORING REQUIRED**

---

## Summary of Issues

### CRITICAL (Must Fix) ❌
1. **Native `<input type="range">` in PlayerControls** - Violates Glass Components requirement
2. **File size violations** - SceneSearchPanel (574L), SceneSearchResultCard (287L), PlayerControls (437L) all exceed 200-line limit

### HIGH (Should Fix) ⚠️
1. **Missing dependencies in useSceneSearch** - ESLint exhaustive-deps violation

### MEDIUM (Nice to Have) 📝
1. **Optimize keyboard handler dependencies** - Remove unused results/currentIndex from deps

---

## Approval Decision

### APPROVAL STATUS: **CHANGES REQUIRED**

**Cannot approve for production deployment because:**

1. ❌ **CRITICAL**: Native HTML `<input type="range">` element violates Glass Components requirement (CLAUDE.md zero-tolerance)
2. ❌ **CRITICAL**: File size violations exceed 200-line maximum:
   - SceneSearchPanel.tsx: 574 lines (must split into multiple components)
   - SceneSearchResultCard.tsx: 287 lines (must refactor)
   - PlayerControls.tsx: 437 lines (must refactor)

**Must be addressed before approval**

---

## Required Changes Checklist

### CRITICAL Fixes Required:
- [ ] Replace native `<input type="range">` with GlassSlider component
- [ ] Split SceneSearchPanel.tsx (574 lines) into multiple files (target: < 200 lines each)
- [ ] Refactor SceneSearchResultCard.tsx (287 lines) to < 200 lines
- [ ] Refactor PlayerControls.tsx (437 lines) to < 200 lines using component composition

### HIGH Priority Fixes:
- [ ] Add missing setState functions to useSceneSearch search callback dependency array
- [ ] Enable ESLint exhaustive-deps rule if not already enabled
- [ ] Test on native iOS/Android to verify focus management works

### MEDIUM Priority Improvements:
- [ ] Remove unused `results`, `currentIndex` from keyboard handler dependency array
- [ ] Add e2e tests for keyboard navigation (Escape, Arrow keys, Tab, Enter)
- [ ] Add e2e tests for focus trap cycling
- [ ] Test on actual TV device (tvOS) for 10-foot UI compliance

---

## Recommendations

1. **Component Composition**: Split large components:
   - SceneSearchPanel → SceneSearchPanel + SceneSearchHeader + SceneSearchList + SceneSearchNav
   - PlayerControls → PlayerControls + PlayerControlsLeft + PlayerControlsRight
   - SceneSearchResultCard → Keep as is or make it even simpler

2. **GlassSlider Creation**: If not available, create `GlassSlider` component:
   - Follows Glass design system (glassmorphism, dark mode)
   - Uses TailwindCSS or StyleSheet
   - Full ARIA support
   - Works on web, TV, and mobile

3. **Testing**: Add comprehensive tests:
   - Keyboard navigation (all keys)
   - Focus trap (Tab forward/backward)
   - Screen reader announcements
   - Mobile vs TV vs Desktop layouts
   - Native iOS/Android compatibility

---

## Conclusion

The Semantic Scene Search implementation demonstrates **excellent accessibility practices** with:
- ✅ Comprehensive ARIA labels and roles
- ✅ Proper keyboard navigation (Escape, Arrow keys, Tab, Enter)
- ✅ Focus trap implementation
- ✅ Screen reader announcements via live regions
- ✅ Strong TV support with 10-foot UI
- ✅ Responsive design across all platforms

However, it **cannot be approved for production** due to:
- ❌ CRITICAL: Native HTML element violation (zero-tolerance per CLAUDE.md)
- ❌ CRITICAL: File size violations (exceeds 200-line limit)
- ⚠️ HIGH: React hook dependency array issues

**Remediation effort**: Medium (2-4 hours)
- 1-2 hours for file refactoring and component composition
- 1-2 hours for GlassSlider component creation
- 1 hour for dependency array fixes and testing

**Post-remediation review recommended**: Yes
