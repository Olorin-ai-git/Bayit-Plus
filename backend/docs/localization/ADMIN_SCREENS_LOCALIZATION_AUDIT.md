# Admin Screens Localization Audit Report

**Date:** 2026-01-12
**Scope:** All admin web and mobile screens
**Status:** ⚠️ Found hardcoded strings in 6 files

---

## Executive Summary

Found **hardcoded English strings** in 6 admin interface files across web and mobile apps. These are common UI strings (Cancel, Save, Active, filter labels) that need to be replaced with i18n translation keys.

---

## Findings

### 1. Common Button Labels (High Priority)

**Files Affected:** 5 web pages
- `web/src/pages/admin/CategoriesPage.tsx`
- `web/src/pages/admin/LiveChannelsPage.tsx`
- `web/src/pages/admin/PodcastsPage.tsx`
- `web/src/pages/admin/PodcastEpisodesPage.tsx`
- `web/src/pages/admin/RadioStationsPage.tsx`

**Hardcoded Strings:**
- "Cancel" - Modal cancel button
- "Save" - Modal save button
- "Active" - Toggle status label

**Impact:** HIGH - User-facing button text

**Lines Affected:**
```typescript
// CategoriesPage.tsx:224, 227
<Text style={styles.cancelBtnText}>Cancel</Text>
<Text style={styles.saveBtnText}>Save</Text>

// LiveChannelsPage.tsx:246, 250, 253
<Text>Active</Text>
<Text style={styles.cancelBtnText}>Cancel</Text>
<Text style={styles.saveBtnText}>Save</Text>

// PodcastsPage.tsx:264, 268, 271
<Text>Active</Text>
<Text style={styles.cancelBtnText}>Cancel</Text>
<Text style={styles.saveBtnText}>Save</Text>

// PodcastEpisodesPage.tsx:186, 277, 280
<Text>Back to Podcasts</Text>
<Text style={styles.cancelBtnText}>Cancel</Text>
<Text style={styles.saveBtnText}>Save</Text>

// RadioStationsPage.tsx:252, 256, 259
<Text>Active</Text>
<Text style={styles.cancelBtnText}>Cancel</Text>
<Text style={styles.saveBtnText}>Save</Text>
```

---

### 2. Filter Chip Labels (Medium Priority)

**File Affected:** `shared/screens/admin/AuditLogsScreen.tsx`

**Hardcoded Strings:**
- "Action: {value} ✕" - Filter chip label (line 171)
- "Resource: {value} ✕" - Filter chip label (line 176)
- "User: {value} ✕" - Filter chip label (line 181)
- "Date range ✕" - Filter chip label (line 186)

**Impact:** MEDIUM - Filter UI labels

**Code:**
```typescript
// Line 171
<Text style={styles.filterChipText}>Action: {filters.action} ✕</Text>

// Line 176
<Text style={styles.filterChipText}>Resource: {filters.resource_type} ✕</Text>

// Line 181
<Text style={styles.filterChipText}>User: {filters.user_id.slice(0, 8)}... ✕</Text>

// Line 186
<Text style={styles.filterChipText}>Date range ✕</Text>
```

---

## Translation Keys Added

All translation keys have been added to `en.json`, `he.json`, and `es.json`:

```json
{
  "admin": {
    "common": {
      "cancel": "Cancel / ביטול / Cancelar",
      "save": "Save / שמור / Guardar",
      "active": "Active / פעיל / Activo",
      "back": "Back / חזרה / Volver",
      "filterAction": "Action / פעולה / Acción",
      "filterResource": "Resource / משאב / Recurso",
      "filterUser": "User / משתמש / Usuario",
      "filterDateRange": "Date range / טווח תאריכים / Rango de fechas"
    }
  }
}
```

---

## Recommended Fixes

### Fix 1: Update Button Labels

**Before:**
```typescript
<Text style={styles.cancelBtnText}>Cancel</Text>
<Text style={styles.saveBtnText}>Save</Text>
```

**After:**
```typescript
<Text style={styles.cancelBtnText}>{t('admin.common.cancel')}</Text>
<Text style={styles.saveBtnText}>{t('admin.common.save')}</Text>
```

**Files to Update:**
- `web/src/pages/admin/CategoriesPage.tsx` (lines 224, 227)
- `web/src/pages/admin/LiveChannelsPage.tsx` (lines 250, 253)
- `web/src/pages/admin/PodcastsPage.tsx` (lines 268, 271)
- `web/src/pages/admin/PodcastEpisodesPage.tsx` (lines 277, 280)
- `web/src/pages/admin/RadioStationsPage.tsx` (lines 256, 259)

---

### Fix 2: Update Active Toggle Label

**Before:**
```typescript
<Text>Active</Text>
```

**After:**
```typescript
<Text>{t('admin.common.active')}</Text>
```

**Files to Update:**
- `web/src/pages/admin/LiveChannelsPage.tsx` (line 246)
- `web/src/pages/admin/PodcastsPage.tsx` (line 264)
- `web/src/pages/admin/RadioStationsPage.tsx` (line 252)

---

### Fix 3: Update Back Navigation

**Before:**
```typescript
<Text>Back to Podcasts</Text>
```

**After:**
```typescript
<Text>{t('admin.common.back')} {t('admin.titles.podcasts')}</Text>
```

**Files to Update:**
- `web/src/pages/admin/PodcastEpisodesPage.tsx` (line 186)

---

### Fix 4: Update Filter Chips

**Before:**
```typescript
<Text style={styles.filterChipText}>Action: {filters.action} ✕</Text>
<Text style={styles.filterChipText}>Resource: {filters.resource_type} ✕</Text>
<Text style={styles.filterChipText}>User: {filters.user_id.slice(0, 8)}... ✕</Text>
<Text style={styles.filterChipText}>Date range ✕</Text>
```

**After:**
```typescript
<Text style={styles.filterChipText}>{t('admin.common.filterAction')}: {filters.action} ✕</Text>
<Text style={styles.filterChipText}>{t('admin.common.filterResource')}: {filters.resource_type} ✕</Text>
<Text style={styles.filterChipText}>{t('admin.common.filterUser')}: {filters.user_id.slice(0, 8)}... ✕</Text>
<Text style={styles.filterChipText}>{t('admin.common.filterDateRange')} ✕</Text>
```

**Files to Update:**
- `shared/screens/admin/AuditLogsScreen.tsx` (lines 171, 176, 181, 186)

---

## Implementation Priority

### Priority 1: Button Labels (30 minutes)
- [ ] Fix "Cancel" and "Save" in CategoriesPage.tsx
- [ ] Fix "Cancel" and "Save" in LiveChannelsPage.tsx
- [ ] Fix "Cancel" and "Save" in PodcastsPage.tsx
- [ ] Fix "Cancel" and "Save" in PodcastEpisodesPage.tsx
- [ ] Fix "Cancel" and "Save" in RadioStationsPage.tsx

### Priority 2: Status Labels (15 minutes)
- [ ] Fix "Active" in LiveChannelsPage.tsx
- [ ] Fix "Active" in PodcastsPage.tsx
- [ ] Fix "Active" in RadioStationsPage.tsx

### Priority 3: Navigation (5 minutes)
- [ ] Fix "Back to Podcasts" in PodcastEpisodesPage.tsx

### Priority 4: Filter Chips (15 minutes)
- [ ] Fix filter labels in AuditLogsScreen.tsx

**Total Estimated Time:** ~1 hour to fix all hardcoded strings

---

## Testing Checklist

After implementing fixes:
- [ ] Test admin pages in English - verify all strings translate
- [ ] Test admin pages in Hebrew - verify RTL and translations
- [ ] Test admin pages in Spanish - verify translations
- [ ] Test modal buttons (Cancel/Save) in all languages
- [ ] Test active toggle in all languages
- [ ] Test filter chips in all languages
- [ ] Verify no hardcoded strings remain

---

## Verification Script

Run this to verify no hardcoded strings remain:

```bash
# Search for common hardcoded patterns
grep -r ">Cancel</\|>Save</\|>Active</" web/src/pages/admin/ shared/screens/admin/

# Should return no matches after fixes
```

---

## Current Status

- ✅ **Translation keys added** to all 3 languages
- ⏳ **Code updates pending** (6 files need updating)
- ⏳ **Testing pending**

---

## Summary by File

| File | Hardcoded Strings | Priority | Estimated Time |
|------|------------------|----------|----------------|
| CategoriesPage.tsx | Cancel, Save | High | 5 min |
| LiveChannelsPage.tsx | Active, Cancel, Save | High | 5 min |
| PodcastsPage.tsx | Active, Cancel, Save | High | 5 min |
| PodcastEpisodesPage.tsx | Back to Podcasts, Cancel, Save | High | 10 min |
| RadioStationsPage.tsx | Active, Cancel, Save | High | 5 min |
| AuditLogsScreen.tsx | Filter labels (4) | Medium | 15 min |
| **TOTAL** | **16 instances** | | **~45 min** |

---

## Next Steps

1. Update all 6 files with translation keys (see recommended fixes above)
2. Test in all 3 languages
3. Run verification script to ensure complete coverage
4. Mark task as complete

---

**Report Generated:** 2026-01-12
**Files Analyzed:** 25 admin pages
**Issues Found:** 16 hardcoded strings in 6 files
**Translation Keys Added:** 8 new keys
**Status:** Translation keys ready, code updates pending
