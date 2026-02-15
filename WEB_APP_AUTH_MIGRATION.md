# Bayit+ Web App - Auth Service Migration Guide

## Changes Required

### 1. Update Environment Variables

**File**: `web/.env` or `web/.env.local`

```env
VITE_AUTH_SERVICE_URL=https://auth.olorin.ai
VITE_API_URL=/api/v1
```

For local testing:
```env
VITE_AUTH_SERVICE_URL=http://localhost:8080
```

### 2. Update Auth Service (Already Created)

**New File**: `shared/services/api/olorinAuthService.ts` ✅

This provides:
- `olorinAuthService.register()`
- `olorinAuthService.login()`
- `olorinAuthService.loginWithGoogle()`
- `olorinAuthService.refreshToken()`
- `olorinAuthService.logout()`
- `olorinAuthService.getProfile()`

### 3. Update Auth Store

**File**: `shared/stores/authStore.ts`

Change imports:
```typescript
// OLD
import { authService } from '../services/api';

// NEW
import { olorinAuthService as authService } from '../services/api/olorinAuthService';
```

Update login/register calls to handle new response format:
```typescript
login: async (email: string, password: string) => {
  const response = await authService.login({ email, password });

  set({
    user: {
      id: response.user_id,
      email: response.email,
      name: response.name,
      avatar: response.avatar,
      role: response.role,
      permissions: response.permissions,
      is_active: true,
    },
    token: response.access_token,
    refreshToken: response.refresh_token,
    isAuthenticated: true,
  });
}
```

### 4. Google OAuth Integration

**Web**: Use Google Sign-In button to get ID token, then:
```typescript
// After Google Sign-In
const credential = googleUser.credential; // ID token

const response = await olorinAuthService.loginWithGoogle(credential);
// Returns access_token, refresh_token, user info
```

**Implementation**:
```tsx
// In your Google Sign-In component
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';

const googleLogin = useGoogleLogin({
  onSuccess: async (codeResponse) => {
    try {
      // Exchange code for ID token or use credential directly
      const response = await olorinAuthService.loginWithGoogle(codeResponse.credential);

      // Update auth store
      authStore.setUser({
        id: response.user_id,
        email: response.email,
        name: response.name,
        avatar: response.avatar,
        role: response.role,
        permissions: response.permissions,
      });
      authStore.setToken(response.access_token, response.refresh_token);

      navigate('/');
    } catch (error) {
      console.error('Google login failed:', error);
    }
  },
  onError: () => console.error('Google login error'),
});
```

### 5. Token Refresh

Auth service tokens expire in 15 minutes. Refresh proactively:

```typescript
// Already implemented in authStore.ts
scheduleTokenRefresh: () => {
  const { token, refreshToken } = get();
  if (!token || !refreshToken) return;

  // Check if token expires soon
  if (willExpireSoon(token)) {
    get().refreshAccessToken();
  }

  // Schedule next check in 5 minutes
  const timeout = setTimeout(() => {
    get().scheduleTokenRefresh();
  }, 5 * 60 * 1000);

  set({ refreshTimeout: timeout });
},

refreshAccessToken: async () => {
  const { refreshToken } = get();
  if (!refreshToken) return false;

  try {
    const response = await olorinAuthService.refreshToken(refreshToken);

    set({
      token: response.access_token,
      refreshToken: response.refresh_token,
    });

    return true;
  } catch (error) {
    // Refresh failed - logout user
    get().logout();
    return false;
  }
}
```

### 6. Update API Client

**File**: `web/src/services/api.js` or `shared/services/api/client.ts`

Token handling remains the same - just ensure Bearer token is sent:
```javascript
// Request interceptor (no changes needed - already correct)
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### 7. Error Handling

Auth service returns different error format:
```json
{
  "detail": "Invalid credentials"
}
```

Update error handling in auth store and components:
```typescript
catch (error: any) {
  const message = error.response?.data?.detail ||
                  error.message ||
                  'Authentication failed';
  set({ error: message, isLoading: false });
}
```

---

## Migration Checklist

### Web App
- [ ] Add VITE_AUTH_SERVICE_URL to .env
- [ ] Update authStore.ts imports
- [ ] Update login/register response handling
- [ ] Update Google OAuth integration
- [ ] Test login flow
- [ ] Test registration flow
- [ ] Test Google OAuth flow
- [ ] Test token refresh
- [ ] Test logout

### Mobile App (iOS)
- [ ] Add AUTH_SERVICE_URL to expo config
- [ ] Use Google Sign-In iOS SDK
- [ ] Get ID token from Google
- [ ] Call olorinAuthService.loginWithGoogle()
- [ ] Store tokens in secure storage
- [ ] Test full flow

### Mobile App (Android)
- [ ] Add AUTH_SERVICE_URL to build config
- [ ] Use Google Sign-In Android SDK
- [ ] Get ID token from Google
- [ ] Call olorinAuthService.loginWithGoogle()
- [ ] Store tokens in secure storage
- [ ] Test full flow

---

## Testing

### Local Testing (with local auth service)
```bash
# Terminal 1: Start auth service
cd /Users/olorin/Documents/Projects/olorin/scripts
./auth-start.sh

# Terminal 2: Update web app .env
cd /Users/olorin/Documents/Projects/olorin/olorin-media/bayit-plus/web
echo "VITE_AUTH_SERVICE_URL=http://localhost:8080" >> .env.local

# Terminal 3: Start web app
npm start
```

### Test Flow
1. Open http://localhost:3000
2. Try registration
3. Try login
4. Check token in browser storage
5. Verify API calls include Bearer token
6. Test token refresh after 15 min

---

## Rollback Plan

If issues occur:
1. Set `AUTH_SERVICE_ENABLED=false` in backend .env
2. Backend falls back to HS256 verification
3. Web app continues to work with legacy endpoints
4. Fix issues
5. Re-enable with `AUTH_SERVICE_ENABLED=true`

---

## Benefits After Migration

✅ **Centralized user management** - all platforms share users
✅ **Enhanced security** - RS256 tokens, proper OAuth verification
✅ **Audit logging** - all auth events tracked
✅ **Rate limiting** - protection against brute force
✅ **MFA ready** - TOTP and SMS support
✅ **Passkeys** - passwordless auth
✅ **Better token management** - rotation, revocation

The web app integration is **ready to implement**!
