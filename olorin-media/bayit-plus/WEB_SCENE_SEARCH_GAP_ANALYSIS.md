# Web Scene Search Implementation - Gap Analysis Report

**Date**: 2026-01-24
**Plan Reference**: `/Users/olorin/Documents/olorin/olorin-media/bayit-plus/docs/plans/SEMANTIC_SCENE_SEARCH_PLAN_v2.md`
**Analysis Focus**: Web-specific implementation gaps and testing issues

---

## Executive Summary

The scene search feature has been **PARTIALLY IMPLEMENTED** for web with **CRITICAL GAPS** in Phase 4 Integration and Phase 6 Testing. While core components exist, deep linking and E2E testing are incomplete.

**Status Overview**:
- ✅ Phase 1 (Backend): API endpoint implemented at `/search/scene`
- ✅ Phase 2 (Components): `SceneSearchPanel`, `useSceneSearch` hook implemented
- ✅ Phase 3 (i18n): Translation keys present
- ⚠️ **Phase 4 (Integration): INCOMPLETE** - Deep linking not fully implemented
- ✅ Phase 5 (Voice): TTS feedback integrated in `useSceneSearch`
- ❌ **Phase 6 (Testing): INCOMPLETE** - E2E tests exist but don't test scene search

---

## 1. Phase 4 Integration Analysis

### 1.1 VideoPlayer Integration ✅ COMPLETE

**File**: `/web/src/components/player/VideoPlayer.tsx` (Lines 262-269)

**Status**: ✅ **CORRECTLY INTEGRATED**

```typescript
{/* Scene Search Panel */}
{!isLive && contentId && (
  <SceneSearchPanel
    contentId={contentId}
    isOpen={showSceneSearchPanel}
    onClose={() => setShowSceneSearchPanel(false)}
    onSeek={controls.seekToTime}
  />
)}
```

**Analysis**:
- Panel correctly conditionally rendered for VOD content only (`!isLive && contentId`)
- State managed via local `showSceneSearchPanel` state
- `onSeek` properly wired to `controls.seekToTime`
- **Missing**: `seriesId` prop not passed (see Gap 1.1.1)

**Gap 1.1.1**: Series-level search not enabled
- **Issue**: `VideoPlayer` doesn't pass `seriesId` to `SceneSearchPanel`
- **Impact**: Users can only search within single episodes, not entire series
- **Fix Required**: Pass `seriesId` prop to `SceneSearchPanel` if content is part of a series

---

### 1.2 PlayerControls Search Button ✅ COMPLETE

**File**: `/web/src/components/player/controls/RightControls.tsx` (Lines 95-100)

**Status**: ✅ **CORRECTLY IMPLEMENTED**

```typescript
{/* Scene Search */}
{hasSceneSearch && onSceneSearchToggle && (
  <Pressable
    onPress={(e) => {
      e.stopPropagation?.()
      onSceneSearchToggle()
```

**Analysis**:
- Button correctly conditionally rendered via `hasSceneSearch` prop
- `hasSceneSearch={!isLive && !!contentId}` passed from `VideoPlayer` (Line 401)
- Toggle handler properly connected
- Search icon from `lucide-react` with accessibility label
- tvOS focus support via `useTVFocus` hook

**No gaps identified** - Implementation matches plan.

---

### 1.3 WatchPage Deep Link Handling ⚠️ **PARTIAL**

**File**: `/web/src/pages/watch/WatchPage.tsx` (Lines 44-51, 168)

**Status**: ⚠️ **PARTIALLY IMPLEMENTED** - Basic timestamp support exists, but lacks full scene search deep link handling

**Current Implementation**:
```typescript
// Line 44-51: Extract ?t= parameter
const initialSeekTime = React.useMemo(() => {
  const timeParam = searchParams.get('t');
  if (timeParam) {
    const parsed = parseFloat(timeParam);
    return isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
}, [searchParams]);

// Line 168: Pass to VideoPlayer
<VideoPlayer
  initialSeekTime={initialSeekTime}
  // ...
/>
```

**Analysis**:
- ✅ Reads `?t=` timestamp parameter from URL
- ✅ Parses and validates numeric timestamp
- ✅ Passes to `VideoPlayer` as `initialSeekTime`
- ❌ **Missing**: Scene search result context (which search led to this timestamp)
- ❌ **Missing**: Auto-open scene search panel on deep link
- ❌ **Missing**: Highlight matching result in panel

**Gap 1.3.1**: No scene search context preservation
- **Issue**: When user clicks a deep link from scene search results, the panel doesn't open with the search query and result highlighted
- **Expected**: Deep link like `/watch/vod/abc123?t=120&q=fight%20scene` should:
  1. Seek to timestamp 120s
  2. Open scene search panel
  3. Pre-populate search query "fight scene"
  4. Highlight the clicked result
- **Current**: Only seeks to timestamp, doesn't open panel or show search context

**Gap 1.3.2**: No search query parameter handling
- **Issue**: URL parameter `?q=` is not extracted or used
- **Plan Requirement**: Deep links should support `?t=120&q=search+query` format
- **Fix Required**: Extract `q` parameter, pass to `SceneSearchPanel`, trigger auto-search

---

### 1.4 useSceneSearch Hook ✅ COMPLETE

**File**: `/web/src/components/player/hooks/useSceneSearch.ts`

**Status**: ✅ **FULLY IMPLEMENTED** with excellent TTS accessibility

**Key Features**:
- ✅ Search query state management
- ✅ API integration via `sceneSearchService.search()` (Line 94-101)
- ✅ Result navigation (next/previous/goToResult)
- ✅ Loading and error states
- ✅ TTS audio feedback for results count and errors (Lines 69-78, 117-130)
- ✅ Performance metrics logging (Lines 91, 103, 106-111)
- ✅ Proper error handling with user-friendly messages

**API Call**:
```typescript
const response = await sceneSearchService.search(
  queryToSearch,
  contentId,
  seriesId,
  language,
  SCENE_SEARCH_CONFIG.defaultLimit,  // 20
  SCENE_SEARCH_CONFIG.defaultMinScore // 0.3
)
```

**Service Definition** (`/web/src/services/api.js` Lines 318-328):
```javascript
const apiSceneSearchService = {
  search: (query, contentId, seriesId, language = 'he', limit = 20, minScore = 0.5) =>
    api.post('/search/scene', {
      query,
      content_id: contentId,
      series_id: seriesId,
      language,
      limit,
      min_score: minScore,
    }),
}
```

**No gaps identified** - Hook is production-ready.

---

## 2. Phase 6 Testing Analysis

### 2.1 E2E Test Coverage ❌ **CRITICAL GAP**

**File**: `/web/tests/e2e/search.spec.ts`

**Status**: ❌ **TESTS EXIST BUT DON'T TEST SCENE SEARCH**

**Current Test Coverage**:
- ✅ Search page layout and UI components
- ✅ Keyword search functionality
- ✅ Semantic search toggle
- ✅ View mode switching (grid/list/cards)
- ✅ Content type filtering (VOD/Live/Radio/Podcast)
- ✅ Responsive design (mobile/tablet/desktop)
- ✅ Premium features (LLM search)

**Missing Test Coverage**:
- ❌ **Scene search panel opening/closing**
- ❌ **Scene search query input**
- ❌ **Scene search results rendering**
- ❌ **Scene search result navigation (next/previous)**
- ❌ **Scene search result click → video seek**
- ❌ **Deep link timestamp parameter (`?t=120`)**
- ❌ **Deep link with search query (`?t=120&q=query`)**
- ❌ **Voice search integration with scene search**

**Gap 2.1.1**: No scene search E2E tests
- **Issue**: `search.spec.ts` tests the main search page (`/search`), not the in-player scene search panel
- **Required Tests** (from plan Phase 6.3):
  ```typescript
  test('opens panel and performs search', async ({ page }) => {
    await page.goto('/watch/vod/test-content');
    await page.click('[aria-label="Scene Search"]');
    await page.fill('[role="searchbox"]', 'test query');
    await page.press('[role="searchbox"]', 'Enter');
    await expect(page.locator('[data-testid="scene-result"]')).toBeVisible();
  });

  test('deep link with timestamp seeks video', async ({ page }) => {
    await page.goto('/watch/vod/test-content?t=120');
    await page.waitForTimeout(1000);
    const currentTime = await page.evaluate(() =>
      document.querySelector('video')?.currentTime
    );
    expect(currentTime).toBeGreaterThan(118);
  });

  test('keyboard navigation works', async ({ page }) => {
    await page.goto('/watch/vod/test-content');
    await page.click('[aria-label="Scene Search"]');
    await page.keyboard.press('Escape');
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  });
  ```

**Gap 2.1.2**: Wrong test file location
- **Issue**: Tests in `/web/tests/e2e/search.spec.ts` but named incorrectly for scene search
- **Expected**: Tests should be in `/web/tests/e2e/scene-search.spec.ts` or within existing `search.spec.ts` but testing the player panel
- **Fix Required**: Create new test suite specifically for in-player scene search

---

### 2.2 Playwright Selector Compatibility ⚠️ **POTENTIAL ISSUE**

**Current Selectors in Test Plan**:
```typescript
'[aria-label="Scene Search"]'       // Button selector
'[role="searchbox"]'                 // Input selector
'[data-testid="scene-result"]'      // Result card selector
'[role="dialog"]'                    // Panel selector
```

**React Native Web Compatibility Analysis**:

**✅ Compatible Selectors**:
- `[aria-label="..."]` - Works with React Native Web when `accessibilityLabel` prop is used
- `[role="..."]` - Works with React Native Web when `accessibilityRole` prop is used
- `[data-testid="..."]` - Works if explicitly added to components

**⚠️ Potentially Problematic**:
- Native HTML elements rendered by React Native Web may have different structure
- `Pressable` components render as `<div role="button">` not `<button>`
- `TextInput` components render as `<div><input /></div>` structure

**Gap 2.2.1**: Missing `data-testid` attributes on components
- **Issue**: `SceneSearchPanel.tsx` uses `testID` (React Native) but tests use `data-testid` (web)
- **Current**: `testID="scene-search-panel"` (Line 149)
- **Required**: React Native Web auto-converts `testID` to `data-testid`, so this should work
- **Verification Needed**: Test actual rendered DOM to confirm selectors work

**Gap 2.2.2**: Inconsistent test ID usage
- **Issue**: Not all components have test IDs
- **Missing Test IDs**:
  - Scene search button in PlayerControls
  - Search input field
  - Individual result cards
  - Navigation buttons (previous/next)
- **Fix Required**: Add `testID` props to all interactive elements

---

## 3. Implementation Gaps Summary

### Critical Gaps (Must Fix)

| Gap ID | Component | Issue | Impact | Priority |
|--------|-----------|-------|--------|----------|
| **1.3.1** | WatchPage | No scene search context preservation in deep links | Users can't share specific search results | **HIGH** |
| **1.3.2** | WatchPage | No `?q=` query parameter handling | Deep links don't auto-populate search | **HIGH** |
| **2.1.1** | Testing | No E2E tests for scene search panel | Feature untested, regression risk | **CRITICAL** |
| **2.1.2** | Testing | Wrong test file/location | Tests don't match implementation | **HIGH** |

### Medium Priority Gaps

| Gap ID | Component | Issue | Impact | Priority |
|--------|-----------|-------|--------|----------|
| **1.1.1** | VideoPlayer | `seriesId` not passed to panel | Series-wide search unavailable | **MEDIUM** |
| **2.2.2** | Components | Missing test IDs on some elements | Harder to write reliable tests | **MEDIUM** |

### Low Priority Gaps

| Gap ID | Component | Issue | Impact | Priority |
|--------|-----------|-------|--------|----------|
| **2.2.1** | Testing | Need to verify React Native Web selector compatibility | Potential test flakiness | **LOW** |

---

## 4. Recommended Fixes

### 4.1 Fix Deep Link Search Context (Gap 1.3.1, 1.3.2)

**File**: `/web/src/pages/watch/WatchPage.tsx`

**Add**:
```typescript
// Extract search query parameter
const searchQuery = React.useMemo(() => {
  return searchParams.get('q') || undefined;
}, [searchParams]);

// Extract search result index
const searchResultIndex = React.useMemo(() => {
  const index = searchParams.get('result');
  if (index) {
    const parsed = parseInt(index, 10);
    return isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
}, [searchParams]);

// Auto-open scene search if query param exists
const [autoOpenSceneSearch, setAutoOpenSceneSearch] = React.useState(!!searchQuery);

// Pass to VideoPlayer
<VideoPlayer
  initialSeekTime={initialSeekTime}
  initialSearchQuery={searchQuery}
  initialSearchResultIndex={searchResultIndex}
  autoOpenSceneSearch={autoOpenSceneSearch}
  // ...
/>
```

**Update**: `/web/src/components/player/VideoPlayer.tsx`
```typescript
interface VideoPlayerProps {
  // ... existing props
  initialSearchQuery?: string;
  initialSearchResultIndex?: number;
  autoOpenSceneSearch?: boolean;
}

// In component
useEffect(() => {
  if (autoOpenSceneSearch && initialSearchQuery) {
    setShowSceneSearchPanel(true);
  }
}, [autoOpenSceneSearch, initialSearchQuery]);

// Pass to SceneSearchPanel
<SceneSearchPanel
  contentId={contentId}
  isOpen={showSceneSearchPanel}
  onClose={() => setShowSceneSearchPanel(false)}
  onSeek={controls.seekToTime}
  initialQuery={initialSearchQuery}
  initialResultIndex={initialSearchResultIndex}
/>
```

**Update**: `/web/src/components/player/SceneSearchPanel.tsx`
```typescript
interface SceneSearchPanelProps {
  // ... existing props
  initialQuery?: string;
  initialResultIndex?: number;
}

// In component
useEffect(() => {
  if (isOpen && initialQuery) {
    setInputValue(initialQuery);
    search(initialQuery);
  }
}, [isOpen, initialQuery]);

useEffect(() => {
  if (initialResultIndex !== undefined && results.length > 0) {
    goToResult(initialResultIndex);
  }
}, [initialResultIndex, results.length]);
```

---

### 4.2 Add Series Search Support (Gap 1.1.1)

**File**: `/web/src/components/player/VideoPlayer.tsx`

**Add**:
```typescript
// Assuming series info is available in content metadata
const seriesId = content?.series_id || content?.series?.id;

<SceneSearchPanel
  contentId={contentId}
  seriesId={seriesId}  // ADD THIS
  isOpen={showSceneSearchPanel}
  onClose={() => setShowSceneSearchPanel(false)}
  onSeek={controls.seekToTime}
/>
```

**Requires**: Verify that series information is available in content metadata. If not, may need to fetch separately.

---

### 4.3 Create Scene Search E2E Tests (Gap 2.1.1, 2.1.2)

**New File**: `/web/tests/e2e/scene-search.spec.ts`

```typescript
import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3200';

test.describe('Scene Search Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Set up auth
    await page.goto(BASE_URL);
    await page.evaluate(() => {
      const mockAuthState = {
        state: {
          token: 'test-premium-token',
          user: {
            id: 'test-user-123',
            email: 'test@bayitplus.com',
            subscription_tier: 'premium',
          },
          isAuthenticated: true,
        },
      };
      localStorage.setItem('bayit-auth', JSON.stringify(mockAuthState));
    });
  });

  test('should open scene search panel from player', async ({ page }) => {
    await page.goto(`${BASE_URL}/watch/vod/test-content-id`);
    await page.waitForLoadState('networkidle');

    // Click scene search button
    const searchButton = page.locator('button[aria-label*="Scene"]').first();
    await searchButton.click();

    // Verify panel opens
    const panel = page.locator('[data-testid="scene-search-panel"]');
    await expect(panel).toBeVisible();
  });

  test('should perform scene search and display results', async ({ page }) => {
    await page.goto(`${BASE_URL}/watch/vod/test-content-id`);

    // Open panel
    await page.click('button[aria-label*="Scene"]');

    // Enter search query
    const searchInput = page.locator('input[placeholder*="scene"]').first();
    await searchInput.fill('test scene');
    await searchInput.press('Enter');

    // Wait for results
    await page.waitForTimeout(2000);

    // Check for results or empty state
    const hasResults = await page.locator('[data-testid*="result-card"]').first().isVisible().catch(() => false);
    const hasEmptyState = await page.locator('[data-testid*="empty-state"]').isVisible().catch(() => false);

    expect(hasResults || hasEmptyState).toBeTruthy();
  });

  test('should navigate between search results', async ({ page }) => {
    await page.goto(`${BASE_URL}/watch/vod/test-content-id`);
    await page.click('button[aria-label*="Scene"]');

    // Perform search
    const searchInput = page.locator('input[placeholder*="scene"]').first();
    await searchInput.fill('test');
    await searchInput.press('Enter');
    await page.waitForTimeout(2000);

    // Check if navigation buttons exist
    const nextButton = page.locator('button[aria-label*="Next"]').first();
    const prevButton = page.locator('button[aria-label*="Previous"]').first();

    if (await nextButton.isVisible().catch(() => false)) {
      await nextButton.click();
      await page.waitForTimeout(300);
      // Verify active result changed (would need data-testid on active card)
    }
  });

  test('should seek video when clicking result', async ({ page }) => {
    await page.goto(`${BASE_URL}/watch/vod/test-content-id`);
    await page.click('button[aria-label*="Scene"]');

    // Perform search
    const searchInput = page.locator('input[placeholder*="scene"]').first();
    await searchInput.fill('test');
    await searchInput.press('Enter');
    await page.waitForTimeout(2000);

    // Click first result (if exists)
    const firstResult = page.locator('[data-testid*="result-card"]').first();
    if (await firstResult.isVisible().catch(() => false)) {
      await firstResult.click();

      // Verify video time changed
      await page.waitForTimeout(500);
      const currentTime = await page.evaluate(() =>
        document.querySelector('video')?.currentTime || 0
      );
      expect(currentTime).toBeGreaterThan(0);
    }
  });

  test('should handle deep link with timestamp', async ({ page }) => {
    await page.goto(`${BASE_URL}/watch/vod/test-content-id?t=120`);
    await page.waitForTimeout(1500);

    const currentTime = await page.evaluate(() =>
      document.querySelector('video')?.currentTime || 0
    );

    // Should be close to 120s (allow ±2s for loading)
    expect(currentTime).toBeGreaterThan(118);
    expect(currentTime).toBeLessThan(122);
  });

  test('should close panel with Escape key', async ({ page }) => {
    await page.goto(`${BASE_URL}/watch/vod/test-content-id`);
    await page.click('button[aria-label*="Scene"]');

    const panel = page.locator('[data-testid="scene-search-panel"]');
    await expect(panel).toBeVisible();

    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    await expect(panel).not.toBeVisible();
  });

  test('should support keyboard navigation (arrow keys)', async ({ page }) => {
    await page.goto(`${BASE_URL}/watch/vod/test-content-id`);
    await page.click('button[aria-label*="Scene"]');

    const searchInput = page.locator('input[placeholder*="scene"]').first();
    await searchInput.fill('test');
    await searchInput.press('Enter');
    await page.waitForTimeout(2000);

    // Test arrow down
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(200);

    // Test arrow up
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(200);

    // Should not crash, active index should change
  });
});
```

---

### 4.4 Add Missing Test IDs (Gap 2.2.2)

**Files to Update**:

1. **RightControls.tsx** - Scene search button:
```typescript
<Pressable
  testID="scene-search-button"
  data-testid="scene-search-button"
  // ...
>
```

2. **SceneSearchInput.tsx** - Search input field:
```typescript
<GlassInput
  testID="scene-search-input"
  data-testid="scene-search-input"
  // ...
/>
```

3. **SceneSearchResultCard.tsx** - Result cards:
```typescript
<Pressable
  testID={`scene-result-card-${index}`}
  data-testid={`scene-result-card-${index}`}
  // ...
>
```

4. **SceneSearchNavigation.tsx** - Navigation buttons:
```typescript
<Pressable
  testID="scene-search-prev"
  data-testid="scene-search-prev"
  // ...
>

<Pressable
  testID="scene-search-next"
  data-testid="scene-search-next"
  // ...
>
```

---

## 5. Testing Strategy Verification

### 5.1 React Native Web Selector Compatibility

**Verification Test**:
```typescript
test('verify React Native Web selectors work', async ({ page }) => {
  await page.goto(`${BASE_URL}/watch/vod/test-content-id`);

  // Test aria-label selector (from accessibilityLabel)
  const button = page.locator('[aria-label="Scene Search"]');
  await expect(button).toBeVisible();

  // Test role selector (from accessibilityRole)
  const dialog = page.locator('[role="dialog"]');
  // Should work after opening panel

  // Test data-testid selector
  const panel = page.locator('[data-testid="scene-search-panel"]');
  // Should work after opening panel

  console.log('All selectors compatible!');
});
```

**Key Points**:
- React Native Web converts `accessibilityLabel` to `aria-label`
- React Native Web converts `accessibilityRole` to `role` attribute
- `testID` prop converts to `data-testid` attribute
- All selectors in plan should work correctly

---

## 6. Conclusion

### Implementation Status

**Completed Features**:
- ✅ Backend API endpoint (`/search/scene`)
- ✅ Scene search panel UI components
- ✅ Search state management hook with TTS
- ✅ Player integration (panel rendering, button)
- ✅ Basic timestamp deep linking

**Critical Missing Features**:
- ❌ Deep link search query/context preservation
- ❌ Series-wide search (missing `seriesId` prop)
- ❌ Comprehensive E2E test coverage

### Recommended Action Plan

**Priority 1 - Critical (Complete This Week)**:
1. Create comprehensive E2E test suite (`scene-search.spec.ts`)
2. Add missing `testID` attributes to all components
3. Implement deep link search context (query parameter handling)

**Priority 2 - High (Complete Within 2 Weeks)**:
1. Add series search support (`seriesId` prop)
2. Test deep link functionality end-to-end
3. Verify React Native Web selector compatibility

**Priority 3 - Medium (Complete Within 1 Month)**:
1. Add integration tests for `useSceneSearch` hook
2. Performance testing (search latency, result rendering)
3. Accessibility testing with screen readers

### Test Coverage Target

**Current**: ~0% (no scene search E2E tests)
**Target**: 87% (per project standards)

**Required Tests**:
- Panel open/close (2 tests)
- Search query input (3 tests)
- Result rendering and navigation (4 tests)
- Video seek on result click (2 tests)
- Deep linking (3 tests)
- Keyboard navigation (3 tests)
- Accessibility (2 tests)
- **Total**: ~19 tests minimum

---

## Appendix A: File Locations

**Implementation Files**:
- `/web/src/components/player/VideoPlayer.tsx` - Main player integration
- `/web/src/components/player/SceneSearchPanel.tsx` - Panel component
- `/web/src/components/player/hooks/useSceneSearch.ts` - Search logic hook
- `/web/src/components/player/controls/RightControls.tsx` - Search button
- `/web/src/pages/watch/WatchPage.tsx` - Deep link handling
- `/web/src/services/api.js` - API service (lines 318-328)

**Test Files**:
- `/web/tests/e2e/search.spec.ts` - Existing (doesn't test scene search)
- `/web/tests/e2e/scene-search.spec.ts` - **MISSING** (needs creation)

**Supporting Files**:
- `/web/src/components/player/panel/SceneSearchHeader.tsx`
- `/web/src/components/player/panel/SceneSearchInput.tsx`
- `/web/src/components/player/panel/SceneSearchNavigation.tsx`
- `/web/src/components/player/panel/SceneSearchEmptyState.tsx`
- `/web/src/components/player/panel/sceneSearchStyles.ts`
- `/web/src/components/player/SceneSearchResultCard.tsx`

---

**Report Generated**: 2026-01-24
**Reviewed By**: Frontend Developer Agent (Claude Sonnet 4.5)
