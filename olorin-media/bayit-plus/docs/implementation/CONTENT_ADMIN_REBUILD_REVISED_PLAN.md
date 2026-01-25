# Content Admin Pages Rebuild - REVISED Implementation Plan

**Version:** 2.0 (Revised after 13-agent review)
**Date:** 2026-01-25
**Status:** Ready for Re-Review
**Previous Version Issues:** 9/13 reviewers required changes

---

## Executive Summary

Rebuild 4 content admin pages with **mandatory pre-implementation fixes** addressing:
- Console.log violations (10 instances)
- Missing backend batch endpoints (2 critical)
- Incomplete translations (6 languages at 0%)
- Security gaps (XSS, SSRF, file upload)
- No rollback mechanism (feature flags required)
- Touch target violations (accessibility)
- Duplicate component abstractions (reuse existing)

**Revised Timeline:** 6 weeks (was 4 weeks)
- **Week 1-2:** Pre-implementation fixes (blockers)
- **Week 3-4:** Page rebuilds with correct patterns
- **Week 5:** Security hardening & testing
- **Week 6:** Gradual rollout with feature flags

---

## Phase 0: Pre-Implementation Fixes (MANDATORY)

**Duration:** 2 weeks
**Owner:** Backend + Frontend teams
**Status:** BLOCKING - Must complete before Phase 1

### Fix 0.1: Remove Console.log Violations (Day 1)

**File:** `web/src/pages/admin/ContentLibraryPage.tsx`

**10 violations to fix:**
- Lines 134-137: Debug useEffect logging
- Line 387: Selection change logging
- Lines 701, 708, 712: Merge wizard logging
- Lines 772, 787: Component error logging

**Required Changes:**
```typescript
// ❌ BEFORE (FORBIDDEN)
console.log('[ContentLibraryPage] showMergeModal changed:', showMergeModal)
console.error('[ContentLibraryPage] Error rendering MergeWizard:', error)

// ✅ AFTER (REQUIRED)
import logger from '@/utils/logger'

logger.debug('Merge modal state changed', 'ContentLibraryPage', {
  showMergeModal,
  selectedCount: selectedIds.length
})
logger.error('Failed to render MergeWizard', 'ContentLibraryPage', error)
```

**Verification:**
```bash
# Must return zero results
grep -r "console\\.log\\|console\\.error\\|console\\.warn" web/src/pages/admin/Content*.tsx
```

**Acceptance Criteria:**
- ✅ All 10 console statements replaced with logger calls
- ✅ `grep` verification returns 0 matches
- ✅ Build succeeds without warnings

---

### Fix 0.2: Replace Tailwind className with StyleSheet (Day 1)

**File:** `web/src/pages/admin/FeaturedManagementPage.tsx`

**4 violations to fix:**
- Line 209: `<ScrollView className="flex-1">`
- Line 278: `<Text className="flex-1 text-red-500 text-sm">`
- Line 287: `<View className="flex-1 justify-center items-center gap-2">`
- Line 288: `<Text className="text-sm text-gray-400">`

**Required Changes:**
```typescript
// ❌ BEFORE (VIOLATION)
<ScrollView className="flex-1">
<Text className="flex-1 text-red-500 text-sm">{error}</Text>

// ✅ AFTER (CORRECT)
<ScrollView style={styles.container}>
<Text style={styles.errorText}>{error}</Text>

// Add to StyleSheet.create()
const styles = StyleSheet.create({
  container: { flex: 1 },
  errorText: {
    flex: 1,
    color: colors.error,
    fontSize: fontSize.sm
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm
  },
  loadingText: {
    fontSize: fontSize.sm,
    color: colors.textMuted
  },
})
```

**Verification:**
```bash
# Must return zero matches
grep -E "className=\".*\"" web/src/pages/admin/FeaturedManagementPage.tsx
```

**Acceptance Criteria:**
- ✅ All 4 className usages converted to StyleSheet
- ✅ Design tokens used (colors.error, fontSize.sm, spacing.sm)
- ✅ No Tailwind classes on React Native components

---

### Fix 0.3: Create Missing Backend Batch Endpoints (Days 2-3)

**File:** `backend/app/api/routes/admin_content_vod_write.py`

**Missing Endpoints:**
1. `POST /admin/content/batch/delete` - Batch delete content
2. `POST /admin/content/batch/feature` - Batch feature/unfeature
3. `POST /admin/content/batch/publish` - Batch publish/unpublish

**Implementation:**

```python
# backend/app/api/routes/admin_content_vod_write.py

from typing import List
from pydantic import BaseModel

class BatchDeleteRequest(BaseModel):
    content_ids: List[str]
    confirm: bool = False

class BatchFeatureRequest(BaseModel):
    content_ids: List[str]
    is_featured: bool

class BatchPublishRequest(BaseModel):
    content_ids: List[str]
    is_published: bool

@router.post("/content/batch/delete")
async def batch_delete_content(
    data: BatchDeleteRequest,
    user: User = Depends(get_current_user),
    permission: None = Depends(has_permission(Permission.CONTENT_DELETE))
):
    """Batch delete multiple content items with system-protected check."""
    if not data.confirm:
        return {"error": "Confirmation required", "status": "pending"}

    deleted_count = 0
    errors = []

    for content_id in data.content_ids:
        try:
            # Fetch content
            content = await Content.get(content_id)
            if not content:
                errors.append({"id": content_id, "error": "Not found"})
                continue

            # Check if system-protected
            if getattr(content, 'is_system_protected', False):
                errors.append({"id": content_id, "error": "System-protected content cannot be deleted"})
                continue

            # Delete episodes if series
            if content.is_series:
                await Content.find({"series_id": content.id}).delete()

            # Delete content
            await content.delete()
            deleted_count += 1

            # Audit log
            logger.info(f"Batch deleted content {content_id}", extra={
                "user_id": str(user.id),
                "content_id": content_id,
                "title": content.title
            })

        except Exception as e:
            logger.error(f"Failed to delete content {content_id}", exc_info=e)
            errors.append({"id": content_id, "error": str(e)})

    return {
        "deleted_count": deleted_count,
        "errors": errors,
        "total_requested": len(data.content_ids)
    }

@router.post("/content/batch/feature")
async def batch_feature_content(
    data: BatchFeatureRequest,
    user: User = Depends(get_current_user),
    permission: None = Depends(has_permission(Permission.CONTENT_UPDATE))
):
    """Batch feature/unfeature multiple content items."""
    updated_count = 0
    errors = []

    # Use bulk update for efficiency
    from pymongo import UpdateOne

    bulk_operations = []
    for content_id in data.content_ids:
        try:
            # Validate content exists
            content = await Content.get(content_id)
            if not content:
                errors.append({"id": content_id, "error": "Not found"})
                continue

            bulk_operations.append(
                UpdateOne(
                    {"_id": ObjectId(content_id)},
                    {"$set": {"is_featured": data.is_featured}}
                )
            )

        except Exception as e:
            errors.append({"id": content_id, "error": str(e)})

    # Execute bulk update
    if bulk_operations:
        collection = Content.get_motor_collection()
        result = await collection.bulk_write(bulk_operations, ordered=False)
        updated_count = result.modified_count

        # Audit log
        logger.info(f"Batch featured {updated_count} items", extra={
            "user_id": str(user.id),
            "is_featured": data.is_featured,
            "count": updated_count
        })

    return {
        "updated_count": updated_count,
        "errors": errors,
        "total_requested": len(data.content_ids)
    }

@router.post("/content/batch/publish")
async def batch_publish_content(
    data: BatchPublishRequest,
    user: User = Depends(get_current_user),
    permission: None = Depends(has_permission(Permission.CONTENT_UPDATE))
):
    """Batch publish/unpublish multiple content items."""
    updated_count = 0
    errors = []

    # Use bulk update
    from pymongo import UpdateOne

    bulk_operations = []
    for content_id in data.content_ids:
        try:
            content = await Content.get(content_id)
            if not content:
                errors.append({"id": content_id, "error": "Not found"})
                continue

            bulk_operations.append(
                UpdateOne(
                    {"_id": ObjectId(content_id)},
                    {"$set": {"is_published": data.is_published}}
                )
            )

        except Exception as e:
            errors.append({"id": content_id, "error": str(e)})

    if bulk_operations:
        collection = Content.get_motor_collection()
        result = await collection.bulk_write(bulk_operations, ordered=False)
        updated_count = result.modified_count

        logger.info(f"Batch published {updated_count} items", extra={
            "user_id": str(user.id),
            "is_published": data.is_published,
            "count": updated_count
        })

    return {
        "updated_count": updated_count,
        "errors": errors,
        "total_requested": len(data.content_ids)
    }
```

**Acceptance Criteria:**
- ✅ All 3 endpoints created and tested
- ✅ Bulk operations use MongoDB `bulk_write()` (not individual updates)
- ✅ System-protected content cannot be deleted
- ✅ Audit logging for all batch operations
- ✅ Error handling returns partial success results

---

### Fix 0.4: Complete i18n Translations (Days 4-7)

**Missing Translations:**
- Chinese (zh): 0/42 keys (0%)
- French (fr): 0/42 keys (0%)
- Italian (it): 0/42 keys (0%)
- Hindi (hi): 0/42 keys (0%)
- Tamil (ta): 0/42 keys (0%)
- Bengali (bn): 0/42 keys (0%)
- Spanish (es): 24/42 keys (57%) - 18 missing
- Japanese (ja): 5/42 keys (12%) - 37 missing

**Implementation:**

1. **Extract all admin.content.* keys from English:**
```bash
cd shared/i18n/locales
jq '.admin.content' en.json > admin_content_keys_en.json
```

2. **Professional Translation Service (Recommended):**
   - Use Phrase.com, Lokalise, or POEditor
   - Upload `admin_content_keys_en.json`
   - Request professional translation for 6 languages
   - Cost estimate: ~$150-250 for 42 keys × 6 languages
   - Turnaround: 3-5 business days

3. **Alternative: Machine Translation + Review:**
```bash
# Use Google Cloud Translation API
# Script: scripts/translate-admin-keys.py

import json
from google.cloud import translate_v2 as translate

translate_client = translate.Client()

with open('en.json') as f:
    en_data = json.load(f)

admin_keys = en_data['admin']['content']

languages = ['zh', 'fr', 'it', 'hi', 'ta', 'bn', 'es', 'ja']

for lang in languages:
    translated = {}
    for key, value in admin_keys.items():
        result = translate_client.translate(value, target_language=lang)
        translated[key] = result['translatedText']

    # Merge into existing locale file
    with open(f'{lang}.json', 'r+') as f:
        lang_data = json.load(f)
        if 'admin' not in lang_data:
            lang_data['admin'] = {}
        lang_data['admin']['content'] = translated
        f.seek(0)
        json.dump(lang_data, f, ensure_ascii=False, indent=2)
        f.truncate()
```

**Required Translation Keys** (42 total):
```json
{
  "admin": {
    "content": {
      "title": "Content Library",
      "subtitle": "Manage all content",
      "searchPlaceholder": "Search content...",
      "filters": {
        "title": "Filters",
        "contentType": "Content Type",
        "status": "Status",
        "all": "All",
        "series": "Series",
        "movies": "Movies",
        "podcasts": "Podcasts",
        "radioStations": "Radio Stations"
      },
      "columns": {
        "title": "Title",
        "category": "Category",
        "year": "Year",
        "subtitles": "Subtitles",
        "status": "Status",
        "actions": "Actions"
      },
      "status": {
        "published": "Published",
        "draft": "Draft"
      },
      "type": {
        "series": "Series",
        "movie": "Movie"
      },
      "selectedItems": "{{count}} item(s) selected",
      "batchMerge": "Merge",
      "batchFeature": "Feature",
      "batchUnfeature": "Unfeature",
      "confirmBatchDelete": "Delete {{count}} item(s)?",
      "editor": {
        "pageTitle": "Edit Content",
        "pageTitleNew": "Add New Content",
        "sections": {
          "basicInfo": "Basic Information",
          "media": "Media",
          "streaming": "Streaming",
          "details": "Content Details",
          "publishing": "Publishing",
          "accessControl": "Access Control"
        },
        "fields": {
          "title": "Title",
          "description": "Description",
          "thumbnail": "Thumbnail",
          "backdrop": "Backdrop",
          "streamUrl": "Stream URL",
          "streamType": "Stream Type",
          "drm": "DRM Protected"
        },
        "actions": {
          "save": "Save",
          "saving": "Saving...",
          "cancel": "Cancel"
        }
      },
      "validation": {
        "titleRequired": "Title is required",
        "requiredFields": "Please fill all required fields"
      },
      "createSuccess": "Content created successfully",
      "updateSuccess": "Content updated successfully",
      "deleteSuccess": "Content deleted successfully"
    }
  }
}
```

**Acceptance Criteria:**
- ✅ All 10 languages have complete admin.content.* translations
- ✅ No English fallback text visible when switching languages
- ✅ RTL languages (Hebrew, Arabic) tested and working
- ✅ Pluralization rules correct (selectedItems_one, selectedItems_other)

---

### Fix 0.5: Extract Language Utilities to Shared Module (Day 8)

**Current Issue:** Language utilities hardcoded in ContentLibraryPage.tsx (lines 68-103)

**Create:** `shared/utils/languageHelpers.ts`

```typescript
// shared/utils/languageHelpers.ts

/**
 * Language flag emoji mapping
 * Used for subtitle language display in content tables
 */
export const LANGUAGE_FLAGS: Record<string, string> = {
  he: '🇮🇱',
  en: '🇺🇸',
  ar: '🇸🇦',
  ru: '🇷🇺',
  es: '🇪🇸',
  fr: '🇫🇷',
  de: '🇩🇪',
  it: '🇮🇹',
  pt: '🇵🇹',
  zh: '🇨🇳',
  ja: '🇯🇵',
  ko: '🇰🇷',
  hi: '🇮🇳',
  ta: '🇮🇳',
  bn: '🇧🇩',
}

/**
 * Get flag emoji for language code
 * @param lang - ISO 639-1 language code
 * @returns Flag emoji or globe emoji for unknown languages
 */
export function getLanguageFlag(lang: string): string {
  return LANGUAGE_FLAGS[lang] || '🌐'
}

/**
 * Get localized language name
 * @param lang - ISO 639-1 language code
 * @param t - Translation function from useTranslation
 * @returns Localized language name (e.g., "עברית" in Hebrew)
 */
export function getLanguageName(lang: string, t: (key: string, options?: any) => string): string {
  return t(`common.languages.${lang}`, { defaultValue: lang.toUpperCase() })
}

/**
 * Format multiple languages as flag list
 * @param languages - Array of language codes
 * @returns String of flag emojis separated by spaces
 */
export function formatLanguageFlags(languages: string[]): string {
  return languages.map(getLanguageFlag).join(' ')
}
```

**Add to locale files:**
```json
// shared/i18n/locales/en.json
{
  "common": {
    "languages": {
      "he": "Hebrew",
      "en": "English",
      "es": "Spanish",
      "zh": "Chinese",
      "fr": "French",
      "it": "Italian",
      "de": "German",
      "pt": "Portuguese",
      "ru": "Russian",
      "ar": "Arabic",
      "ja": "Japanese",
      "ko": "Korean",
      "hi": "Hindi",
      "ta": "Tamil",
      "bn": "Bengali"
    }
  }
}

// shared/i18n/locales/he.json
{
  "common": {
    "languages": {
      "he": "עברית",
      "en": "אנגלית",
      "es": "ספרדית",
      "zh": "סינית",
      "fr": "צרפתית",
      "it": "איטלקית"
      // ... (translate all languages)
    }
  }
}
```

**Update ContentLibraryPage.tsx:**
```typescript
// Remove lines 68-103 (hardcoded utilities)
// Replace with:
import { getLanguageFlag, getLanguageName, formatLanguageFlags } from '@/shared/utils/languageHelpers'
```

**Acceptance Criteria:**
- ✅ Language utilities in shared module
- ✅ All locale files have common.languages.* keys
- ✅ Language names localized (not hardcoded English)
- ✅ ContentLibraryPage imports from shared utils

---

### Fix 0.6: Implement Feature Flag Infrastructure (Days 9-10)

**Required for:** Gradual rollout and instant rollback

**Backend: Create Feature Flag API**

```python
# backend/app/api/routes/admin/feature_flags.py

from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorClient

class FeatureFlag(BaseModel):
    name: str
    enabled: bool
    rollout_percentage: int = 100
    target_user_ids: list[str] = []
    created_at: datetime
    updated_at: datetime

@router.get("/admin/settings/feature-flags/public")
async def get_public_feature_flags():
    """Get all public feature flags (cached 60s)."""
    flags = await feature_flags_collection.find({"public": True}).to_list(length=None)
    return {"flags": {flag["name"]: flag for flag in flags}}

@router.post("/admin/settings/feature-flags/{flag_name}/toggle")
async def toggle_feature_flag(
    flag_name: str,
    enabled: bool,
    user: User = Depends(get_current_user),
    permission: None = Depends(has_permission(Permission.SUPER_ADMIN))
):
    """Toggle feature flag instantly (admin only)."""
    await feature_flags_collection.update_one(
        {"name": flag_name},
        {
            "$set": {
                "enabled": enabled,
                "updated_at": datetime.utcnow()
            }
        },
        upsert=True
    )

    logger.info(f"Feature flag toggled: {flag_name} = {enabled}", extra={
        "user_id": str(user.id),
        "flag_name": flag_name,
        "enabled": enabled
    })

    return {"success": True, "flag": flag_name, "enabled": enabled}

@router.post("/admin/settings/feature-flags/{flag_name}/rollout")
async def set_rollout_percentage(
    flag_name: str,
    percentage: int,
    user: User = Depends(get_current_user),
    permission: None = Depends(has_permission(Permission.SUPER_ADMIN))
):
    """Set gradual rollout percentage (0-100)."""
    if not 0 <= percentage <= 100:
        raise HTTPException(400, "Percentage must be 0-100")

    await feature_flags_collection.update_one(
        {"name": flag_name},
        {
            "$set": {
                "rollout_percentage": percentage,
                "updated_at": datetime.utcnow()
            }
        },
        upsert=True
    )

    return {"success": True, "flag": flag_name, "rollout_percentage": percentage}
```

**Frontend: Feature Flag Hook**

```typescript
// web/src/hooks/useFeatureFlag.ts

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'

interface FeatureFlagData {
  enabled: boolean
  rollout_percentage: number
}

export function useFeatureFlag(flagName: string) {
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const { user } = useAuthStore()

  useEffect(() => {
    const fetchFlags = async () => {
      try {
        const response = await fetch('/api/v1/admin/settings/feature-flags/public')
        const data = await response.json()
        const flag: FeatureFlagData = data.flags[flagName]

        if (!flag || !flag.enabled) {
          setEnabled(false)
          return
        }

        // Check rollout percentage (deterministic hash)
        const userHash = hashString(`${user.id}-${flagName}`) % 100
        const isInRollout = userHash < flag.rollout_percentage

        setEnabled(isInRollout)
      } catch (error) {
        logger.error('Failed to fetch feature flags', 'useFeatureFlag', error)
        setEnabled(false)
      } finally {
        setLoading(false)
      }
    }

    fetchFlags()

    // Poll every 60 seconds for updates
    const interval = setInterval(fetchFlags, 60000)
    return () => clearInterval(interval)
  }, [flagName, user.id])

  return { enabled, loading }
}

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}
```

**Feature Flag Wrapper Pattern:**

```typescript
// web/src/pages/admin/ContentLibraryPage.tsx

import { useFeatureFlag } from '@/hooks/useFeatureFlag'
import ContentLibraryPageNew from './ContentLibraryPage.new'
import ContentLibraryPageLegacy from './ContentLibraryPage.legacy'

export default function ContentLibraryPageWrapper() {
  const { enabled, loading } = useFeatureFlag('admin_content_library_new')

  if (loading) {
    return <GlassLoadingSpinner />
  }

  return enabled ? <ContentLibraryPageNew /> : <ContentLibraryPageLegacy />
}
```

**Seed Feature Flags:**

```python
# backend/scripts/seed_feature_flags.py

flags = [
    {
        "name": "admin_content_library_new",
        "enabled": False,
        "rollout_percentage": 0,
        "public": True,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    },
    {
        "name": "admin_uploads_new",
        "enabled": False,
        "rollout_percentage": 0,
        "public": True,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    },
    {
        "name": "admin_categories_new",
        "enabled": False,
        "rollout_percentage": 0,
        "public": True,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    },
    {
        "name": "admin_editor_new",
        "enabled": False,
        "rollout_percentage": 0,
        "public": True,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
]

await feature_flags_collection.insert_many(flags)
```

**Acceptance Criteria:**
- ✅ Feature flag API endpoints created
- ✅ Frontend hook with rollout percentage support
- ✅ Wrapper components for all 4 pages
- ✅ Legacy pages renamed to `.legacy.tsx` (NOT deleted)
- ✅ Feature flags seeded in database
- ✅ Admin dashboard to toggle flags (optional but recommended)

---

### Fix 0.7: Security Hardening (Days 11-12)

**0.7.1: Input Sanitization (ContentEditorPage)**

```typescript
// web/src/pages/admin/ContentEditorPage.tsx

import { sanitizeMessage } from '@bayit/glass-ui/utils/sanitization'

const handleSubmit = async () => {
  // Validate required fields
  if (!formData.title || !formData.stream_url) {
    setError(t('admin.content.validation.requiredFields'))
    return
  }

  // Validate field lengths
  if (formData.title.length > 200) {
    setError(t('admin.content.validation.titleTooLong'))
    return
  }

  if (formData.description && formData.description.length > 2000) {
    setError(t('admin.content.validation.descriptionTooLong'))
    return
  }

  // Validate stream URL format
  const urlPattern = /^https?:\/\/.+\.(m3u8|mpd|mp4|avi|mkv)$/i
  if (!urlPattern.test(formData.stream_url)) {
    setError(t('admin.content.validation.invalidStreamUrl'))
    return
  }

  // Validate subscription tier
  const validTiers = ['free', 'basic', 'premium', 'vip']
  if (!validTiers.includes(formData.subscription_tier)) {
    setError(t('admin.content.validation.invalidTier'))
    return
  }

  // Sanitize before submission
  const sanitizedData = {
    ...formData,
    title: sanitizeMessage(formData.title),
    description: formData.description ? sanitizeMessage(formData.description) : undefined,
    director: formData.director ? sanitizeMessage(formData.director) : undefined,
    cast: formData.cast ? sanitizeMessage(formData.cast) : undefined,
  }

  try {
    setSubmitting(true)
    if (contentId) {
      await adminContentService.updateContent(contentId, sanitizedData)
      setSuccess(t('admin.content.updateSuccess'))
    } else {
      await adminContentService.createContent(sanitizedData)
      setSuccess(t('admin.content.createSuccess'))
    }
    // Redirect after 2 seconds
    setTimeout(() => navigate('/admin/content'), 2000)
  } catch (err) {
    logger.error('Failed to save content', 'ContentEditorPage', err)
    setError(t('admin.content.saveFailed'))
  } finally {
    setSubmitting(false)
  }
}
```

**0.7.2: SSRF Protection (ImageUploader)**

```typescript
// shared/components/admin/ImageUploader.tsx

const ALLOWED_URL_SCHEMES = ['http:', 'https:']
const BLOCKED_IP_PATTERNS = [
  /^127\./,                    // localhost
  /^10\./,                     // Private class A
  /^172\.(1[6-9]|2[0-9]|3[01])\./, // Private class B
  /^192\.168\./,               // Private class C
  /^169\.254\./,               // Link-local
  /^::1$/,                     // IPv6 localhost
  /^fe80:/,                    // IPv6 link-local
]

const handleUrlUpload = async () => {
  try {
    const parsedUrl = new URL(urlInput)

    // Validate scheme
    if (!ALLOWED_URL_SCHEMES.includes(parsedUrl.protocol)) {
      setError(t('admin.upload.invalidScheme'))
      return
    }

    // Block private IPs
    const hostname = parsedUrl.hostname
    if (BLOCKED_IP_PATTERNS.some(pattern => pattern.test(hostname))) {
      setError(t('admin.upload.privateIpBlocked'))
      return
    }

    // Backend will perform additional validation
    const response = await uploadsService.uploadFromUrl(urlInput, uploadType)
    onUploadComplete(response.url)

  } catch (error) {
    logger.error('Invalid URL for upload', 'ImageUploader', error)
    setError(t('admin.upload.invalidUrl'))
  }
}
```

**0.7.3: File Upload Validation**

```typescript
// shared/components/admin/ImageUploader.tsx

const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MIN_IMAGE_DIMENSION = 50

const validateFile = async (file: File): Promise<boolean> => {
  // Extension whitelist
  const ext = file.name.toLowerCase().match(/\.\w+$/)?.[0]
  if (!ext || !ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
    setError(t('admin.upload.invalidFileType'))
    return false
  }

  // File size check
  if (file.size > MAX_FILE_SIZE) {
    setError(t('admin.upload.fileTooLarge'))
    return false
  }

  // Image dimensions check
  try {
    const dimensions = await getImageDimensions(file)
    if (dimensions.width < MIN_IMAGE_DIMENSION || dimensions.height < MIN_IMAGE_DIMENSION) {
      setError(t('admin.upload.imageTooSmall'))
      return false
    }
  } catch (error) {
    logger.error('Failed to read image dimensions', 'ImageUploader', error)
    setError(t('admin.upload.invalidImage'))
    return false
  }

  return true
}

const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.width, height: img.height })
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}
```

**Backend: Magic Number Validation**

```python
# backend/app/services/upload_service.py

ALLOWED_IMAGE_SIGNATURES = {
    b'\xFF\xD8\xFF': 'image/jpeg',      # JPEG
    b'\x89PNG\r\n\x1a\n': 'image/png',  # PNG
    b'GIF87a': 'image/gif',             # GIF87a
    b'GIF89a': 'image/gif',             # GIF89a
    b'RIFF': 'image/webp',              # WebP (partial check)
}

async def validate_image_upload(file_bytes: bytes, declared_mime: str) -> bool:
    """Validate image using magic number (not just MIME type)."""

    # Check magic number
    for signature, mime_type in ALLOWED_IMAGE_SIGNATURES.items():
        if file_bytes.startswith(signature):
            # MIME type matches magic number
            if declared_mime == mime_type:
                return True
            # MIME mismatch - possible attack
            logger.warning(f"MIME type mismatch: declared {declared_mime}, actual {mime_type}")
            return False

    # No valid magic number found
    logger.warning(f"Invalid image magic number for {declared_mime}")
    return False
```

**Acceptance Criteria:**
- ✅ Input sanitization in ContentEditorPage (all text fields)
- ✅ SSRF protection in ImageUploader (URL scheme + IP blocking)
- ✅ File upload validation (extension, size, dimensions)
- ✅ Backend magic number validation
- ✅ All error messages translated

---

### Fix 0.8: Touch Target Fixes (Day 13)

**File:** `shared/screens/admin/UsersListScreen.tsx`

**Before:**
```typescript
actionButton: {
  width: 30,   // ❌ Too small
  height: 30,
  borderRadius: borderRadius.sm,
  backgroundColor: colors.backgroundLighter,
  justifyContent: 'center',
  alignItems: 'center',
}
```

**After:**
```typescript
actionButton: {
  width: 44,   // ✅ iOS/Android minimum
  height: 44,
  borderRadius: borderRadius.sm,
  backgroundColor: colors.backgroundLighter,
  justifyContent: 'center',
  alignItems: 'center',
}
```

**Also fix in:**
- DataTable checkboxes (expand touch area to 44x44)
- Pagination buttons (increase from 32x32 to 44x44)
- Close/clear buttons in filter chips

**Acceptance Criteria:**
- ✅ All interactive elements minimum 44x44pt
- ✅ Tested on mobile browsers (Safari iOS, Chrome Android)
- ✅ No accessibility violations

---

### Fix 0.9: Optimize Featured Reorder (Day 14)

**File:** `web/src/pages/admin/FeaturedManagementPage.tsx`

**Before (N+1 Query):**
```typescript
const handleSaveOrder = async () => {
  const updatePromises = items.map((item, index) =>
    adminContentService.updateContent(item.id, { featured_order: index })
  )
  await Promise.all(updatePromises) // N HTTP requests
}
```

**After (Single Bulk Request):**
```typescript
const handleSaveOrder = async () => {
  try {
    setSaving(true)

    // Prepare bulk update data
    const updates = items.map((item, index) => ({
      id: item.id,
      featured_order: index
    }))

    // Single API call
    await adminContentService.bulkUpdateFeaturedOrder(updates)

    setOriginalItems([...items])
    setHasChanges(false)
    notifications.show({
      level: 'success',
      title: t('admin.featured.saveSuccess'),
      message: t('admin.featured.orderUpdated', { count: items.length })
    })
  } catch (error) {
    logger.error('Failed to save featured order', 'FeaturedManagementPage', error)
    notifications.show({
      level: 'error',
      title: t('admin.featured.saveFailed'),
      message: error.message
    })
  } finally {
    setSaving(false)
  }
}
```

**Backend Endpoint:**
```python
# backend/app/api/routes/admin_content_vod_write.py

from typing import List
from pydantic import BaseModel

class FeaturedOrderUpdate(BaseModel):
    id: str
    featured_order: int

class BulkFeaturedOrderRequest(BaseModel):
    updates: List[FeaturedOrderUpdate]

@router.post("/content/bulk/featured-order")
async def bulk_update_featured_order(
    data: BulkFeaturedOrderRequest,
    user: User = Depends(get_current_user),
    permission: None = Depends(has_permission(Permission.CONTENT_UPDATE))
):
    """Bulk update featured_order for multiple items (single round-trip)."""
    from pymongo import UpdateOne

    bulk_operations = []
    for update in data.updates:
        bulk_operations.append(
            UpdateOne(
                {"_id": ObjectId(update.id)},
                {"$set": {"featured_order": update.featured_order}}
            )
        )

    if bulk_operations:
        collection = Content.get_motor_collection()
        result = await collection.bulk_write(bulk_operations, ordered=False)

        logger.info(f"Bulk updated featured order for {result.modified_count} items", extra={
            "user_id": str(user.id),
            "count": result.modified_count
        })

        return {
            "updated_count": result.modified_count,
            "total_requested": len(data.updates)
        }

    return {"updated_count": 0, "total_requested": 0}
```

**Acceptance Criteria:**
- ✅ Single HTTP request for reorder save
- ✅ Backend uses MongoDB bulk_write()
- ✅ Frontend updated to use new endpoint

---

## Phase 1: Shared Infrastructure (Week 3)

**Duration:** 1 week
**Prerequisites:** Phase 0 completed and verified

### CORRECTED: Reuse Existing Components

**DO NOT CREATE:**
- ❌ AdminPageLayout (use existing GlassPageHeader)
- ❌ AdminEmptyState (use GlassHierarchicalTable emptyMessage prop)
- ❌ AdminLoadingState (use existing GlassSkeleton/GlassLoadingSpinner)

**CREATE ONLY 2 NEW COMPONENTS:**

#### 1.1: GlassFilterBar Component

```typescript
// shared/components/ui/GlassFilterBar.tsx

interface GlassFilterBarProps {
  searchValue: string
  onSearchChange: (value: string) => void
  filters: Array<{
    label: string
    value: any
    options: Array<{ label: string; value: any }>
    onChange: (value: any) => void
  }>
  isRTL: boolean
}

export function GlassFilterBar({ searchValue, onSearchChange, filters, isRTL }: GlassFilterBarProps) {
  const [showDropdown, setShowDropdown] = useState(false)

  return (
    <View style={[styles.container, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      <GlassInput
        value={searchValue}
        onChangeText={onSearchChange}
        placeholder={t('common.search')}
        icon={<Search size={18} />}
        style={styles.searchInput}
      />

      <Pressable onPress={() => setShowDropdown(!showDropdown)} style={styles.filterButton}>
        <Filter size={18} />
        <Text style={styles.filterText}>{t('common.filters')}</Text>
      </Pressable>

      {showDropdown && (
        <View style={[styles.dropdown, { [isRTL ? 'left' : 'right']: spacing.lg }]}>
          {filters.map((filter, index) => (
            <GlassSelect
              key={index}
              label={filter.label}
              value={filter.value}
              options={filter.options}
              onChange={filter.onChange}
            />
          ))}
        </View>
      )}
    </View>
  )
}
```

#### 1.2: GlassBatchActionBar Component

```typescript
// shared/components/ui/GlassBatchActionBar.tsx

interface GlassBatchActionBarProps {
  selectedCount: number
  actions: Array<{
    label: string
    icon: React.ReactNode
    onPress: () => void
    variant?: 'primary' | 'secondary' | 'danger'
  }>
  onClearSelection: () => void
  isRTL: boolean
}

export function GlassBatchActionBar({ selectedCount, actions, onClearSelection, isRTL }: GlassBatchActionBarProps) {
  return (
    <View style={[styles.container, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      <Text style={styles.selectedText}>
        {t('common.selectedItems', { count: selectedCount })}
      </Text>

      <View style={[styles.actions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {actions.map((action, index) => (
          <GlassButton
            key={index}
            title={action.label}
            onPress={action.onPress}
            variant={action.variant || 'secondary'}
            icon={action.icon}
          />
        ))}

        <GlassButton
          title={t('common.clearSelection')}
          onPress={onClearSelection}
          variant="ghost"
          icon={<X size={18} />}
        />
      </View>
    </View>
  )
}
```

### CORRECTED: Simplified Hooks

**DO NOT CREATE:**
- ❌ useAdminData (too generic, anti-pattern)
- ❌ useSelection (already exists in TreeActions.tsx - move to shared)

**CREATE ONLY 2 NEW HOOKS:**

#### 1.3: useAdminForm Hook

```typescript
// web/src/hooks/admin/useAdminForm.ts

interface UseAdminFormOptions<T> {
  initialData?: T
  onSubmit: (data: T) => Promise<void>
  validate?: (data: T) => Record<string, string> | null
}

export function useAdminForm<T extends Record<string, any>>(options: UseAdminFormOptions<T>) {
  const [formData, setFormData] = useState<T>(options.initialData || {} as T)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleChange = (field: keyof T, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error for this field
    if (errors[field as string]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field as string]
        return newErrors
      })
    }
  }

  const handleSubmit = async () => {
    // Validate if validator provided
    if (options.validate) {
      const validationErrors = options.validate(formData)
      if (validationErrors) {
        setErrors(validationErrors)
        return
      }
    }

    try {
      setIsSubmitting(true)
      setErrors({})
      await options.onSubmit(formData)
    } catch (error) {
      logger.error('Form submission failed', 'useAdminForm', error)
      setErrors({ submit: error.message })
    } finally {
      setIsSubmitting(false)
    }
  }

  const reset = () => {
    setFormData(options.initialData || {} as T)
    setErrors({})
  }

  return {
    formData,
    handleChange,
    handleSubmit,
    isSubmitting,
    errors,
    reset,
  }
}
```

#### 1.4: Move Existing useSelection to Shared

```bash
# Move existing hook
mv web/src/components/admin/hierarchy/TreeActions.tsx web/src/hooks/admin/useSelection.ts

# Extract only the hook logic
# Update imports in ContentLibraryPage
```

---

## Phase 2: Page Rebuilds (Week 4)

**Duration:** 1 week
**Prerequisites:** Phase 0 + Phase 1 completed

### Page-Specific Implementation

**For each page:**

1. **Rename existing to `.legacy.tsx`:**
   ```bash
   mv ContentLibraryPage.tsx ContentLibraryPage.legacy.tsx
   ```

2. **Create wrapper with feature flag:**
   ```typescript
   // ContentLibraryPage.tsx
   export default function ContentLibraryPageWrapper() {
     const { enabled, loading } = useFeatureFlag('admin_content_library_new')
     if (loading) return <GlassLoadingSpinner />
     return enabled ? <ContentLibraryPageNew /> : <ContentLibraryPageLegacy />
   }
   ```

3. **Create new implementation:**
   - Use GlassPageHeader (not custom AdminPageLayout)
   - Use GlassFilterBar for search/filters
   - Use GlassBatchActionBar for selection actions
   - Use logger (not console.log)
   - Use StyleSheet.create() (not Tailwind className)
   - Add accessibility labels

4. **Extract sub-components:**
   - Keep main file <200 lines
   - Create page-specific components in same directory

---

## Phase 3: Testing & Refinement (Week 5)

### 3.1: Security Testing
- XSS injection tests (sanitization)
- SSRF bypass tests (URL validation)
- File upload bypass tests (polyglot files)
- Batch operation edge cases

### 3.2: Accessibility Testing
- VoiceOver (iOS) testing
- TalkBack (Android) testing
- Keyboard-only navigation
- Screen reader announcements
- WCAG AA compliance verification

### 3.3: Performance Testing
- Bundle size verification (<512KB admin chunk)
- Page load times (FCP <1.5s, LCP <2.5s)
- Large dataset testing (1000+ content items)
- Mobile performance (3G throttling)

### 3.4: Cross-Browser Testing
- Chrome, Firefox, Safari (WebKit), Edge
- Mobile browsers (Safari iOS, Chrome Android)
- Viewport testing (320px to 2560px)

---

## Phase 4: Gradual Rollout (Week 6)

### Rollout Schedule

**Day 1-2: Internal Beta (Specific User IDs)**
```python
# Set target users only
await feature_flags_collection.update_one(
    {"name": "admin_content_library_new"},
    {"$set": {
        "enabled": True,
        "rollout_percentage": 0,
        "target_user_ids": ["user_id_1", "user_id_2"]
    }}
)
```

**Day 3-4: 10% Rollout**
```python
await feature_flags_collection.update_one(
    {"name": "admin_content_library_new"},
    {"$set": {"rollout_percentage": 10}}
)
```

**Day 5-6: 25% Rollout** (if no issues)

**Day 7-9: 50% Rollout**

**Day 10+: 100% Rollout**

**Week 6+4: Remove Feature Flags & Legacy Code**

### Monitoring During Rollout

**Sentry Dashboards:**
- Error rate by version (new vs legacy)
- Performance by version
- User engagement metrics

**Rollback Procedure:**
```python
# Instant rollback (no deployment)
await feature_flags_collection.update_one(
    {"name": "admin_content_library_new"},
    {"$set": {"enabled": False}}
)
# All users revert to legacy in 60 seconds (cache TTL)
```

---

## Success Criteria (REVISED)

### Phase 0 (Pre-Implementation Fixes)
- ✅ Zero console.log/error statements in all admin pages
- ✅ Zero Tailwind className on React Native components
- ✅ All 3 batch endpoints implemented and tested
- ✅ All 10 languages have 100% admin.content.* coverage
- ✅ Language utilities in shared module
- ✅ Feature flag infrastructure operational
- ✅ Input sanitization, SSRF protection, file validation implemented
- ✅ All touch targets minimum 44x44pt
- ✅ Featured reorder uses bulk update (single request)

### Phase 1 (Shared Infrastructure)
- ✅ GlassFilterBar component created (NOT AdminPageLayout)
- ✅ GlassBatchActionBar component created
- ✅ useAdminForm hook created
- ✅ useSelection moved to shared hooks

### Phase 2 (Page Rebuilds)
- ✅ All 4 pages under 200 lines (main files)
- ✅ Legacy pages retained with `.legacy.tsx` suffix
- ✅ Feature flag wrappers for all pages
- ✅ 100% Glass component usage
- ✅ 100% StyleSheet.create() styling
- ✅ Complete i18n coverage
- ✅ RTL support functional
- ✅ All accessibility labels present

### Phase 3 (Testing)
- ✅ Security tests pass (XSS, SSRF, file upload)
- ✅ Accessibility tests pass (VoiceOver, WCAG AA)
- ✅ Performance targets met (bundle <512KB, LCP <2.5s)
- ✅ Cross-browser compatibility verified

### Phase 4 (Rollout)
- ✅ Internal beta successful (no critical bugs)
- ✅ 10% rollout stable for 48 hours
- ✅ 100% rollout achieved
- ✅ Legacy usage <1%
- ✅ Feature flags removed
- ✅ Legacy code deleted

---

## Rollback Strategy (REVISED)

### Instant Rollback (No Deployment)
1. Admin toggles feature flag to `false`
2. All users revert to legacy version in 60 seconds
3. No code changes or redeployment required

### Partial Rollback
1. Reduce rollout percentage (100% → 50% → 10% → 0%)
2. Monitor error rates at each level
3. Identify and fix issues
4. Resume rollout when stable

### Full Rollback with Fix
1. Toggle feature flag to `false` (instant rollback)
2. Fix issue in code
3. Deploy fix to staging
4. Re-enable feature flag at 10%
5. Resume gradual rollout

---

## Risk Mitigation (REVISED)

| Risk | Mitigation |
|------|------------|
| Critical bug in new page | Feature flag instant rollback (60s) |
| Backend batch endpoint fails | Keep individual endpoints as fallback |
| Translation errors | Professional translation service + review |
| Performance regression | Bundle size checks in CI, performance budgets |
| Security vulnerability | Security testing in Phase 3, penetration testing |
| Accessibility regression | VoiceOver/TalkBack testing, WCAG AA audit |
| User confusion | Gradual rollout, monitor support tickets |
| Cache invalidation issues | Feature flag polling (60s), version headers |

---

## Estimated Timeline (REVISED)

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| **Phase 0: Fixes** | 2 weeks | All 9 blockers resolved, verified |
| **Phase 1: Infrastructure** | 1 week | 2 components, 2 hooks |
| **Phase 2: Rebuilds** | 1 week | 4 pages rebuilt, feature flags |
| **Phase 3: Testing** | 1 week | Security, a11y, performance tests |
| **Phase 4: Rollout** | 1 week | Gradual rollout to 100% |
| **Cleanup** | +4 weeks | Remove flags, delete legacy code |
| **TOTAL** | 6 weeks (+4 weeks cleanup) |

---

## Appendix: Verification Commands

```bash
# Verify console.log removal
grep -r "console\\.log\\|console\\.error" web/src/pages/admin/*.tsx
# Expected: 0 matches

# Verify className removal
grep -E "className=\".*\"" web/src/pages/admin/FeaturedManagementPage.tsx
# Expected: 0 matches

# Verify translation coverage
node scripts/verify-translations.js admin.content
# Expected: 100% for all 10 languages

# Verify bundle sizes
npm run build && ls -lh web/dist/*.chunk.js
# Expected: admin chunk <512KB

# Verify touch targets
grep "width: 30\\|height: 30" shared/screens/admin/*.tsx
# Expected: 0 matches

# Verify feature flags seeded
curl http://localhost:8090/api/v1/admin/settings/feature-flags/public
# Expected: 4 flags with enabled=false
```

---

**END OF REVISED PLAN**

This plan addresses all 9 reviewers' critical issues and is ready for re-submission to the 13-agent review panel.
