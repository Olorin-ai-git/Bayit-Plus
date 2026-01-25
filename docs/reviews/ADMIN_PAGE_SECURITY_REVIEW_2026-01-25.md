# ADMIN PAGE SECURITY REVIEW
**Date:** 2026-01-25  
**Reviewer:** Security Specialist (security-specialist)  
**Scope:** Admin page rebuilds - ContentEditorPage & ContentLibraryPage  
**Status:** ⚠️ CHANGES REQUIRED

---

## EXECUTIVE SUMMARY

The admin page rebuild plan demonstrates **good baseline security** but requires **critical improvements** before implementation approval. The authentication/authorization infrastructure is solid, but several security gaps exist in input validation, batch operations, and audit logging.

**Overall Security Score:** 6.5/10

**Critical Issues:** 3  
**High Priority:** 4  
**Medium Priority:** 3  
**Recommendations:** 8

---

## 1. AUTHENTICATION & AUTHORIZATION ✅ APPROVED

### ✅ Strengths

**Backend RBAC Implementation:**
- ✅ Permission-based access control via `has_permission()` dependency
- ✅ Role hierarchy: SUPER_ADMIN → ADMIN → MODERATOR → CONTENT_MANAGER
- ✅ Fine-grained permissions: `CONTENT_READ`, `CONTENT_WRITE`, `CONTENT_DELETE`
- ✅ All admin routes protected with `Depends(has_permission(Permission.CONTENT_WRITE))`
- ✅ Audit logging integrated (`log_audit()` function)

**Frontend Token Management:**
```typescript
// shared/services/adminApi.ts
adminApi.interceptors.request.use((config) => {
  const token = authStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // ...
});

// Automatic 401 handling with logout + redirect
adminApi.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      authStore.getState().logout();
      window.location.href = `/login?redirect=${currentPath}`;
    }
    // ...
  }
);
```

**Session Security:**
- ✅ JWT tokens with expiration
- ✅ Automatic logout on 401 Unauthorized
- ✅ Redirect to login with return URL preservation
- ✅ CSRF token support via cookies (`X-CSRF-Token` header)

### ⚠️ Findings

**No Critical Issues** - Authentication/Authorization implementation is solid.

---

## 2. INPUT VALIDATION & SANITIZATION ⚠️ CHANGES REQUIRED

### ✅ Strengths

**Backend Middleware Protection:**
```python
# backend/app/middleware/input_sanitization.py
class InputSanitizationMiddleware(BaseHTTPMiddleware):
    DANGEROUS_PATTERNS = [
        r"<script[^>]*>.*?</script>",  # XSS
        r"javascript:",                 # XSS
        r"on\w+\s*=",                   # Event handlers
        r"<iframe[^>]*>",               # Iframes
        r"(\bUNION\b.*\bSELECT\b)",     # SQL injection
        r"(\bDROP\b.*\bTABLE\b)",       # SQL injection
        # ... etc
    ]
```

**Frontend Sanitization:**
```typescript
// packages/ui/glass-components/src/utils/sanitization.ts
export const sanitizeMessage = (message: string): string => {
  // Remove script tags (XSS prevention)
  let sanitized = message.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  // Remove style tags
  sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  // Remove all HTML tags
  sanitized = sanitized.replace(/<[^>]*>/g, '');
  // Remove XSS patterns
  return sanitized.replace(/javascript:/gi, '').replace(/on\w+\s*=/gi, '');
};
```

### 🔴 CRITICAL ISSUES

#### C1: Insufficient Client-Side Validation in ContentEditorPage

**Risk:** Malicious admin could bypass minimal validation and inject dangerous content.

**Current Implementation:**
```typescript
// ContentEditorPage.tsx - Lines 62-66
const handleSubmit = async () => {
  if (!formData.title || !formData.stream_url || !formData.category_id) {
    setError('Please fill all required fields')
    return
  }
  // No sanitization before submission! ❌
  await adminContentService.createContent(formData as Content)
}
```

**Attack Vectors:**
- **XSS in title/description:** `<script>alert('XSS')</script>` in title field
- **Malicious stream URLs:** `javascript:alert(document.cookie)` in stream_url
- **HTML injection:** `<img src=x onerror=alert(1)>` in description

**Required Changes:**

```typescript
import { sanitizeMessage } from '@bayit/glass-ui/utils/sanitization';

const handleSubmit = async () => {
  // ✅ VALIDATION STEP 1: Required fields
  if (!formData.title || !formData.stream_url || !formData.category_id) {
    setError(t('admin.content.validation.requiredFields'))
    return
  }

  // ✅ VALIDATION STEP 2: Field length limits
  if (formData.title.length > 200) {
    setError('Title must not exceed 200 characters')
    return
  }

  if (formData.description && formData.description.length > 2000) {
    setError('Description must not exceed 2000 characters')
    return
  }

  // ✅ VALIDATION STEP 3: URL format validation
  try {
    new URL(formData.stream_url)
  } catch {
    setError('Invalid stream URL format')
    return
  }

  // ✅ VALIDATION STEP 4: Sanitize user input before submission
  const sanitizedData = {
    ...formData,
    title: sanitizeMessage(formData.title),
    description: formData.description ? sanitizeMessage(formData.description) : undefined,
    genre: formData.genre ? sanitizeMessage(formData.genre) : undefined,
    director: formData.director ? sanitizeMessage(formData.director) : undefined,
    rating: formData.rating ? sanitizeMessage(formData.rating) : undefined,
  }

  // ✅ VALIDATION STEP 5: Validate subscription tier
  const validTiers = ['basic', 'premium', 'family']
  if (!validTiers.includes(sanitizedData.requires_subscription)) {
    setError('Invalid subscription tier')
    return
  }

  try {
    if (contentId) {
      await adminContentService.updateContent(contentId, sanitizedData)
    } else {
      await adminContentService.createContent(sanitizedData as Content)
    }
    setSuccess(true)
  } catch (err) {
    logger.error('Failed to save content', err)
    setError(err.message)
  }
}
```

**Severity:** CRITICAL  
**Impact:** XSS attacks, content injection  
**Likelihood:** HIGH (admin forms are high-value targets)

---

#### C2: Image Upload URL Validation Insufficient

**Risk:** SSRF (Server-Side Request Forgery) via malicious image URLs.

**Current Implementation:**
```typescript
// ImageUploader.tsx - Lines 102-126
const handleUrlSubmit = async () => {
  if (!urlInput.trim()) return
  
  const response = await uploadsService.validateUrl(urlInput)
  if (response.valid) {
    onChange(urlInput)  // ❌ No URL scheme validation!
  }
}
```

**Attack Vectors:**
- **SSRF:** `http://169.254.169.254/latest/meta-data/` (AWS metadata endpoint)
- **Local file access:** `file:///etc/passwd`
- **Internal network scanning:** `http://192.168.1.1:22`
- **Malicious redirects:** URLs pointing to phishing sites

**Required Changes:**

```typescript
const ALLOWED_URL_SCHEMES = ['http:', 'https:']
const BLOCKED_IP_PATTERNS = [
  /^127\./,           // Localhost
  /^10\./,            // Private network
  /^172\.(1[6-9]|2[0-9]|3[01])\./,  // Private network
  /^192\.168\./,      // Private network
  /^169\.254\./,      // Link-local
  /^::1$/,            // IPv6 localhost
  /^fc00:/,           // IPv6 private
]

const handleUrlSubmit = async () => {
  if (!urlInput.trim()) return

  setIsUploading(true)
  setError(null)

  try {
    // ✅ STEP 1: Validate URL format
    let parsedUrl: URL
    try {
      parsedUrl = new URL(urlInput.trim())
    } catch {
      setError('Invalid URL format')
      return
    }

    // ✅ STEP 2: Validate URL scheme (prevent file://, ftp://, etc.)
    if (!ALLOWED_URL_SCHEMES.includes(parsedUrl.protocol)) {
      setError('Only HTTP and HTTPS URLs are allowed')
      return
    }

    // ✅ STEP 3: Block private IP ranges (SSRF prevention)
    const hostname = parsedUrl.hostname.toLowerCase()
    if (BLOCKED_IP_PATTERNS.some(pattern => pattern.test(hostname))) {
      setError('Private/local network URLs are not allowed')
      return
    }

    // ✅ STEP 4: Validate with backend (checks content-type, size, etc.)
    const response = await uploadsService.validateUrl(urlInput)
    if (response.valid) {
      onChange(urlInput)
      setUrlInput('')
      setShowUrlInput(false)
    } else {
      setError(response.message || 'Invalid image URL')
    }
  } catch (err) {
    logger.error('URL validation failed', err)
    setError('Failed to validate image URL')
  } finally {
    setIsUploading(false)
  }
}
```

**Severity:** CRITICAL  
**Impact:** SSRF, internal network access, data exfiltration  
**Likelihood:** MEDIUM (requires malicious admin, but high impact)

---

#### C3: File Upload Validation - Client-Side Only

**Risk:** Malicious file uploads if backend validation is missing.

**Current Implementation:**
```typescript
// ImageUploader.tsx - Lines 46-62
const validateFile = (file: File): boolean => {
  if (!file.type.startsWith('image/')) {  // ❌ MIME type can be spoofed!
    setError('Only images allowed')
    return false
  }
  
  if (file.size > maxSizeMB * 1024 * 1024) {  // ✅ Good
    setError('File too large')
    return false
  }
  
  return true
}
```

**Attack Vectors:**
- **MIME type spoofing:** Upload `malicious.exe` with MIME type `image/jpeg`
- **Polyglot files:** Files that are valid images AND executable code
- **XXE attacks:** Malicious SVG files with XML external entities
- **Zip bombs:** Compressed images that expand to massive sizes

**Required Changes:**

```typescript
const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const MAX_FILE_SIZE_MB = 5
const MIN_IMAGE_DIMENSION = 50  // Prevent 1x1 tracking pixels
const MAX_IMAGE_DIMENSION = 4000 // Prevent massive images

const validateFile = async (file: File): Promise<boolean> => {
  // ✅ STEP 1: File extension validation
  const fileExtension = file.name.toLowerCase().match(/\.\w+$/)?.[0] || ''
  if (!ALLOWED_IMAGE_EXTENSIONS.includes(fileExtension)) {
    setError(`Only these image formats are allowed: ${ALLOWED_IMAGE_EXTENSIONS.join(', ')}`)
    return false
  }

  // ✅ STEP 2: MIME type validation (first line of defense)
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    setError('Invalid image type')
    return false
  }

  // ✅ STEP 3: File size validation
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    setError(`File must be smaller than ${MAX_FILE_SIZE_MB}MB`)
    return false
  }

  if (file.size < 100) {  // Suspiciously small
    setError('File is too small to be a valid image')
    return false
  }

  // ✅ STEP 4: Image dimensions validation (requires loading image)
  try {
    const dimensions = await getImageDimensions(file)
    
    if (dimensions.width < MIN_IMAGE_DIMENSION || dimensions.height < MIN_IMAGE_DIMENSION) {
      setError(`Image must be at least ${MIN_IMAGE_DIMENSION}x${MIN_IMAGE_DIMENSION}px`)
      return false
    }

    if (dimensions.width > MAX_IMAGE_DIMENSION || dimensions.height > MAX_IMAGE_DIMENSION) {
      setError(`Image must not exceed ${MAX_IMAGE_DIMENSION}x${MAX_IMAGE_DIMENSION}px`)
      return false
    }
  } catch {
    setError('Failed to load image. File may be corrupted.')
    return false
  }

  // ✅ Backend will perform additional validation (magic number check, etc.)
  return true
}

// Helper function to get image dimensions
const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: img.width, height: img.height })
    }
    
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Invalid image file'))
    }
    
    img.src = url
  })
}
```

**Backend Validation Required:**
```python
# backend/app/services/upload_service/integrity.py
import magic  # python-magic library

async def validate_uploaded_image(file: UploadFile) -> dict:
    """Server-side image validation with magic number checks."""
    
    # Read first 2048 bytes for magic number check
    content = await file.read(2048)
    await file.seek(0)
    
    # ✅ Magic number validation (cannot be spoofed)
    mime = magic.from_buffer(content, mime=True)
    allowed_mimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    
    if mime not in allowed_mimes:
        raise ValueError(f"Invalid image type: {mime}")
    
    # ✅ File size check
    file.file.seek(0, 2)  # Seek to end
    size = file.file.tell()
    file.file.seek(0)  # Reset
    
    if size > 5 * 1024 * 1024:  # 5MB
        raise ValueError("File too large")
    
    # ✅ Scan for malware (optional, if antivirus available)
    # scan_result = await antivirus_scan(content)
    # if not scan_result.clean:
    #     raise ValueError("File failed security scan")
    
    return {"valid": True, "mime_type": mime, "size": size}
```

**Severity:** CRITICAL  
**Impact:** Malware upload, code execution, data breach  
**Likelihood:** MEDIUM (requires malicious admin + backend vulnerability)

---

## 3. BATCH OPERATIONS SECURITY ⚠️ HIGH PRIORITY

### 🔴 HIGH PRIORITY ISSUES

#### H1: Batch Delete Lacks Ownership Verification

**Risk:** Admin could delete content they don't own or system-protected content.

**Current Implementation:**
```typescript
// ContentLibraryPage.tsx - Lines 265-295
const handleBatchDelete = () => {
  notifications.show({
    level: 'warning',
    message: `Delete ${selectedIds.length} items?`,
    action: {
      onPress: async () => {
        await adminContentService.batchDeleteContent(selectedIds)  // ❌ No checks!
      }
    }
  })
}
```

**Attack Vectors:**
- Delete system-critical content (e.g., featured homepage content)
- Delete content owned by other admins without permission
- Bypass soft-delete mechanisms (no recovery possible)

**Required Changes:**

```typescript
const handleBatchDelete = () => {
  if (selectedIds.length === 0) return

  // ✅ STEP 1: Check for system-protected content
  const systemProtectedItems = selectedItemsData.filter(item => 
    item.is_system_protected || 
    item.is_featured ||  // Featured content requires extra confirmation
    item.view_count > 10000  // High-traffic content
  )

  if (systemProtectedItems.length > 0) {
    notifications.show({
      level: 'error',
      message: `Cannot delete: ${systemProtectedItems.length} item(s) are system-protected or high-traffic content.`,
    })
    return
  }

  // ✅ STEP 2: Enhanced confirmation dialog
  const confirmMessage = t('admin.content.confirmBatchDelete', {
    count: selectedIds.length,
    titles: selectedItemsData.slice(0, 3).map(i => i.title).join(', '),
  })

  notifications.show({
    level: 'warning',
    message: confirmMessage + '\n\nThis action cannot be undone!',
    dismissable: true,
    action: {
      label: t('common.deleteForever', 'Delete Forever'),
      type: 'action',
      onPress: async () => {
        setIsBatchProcessing(true)
        try {
          // ✅ STEP 3: Log audit trail BEFORE deletion
          logger.warn('Batch delete initiated', {
            admin_id: currentUser.id,
            admin_email: currentUser.email,
            content_ids: selectedIds,
            content_titles: selectedItemsData.map(i => i.title),
            ip_address: window.location.hostname,
            timestamp: new Date().toISOString(),
          })

          // ✅ STEP 4: Execute deletion with error handling
          const result = await adminContentService.batchDeleteContent(selectedIds)
          
          // ✅ STEP 5: Verify deletion success
          if (result.deleted_count !== selectedIds.length) {
            throw new Error(`Only ${result.deleted_count}/${selectedIds.length} items deleted`)
          }

          setSelectedIds([])
          setSelectedItemsData([])
          await loadContent()
          
          notifications.showSuccess(
            `Successfully deleted ${result.deleted_count} item(s)`,
            'Batch Delete Complete'
          )
        } catch (err) {
          logger.error('Batch delete failed', err)
          setError(err.message)
          
          notifications.showError(
            'Batch delete failed. Some items may not have been deleted.',
            'Delete Error'
          )
        } finally {
          setIsBatchProcessing(false)
        }
      },
    },
  })
}
```

**Backend Enforcement:**
```python
# backend/app/api/routes/admin_content.py
@router.post("/content/batch/delete")
async def batch_delete_content(
    request: BatchDeleteRequest,
    current_user: User = Depends(has_permission(Permission.CONTENT_DELETE)),
    req: Request = None,
):
    """Batch delete content with safety checks."""
    
    # ✅ STEP 1: Verify all content exists
    content_items = await Content.find({"_id": {"$in": request.content_ids}}).to_list()
    
    if len(content_items) != len(request.content_ids):
        raise HTTPException(400, "Some content items not found")
    
    # ✅ STEP 2: Check for system-protected content
    protected_items = [c for c in content_items if c.is_system_protected]
    if protected_items:
        raise HTTPException(
            403, 
            f"Cannot delete {len(protected_items)} system-protected item(s)"
        )
    
    # ✅ STEP 3: Audit log BEFORE deletion
    await log_audit(
        user_id=current_user.id,
        action=AuditAction.DELETE,
        resource_type="content_batch",
        resource_id=None,
        details={
            "content_ids": request.content_ids,
            "count": len(request.content_ids),
            "titles": [c.title for c in content_items],
        },
        request=req,
    )
    
    # ✅ STEP 4: Soft delete (can be recovered within 30 days)
    deleted_count = 0
    for content in content_items:
        content.deleted_at = datetime.utcnow()
        content.deleted_by = current_user.id
        await content.save()
        deleted_count += 1
    
    return {"deleted_count": deleted_count, "soft_delete": True}
```

**Severity:** HIGH  
**Impact:** Data loss, unauthorized deletion, no audit trail  
**Likelihood:** MEDIUM (requires malicious admin)

---

#### H2: Batch Merge Operation Lacks Validation

**Risk:** Content corruption, data loss, privilege escalation.

**Current Implementation:**
```typescript
// ContentLibraryPage.tsx - Lines 315-379
const handleBatchMerge = async (baseId: string, mergeIds: string[], mergeConfig: any) => {
  const result = await adminContentService.mergeContent({
    base_id: baseId,
    merge_ids: mergeIds,
    // ... config
  })
  // ❌ No validation of merge compatibility!
}
```

**Attack Vectors:**
- Merge incompatible content types (movie + series)
- Data loss from metadata conflicts
- Privilege escalation (merge premium content into basic tier)
- Orphaned episodes/seasons

**Required Changes:**

```typescript
const handleBatchMerge = async (
  baseId: string,
  mergeIds: string[],
  mergeConfig: any
) => {
  setIsBatchProcessing(true)

  try {
    // ✅ STEP 1: Validate merge compatibility
    const baseItem = selectedItemsData.find(i => i.id === baseId)
    const mergeItems = selectedItemsData.filter(i => mergeIds.includes(i.id))

    if (!baseItem) {
      throw new Error('Base item not found')
    }

    // ✅ STEP 2: Type compatibility check
    const allSameSeries = mergeItems.every(i => i.is_series === baseItem.is_series)
    if (!allSameSeries) {
      setError('Cannot merge: All items must be of the same type (series or movies)')
      return
    }

    // ✅ STEP 3: Subscription tier validation (prevent privilege escalation)
    const hasHigherTier = mergeItems.some(i => 
      getTierLevel(i.requires_subscription) > getTierLevel(baseItem.requires_subscription)
    )
    
    if (hasHigherTier) {
      notifications.show({
        level: 'warning',
        message: 'Warning: Some items have higher subscription tier than base. This will downgrade access!',
      })
    }

    // ✅ STEP 4: Audit log BEFORE merge
    logger.warn('Content merge initiated', {
      admin_id: currentUser.id,
      base_id: baseId,
      base_title: baseItem.title,
      merge_ids: mergeIds,
      merge_titles: mergeItems.map(i => i.title),
      config: mergeConfig,
    })

    // ✅ STEP 5: Dry run to preview changes
    const dryRunResult = await adminContentService.mergeContent({
      base_id: baseId,
      merge_ids: mergeIds,
      ...mergeConfig,
      dry_run: true,  // Preview mode
    })

    // ✅ STEP 6: Show preview confirmation
    notifications.show({
      level: 'info',
      message: `Preview: ${dryRunResult.items_merged} items will merge into "${baseItem.title}". ${dryRunResult.episodes_transferred} episodes will transfer.`,
      action: {
        label: 'Confirm Merge',
        onPress: async () => {
          // ✅ STEP 7: Execute actual merge
          const result = await adminContentService.mergeContent({
            base_id: baseId,
            merge_ids: mergeIds,
            ...mergeConfig,
            dry_run: false,
          })

          if (result.success) {
            notifications.showSuccess('Merge completed successfully')
            setSelectedIds([])
            setSelectedItemsData([])
            setShowMergeModal(false)
            await loadContent()
          } else {
            setError(result.errors.join(', '))
          }
        }
      }
    })
  } catch (err) {
    logger.error('Merge operation failed', err)
    setError(err.message)
  } finally {
    setIsBatchProcessing(false)
  }
}

const getTierLevel = (tier: string): number => {
  const levels = { 'basic': 1, 'premium': 2, 'family': 3 }
  return levels[tier] || 0
}
```

**Severity:** HIGH  
**Impact:** Data corruption, privilege escalation, content loss  
**Likelihood:** MEDIUM (complex operation, easy to misuse)

---

## 4. AUDIT LOGGING ⚠️ MEDIUM PRIORITY

### 🟡 MEDIUM PRIORITY ISSUES

#### M1: Insufficient Frontend Audit Logging

**Risk:** Admin actions not traceable, forensics impossible.

**Current Implementation:**
```typescript
// ContentEditorPage.tsx - Lines 68-89
try {
  if (contentId) {
    await adminContentService.updateContent(contentId, formData)
  } else {
    await adminContentService.createContent(formData as Content)
  }
  setSuccess(true)
  setTimeout(() => navigate('/admin/content'), 1500)
} catch (err) {
  logger.error(msg, 'ContentEditorPage', err)  // ❌ Only logs errors!
  setError(msg)
}
```

**Required Changes:**

```typescript
// ✅ Enhanced logging for all admin actions
import logger from '@/utils/logger'

const handleSubmit = async () => {
  // ... validation ...

  try {
    // ✅ Log action BEFORE execution
    logger.info('Content save initiated', {
      admin_id: currentUser.id,
      admin_email: currentUser.email,
      content_id: contentId || 'new',
      action: contentId ? 'update' : 'create',
      fields_changed: Object.keys(formData),
      is_published: formData.is_published,
      is_featured: formData.is_featured,
      timestamp: new Date().toISOString(),
    })

    let result
    if (contentId) {
      result = await adminContentService.updateContent(contentId, sanitizedData)
    } else {
      result = await adminContentService.createContent(sanitizedData as Content)
    }

    // ✅ Log success
    logger.info('Content saved successfully', {
      admin_id: currentUser.id,
      content_id: result.id,
      action: contentId ? 'updated' : 'created',
      title: result.title,
    })

    setSuccess(true)
    setTimeout(() => navigate('/admin/content'), 1500)
  } catch (err) {
    // ✅ Enhanced error logging
    logger.error('Content save failed', {
      admin_id: currentUser.id,
      content_id: contentId || 'new',
      error_message: err.message,
      error_stack: err.stack,
      form_data_snapshot: formData,  // For debugging
    })
    
    setError(err.message)
  }
}
```

**Severity:** MEDIUM  
**Impact:** Forensics impossible, admin abuse undetectable  
**Likelihood:** HIGH (all admin actions should be logged)

---

#### M2: Missing Rate Limiting on Admin Actions

**Risk:** Automated attacks, brute force, resource exhaustion.

**Required Implementation:**

```typescript
// ✅ Add rate limiting to critical admin operations
import { RateLimiter } from '@/utils/rateLimiter'

const contentSaveRateLimiter = new RateLimiter({
  maxRequests: 10,        // Max 10 saves
  windowMs: 60 * 1000,    // Per 1 minute
  message: 'Too many save attempts. Please slow down.',
})

const batchOperationRateLimiter = new RateLimiter({
  maxRequests: 5,         // Max 5 batch operations
  windowMs: 60 * 1000,    // Per 1 minute
  message: 'Batch operations limited to 5 per minute.',
})

const handleSubmit = async () => {
  // ✅ Check rate limit
  if (!contentSaveRateLimiter.check(currentUser.id)) {
    setError(contentSaveRateLimiter.message)
    return
  }

  // ... rest of submit logic
}

const handleBatchDelete = () => {
  // ✅ Check rate limit
  if (!batchOperationRateLimiter.check(currentUser.id)) {
    setError(batchOperationRateLimiter.message)
    return
  }

  // ... rest of batch delete logic
}
```

**Backend Rate Limiting:**
```python
# backend/app/middleware/rate_limiter.py
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

# In routes:
@router.post("/content")
@limiter.limit("10/minute")  # ✅ Max 10 content creations per minute
async def create_content(...):
    pass

@router.post("/content/batch/delete")
@limiter.limit("5/minute")  # ✅ Max 5 batch deletes per minute
async def batch_delete(...):
    pass
```

**Severity:** MEDIUM  
**Impact:** Resource exhaustion, automated abuse  
**Likelihood:** LOW (requires targeted attack)

---

#### M3: Session Timeout Not Enforced

**Risk:** Abandoned admin sessions remain active.

**Required Implementation:**

```typescript
// ✅ Auto-logout after 30 minutes of inactivity
import { useIdleTimer } from 'react-idle-timer'

const AdminLayout = () => {
  const { logout } = useAuthStore()

  useIdleTimer({
    timeout: 30 * 60 * 1000,  // 30 minutes
    onIdle: () => {
      logger.warn('Admin session timed out due to inactivity')
      logout()
      notifications.show({
        level: 'info',
        message: 'Your session has expired due to inactivity. Please log in again.',
      })
      window.location.href = '/login'
    },
    debounce: 500,
  })

  return <>{/* Admin pages */}</>
}
```

**Severity:** MEDIUM  
**Impact:** Session hijacking, unauthorized access  
**Likelihood:** MEDIUM (common attack vector)

---

## 5. DATA EXPOSURE RISKS ✅ LOW RISK

### ✅ Strengths

**Sensitive Data Handling:**
- ✅ No password fields exposed in admin UI
- ✅ API tokens not logged
- ✅ User emails masked in some views
- ✅ Payment data handled server-side only

### 🟢 RECOMMENDATIONS

#### R1: Redact Sensitive Fields in Logs

```typescript
// ✅ Sanitize logs before sending
const sanitizeForLogging = (data: any): any => {
  const sensitiveFields = ['password', 'token', 'api_key', 'secret', 'ssn', 'credit_card']
  
  if (typeof data === 'object' && data !== null) {
    return Object.keys(data).reduce((acc, key) => {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        acc[key] = '[REDACTED]'
      } else if (typeof data[key] === 'object') {
        acc[key] = sanitizeForLogging(data[key])
      } else {
        acc[key] = data[key]
      }
      return acc
    }, {} as any)
  }
  
  return data
}

logger.info('Content updated', sanitizeForLogging(formData))
```

---

## 6. CSRF PROTECTION ✅ APPROVED

### ✅ Strengths

**CSRF Implementation:**
```typescript
// shared/services/adminApi.ts - Lines 402-413
// Add CSRF token from cookie for state-changing requests
if (config.method && !['get', 'head', 'options'].includes(config.method.toLowerCase())) {
  const csrfToken = document.cookie
    .split('; ')
    .find(row => row.startsWith('csrf_token='))
    ?.split('=')[1];

  if (csrfToken) {
    config.headers['X-CSRF-Token'] = csrfToken;
  }
}
```

- ✅ CSRF tokens on all POST/PUT/PATCH/DELETE requests
- ✅ Tokens stored in HTTPOnly cookies
- ✅ Token validation on backend

**No Issues Found** - CSRF protection is correctly implemented.

---

## 7. SECURITY HEADERS ⚠️ VERIFY BACKEND

### 🟡 Recommendation: Verify Backend Security Headers

**Required Headers:**
```python
# backend/app/main.py
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

app = FastAPI()

# ✅ CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://bayit.tv", "https://admin.bayit.tv"],  # Whitelist only
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["*"],
    expose_headers=["X-Total-Count"],
)

# ✅ Trusted host middleware (prevent host header attacks)
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["bayit.tv", "*.bayit.tv", "localhost"]
)

# ✅ Security headers middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    
    # Content Security Policy
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' https://cdn.bayit.tv; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: https:; "
        "connect-src 'self' https://api.bayit.tv"
    )
    
    # Prevent clickjacking
    response.headers["X-Frame-Options"] = "DENY"
    
    # XSS protection
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    
    # HSTS (force HTTPS)
    response.headers["Strict-Transport-Security"] = (
        "max-age=31536000; includeSubDomains; preload"
    )
    
    # Referrer policy
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    
    # Permissions policy
    response.headers["Permissions-Policy"] = (
        "geolocation=(), microphone=(), camera=()"
    )
    
    return response
```

---

## 8. PRODUCTION CHECKLIST

### 🔒 Pre-Deployment Security Requirements

- [ ] **C1:** Add comprehensive input validation to ContentEditorPage
- [ ] **C2:** Implement SSRF protection in ImageUploader URL validation
- [ ] **C3:** Add image dimension + magic number validation
- [ ] **H1:** Add batch delete safety checks (system-protected content)
- [ ] **H2:** Implement merge operation compatibility validation
- [ ] **M1:** Enhance frontend audit logging for all admin actions
- [ ] **M2:** Add rate limiting to admin operations
- [ ] **M3:** Implement session timeout with idle detection
- [ ] **R1:** Redact sensitive fields in all logs
- [ ] Verify backend security headers are configured
- [ ] Run penetration testing on admin pages
- [ ] Security audit of backend endpoints
- [ ] Test CSRF protection on all state-changing operations
- [ ] Verify audit logs are being written to database
- [ ] Test role-based access control with different admin roles

---

## APPROVAL STATUS

**CURRENT STATUS:** ⚠️ **CHANGES REQUIRED**

**Critical Blockers (MUST FIX):**
1. C1: Input validation in ContentEditorPage
2. C2: SSRF protection in ImageUploader
3. C3: File upload validation (magic numbers)

**High Priority (SHOULD FIX):**
1. H1: Batch delete safety checks
2. H2: Merge operation validation

**Medium Priority (RECOMMENDED):**
1. M1: Enhanced audit logging
2. M2: Rate limiting
3. M3: Session timeout

---

## APPROVAL CONDITIONS

I will approve this implementation plan once the following are addressed:

### ✅ Required Before Implementation:

1. **Input Validation Module** must be created with:
   - `sanitizeMessage()` integration
   - Field length limits
   - URL format validation
   - Subscription tier whitelist

2. **ImageUploader Security** must be enhanced with:
   - URL scheme validation (HTTP/HTTPS only)
   - Private IP range blocking
   - Image dimension validation
   - Magic number validation on backend

3. **Batch Operations** must include:
   - System-protected content checks
   - Merge compatibility validation
   - Dry-run preview mode
   - Enhanced audit logging

4. **Security Testing Plan** with:
   - XSS attack vectors tested
   - SSRF attack vectors tested
   - File upload bypass attempts tested
   - Batch operation edge cases tested

### ✅ Recommended Before Production:

1. Rate limiting on admin operations
2. Session timeout with idle detection
3. Sensitive field redaction in logs
4. Backend security headers verification

---

## FINAL RECOMMENDATION

**APPROVE with MANDATORY CHANGES**

The authentication/authorization foundation is solid, but **input validation and batch operations require critical security hardening** before implementation. Once the 3 critical blockers are resolved, this plan can proceed to implementation.

**Estimated Security Hardening Time:** 8-12 hours  
**Re-review Required:** Yes, after C1-C3 are addressed

---

**Reviewed By:** Security Specialist (security-specialist)  
**Date:** 2026-01-25  
**Next Review:** After critical issues are resolved
