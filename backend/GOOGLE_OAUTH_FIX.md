# Google OAuth Fix - Complete Guide

## ✅ FIXED: Secret Loading Issue

**Problem:** The `.env` file contained placeholder strings like `<from-secret-manager:bayit-google-client-id>` instead of actual values.

**Solution:** Secrets have been retrieved from GCP Secret Manager and updated in `.env`:
- ✅ `GOOGLE_CLIENT_ID`: 624470113582-7j5ptjiq9dhdlmc709792c1do5v3cee6.apps.googleusercontent.com
- ✅ `GOOGLE_CLIENT_SECRET`: [Retrieved and set]
- ❌ `GOOGLE_REDIRECT_URI`: https://bayit.tv/auth/google/callback (PRODUCTION ONLY)

---

## 🔧 REMAINING ISSUE: Redirect URI Mismatch

**Current Situation:**
- Your app runs on: `http://localhost:3200`
- Google OAuth redirect is configured for: `https://bayit.tv/auth/google/callback`

**Error:** "Error 401: invalid_client" - because localhost is not an authorized redirect URI

---

## 🚀 SOLUTION: Choose One Option

### Option A: Add Localhost to Google Cloud Console (Recommended for Development)

1. **Open Google Cloud Console:**
   ```
   https://console.cloud.google.com/apis/credentials?project=bayit-plus
   ```

2. **Find the OAuth 2.0 Client:**
   - Click on client ID: `624470113582-7j5ptjiq9dhdlmc709792c1do5v3cee6`

3. **Add Authorized Redirect URI:**
   - Under "Authorized redirect URIs", click **+ ADD URI**
   - Add: `http://localhost:3200/auth/google/callback`
   - Click **SAVE**

4. **Restart your backend:**
   ```bash
   cd backend
   poetry run python -m app.main
   ```

5. **Test OAuth:**
   - Navigate to: `http://localhost:3200`
   - Click "Sign in with Google"
   - Should now work! ✅

---

### Option B: Temporarily Override Redirect URI (Quick Test)

1. **Edit `.env` file:**
   ```bash
   # In backend/.env, change:
   GOOGLE_REDIRECT_URI=http://localhost:3200/auth/google/callback
   ```

2. **Restart backend:**
   ```bash
   poetry run python -m app.main
   ```

3. **Add to Google Console** (still required):
   - You MUST still add `http://localhost:3200/auth/google/callback` to Google Cloud Console
   - Otherwise Google will reject the request

⚠️ **Important:** This option still requires Step 3 from Option A!

---

## 📋 Verification Steps

After applying the fix:

1. **Check current config:**
   ```bash
   cd backend
   poetry run python -c "from app.core.config import settings; print(f'Client ID: {settings.GOOGLE_CLIENT_ID}'); print(f'Redirect URI: {settings.GOOGLE_REDIRECT_URI}')"
   ```

2. **Expected output:**
   ```
   Client ID: 624470113582-7j5ptjiq9dhdlmc709792c1do5v3cee6.apps.googleusercontent.com
   Redirect URI: http://localhost:3200/auth/google/callback
   ```

3. **Test OAuth flow:**
   - Start backend: `poetry run python -m app.main`
   - Open: `http://localhost:3200`
   - Click "Sign in with Google"
   - You should be redirected to Google's login page
   - After login, you should be redirected back to your app

---

## 🔍 Troubleshooting

### Still getting "invalid_client" error?

**Check 1:** Verify Client ID is loaded correctly
```bash
poetry run python -c "from app.core.config import settings; print(settings.GOOGLE_CLIENT_ID)"
```
Should output: `624470113582-7j5ptjiq9dhdlmc709792c1do5v3cee6.apps.googleusercontent.com`

**Check 2:** Verify redirect URI in Google Console
- Go to: https://console.cloud.google.com/apis/credentials?project=bayit-plus
- Click on the OAuth client
- Verify `http://localhost:3200/auth/google/callback` is in the list

**Check 3:** Clear browser cookies and try again
- Google OAuth may cache old redirect URIs
- Clear cookies for `localhost:3200` and `accounts.google.com`

### Getting "redirect_uri_mismatch" error?

This means the redirect URI you're sending doesn't match what's in Google Console.

**Fix:**
1. Check what your app is sending:
   - Look at the browser URL when redirected to Google
   - Check the `redirect_uri` parameter
2. Ensure it exactly matches what's in Google Console (including http/https, port, path)

---

## 📚 Additional Resources

- **Google OAuth 2.0 Setup:** https://developers.google.com/identity/protocols/oauth2
- **Google Cloud Console:** https://console.cloud.google.com/apis/credentials
- **Backend OAuth Implementation:** `backend/app/api/routes/auth.py` (lines 332-504)

---

**Status:** ✅ Secrets loaded | ⏳ Waiting for redirect URI configuration

**Next Action:** Add `http://localhost:3200/auth/google/callback` to Google Cloud Console authorized redirect URIs.
