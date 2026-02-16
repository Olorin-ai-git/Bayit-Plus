# OAuth Credentials Cleanup Instructions

**Task #7: Clean Up Orphaned OAuth Clients**
**Date:** 2026-02-15
**Status:** ✅ COMPLETE - Orphaned OAuth credentials deleted
**Completed:** 2026-02-15

---

## Overview

After migrating to Olorin Auth (auth.olorin.ai), some OAuth credentials in Google Cloud Console are no longer referenced in the codebase and should be removed to reduce security surface area.

---

## Step-by-Step Instructions

### 1. Access Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select project: **bayit-plus**
3. Navigate to: **APIs & Services** → **Credentials**

---

### 2. Identify Active Credentials

**✅ KEEP These Credentials (Currently in Use):**

| Client ID Suffix | Type | Used By | Location |
|------------------|------|---------|----------|
| `-7p34...` | Web | Backend OAuth | `backend/.env` → `GOOGLE_CLIENT_ID` |
| `-21du...` | iOS | iOS/tvOS Apps | iOS Info.plist |
| `-pp6d...` | Android | Android App | `google-services.json` |
| `-9u8u...` | iOS/tvOS | tvOS App | tvOS Info.plist |

**To verify active credentials:**
```bash
# Backend
grep GOOGLE_CLIENT_ID backend/.env

# iOS
grep CLIENT_ID ios-app/BayitPlusApp/Info.plist

# Android
grep client_id android-app/app/google-services.json
```

---

### 3. Delete Orphaned Credentials

**❌ DELETE These Credentials (Not Referenced in Code):**

Based on the migration guide, the following credentials were identified as orphaned:

| Client ID Suffix | Type | Reason for Deletion |
|------------------|------|---------------------|
| `-7j5p...` | Web | Not found in any config files |
| `-pcpr...` | Web | Old/unused, not in current configs |
| `-47ae...` | iOS | Not found in any Info.plist files |

**API Keys to Delete:**
- "Bayit+ iOS OAuth" - Not referenced in code

**How to Delete:**

1. In the **Credentials** page, locate each credential by its suffix
2. Click the **trash icon** (🗑️) on the right side
3. Confirm deletion when prompted
4. Document the deletion in this file

---

### 4. Verification Checklist

After deletion, verify that the application still works:

- [ ] Backend Google OAuth works (web login)
- [ ] iOS app Google Sign-In works
- [ ] Android app Google Sign-In works
- [ ] tvOS app Google Sign-In works
- [ ] No OAuth-related errors in logs

**Test Commands:**
```bash
# Test web OAuth (should redirect to Google)
curl -s http://localhost:8000/api/v1/auth/google/url | jq '.auth_url'

# Check production logs for OAuth errors
gcloud logging read 'severity>=ERROR AND textPayload=~"oauth"' \
  --project=bayit-plus --limit=10
```

---

### 5. Deletion Log

**Record deletions here:**

| Date | Client ID | Type | Deleted By | Notes |
|------|-----------|------|------------|-------|
| 2026-02-15 | -7j5p... | Web | Manual | Orphaned credential - not referenced in codebase |
| 2026-02-15 | -pcpr... | Web | Manual | Orphaned credential - old/unused |
| 2026-02-15 | -47ae... | iOS | Manual | Orphaned credential - not in Info.plist |
| 2026-02-15 | Bayit+ iOS OAuth | API Key | Manual | Orphaned API key - not referenced |

---

## Security Benefits

**Reduced Attack Surface:**
- Fewer OAuth clients = smaller security perimeter
- Old/unused credentials can't be exploited if compromised
- Simplifies security audits and credential rotation

**Compliance:**
- Follows principle of least privilege
- Reduces unnecessary API access points
- Cleaner credential inventory for audits

---

## Rollback Plan

If deletion causes issues:

1. **Immediate:** Re-create the deleted OAuth client with same settings
2. **Update:** Add the new client ID to the affected config files
3. **Redeploy:** Push updated configs to affected platforms
4. **Document:** Note which credential was restored and why

**Important:** OAuth client IDs cannot be restored after deletion. You'll need to create a new one with the same configuration.

---

## Post-Cleanup Tasks

After successful cleanup:

- [ ] Update this document with deletion log entries
- [ ] Update `docs/security/AUTH_MIGRATION_IMPLEMENTATION_GUIDE.md` to mark Task #7 complete
- [ ] Run final OAuth verification tests
- [ ] Document any remaining credentials in security audit log

---

## Reference

**Current Active Credentials:**
```bash
# Backend (Web OAuth)
GOOGLE_CLIENT_ID=624470113582-7p34b1tpqlfob5sh4cl9eoospmvao1at.apps.googleusercontent.com

# Active redirect URIs:
# - https://bayit.tv/auth/google/callback
# - https://www.bayit.tv/auth/google/callback
# - http://localhost:3200/auth/google/callback
```

**Migration Context:**
- Olorin Auth (auth.olorin.ai) now handles authentication
- Google OAuth still used for social login (Sign in with Google)
- OAuth credentials needed for Google Sign-In SDK integration
