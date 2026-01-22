# StyleSheet.create Violations Report - Bayit+ Codebase

**Date:** 2026-01-21
**Severity:** CRITICAL - Blocks web build and violates CLAUDE.md zero-tolerance rules

## Executive Summary

Found **56 files** with `StyleSheet.create` usage, violating CLAUDE.md requirement for TailwindCSS-only styling across all platforms. This affects:
- **23 shared components** (used by web, iOS, tvOS)
- **33 web-only files** (React web app)
- **Estimated 10,000+ lines** of StyleSheet code requiring conversion

## Current Status

**Immediate Impact:**
- ❌ Web build crashes with: `TypeError: StyleSheet.create is not a function`
- ❌ Dev server fails to start
- ❌ Production deployment blocked

**Fixed:**
- ✅ `shared/components/TrendingRow.tsx` (335 lines) - Converted to TailwindCSS

**Remaining:**
- ⚠️ 55 files still violating CLAUDE.md

## Violations by Priority

### 🔴 CRITICAL - Blocking Web Build (6 files, 3,251 lines)

These are exported in `shared/components/index.ts` and loaded by webpack when any shared component is imported:

| File | Lines | Status |
|------|-------|--------|
| JerusalemRow.tsx | 540 | ❌ Not fixed |
| TelAvivRow.tsx | 542 | ❌ Not fixed |
| GlassCarousel.tsx | 687 | ❌ Not fixed |
| CultureCityRow.tsx | 615 | ❌ Not fixed |
| CultureTrendingRow.tsx | 531 | ❌ Not fixed |
| UserAccountMenu.tsx | 336 | ❌ Not fixed |

**Impact:** These files are automatically included in web bundle through barrel exports, causing immediate crashes.

### 🟠 HIGH PRIORITY - Imported by Web App (4 files)

Directly imported by web components:

| File | Imported By |
|------|-------------|
| flows/FlowItemCard.tsx | FlowItemList.tsx |
| flows/ContentItemCard.tsx | ContentPickerModal.tsx |
| support/SupportSearch.tsx | SupportPage.tsx |
| support/SupportTicketList.tsx | SupportPage.tsx |

### 🟡 MEDIUM PRIORITY - Shared Screens (12 files)

Admin and support screens in `shared/screens/admin/`:

```
AdminDashboardScreen.tsx
BillingOverviewScreen.tsx
CampaignDetailScreen.tsx
CampaignsListScreen.tsx
EmailCampaignsScreen.tsx
SupportDashboardScreen.tsx
UploadsScreen.tsx
UserDetailScreen.tsx
UsersListScreen.tsx
```

Plus shared/components:
```
judaism/ShabbatModeBanner.tsx
judaism/ShabbatEveSection.tsx
layouts/CinematicHero.tsx
```

### 🟢 LOW PRIORITY - Web-Only Files (33 files)

Files in `web/src/` that only run on web (StyleSheet still won't work but less critical):

**Admin Components (7 files):**
- CategoryPicker.tsx
- DataTable.tsx
- FreeContentImportWizard.tsx
- HierarchicalContentTable.tsx
- ImageUploader.tsx
- LibrarianActivityLog.tsx
- LibrarianScheduleCard.tsx

**Player Components (6 files):**
- ChapterTimeline.tsx
- PlayerControls.tsx
- SettingsPanel.tsx
- SubtitleControls.tsx
- VideoPlayer.tsx
- RecordingCard.tsx

**Layout Components (4 files):**
- Footer.tsx
- GlassSidebar.tsx
- Header.tsx
- VerticalFeed.tsx

**Content Components (3 files):**
- ContentCard.tsx
- HeroSection.tsx
- EPGRecordModal.tsx

**Page Components (5 files):**
- YoungstersPage.tsx
- WatchlistPage.tsx
- UserWidgetsPage.tsx
- VODPage.tsx
- ProfileSelectionPage.tsx

**Other (8 files):**
- PlayerProfilePage.tsx, PodcastsPage.tsx, WidgetContainer.tsx, etc.

## Technical Analysis

### Root Cause

1. **React Native StyleSheet API not available in web builds**
   - `StyleSheet.create` is part of react-native package
   - Web builds don't include React Native's StyleSheet implementation
   - Results in runtime error: `StyleSheet.create is not a function`

2. **Webpack barrel export bundling**
   - `shared/components/index.ts` exports all components
   - Web app imports from `@bayit/shared`
   - Webpack includes entire barrel export, including unused components
   - All exported components are evaluated, triggering StyleSheet errors

3. **CLAUDE.md Compliance Violation**
   - Zero-tolerance rule: NO `StyleSheet.create()` allowed
   - ALL styling must use TailwindCSS `className` props
   - Current codebase has 56 violations

### Why This Happened

Legacy code patterns mixed with modern requirements:
- ✅ Modern: TailwindCSS configured (NativeWind installed)
- ❌ Legacy: Old React Native StyleSheet code not migrated
- ❌ Architecture: Shared components used StyleSheet for cross-platform
- ❌ Build: Webpack doesn't tree-shake barrel exports effectively

## Recommended Fix Strategy

### Phase 1: Unblock Web Build (URGENT - 6 files)

**Action:** Convert critical shared components to TailwindCSS
**Files:** JerusalemRow, TelAvivRow, GlassCarousel, CultureCityRow, CultureTrendingRow, UserAccountMenu
**Effort:** ~6-8 hours (complex components with extensive styling)
**Priority:** IMMEDIATE - Blocks all development

### Phase 2: Fix High-Priority Imports (4 files)

**Action:** Convert flow and support components
**Files:** FlowItemCard, ContentItemCard, SupportSearch, SupportTicketList
**Effort:** ~2-3 hours
**Priority:** HIGH - Prevents feature-specific crashes

### Phase 3: Shared Screens Cleanup (12 files)

**Action:** Convert admin and shared screens
**Effort:** ~4-6 hours
**Priority:** MEDIUM - May be imported in future

### Phase 4: Web-Only Files (33 files)

**Action:** Convert remaining web components
**Effort:** ~10-15 hours
**Priority:** LOW - Not breaking build but violates standards

### Total Estimated Effort

**56 files total:**
- ⏱️ 22-32 hours of manual conversion work
- 📝 10,000+ lines of StyleSheet code to convert
- 🧪 Extensive testing required per component
- 🔍 Visual QA across all platforms (web, iOS, tvOS)

## Automated Conversion Options

### Option A: Manual Conversion (Current)
✅ Precise control
✅ Best quality
❌ Very time-consuming
❌ Error-prone

### Option B: Automated AST Transformation
✅ Fast (minutes vs hours)
✅ Consistent
❌ Requires tooling setup
⚠️ May need manual tweaks

**Recommended Tool:**
```bash
# Use jscodeshift or custom codemod
npx jscodeshift -t style-to-classname-transform.js shared/components/*.tsx
```

### Option C: Incremental Migration
✅ Unblock critical path quickly
✅ Distribute work over time
⚠️ Requires discipline
❌ Tech debt remains longer

**Approach:**
1. Fix 6 critical files manually (TODAY)
2. Write automated transformer
3. Run transformer on remaining 50 files
4. Manual QA and adjustments

## Immediate Actions Required

1. ✅ **Fixed:** TrendingRow.tsx converted to TailwindCSS
2. ⏳ **Next:** Fix 6 critical shared components (JerusalemRow, TelAvivRow, etc.)
3. ⏳ **Then:** Fix 4 high-priority imports (flows + support)
4. ⏳ **Finally:** Automated conversion of remaining 46 files

## Prevention Strategy

### Short-term
- [ ] Add pre-commit hook to block `StyleSheet.create` in new code
- [ ] ESLint rule: `no-restricted-imports` for react-native StyleSheet
- [ ] CI/CD check for forbidden patterns

### Long-term
- [ ] Update component templates to use TailwindCSS only
- [ ] Document TailwindCSS patterns for common use cases
- [ ] Code review checklist includes CLAUDE.md compliance
- [ ] Monthly audit of codebase for violations

## Files Requiring Conversion

### Shared Components (23 files)

```
shared/components/CultureCityRow.tsx
shared/components/CultureTrendingRow.tsx
shared/components/flows/ContentItemCard.tsx
shared/components/flows/FlowItemCard.tsx
shared/components/GlassCarousel.tsx
shared/components/JerusalemRow.tsx
shared/components/judaism/ShabbatEveSection.tsx
shared/components/judaism/ShabbatModeBanner.tsx
shared/components/layouts/CinematicHero.tsx
shared/components/support/SupportSearch.tsx
shared/components/support/SupportTicketList.tsx
shared/components/TelAvivRow.tsx
shared/components/UserAccountMenu.tsx
shared/screens/admin/AdminDashboardScreen.tsx
shared/screens/admin/BillingOverviewScreen.tsx
shared/screens/admin/CampaignDetailScreen.tsx
shared/screens/admin/CampaignsListScreen.tsx
shared/screens/admin/EmailCampaignsScreen.tsx
shared/screens/admin/SupportDashboardScreen.tsx
shared/screens/admin/UploadsScreen.tsx
shared/screens/admin/UserDetailScreen.tsx
shared/screens/admin/UsersListScreen.tsx
```

### Web Components (33 files)

```
web/src/components/admin/CategoryPicker.tsx
web/src/components/admin/DataTable.tsx
web/src/components/admin/FreeContentImportWizard.tsx
web/src/components/admin/HierarchicalContentTable.tsx
web/src/components/admin/ImageUploader.tsx
web/src/components/admin/LibrarianActivityLog.tsx
web/src/components/admin/LibrarianScheduleCard.tsx
web/src/components/content/ContentCard.tsx
web/src/components/content/HeroSection.tsx
web/src/components/epg/EPGRecordModal.tsx
web/src/components/flow/RunningFlowBanner.tsx
web/src/components/layout/Footer.tsx
web/src/components/layout/GlassSidebar.tsx
web/src/components/layout/Header.tsx
web/src/components/layouts/VerticalFeed.tsx
web/src/components/player/ChapterTimeline.tsx
web/src/components/player/PlayerControls.tsx
web/src/components/player/SettingsPanel.tsx
web/src/components/player/SubtitleControls.tsx
web/src/components/player/VideoPlayer.tsx
web/src/components/recordings/RecordingCard.tsx
web/src/components/settings/RitualSettings.tsx
web/src/components/widgets/WidgetContainer.tsx
web/src/components/widgets/WidgetFormModal.tsx
web/src/pages/flows/components/FlowActionsModal.tsx
web/src/pages/flows/components/FlowSidebar.tsx
web/src/pages/PlayerProfilePage.tsx
web/src/pages/PodcastsPage.tsx
web/src/pages/ProfileSelectionPage.tsx
web/src/pages/UserWidgetsPage.tsx
web/src/pages/VODPage.tsx
web/src/pages/WatchlistPage.tsx
web/src/pages/YoungstersPage.tsx
```

## CLAUDE.md Compliance Check

| Rule | Status | Violations |
|------|--------|------------|
| NO StyleSheet.create | ❌ FAIL | 56 files |
| TailwindCSS only | ❌ FAIL | 56 files |
| className props | ⚠️ PARTIAL | Mixed usage |
| Zero tolerance | ❌ CRITICAL | Major violation |

## Conclusion

This is a **CRITICAL** zero-tolerance violation requiring immediate action. The web build is currently broken and cannot proceed until at minimum the 6 critical shared components are fixed.

**Recommended Next Steps:**
1. Approve Phase 1 fix (6 files, ~6-8 hours)
2. Decision: Manual vs automated approach for remaining files
3. Implement prevention measures
4. Schedule Phase 2-4 based on priority

---
*Report generated: 2026-01-21*
*Scan completed: 56 violations found*
*Fixed: 1 file (TrendingRow.tsx)*
*Remaining: 55 files*
