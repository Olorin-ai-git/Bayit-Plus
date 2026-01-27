# Debugging Playback Session 401 Error

**Issue**: `POST /api/v1/playback/session/start` returns `401 Unauthorized` even though the movie is playing.

## Root Cause Analysis

The 401 error means the backend cannot authenticate the request. This happens when:

1. **No Authorization header is sent** - Token is undefined/null at request time
2. **Invalid token** - Token signature doesn't match SECRET_KEY or SECRET_KEY_OLD
3. **Expired token** - Token exp claim is in the past
4. **User doesn't exist** - Token valid but user deleted from database
5. **User is inactive** - User marked as inactive after token was issued

## Quick Diagnostics

### 1. Check Browser Console Logs

The client now logs warnings when tokens are missing:

```javascript
// Look for these messages in browser console:
"No auth token found for playback session request"
"Failed to create playback session: Authentication failed (401)"
```

**How to check**:
1. Open DevTools (F12)
2. Go to **Console** tab
3. Start playing a video
4. Watch for "Playback session" messages
5. Check if you see token-related warnings

### 2. Verify Token is Loaded

In browser console, run:

```javascript
// Check if auth store has a token
import { useAuthStore } from '@bayit/shared-stores/authStore'
const token = useAuthStore.getState().token
console.log('Token exists:', !!token)
console.log('Token preview:', token?.substring(0, 20) + '...')
console.log('Token length:', token?.length)
```

### 3. Check Authorization Header in Network Tab

1. Open DevTools → **Network** tab
2. Start playing a video
3. Find the `POST` request to `/api/v1/playback/session/start`
4. Click on it to view details
5. Go to **Request Headers** section
6. Look for: `Authorization: Bearer eyJ...`

**If missing**: Token is null when request is made (timing issue)
**If present**: Check if token is valid (see section below)

### 4. Verify Token Validity

Decode your token at [jwt.io](https://jwt.io) to check:

```json
{
  "sub": "user_id_here",
  "exp": 1234567890,  // Expiration timestamp
  "iat": 1234567800,  // Issued at timestamp
  ...
}
```

**Common issues**:
- `exp` timestamp is in the past → Token expired
- `sub` is missing or empty → Token malformed
- Token was issued but user doesn't exist in database

### 5. Check Backend Logs

Look for auth-related errors:

```bash
# If using Cloud Run:
gcloud logging read "resource.type=cloud_run_revision AND jsonPayload.message=~'token'" \
  --format json \
  --limit 20

# Or check local logs:
tail -f logs/backend.log | grep -i "token\|auth"
```

**Look for**:
- "Token validated with OLD secret during rotation" → Token using old key
- "Could not validate credentials" → Token signature mismatch
- "Invalid token" → Malformed JWT
- "User not found" → Token valid but user deleted

## Solutions

### Issue: Token is Null at Request Time

**Symptom**: Authorization header missing in network tab

**Causes**:
- Auth store hasn't loaded from localStorage yet
- User just logged in but token not in state yet
- Race condition between auth load and video play

**Solutions**:

1. **Add minimum delay before making session request**:
   - Wait 100-200ms after detecting `isPlaying = true`
   - Ensures auth store has time to hydrate from localStorage

2. **Check user authentication first**:
   - Before creating session, verify `useAuthStore.getState().user` exists
   - If null, delay or retry

3. **Add retry logic**:
   - If session/start returns 401, retry after 500ms
   - Maximum 3 retries with exponential backoff

### Issue: Token Expired

**Symptom**: Authorization header present, but returns 401

**Cause**: Token exp time is in the past

**Solution**:
- Token should auto-refresh via `/auth/refresh` endpoint
- If refresh fails, user needs to log in again
- Check that refresh token is valid and not expired

### Issue: User Not Found in Database

**Symptom**: Token valid but user_id doesn't exist

**Cause**:
- User account deleted after token issued
- Token created offline/in test environment
- Database doesn't have the user yet

**Solution**:
- Verify user exists: `GET /api/v1/users/{user_id}`
- Check if user is active: `is_active = true`
- Create user if needed

## Detailed Debugging Checklist

Run these checks in order:

- [ ] **Auth Token Exists**
  ```javascript
  useAuthStore.getState().token !== null
  ```

- [ ] **Token is Valid JWT**
  ```javascript
  // Should have 3 parts separated by dots
  token.split('.').length === 3
  ```

- [ ] **Authorization Header Sent**
  - Open DevTools → Network
  - Find playback/session/start request
  - Check Request Headers for Authorization header

- [ ] **Token Not Expired**
  - Decode token at jwt.io
  - Check `exp` > current_timestamp
  - Current timestamp: `Math.floor(Date.now() / 1000)`

- [ ] **User Exists in Backend**
  ```bash
  curl -H "Authorization: Bearer {your_token}" \
       https://bayit.tv/api/v1/users/me
  ```

- [ ] **User is Active**
  - Check response from above includes `"is_active": true`

- [ ] **CORS is Working**
  - Check response headers include `Access-Control-Allow-Origin`
  - Should match your domain

## Test the Fix

After implementing any changes:

1. **Clear auth state**:
   ```javascript
   localStorage.clear()
   location.reload()
   ```

2. **Log in fresh**:
   - Log out
   - Clear storage
   - Log in again

3. **Play a video**:
   - Watch for "Playback session created" message in console
   - Should see session_id in response

4. **Monitor heartbeats**:
   - Every 30 seconds, should see heartbeat requests
   - Status should be 200 OK

## Logging for Production

The enhanced error logging now captures:

```javascript
{
  status: 401,
  detail: "Could not validate credentials",
  hasToken: false,  // NEW: Shows if token exists
  url: "/api/v1/playback/session/start"
}
```

**Enable verbose logging**:
```javascript
// In app initialization
import logger from '@bayit/shared-utils/logger'
logger.setLevel('DEBUG')
```

## Production Monitoring

Add monitoring for 401 errors on playback/session:

```javascript
// Track 401 errors for playback sessions
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401 &&
        error.config?.url?.includes('playback/session')) {
      // Send to error tracking (Sentry, etc.)
      captureException({
        type: 'PLAYBACK_AUTH_FAILED',
        url: error.config.url,
        hasToken: !!useAuthStore.getState().token,
        timestamp: new Date().toISOString()
      })
    }
    return Promise.reject(error)
  }
)
```

## Contact Backend Team

If you've verified:
- ✅ Token exists and is valid
- ✅ Authorization header is present
- ✅ User exists and is active
- ✅ CORS is working

Then contact backend team with:
1. Session ID from request
2. User ID
3. Timestamp of 401 error
4. Full request/response headers
5. Backend logs from that time

They can verify SECRET_KEY matches and check JWT validation on backend.
