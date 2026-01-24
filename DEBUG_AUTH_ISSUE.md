# Debugging 401 Authentication Issue

## Problem
Getting 401 Unauthorized on `/api/v1/profiles/preferences/voice` despite being logged in as admin.

## Root Cause Analysis

### Backend Endpoint (Correct)
The endpoint at `backend/app/api/routes/profiles.py:511-519` requires authentication:
```python
@router.get("/preferences/voice")
async def get_voice_preferences(
    current_user: User = Depends(get_current_active_user),
):
```

### Frontend Authentication Flow
1. **Login** → Sets token in `authStore.ts` (line 87)
2. **API Client** → Retrieves token from store (line 126 in `client.ts`)
3. **Request** → Adds `Authorization: Bearer <token>` header

### Current Graceful Handling
The `voiceSettingsStore.ts` already handles 401 errors gracefully (lines 101-113):
```typescript
if (error?.response?.status === 401 || error?.status === 401) {
  console.log('[VoiceSettingsStore] User not authenticated, using default preferences');
  set({
    preferences: DEFAULT_VOICE_PREFERENCES,
    loading: false,
    error: null, // No error for unauthenticated users
  });
}
```

## Debugging Steps

### 1. Check Token Storage (Browser DevTools)

Open Browser Console and run:
```javascript
// Check if token exists in storage
const authState = JSON.parse(localStorage.getItem('bayit-auth') || '{}');
console.log('Auth State:', authState);
console.log('Token:', authState.state?.token);
console.log('User:', authState.state?.user);
console.log('Is Authenticated:', authState.state?.isAuthenticated);
```

### 2. Verify Token in Request Headers

In Browser DevTools Network tab:
1. Filter for `preferences/voice` requests
2. Click on a failed request
3. Check "Request Headers" section
4. Verify `Authorization: Bearer <token>` is present

### 3. Check Token Expiration

The token might have expired. Check backend logs for token validation errors:
```bash
cd backend
grep -r "Token has expired\|Could not validate credentials" logs/
```

### 4. Manual Token Verification

Test the token directly using curl:
```bash
# Get the token from browser console (step 1)
TOKEN="<your-token-here>"

# Test the endpoint
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/v1/profiles/preferences/voice
```

### 5. Check Auth Store Rehydration

The auth store uses AsyncStorage with persistence. Check if rehydration completed:
```javascript
// In browser console
import { useAuthStore } from './shared/stores/authStore';
const store = useAuthStore.getState();
console.log('Is Hydrated:', store.isHydrated);
console.log('Token:', store.token);
console.log('User:', store.user);
```

## Possible Issues & Solutions

### Issue 1: Token Not Persisted After Login
**Symptom**: Token is `null` in storage despite successful login

**Solution**: Verify login response includes `access_token`:
```typescript
// In authStore.ts:84-90
const response: any = await authService.login(email, password);
set({
  user: response.user,
  token: response.access_token,  // <-- Must be present
  isAuthenticated: true,
});
```

### Issue 2: Token Expired
**Symptom**: Token exists but backend returns 401

**Solution**: Log out and log back in to get a new token:
```javascript
// Browser console
useAuthStore.getState().logout();
// Then log in again through the UI
```

### Issue 3: Timing Issue (Store Not Rehydrated)
**Symptom**: Request fires before AsyncStorage rehydration completes

**Solution**: Wait for `isHydrated` before making API calls:
```typescript
// In voiceSettingsStore.ts or component
const authStore = useAuthStore();
if (!authStore.isHydrated) {
  // Wait for rehydration
  return;
}
```

### Issue 4: CORS/Preflight Issues
**Symptom**: OPTIONS request succeeds but GET fails with 401

**Solution**: Check backend CORS configuration in `backend/app/main.py`:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Quick Fix Commands

### Backend: Check if server is running with correct auth
```bash
cd backend
poetry run python -c "
from app.core.security import get_current_active_user
print('Security module loaded successfully')
"
```

### Frontend: Clear storage and re-login
```javascript
// Browser console
localStorage.clear();
sessionStorage.clear();
// Then refresh page and log in again
```

### Verify API client is working
```javascript
// Browser console
import { api } from './shared/services/api/client';
api.get('/health').then(r => console.log('API OK:', r));
```

## Expected Behavior

When working correctly:
1. Login sets token in authStore → persisted to AsyncStorage
2. API client interceptor adds token to all requests
3. Backend validates token and returns user preferences
4. If 401 occurs, voiceSettingsStore falls back to defaults (no error shown)

## Current Behavior

The 401 error is appearing in console but should be handled gracefully. The system should:
- ✅ Fall back to default preferences
- ✅ Not show error to user
- ✅ Continue functioning with default voice settings

## Next Steps

1. Run debugging step 1 to check token storage
2. If token is missing → Check login flow
3. If token exists → Check if it's being added to request headers
4. If header is present → Token might be expired or invalid
5. If all else fails → Clear storage and re-login
