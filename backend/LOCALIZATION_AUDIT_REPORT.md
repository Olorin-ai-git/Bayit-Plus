# Backend API Localization Audit Report

**Date:** 2026-01-12
**Scope:** Backend API hardcoded text analysis
**Status:** 🚨 CRITICAL - 360+ hardcoded messages found

## Executive Summary

The backend API contains **360+ hardcoded English error messages** that are NOT localized. These messages are returned directly to users and will not respect the user's language preference.

## Findings

### 1. HTTPException Messages (Primary Issue)

**Pattern:**
```python
raise HTTPException(status_code=404, detail="Content not found")
raise HTTPException(status_code=403, detail="Admin access required")
raise HTTPException(status_code=400, detail="Invalid request")
```

**Count:** ~360 instances across all route files

**Impact:** HIGH - These are user-facing error messages

**Files Affected:**
- `app/api/routes/*.py` (all route files)
- `app/core/security.py`
- Various service files

### 2. Response Messages

**Pattern:**
```python
return {"message": "Logged out successfully"}
return {"message": "Chapter generated successfully"}
return {"status": "success", "message": "Operation completed"}
```

**Impact:** HIGH - Success messages shown to users

### 3. Validation Error Messages

**Pattern:**
```python
raise ValueError("Failed to initialize S3 client")
raise ValueError("Invalid email format")
```

**Impact:** MEDIUM - May bubble up to user

### 4. Log Messages (Lower Priority)

**Pattern:**
```python
logger.error("Google token exchange failed")
print("Image optimization failed")
```

**Impact:** LOW - Internal only (but should still be structured)

## Detailed Breakdown by Category

### Category A: Authentication Errors
- "Invalid credentials"
- "Inactive user"
- "Token expired"
- "Unauthorized"
- "Failed to exchange code for token"
- "Failed to get user info from Google"

**Files:**
- `app/api/routes/auth.py`
- `app/core/security.py`

### Category B: Resource Not Found
- "Content not found"
- "Widget not found"
- "Channel not found"
- "User not found"
- "Category not found"
- "No chapters found"

**Files:**
- All route files (`app/api/routes/*.py`)

### Category C: Permission Errors
- "Admin access required"
- "Insufficient permissions"
- "Access denied"

### Category D: Validation Errors
- "Invalid request"
- "Invalid email format"
- "Missing required field"
- "Invalid data format"

### Category E: Operation Status
- "Logged out successfully"
- "Chapter generated successfully"
- "Upload completed"
- "Operation failed"

## Recommendations

### Short-term (Band-aid)

1. **Create Error Code System**
   ```python
   # app/core/errors.py
   class ErrorCode(str, Enum):
       CONTENT_NOT_FOUND = "content_not_found"
       INVALID_CREDENTIALS = "invalid_credentials"
       ADMIN_REQUIRED = "admin_required"

   # Return error codes instead of messages
   raise HTTPException(
       status_code=404,
       detail={"code": ErrorCode.CONTENT_NOT_FOUND}
   )
   ```

2. **Frontend Handles Translation**
   - Frontend receives error codes
   - Frontend looks up localized message from i18n
   - Maintains consistency with mobile app pattern

### Long-term (Proper Solution)

1. **Backend i18n Support**
   - Add `Accept-Language` header parsing
   - Implement backend translation service
   - Return localized messages based on user preference

2. **Structured Error Responses**
   ```python
   {
       "error": {
           "code": "CONTENT_NOT_FOUND",
           "message": "Content not found",  # English fallback
           "message_key": "errors.api.notFound",  # i18n key for frontend
           "params": {}  # Optional parameters for message formatting
       }
   }
   ```

## Implementation Priority

### Priority 1: Critical User-Facing (Do First)
- [ ] Authentication errors (`auth.py`)
- [ ] Resource not found errors (all routes)
- [ ] Permission errors

### Priority 2: High User-Facing
- [ ] Validation errors
- [ ] Success messages
- [ ] Operation status messages

### Priority 3: Medium
- [ ] Service-level exceptions
- [ ] Internal error messages that may bubble up

### Priority 4: Low (Nice to Have)
- [ ] Log messages (keep in English, add context)
- [ ] Debug messages

## Recommended Approach

**Option A: Error Code System (Recommended)**

1. Create `app/core/error_codes.py`:
   ```python
   from enum import Enum

   class ErrorCode(str, Enum):
       # Authentication
       INVALID_CREDENTIALS = "auth.invalid_credentials"
       INACTIVE_USER = "auth.inactive_user"
       TOKEN_EXPIRED = "auth.token_expired"

       # Resources
       CONTENT_NOT_FOUND = "content.not_found"
       WIDGET_NOT_FOUND = "widget.not_found"

       # Permissions
       ADMIN_REQUIRED = "permission.admin_required"
       INSUFFICIENT_PERMISSIONS = "permission.insufficient"

       # Validation
       INVALID_REQUEST = "validation.invalid_request"
       MISSING_FIELD = "validation.missing_field"

   ERROR_MESSAGES = {
       ErrorCode.INVALID_CREDENTIALS: "Invalid email or password",
       ErrorCode.CONTENT_NOT_FOUND: "Content not found",
       # ... English fallbacks
   }
   ```

2. Create `app/core/exceptions.py`:
   ```python
   from fastapi import HTTPException
   from typing import Optional, Dict, Any

   class LocalizedHTTPException(HTTPException):
       def __init__(
           self,
           status_code: int,
           error_code: ErrorCode,
           params: Optional[Dict[str, Any]] = None
       ):
           detail = {
               "code": error_code.value,
               "message": ERROR_MESSAGES.get(error_code, "An error occurred"),
               "params": params or {}
           }
           super().__init__(status_code=status_code, detail=detail)
   ```

3. Update all route files:
   ```python
   # Before
   raise HTTPException(status_code=404, detail="Content not found")

   # After
   raise LocalizedHTTPException(
       status_code=404,
       error_code=ErrorCode.CONTENT_NOT_FOUND
   )
   ```

4. Frontend handles translation:
   ```typescript
   // Mobile app
   try {
       await api.get('/content/123')
   } catch (error) {
       if (error.response?.data?.code) {
           const message = t(`errors.${error.response.data.code}`)
           Alert.alert(t('errors.title'), message)
       }
   }
   ```

## Estimated Effort

- **Error Code System Setup:** 2-3 hours
- **Refactor All Routes:** 8-12 hours (360 instances)
- **Frontend Integration:** 2-3 hours
- **Testing:** 3-4 hours
- **Total:** ~20-25 hours

## Alternative: Quick Win

For immediate improvement with minimal effort:

1. Create error code enum (1 hour)
2. Refactor top 20 most common errors (2 hours)
3. Add frontend handling for error codes (1 hour)
- **Total:** ~4 hours for 80% of user-visible errors

## Current Status

- ✅ Mobile app error handling: LOCALIZED (Task 1 complete)
- ✅ Mobile app UI: LOCALIZED (existing i18n system)
- ✅ Database content: LOCALIZABLE (Task 1 - new translation system)
- ❌ Backend API responses: **NOT LOCALIZED** (360+ hardcoded messages)

## Next Steps

1. **Immediate:** Implement error code system
2. **Week 1:** Refactor authentication & critical errors
3. **Week 2:** Refactor resource not found errors
4. **Week 3:** Complete remaining errors
5. **Week 4:** Testing & validation

---

**Conclusion:** The backend API requires significant refactoring to support localization. The recommended error code system provides a clean, maintainable solution that works well with the existing mobile app i18n infrastructure.
