# Playback Session Retry Logic & Token Refresh Implementation

**Status**: ✅ Complete
**Date**: 2026-01-27
**File Modified**: `web/src/components/player/hooks/usePlaybackSession.ts`

## Summary

Enhanced the `usePlaybackSession` hook with automatic retry logic and token refresh to handle transient authentication failures and improve resilience of playback session creation.

## Changes Implemented

### 1. Automatic Token Refresh Before Session Creation

Before attempting to create a playback session, the hook now:
- Checks if the current JWT token will expire within 5 minutes
- Automatically refreshes the token if expiration is imminent
- Only proceeds with session creation if token refresh succeeds

**Code Location**: `usePlaybackSession.ts:105-117`

```typescript
if (tokenWillExpireSoon()) {
  console.log('Token expiring soon, refreshing before playback session...');
  const refreshed = await useAuthStore.getState().refreshAccessToken();
  if (!refreshed) {
    setIsCreatingSession(false);
    setError({
      code: 'TOKEN_REFRESH_FAILED',
      message: 'Failed to refresh authentication token',
    });
    return;
  }
}
```

### 2. Retry Logic with Exponential Backoff

**Maximum Retries**: 3 attempts
**Backoff Strategy**: Exponential backoff - 500ms → 1000ms → 2000ms

The hook now handles different error scenarios:

#### 401 Unauthorized Errors
- Attempts automatic token refresh on first 401
- Retries session creation with exponential backoff
- If token refresh fails, immediately stops and returns auth error
- Logs token status to aid debugging

**Code Location**: `usePlaybackSession.ts:141-185`

#### 403 Forbidden (Concurrent Stream Limit)
- Does NOT retry (limit is deterministic)
- Immediately returns limit error with device details
- Triggers `onLimitExceeded` callback if provided

#### Transient Errors (Network, 5xx, etc.)
- Retries with exponential backoff (500ms, 1000ms, 2000ms)
- Gives servers time to recover between attempts
- Logs each retry attempt with backoff duration

**Code Location**: `usePlaybackSession.ts:196-205`

### 3. Enhanced Logging

All retry attempts and token operations are logged with contextual information:
- Current attempt number and max retries
- Error status codes and details
- Token existence at request time (for debugging)
- Backoff duration before retry
- Token refresh status

Example logs:
```
Token expiring soon, refreshing before playback session...
Playback session 401 error (attempt 1/3)
Attempting token refresh and retry...
Retrying session creation in 500ms...
Playback session created: [session_id]
```

### 4. Token Expiration Check Helper

New helper function `tokenWillExpireSoon()` safely decodes JWT and checks if expiration is within 5 minutes:
- Safely handles token parsing with try-catch
- Returns false for invalid/missing tokens
- Uses 5-minute window (consistent with auth store)

**Code Location**: `usePlaybackSession.ts:72-89`

## Error Handling

The hook distinguishes between error types and handles each appropriately:

| Error Type | Behavior | Retries | Note |
|-----------|----------|---------|------|
| 401 Unauthorized | Refresh token, retry with backoff | Yes (3x) | Most common auth issue |
| 403 Forbidden (Stream Limit) | Return limit error immediately | No | User needs to stop another stream |
| Network/5xx Errors | Retry with exponential backoff | Yes (3x) | Transient failures |
| Token Refresh Failure | Return auth error immediately | No | Token invalid/expired |

## Benefits

1. **Improved Resilience**: Transient network issues no longer block playback
2. **Reduced Failed Sessions**: Automatic retry with backoff handles temporary failures
3. **Better Authentication**: Proactive token refresh prevents expiration during playback
4. **Enhanced Debugging**: Comprehensive logging shows token status and retry attempts
5. **User Experience**: Session creation succeeds in more scenarios, reducing playback interruptions

## Testing Checklist

- [ ] **Token Refresh on Expiration**: Start video with token near expiration (5 min window) → Should refresh automatically
- [ ] **401 Retry**: Kill backend auth service → Start video → Should retry with backoff → Should fail after 3 attempts
- [ ] **Transient Network Error**: Simulate network timeout → Should retry and recover
- [ ] **Stream Limit**: Exceed concurrent streams → Should show limit error (not retry)
- [ ] **Happy Path**: Normal playback → Session created immediately on first attempt
- [ ] **Logging**: Check browser console and backend logs for detailed retry information
- [ ] **Token Persistence**: Verify refreshed token stored in localStorage
- [ ] **Concurrent Sessions**: Multiple videos playing → Each maintains own session

## Integration Points

### Auth Store (`useAuthStore`)
- `refreshAccessToken()`: Refreshes JWT and updates state
- `token`: Current access token from Zustand store
- Uses existing token refresh scheduling

### Device Service (`deviceService`)
- `generateDeviceId()`: Creates unique device identifier
- `getDeviceName()`: Gets human-readable device name
- No changes needed

### Axios Interceptor (`api.js`)
- Continues to add Authorization header automatically
- Logs all requests with correlation IDs
- No changes needed for retry logic to work

## Future Enhancements

1. **Metrics**: Track retry success rates to identify patterns
2. **Circuit Breaker**: Disable retries if consistently failing
3. **Backoff Jitter**: Add randomization to prevent thundering herd
4. **Max Backoff**: Cap exponential backoff to prevent excessive delays
5. **Configurable Retry**: Allow adjusting max retries and backoff duration

## References

- **Debug Guide**: `DEBUG_PLAYBACK_401.md` - Comprehensive 401 error troubleshooting
- **Auth Store**: `web/src/stores/authStore.js` - Token management and refresh
- **API Config**: `web/src/services/api.js` - Request/response interceptors
